import { createMachine, assign, send } from "xstate"
import defaultData, { Program } from "./defaultData"
import { speak } from "./audio"
import localforage from "localforage"

type LoadedEvent = { type: "LOADED"; data: Program[] }
type StartEvent = { type: "START" }
type ResetEvent = { type: "RESET" }
type PauesEvent = { type: "PAUSE" }
type TickEvent = { type: "TICK" }
type LeadTickEvent = { type: "LEAD_TICK" }
type FinishLeadIn = { type: "FINISH_LEAD_IN" }
type SelectProgramEvent = { type: "SELECT_PROGRAM"; index: number }
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
  | ReorderProgramsEvent

const timerMachine = createMachine(
  {
    /** @xstate-layout N4IgpgJg5mDOIC5QBcCWBbMAnAdAGwHsBDCVAOygGIICywdyA3Aga3rU10JPKgSYIBjImloBtAAwBdSVMSgADgVipRZeSAAeiAGwBmHACYALPoCcOgIw6JAVj1mAHDoA0IAJ6JDO2zmPGJS2NDCUdDe2M9WwBfaLcObBwFLAIoLCJ0AAIyAmRM2DA8MEFkSEoAZQBRABlKgGEAFQB9AAUAJQB5AHE2gEEAWVkNJRU1DW0EW19jR2MAdgk5vR05xz09CWM3TwR5iT9F4zMJQxCJPUcg2PiMROTU9KyCopLIHFhkAgUFMvKG3raDSGSBAI1UqFo40QlgkOhwa2CQVshjmc0MZn820QZj0hnhOn0kQ2YXCc2uIASuHuaQy+UKxVKEBwWAArmQyLxKC1egBVKrAxTKcGQkETZx4jaBKbeAkzVweRCOWyWHBOE6OHE6MyGC6GcmUpIpGlPemvJms9mctqVKpA6TDIVjUWIBz7FbKxxrRyoqyOLEIS4q2zGWwnJxmSwXWyOfW3KlGx50l6M5lsjkUSgC0GOiHqZ27WxmHDRhyFtHnJV6f2oouekLBExzbXzWOcQ0PWnPBlvC3pqA4QQENloCiZGgAdzIlAaAEk6gBpLNgp2gCaWaxwnwe8LonSRf2WHXGHDrdZzdc6HX6HStu4JzumlO93gDodkEdQMcESeZ+0g5e5lCCCXgYF5WIYlgYlMthzAe6xwoY3pSmqaJ6Le8YdiayY9mmL69Oyb6CLwmQAEaEIILDULQ9ACGwOAGtSiZdmaqaWhQOD4TkbJEaOZFCCw-BkMwwhqLIS45iKq4uvoOCWDBe51kqRxVgqCDrlMxYwbMwbhhGxjoe2xpJt25q4exnGEcRg7DhOU61L0AAiTSzgu4mjIB+aor4MEBAE3o+P5B6kieEhmNqyLWE2IYGYxD7YaZbH9hZ3FWW+yC2ZQABiM4AHIzuUAASTT2U5uVucKeZSQG6zFrMCx6JYTa+pYB5ycedirJGJzuvpcQUnGhlMY+bwKEQLIFBAlDWra5UrloiDRr4l7BssJj+NYWyqQsx5zEckROFqu3BjF95YSZSRjRNFT-ICs0eVVXk4Ki1gWHMyoov6SoqmqiGatquoGdwpAZtgKRUngIgAGYEFg6D0QNQO8IJwkiLmYl-oK7mSfNCAmL4YRrBI5wXJEyoqTsMLHj4RMrRBpyojGfUMadxlmhUNT1M07TdH0gwY9mWOVTj57Hv4GyRLMSq7YY-rGIeT32HJb0XgTBk5JksXoLAVF0AwQmsOwA3q5rsDI0IqPiNId3YxMuJwvYURywiEGerYB4aXou0zBikF1j4sR9TkEBwBolIOoLQEALQGASSrOLMISQciMuqY1smhnYpMontiyA8QwNQOHFVAciT0NXJxw6o1Rx+qnixGBskFvY4RN6HLvU3G2mvZLkrOMkXc0TEcqpHPYoUWK9sz+g47VhdqWqWGEqEnZhfeQAP904-4J4NXLDUwWqMz+lYcxGHth4yhqTgr0ZzEph8Xw-BAG829ix6K-JqxRDCLVbWnYSHiinLGEmwb5DXiqxPsL8hYTG1DvIIkYlaH1rhTc4+wOqXELGcOwZgwFxXOs+di1l3zEVstAoCP9T5HWRBqc8cwrC-wpl1TSqwM62C1NePBZ0WKEKSgRFKvFyIsHIfmII+x1gIP3k2FuR9U7rlPlML+ME7Aam8FwteCU+wcX4WQHin5iHpW-ELACr9Ji7T8H5JuM9oytTTootYyjozz3UXfEal117-gkjAxAj11gtwxPVEmsEtqbCentXaCx2GRj1EzI2BANanXgJ4iO+Z7COD8Msc4MEzimHlKg0+OpAhmHsGiEIyJcEByAA */
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
                      actions: "decrementTimer",
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
                  onDone: "Announcing countdown",
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
    },

    actions: {
      decrementTimer: assign({
        secondsRemaining: ({ secondsRemaining }) => secondsRemaining - 1,
      }),
      incrementBlock: assign({
        currentBlockIndex: ({ currentBlockIndex }) => currentBlockIndex + 1,
        secondsRemaining: ({ program, currentBlockIndex }) =>
          program?.blocks[currentBlockIndex + 1].seconds || 0,
      }),
      resetTimer: assign({
        secondsRemaining: ({ program }) => program?.blocks[0].seconds || 0,
        leadSecondsRemaining: 3,
        currentBlockIndex: 0,
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
