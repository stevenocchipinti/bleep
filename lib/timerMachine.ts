import { createMachine, assign, send } from "xstate"
import dummyData from "./dummyData"

const dummyProgram = dummyData[0]

type LoadedEvent = {
  type: "LOADED"
  data: typeof dummyProgram
}

const timerMachine = createMachine(
  {
    /** @xstate-layout N4IgpgJg5mDOIC5QBcCWBbMAnAdAGQHsBDCVAOygGIICywdyA3Aga3rU10JPKgSYIBjImloBtAAwBdSVMSgADgVipRZeSAAeiACwBWHHr0SAjAA4JOgGx6zJgEw6AzABoQAT0QBaExKs5LAE4TAHZHKydAvStHAF9Ytw5sHFhkAgUFSEoAZQAVAEEAJVzZDSUVNQ1tBCcJQJwdCRDm+xCzPXtg1w9EBwNAgacQyNsQ50t4xIxkrABXMjJeSgAFfIBVbIBRUqQQctVUWirEeybDYesnJ2MJJxs9N08EHU6cK2d2wJ0zYaszK0mICSuDmCyWhU2WxK0jKygOR121ScrUMPx+VjGgT8Jh0j0QYRwZheERaWPsNgBCSB0xB80WFEoO0UcMqiN0fwaUXsTmcRnadjxz3s5yiVluL3s0TMgOBOFB9KgOEEBHmaAoAAIaAB3MiUXIASQAwgBpJl7FmHdRs552AJtYI6LF6a5-QXOkKEwJmMxOEzI8l-ewymk4BREWawLIQqFm-as0DVZ04AM895EmwmJ2CyX1cZY0IOsXNYOcUPhyMQHIFYqxi0IhMnM7DELO-32VpGXE9GpWeqZv2mVqBewOHQlmZ03hKlVkNVQTUEHWMmG7OOW44IKy9t46ZohYLktqOwX6Mw4HlmRzmfcDKwmeJUsgECBwDTA2EVdfWrynHAF50-CYRgjpEgpeMiBghFuegmDYjRRM645cMQpAUB+8JWg2CAopelh3vYRK7v8JhgdyZ4Bh0+h1F6gTvEhKRpBkkDofGWiINcO5bi85h+AegSCrBhKdEYfh6LusFjPR8q8CxX5YUMfbev6EgdGKrRWIKVz+BmOLegRpgqXoUmThQ06qrwC46rJ9ZsUKHrmD67YqeSEjqSejh-jBOISPygRQUGVKymGEbMaudaYbZHTJq0rQmH6vbmPx3YvPU7xON6GJfAMrQPrEQA */
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
              TICK: [
                {
                  target: "counting down",
                  internal: true,
                  actions: "decrementTimer",
                },
                {
                  target: "counting down",
                  internal: true,
                  actions: "incrementBlock",
                },
              ],
            },

            always: {
              target: "counting down",
              internal: true,
              cond: "blockFinished",
              actions: "incrementBlock",
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
        currentBlockIndex: 0,
      }),

      assignProgram: assign({
        program: (_, event: LoadedEvent) => event.data,
        currentBlockIndex: 0,
      }),
    },
    services: {
      startTimer: () => send => {
        const interval = setInterval(() => send("TICK"), 1000)
        return () => clearInterval(interval)
      },
      loadData: () => {
        return new Promise(resolve => {
          setTimeout(() => resolve(dummyProgram), 1000)
        })
      },
    },
  }
)

export default timerMachine
