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
  | ReorderProgramsEvent

const timerMachine = createMachine(
  {
    /** @xstate-layout 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 */
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
                  actions: "incrementBlock",
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
                    actions: "incrementBlock",
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

        initial: "stopped",

        on: {
          SELECT_PROGRAM: {
            target: "program selected",
            internal: false,
            actions: "assignProgram",
          },
        },
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
      incrementBlock: assign({
        currentBlockIndex: ({ currentBlockIndex }) => currentBlockIndex + 1,
        secondsRemaining: ({ program, currentBlockIndex }) => {
          const block = program?.blocks[currentBlockIndex + 1]
          return block?.type === "timer" ? block.seconds : 0
        },
      }),
      resetTimer: assign({
        leadSecondsRemaining: 3,
        currentBlockIndex: 0,
        secondsRemaining: ({ program, currentBlockIndex }) => {
          const block = program?.blocks[currentBlockIndex + 1]
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
        () =>
          speak(program?.blocks[currentBlockIndex].name || ""),
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
