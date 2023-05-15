import { createMachine, assign, send } from "xstate"
import dummyData from "./dummyData"

const dummyProgram = dummyData[0]

type LoadedEvent = {
  type: "LOADED"
  data: typeof dummyProgram
}

const timerMachine = createMachine(
  {
    /** @xstate-layout N4IgpgJg5mDOIC5QBcCWBbMAnAdAGQHsBDCVAOygGIICywdyA3Aga3rU10JPKgSYIBjImloBtAAwBdSVMSgADgVipRZeSAAeiACwBWHHr0SAjAA4JOgGx6zJgEw6AzABoQAT0QBaExKs5LAE4TAHZHKydAvStHAF9Ytw5sHFhkAgUFSEoAZQAVAEEAJVzZDSUVNQ1tBCcJQJwdCRDm+xCzPXtg1w9EBwNAgacQyNsQ50t4xIxkrABXMjJeSgAFfIBVbIBRUqQQctVUWirEeybDYesnJ2MJJxs9N08EHU6cK2d2wJ0zYaszK0mICSuDmCyWhU2WxK0jKygOR121ScrUMPx+VjGgT8Jh0j0QYRwZheERaWPsNgBCSB0xB80WFEoO0UcMqiN0fwaUXsTmcRnadjxz3s5yiVluL3s0TMgOBOFB9KgOEEBHmaAoAAIaAB3MiUXIASQAwgBpJl7FmHdRs552AJtYI6LF6a5-QXOkKEwJmMxOEzI8l-ewymk4BREWawLIQqFm-as0DVZ04AM895EmwmJ2CyX1cZY0IOsXNYOcUPhyMQHIFYqxi0IhMnM7DELO-32VpGXE9GpWeqZv2mVqBewOHTxKlkAgQOAaYGwiqW44ILynHAF50-ExGEeRQVeZEGEJWDNfIa1MxfEvJbikCjz+FWhsIFFmU7WBxEnRtKwmPfcszJseHT6HUXqBO8V64Kk6SZBA97xloiDXG81jvCOFi9g4gSCiY-ivlExg2F+uFjJBcp0rw8GLtaQx9t6-oSB0YqtFYgpXP4GY4nogS+hS-xkfKvBKiqZBqlAmoEDqVH1ohQoeuYPrtox5ISCxgovDoa56CYOISPygRHkGVKymGEaQNJj6yR0yatK0Ol3MEF7qa87xON6GJfAMrTjrEQA */
    id: "timer",
    initial: "Loading",
    context: {
      program: null,
      currentBlockIndex: 0,
      secondsRemaining: 0,
    },
    schema: {
      context: {} as {
        program: typeof dummyProgram | null
        currentBlockIndex: number
        secondsRemaining: number
      },
      events: {} as
        | LoadedEvent
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
              src: "startTimer",
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
      timerFinished: ({ program, currentBlockIndex, secondsRemaining }) =>
        !!program &&
        secondsRemaining === 0 &&
        currentBlockIndex === program.blocks.length - 1,
    },
    actions: {
      decrementTimer: assign(context => {
        const { program, currentBlockIndex, secondsRemaining } = context
        if (!program || currentBlockIndex === null) return context

        let newSecondsRemaining = secondsRemaining - 1
        let newCurrentBlockIndex = currentBlockIndex

        if (
          newSecondsRemaining <= 0 &&
          currentBlockIndex < program.blocks.length - 1
        ) {
          newCurrentBlockIndex++
          newSecondsRemaining = program.blocks[newCurrentBlockIndex].seconds
        }

        return {
          secondsRemaining: newSecondsRemaining,
          currentBlockIndex: newCurrentBlockIndex,
          program,
        }
      }),

      resetTimer: assign({
        secondsRemaining: ({ program }) => program?.blocks[0].seconds || 0,
        currentBlockIndex: 0,
      }),

      assignProgram: assign({
        program: (_, event: LoadedEvent) => event.data,
        currentBlockIndex: 0,
      }),
    },
    services: {
      startTimer: () => send => {
        send("TICK")
        const interval = setInterval(() => send("TICK"), 1000)
        return () => clearInterval(interval)
      },
      loadData: () => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve(dummyProgram)
          }, 1000)
        })
      },
    },
  }
)

export default timerMachine
