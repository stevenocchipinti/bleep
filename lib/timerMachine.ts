import { createMachine, assign } from "xstate"

const timerMachine = createMachine(
  {
    /** @xstate-layout N4IgpgJg5mDOIC5QBcCWBbMAnAdLZA9gA5GQDEAygCoCCASlQNoAMAuoqEQbKmgQHYcQAD0QAWAGwAmHFICsAdgAcYgMzMAjAsVKNAGhABPRBuYScATguqptixrlSlc1RIC+bg2ky4sAV35+VH4oMgAFGgBVCgBRFnYkEC4ePkFE0QQHMRwFZlUNeQNjBDENCxw5Dy8MbBx-QODQuhjYpjYhZN5UASEMyRlnCzFmOTktHX0jE2UqkG9a+qCQsniO7i6e9MRpZhxVCzklI4c5MSkJBSLEFxxTC2Z5ZVNnMVn53wClqBwAYwIAtAhAAEEAIAHd+GQqABJADCAGlVolOqletsFOUlBYVBIlJptE8rghzkoclizPI3jVcEQAIZ+WDkZqtJGcdaoraZU45PIFOREgoKCpUnw4OkM8jUehtBJslLdNKgDJZHn5QpTYnYnKVWb8AgQOBCd5reWbJWIAC0EiJFtU2X2zAsCjOGixGkkItq+GIpAgJo2ipEiHOcj2Tj5AuY2R11VFi0a-o55oQEgKOQsEnuo3GhI1ro0snJ0hjc2pdU+jV+-34gKgIPBgZRCrRKYkuwxmZGYwJuiJrnKzqkru0npp9MZfuR7ObnLOfc02o8HiAA */
    id: "timer",
    initial: "stopped",
    context: {
      secondsRemaining: 30,
    },
    schema: {
      context: {} as { secondsRemaining: number },
      events: {} as
        | { type: "START" }
        | { type: "RESET" }
        | { type: "PAUSE" }
        | { type: "TICK" },
    },
    states: {
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
    },
    services: {
      timerInterval: () => send => {
        const interval = setInterval(() => send("TICK"), 1000)
        return () => clearInterval(interval)
      },
    },
  }
)

export default timerMachine
