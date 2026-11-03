import { createMachine, assign } from "xstate"

import { defaultPatternId, patternById } from "./breathingPatterns"

export interface BreathingContext {
  patternId: string
  /** Session length in seconds, or null for an open-ended session. */
  targetSeconds: number | null
  phaseIndex: number
  phaseSecondsRemaining: number
  phaseTotalSeconds: number
  elapsedSeconds: number
  cycles: number
}

export type StartEvent = { type: "START" }
export type TickEvent = { type: "TICK" }
export type PauseEvent = { type: "PAUSE" }
export type ResumeEvent = { type: "RESUME" }
export type StopEvent = { type: "STOP" }
export type SetTargetEvent = {
  type: "SET_TARGET"
  targetSeconds: number | null
}
export type SetPatternEvent = { type: "SET_PATTERN"; patternId: string }

export type BreathingEvent =
  | StartEvent
  | TickEvent
  | PauseEvent
  | ResumeEvent
  | StopEvent
  | SetTargetEvent
  | SetPatternEvent

/** Sessions shorter than this are treated as accidental taps. */
export const MIN_SESSION_SECONDS = 5

/**
 * Whether a finished or abandoned session is worth recording: at least one
 * full breath cycle, and not so short it was probably a mis-tap.
 */
export const isRecordableSession = ({
  cycles,
  elapsedSeconds,
}: Pick<BreathingContext, "cycles" | "elapsedSeconds">) =>
  cycles >= 1 && elapsedSeconds >= MIN_SESSION_SECONDS

const durationFor = (patternId: string, phaseIndex: number) => {
  const pattern = patternById(patternId)
  const phase = pattern.phases[phaseIndex] ?? pattern.phases[0]
  return phase.seconds
}

const initialContext = (patternId = defaultPatternId): BreathingContext => {
  const total = durationFor(patternId, 0)
  return {
    patternId,
    targetSeconds: null,
    phaseIndex: 0,
    phaseTotalSeconds: total,
    phaseSecondsRemaining: total,
    elapsedSeconds: 0,
    cycles: 0,
  }
}

const breathingMachine = createMachine<BreathingContext, BreathingEvent>(
  {
    id: "breathing",
    initial: "idle",
    context: initialContext(),
    predictableActionArguments: true,
    preserveActionOrder: true,
    states: {
      idle: {
        on: {
          START: { target: "running", actions: "resetSession" },
          SET_PATTERN: { actions: "setPattern" },
          SET_TARGET: { actions: "setTarget" },
        },
      },

      running: {
        invoke: { src: "ticker" },
        on: {
          TICK: { internal: true, actions: "tick" },
          PAUSE: "paused",
          STOP: { target: "idle", actions: ["sessionEnded", "resetSession"] },
          SET_TARGET: { actions: "setTarget" },
        },
        always: [
          {
            target: "complete",
            cond: "targetReached",
          },
          {
            cond: "phaseFinished",
            actions: "advancePhase",
          },
        ],
      },

      paused: {
        on: {
          RESUME: "running",
          START: "running",
          STOP: { target: "idle", actions: ["sessionEnded", "resetSession"] },
          SET_TARGET: { actions: "setTarget" },
        },
      },

      complete: {
        entry: "sessionEnded",
        on: {
          START: { target: "running", actions: "resetSession" },
          STOP: { target: "idle", actions: "resetSession" },
          SET_PATTERN: { actions: "setPattern" },
          SET_TARGET: { actions: "setTarget" },
        },
      },
    },
  },
  {
    guards: {
      targetReached: ({ targetSeconds, elapsedSeconds }) =>
        targetSeconds !== null && elapsedSeconds >= targetSeconds,
      phaseFinished: ({ phaseSecondsRemaining }) => phaseSecondsRemaining <= 0,
    },
    actions: {
      /** Override with `useMachine(..., { actions })` to record sessions. */
      sessionEnded: () => {},

      resetSession: assign(context => ({
        ...context,
        phaseIndex: 0,
        phaseTotalSeconds: durationFor(context.patternId, 0),
        phaseSecondsRemaining: durationFor(context.patternId, 0),
        elapsedSeconds: 0,
        cycles: 0,
      })),

      tick: assign((context, _event: TickEvent) => ({
        ...context,
        phaseSecondsRemaining: context.phaseSecondsRemaining - 1,
        elapsedSeconds: context.elapsedSeconds + 1,
      })),

      advancePhase: assign(context => {
        const pattern = patternById(context.patternId)
        const nextIndex = (context.phaseIndex + 1) % pattern.phases.length
        const wrapped = nextIndex === 0
        const total = durationFor(context.patternId, nextIndex)
        return {
          ...context,
          phaseIndex: nextIndex,
          phaseTotalSeconds: total,
          phaseSecondsRemaining: total,
          cycles: wrapped ? context.cycles + 1 : context.cycles,
        }
      }),

      setPattern: assign((context, event: SetPatternEvent) => {
        const total = durationFor(event.patternId, 0)
        return {
          ...context,
          patternId: event.patternId,
          phaseIndex: 0,
          phaseTotalSeconds: total,
          phaseSecondsRemaining: total,
          elapsedSeconds: 0,
          cycles: 0,
        }
      }),

      setTarget: assign((context, event: SetTargetEvent) => ({
        ...context,
        targetSeconds: event.targetSeconds,
      })),
    },

    services: {
      ticker: () => send => {
        const interval = setInterval(() => send("TICK"), 1000)
        return () => clearInterval(interval)
      },
    },
  },
)

export default breathingMachine
