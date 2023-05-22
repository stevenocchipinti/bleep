import { createMachine, assign, send } from "xstate"
import defaultData, { Program } from "./defaultData"
import { playTone, speak } from "./audio"
import localforage from "localforage"

type LoadedEvent = { type: "LOADED"; data: Program[] }
type StartEvent = { type: "START" }
type ResetEvent = { type: "RESET" }
type PauesEvent = { type: "PAUSE" }
type TickEvent = { type: "TICK" }
type LeadTickEvent = { type: "LEAD_TICK" }
type FinishLeadIn = { type: "FINISH_LEAD_IN" }
type SelectProgramEvent = { type: "SELECT_PROGRAM"; index: number }
type ContinueEvent = { type: "CONTINUE" }
type NextEvent = { type: "NEXT" }
type PreviousEvent = { type: "PREVIOUS" }
type ReorderProgramsEvent = {
  type: "REORDER_PROGRAMS"
  sourceIndex: number
  destinationIndex: number
}

type Events =
  | LoadedEvent
  | SelectProgramEvent
  | StartEvent
  | ResetEvent
  | PauesEvent
  | TickEvent
  | LeadTickEvent
  | FinishLeadIn
  | ContinueEvent
  | NextEvent
  | PreviousEvent
  | ReorderProgramsEvent

const timerMachine = createMachine(
  {
    /** @xstate-layout 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-UKvQ-AYm6KmdUpgUJ8uSaA1J9gxwhETGYWIsQgA */
    id: "timer",

    initial: "loading",

    schema: {
      context: {} as {
        allPrograms: Program[]
        selectedProgramIndex: number | null
        program: Program | null
        currentBlockIndex: number
        secondsRemaining: number
        leadSecondsRemaining: number
      },
      events: {} as Events,
    },

    context: {
      allPrograms: [],
      selectedProgramIndex: null,
      program: null,
      currentBlockIndex: 0,
      secondsRemaining: 0,
      leadSecondsRemaining: 0,
    },

    states: {
      loading: {
        invoke: {
          src: "loadData",

          onDone: {
            target: "program not selected",
            actions: "assignAllPrograms",
          },

          onError: "no programs",
        },
      },

      "program not selected": {
        on: {
          SELECT_PROGRAM: {
            target: "program selected",
            actions: "assignProgram",
          },
        },
      },

      "program selected": {
        states: {
          stopped: {
            on: {
              START: {
                target: "running",
              },

              NEXT: {
                target: "stopped",
                cond: "nextBlockAvailable",
                actions: "nextBlock",
                internal: true,
              },

              PREVIOUS: {
                target: "stopped",
                cond: "previousBlockAvailable",
                actions: "previousBlock",
                internal: true,
              },
            },

            entry: ["resetTimer", "stopTalking"],
          },

          running: {
            on: {
              PAUSE: {
                target: "paused",
              },

              RESET: {
                target: "stopped",
              },

              NEXT: {
                target: "running",
                internal: true,
                cond: "nextBlockAvailable",
                actions: "nextBlock",
              },

              PREVIOUS: {
                target: "running",
                internal: true,
                cond: "previousBlockAvailable",
                actions: "previousBlock",
              },
            },

            states: {
              "counting down": {
                invoke: {
                  src: "startTimer",
                },

                on: {
                  TICK: [
                    {
                      target: "counting down",
                      internal: true,
                      actions: ["decrementTimer", "beep"],
                    },
                  ],
                },

                always: {
                  target: "Announcing block",
                  cond: "blockFinished",
                  actions: "nextBlock",
                },
              },

              "Announcing block": {
                invoke: {
                  src: "announceBlock",

                  onDone: [
                    {
                      target: "Announcing countdown",
                      cond: "isTimerBlock",
                    },
                    {
                      target: "Awaiting continue",
                      cond: "isPauseBlock",
                    },
                  ],
                },

                exit: "stopTalking",
              },

              "Announcing countdown": {
                invoke: {
                  src: "announceCountdown",
                },

                exit: "stopTalking",

                on: {
                  LEAD_TICK: {
                    target: "Announcing countdown",
                    internal: true,
                  },

                  FINISH_LEAD_IN: "counting down",
                },
              },

              "Awaiting continue": {
                on: {
                  CONTINUE: {
                    target: "Announcing block",
                    actions: "nextBlock",
                  },
                },
              },
            },

            initial: "Announcing block",
            always: {
              target: "stopped",
              cond: "timerFinished",
            },
          },

          paused: {
            on: {
              RESET: "stopped",
              START: "running",
            },
          },
        },

        on: {
          SELECT_PROGRAM: {
            target: "program selected",
            internal: false,
            actions: "assignProgram",
          },
        },

        initial: "stopped",
      },

      "no programs": {
        invoke: {
          src: "saveDefaultData",
          onDone: "loading",
        },
      },
    },

    predictableActionArguments: true,
    preserveActionOrder: true,
  },
  {
    guards: {
      timerFinished: ({ program, currentBlockIndex, secondsRemaining }) =>
        !!program &&
        secondsRemaining === 0 &&
        currentBlockIndex === program.blocks.length - 1,
      blockFinished: ({ program, currentBlockIndex, secondsRemaining }) =>
        !!program &&
        secondsRemaining === 0 &&
        currentBlockIndex < program.blocks.length - 1,
      isTimerBlock: ({ program, currentBlockIndex }) =>
        !!program && program.blocks[currentBlockIndex].type === "timer",
      isPauseBlock: ({ program, currentBlockIndex }) =>
        !!program && program.blocks[currentBlockIndex].type === "pause",
      previousBlockAvailable: ({ program, currentBlockIndex }) =>
        !!program && currentBlockIndex > 0,
      nextBlockAvailable: ({ program, currentBlockIndex }) =>
        !!program && currentBlockIndex < program.blocks.length - 1,
    },

    actions: {
      decrementTimer: assign({
        secondsRemaining: ({ secondsRemaining }) => secondsRemaining - 1,
      }),
      beep: ({ secondsRemaining }) => {
        if (secondsRemaining === 3) playTone(440, 0.3)
        if (secondsRemaining === 2) playTone(440, 0.3)
        if (secondsRemaining === 1) playTone(440, 0.3)
        if (secondsRemaining === 0) playTone(880, 0.8)
      },
      nextBlock: assign({
        currentBlockIndex: ({ currentBlockIndex }) => currentBlockIndex + 1,
        secondsRemaining: ({ program, currentBlockIndex }) => {
          const block = program?.blocks[currentBlockIndex + 1]
          return block?.type === "timer" ? block.seconds : 0
        },
      }),
      previousBlock: assign({
        currentBlockIndex: ({ currentBlockIndex }) => currentBlockIndex - 1,
        secondsRemaining: ({ program, currentBlockIndex }) => {
          const block = program?.blocks[currentBlockIndex - 1]
          return block?.type === "timer" ? block.seconds : 0
        },
      }),
      resetTimer: assign({
        leadSecondsRemaining: 3,
        currentBlockIndex: 0,
        secondsRemaining: ({ program }) => {
          const block = program?.blocks[0]
          return block?.type === "timer" ? block.seconds : 0
        },
      }),
      stopTalking: () => {
        speechSynthesis.cancel()
      },
      assignProgram: assign({
        selectedProgramIndex: (_, event: SelectProgramEvent) => event.index,
        program: ({ allPrograms }, event: SelectProgramEvent) =>
          allPrograms[event.index],
      }),
      assignAllPrograms: assign({
        allPrograms: (_, event: LoadedEvent) => event.data,
      }),
    },

    services: {
      loadData: () =>
        localforage.getItem("allPrograms").then(data => {
          if (data) return data
          else throw "No data found"
        }),
      saveDefaultData: () => localforage.setItem("allPrograms", defaultData),
      startTimer: () => send => {
        const interval = setInterval(() => send("TICK"), 1000)
        return () => clearInterval(interval)
      },
      announceBlock:
        ({ program, currentBlockIndex }) =>
        () => {
          const block = program?.blocks[currentBlockIndex]
          if (block?.type === "timer")
            return speak(`${block.name} for ${block.seconds} seconds`)
          else if (block?.type === "pause" && block?.reps && block.reps > 0)
            return speak(`${block.name} for ${block.reps} reps`)
          else return speak(`${block?.name}`)
        },
      announceCountdown:
        ({ leadSecondsRemaining }) =>
        send => {
          speak("Starting in")
          const interval = setInterval(() => {
            if (leadSecondsRemaining === 0) send("FINISH_LEAD_IN")
            else speak(`${leadSecondsRemaining--}`)
          }, 1000)
          return () => clearInterval(interval)
        },
    },
  }
)

export default timerMachine
