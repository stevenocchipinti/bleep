import { createMachine, assign, send } from "xstate"
import dummyData from "./dummyData"
import { speak, speakCountdown } from "./audio"

const dummyProgram = dummyData[0]

type LoadedEvent = { type: "LOADED"; data: typeof dummyProgram }
type StartEvent = { type: "START" }
type ResetEvent = { type: "RESET" }
type PauesEvent = { type: "PAUSE" }
type TickEvent = { type: "TICK" }
type LeadTickEvent = { type: "LEAD_TICK" }
type FinishLeadIn = { type: "FINISH_LEAD_IN" }

type Events =
  | LoadedEvent
  | StartEvent
  | ResetEvent
  | PauesEvent
  | TickEvent
  | LeadTickEvent
  | FinishLeadIn

const timerMachine = createMachine(
  {
    /** @xstate-layout N4IgpgJg5mDOIC5QBcCWBbMAnAdAGQHsBDCVAOygGIICywdyA3Aga3rU10JPKgSYIBjImloBtAAwBdSVMSgADgVipRZeSAAeiACwBWHHr0SAjAA4JOgGx6zJgEw6AzABoQAT0QBaExKs5LAE4TAHZHKydAvStHAF9Ytw5sHFhkAgUFSEoAZQAVAEEAJVzZDSUVNQ1tBCcJQJwdCRDm+xCzPXtg1w9EBwNAgacQyNsQ50t4xIxkrABXMjJeSgAFfIBVbIBRUqQQctVUWirEeybDYesnJ2MJJxs9N08EHU6cK2d2wJ0zYaszK0mICSuDmCyWhU2WxK0jKygOR121TuZkM9hMOhCQUCfnRj0QYRwJj0Dic6JC2PsNgBCSB0xB80WFEoO0UcMqiN0fwaUXsTmcRnadjxz3s5yiVluL3s0TMgOBOFBjKgOEEBHmaAoAAIaAB3MiUXIASQAwgBpFl7NmHdQchAOIlvaW1ExWQKYkJ-YU2UU8ynXezS4Z6OV0hUM3gqtVkDVQbUEPXMmG7fbs0DVEKhBo-OrSiRmMxOezCuwmALo0yRU6Bdr2EOcMNgig4fILKOCXiagBGABshCxqLR6AI2Dh5YqIy2yG2Oz2+-wyMxhGpZBaU9bjgg9Dp6jErHu9BmmlYQsLGgY7LynBYordKXWZuGm5Pp1rVerdfqAGKGgByhuyAASAD6eCbPkAAiQG-quVoImmiA-DoOAWC0Jgup0e4nj0zwSOeJJXnUxiFtSUz1uOT6tvM7avlGyAfpQoEQUBRpmjBFTrrabSlpYrr-IWZhfIEVheh0OC+se+i7hE964AoRCzLAWQQlCbHwja8Gbk4OCUhE1jfNYxLYg82HSvU4zYqEwTWE0IQyTgckKVkeRFNCcjJrB6laCcZzDCEehXAGAZ+Vuwp3PUJhdKYrSBGicSAlOEBwBowKwuxcFeQgXinIS5L+T8RIdCYkTCl4hYGB63oSBWVgkiRtL1twpAUKlakbq0yGnNYDhmDoGL-CYJW8iiOkdPodTVkJOh2ak6SZBALWphl1xvNY7xohYroOIEwouh1UTGDYGIumMdnkVAC0cRpVwhG8xLbnyha1KcwnYaSKKkryLx6FZdQ9adj7Km+0Ydh+F3pdUvjfGJ0r-FVFL2PmwrEv4-m+AJgSRF8Hr-Y2yrPlRM69oILBg55SLtLd6IY84vISM9SO7ajebXkRd40mOAPNpRZDUbGQN0fGnlruDiB-DdqPbn4ljEkMDMo6SzOEbedXyg5inze5aVk4golBa0aFheY23YS8O4fP85LbjFtnxLEQA */
    id: "timer",
    initial: "Loading",
    context: {
      program: null,
      currentBlockIndex: 0,
      secondsRemaining: 0,
      leadSecondsRemaining: 0,
    },
    schema: {
      context: {} as {
        program: typeof dummyProgram | null
        currentBlockIndex: number
        secondsRemaining: number
        leadSecondsRemaining: number
      },
      events: {} as Events,
    },
    states: {
      Loading: {
        invoke: {
          src: "loadData",
          onDone: {
            target: "stopped",
            actions: "assignProgram",
          },
        },
      },
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
        program: (_, event: LoadedEvent) => event.data,
        currentBlockIndex: 0,
      }),
    },

    services: {
      loadData: () => {
        return new Promise(resolve => {
          setTimeout(() => resolve(dummyProgram), 1000)
        })
      },
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
