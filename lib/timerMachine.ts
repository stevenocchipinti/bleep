import { createMachine, assign } from "xstate"
import dummyData from "./dummyData"

const dummyProgram = dummyData[0]

const timerMachine = createMachine(
  {
    /** @xstate-layout N4IgpgJg5mDOIC5QBcCWBbMAnAdAGQHsBDCVAOygGIICywdyA3Aga3rU10JPKgSYIBjImloBtAAwBdSVMSgADgVipRZeSAAeiALQBGCRJwBWAGymAzAE4LxiXYsAOCwCYANCACeul3qs4rABZAvQtTAHYXCVM7YwsAX3iPDmwcWGQCBQVISgBlABUAQQAlfNkNJRU1DW0EHRcXHHCrFxtHF1dA30dw4w9vBEDjHHbjF2MQmJdHONNE5IxUrABXMjJeSgAFQoBVXIBRcqQQStVUWhrEPUCcC2tHQIte-sQLUNuraL8DPT8rY3mIBSuBWaw2xX2BzK0gqyjOF2OtT0pkcARR4Uc9j0vQxencXl0eNuLi6eh6AKSQMWINW6wolCOijh1URiF8eluxhs4WCPPCFhC+IGOhRI3CBkcktsvWMGMBwJwoLpUBwggIqzQFAABDQAO5kSj5ACSAGEANKMk7M87qVkIKI3KymCROzHY2WOPEvBChVESXHjeXUnAKIjLWA5CFQy2nFmgWr6cYjT6mcbeoI4aZ4ikLTghsMRiB5IqlGPWhHxxD+QJOl1PPoEn3WExWcIxVMUylkAgQOAaYGwqo2y51MI3exBBqBcKGVNC3SuDlBZytYzI+xhIN57ikCiD+G2yuj5E4CddEkz6INb31AU4YIr0xWB6tGYuLepdKZbIQfdxrSEtip5vGmjY6BmqYGNyOZUnmSq8H+w52qE4QjFygT2GuOKevOCB2CYAYkiiJI1nMlIKvBFCquqZCalAOoEPqiEVgBPozGhQSYe6Abeh0-gSCBMEKqG4aQMxh6sYmRjQd6bwWB8V6dvEQA */
    id: "timer",
    initial: "Loading",
    context: {
      secondsRemaining: 30,
      program: null,
    },
    schema: {
      context: {} as {
        secondsRemaining: number
        program: typeof dummyProgram | null
      },
      events: {} as
        | { type: "LOADED"; data: typeof dummyProgram }
        | { type: "START" }
        | { type: "RESET" }
        | { type: "PAUSE" }
        | { type: "TICK" },
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

        entry: "resetTimer",
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
              src: "timerInterval",
            },

            on: {
              TICK: {
                target: "counting down",
                internal: true,
                actions: "decrementTimer",
              },
            },
          },
        },

        initial: "counting down",
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
      timerFinished: context => context.secondsRemaining === 0,
    },
    actions: {
      decrementTimer: assign({
        secondsRemaining: ({ secondsRemaining }) => secondsRemaining - 1,
      }),
      resetTimer: assign({
        secondsRemaining: 30,
      }),
      assignProgram: assign({
        program: (_, event: { type: "LOADED"; data: typeof dummyProgram }) =>
          event.data,
      }),
    },
    services: {
      timerInterval: () => send => {
        const interval = setInterval(() => send("TICK"), 1000)
        return () => clearInterval(interval)
      },
      loadData: () => {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            resolve(dummyProgram)
          }, 1000)
        })
      },
    },
  }
)

export default timerMachine
