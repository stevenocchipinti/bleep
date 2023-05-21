import { createMachine, assign, send } from "xstate"
import dummyData, { Program } from "./dummyData"
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

type Events =
  | LoadedEvent
  | SelectProgramEvent
  | StartEvent
  | ResetEvent
  | PauesEvent
  | TickEvent
  | LeadTickEvent
  | FinishLeadIn

const timerMachine = createMachine(
  {
    /** @xstate-layout N4IgpgJg5mDOIC5QBcCWBbMAnAdAGwHsBDCVAOygGIICywdyA3Aga3rU10JPKgSYIBjImloBtAAwBdSVMSgADgVipRZeSAAeiAMwBWAEw4AjAYAsOgBx6AbHtMG9OswBoQAT0RmzAdhwHLayczAE5jCQibAF8otw5sHAUsAigsInQAAjICZAzYMDwwQWRISgBlAFEAGQqAYQAVAH0ABQAlAHkAcVaAQQBZWQ0lFTUNbQQQs2McPW8Qu2tjEIjLN08Ebz0cH0C9RdmDMIMYuIwEpJS0zPzC4sgcWGQCBQVSsvqe1vrBpBBh1VQtDGujsODMEmM3gk3mMeh8jhsa0QYRCOEsUx0dkmlh0xksx1iIHiuAuqXSeQKRRKEBwWAArmQyLxKM0egBVSo-RTKAFA37jKwSGY+CI6fSWYzGXE+JEISUSLY6CT6AwGMXQkI+aKE4mJZJk66Uu40+mM5mtCqVb7SIY80b8rxinA2cFK6E6RwWAyIjyIHw+HT+Mw2b3K-TLTEnIlnEn6q4U27U2kMpkUShcv52wHqB0bCR+MzohUSAL5vROWXwyw4EKq0yw2H+gw+KO60nxm5U+6m1NQHCCAgMtAUDI0ADuZEo9QAkrUANIZ-720DjYwB6aqzclwU6HyuX1y-PVmy7Q6a9Vr1sxvWXcmd43Js0UfuDsjDqCjggT9M235L7PAnKeJ+CemKhMshx6LKkqWEKLoGGuvhhDYNjGFenA3gaCZdiaKa8DgPSMq+gi8BkABGhCCCw1C0PQAhsDgbZxneRpJj2+GEdkDIkSOFFCCw-BkMwwhqLIi5ZnyK7Is22zmCediYpMmKyiEqk1lKEQWBIqmQeh5zMYaibdnhz6ccRpEDkO46TjUPQACKNDO87iSMAG5lK4ImFMR57KEEohNB4TTChegSEWzYBo4emxrehk4Y+vYEUR3EWa+yDWZQABi04AHLTmUAASjS2Q5uUubyOZSXKOghNWDZ7mFgQQo4Km1WCpianiu42LW0WYR2rH3AoRB0vkECUBaVrlcuWjIoGaqSi6lhaoEmqrAetWojVYU+OW+IBNqpwYe2LFGTSw2jW8HxfNNblVZiWzgpC4IwnCCIqTYfi1k2UywTihZ9dwpBptgyQkngIgAGYEFg6CMdeQO8IJwkiNmYm-tyrmSbNCAoepvjBHuu3vQeVhbN69jBiENXNnifXZBkJ3oLAP5yH+EmVTjziBvYtbdSeyqirKtM1rtPWzLWBj5n1TPYca5TVHUTRtF0vQDBjmZY5zq6emCFh6KpJY7Oi+7rJs2y7HukzzDYyraoS2QQHAGjEraWuAQAtEYK04vYC3hHWMoHniZhgrtsE1bt2nhDogPEMDUBuxVgGGNsuKwhB0p+bK5sU5CPU0z4dM6tesvZLk97UknM3jDYzj+KKaqHBKHpB2bJ7bHYz17qEZ4ywZctV+z7u5mY5Pp0tPtrbKddCh6pgSniexhv3sWD-cjzPK8EDV3dOOTDMuJwp9vtBZWa5oghzaTFM4TQqvWGV8ZT6J8Pye5nYNhorVY9hShu6FllMtUOUxDhEyVEpEID8BpnQSvhSyb5SLWV3tjVcewjC4gRChWCsJZgqT3OpN0gRPrLGLkdfSa8n64RfklLiZAeIfj4lRFB2s-TQm-uiUKlh-57nWuseY0wjiqTHsYUC0sS7HQHlQuBplkr0NSlZL8nN-yoMQJKGqOAIg7DhN4bRaoPqCI6pMewYiWwSIoY-Qa50RpjRYYBVU5MJRTGXnsGqOhAoKhwEqfQcJRF10-vTAgjMDLwDfjXP03tqYoQQosZwgCDyHFDiEQwCJNQuk1OWGIMQgA */
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
        always: {
          target: "program not selected",
          actions: "loadDefaults",
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
      loadDefaults: assign({ allPrograms: dummyData }),
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
      }),
      assignAllPrograms: assign({
        allPrograms: (_, event: LoadedEvent) => event.data,
      }),
    },

    services: {
      loadData: () => localforage.getItem("allPrograms"),
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
