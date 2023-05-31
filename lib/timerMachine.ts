import { createMachine, assign } from "xstate"
import { assign as immerAssign } from "@xstate/immer"
import localforage from "localforage"

import defaultData from "./defaultData"
import { ProgramSchema } from "./types"
import { Block, Program } from "./types"
import { playTone, speak } from "./audio"

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
type UpdateBlockEvent = {
  type: "UPDATE_BLOCK"
  index: number
  block: Block
}
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
  | UpdateBlockEvent
  | ReorderProgramsEvent

const timerMachine = createMachine(
  {
    /** @xstate-layout N4IgpgJg5mDOIC5QBcCWBbMAnAdAGwHsBDCVAOygGIICywdyA3Aga3rU10JPKgSYIBjImloBtAAwBdSVMSgADgVipRZeSAAeiAGwBmHACYALPoCcOgIw6JAVj1mAHDoA0IAJ6JDO2zmPGJS2NDCUdDe2M9WwBfaLcObHxiUgpKbCwCXAU8EQAzTPQcBK5k3n4yZmE1WVkNJRU1DW0EE18wxz0JCT09R0jbSz03TwRLCWMcHy7bSMNLQ0MAdkXHWPiMRIUMqCwidAACMgJkfdgwPDBBZEhKAGUAUQAZe4BhABUAfQAFACUAeQA4j8AIIAWVqSBA9VUqFoTUQtl8xj6iwkiz0OhWPXGw0QxlRfjRxjMEgWXV6QTWIGKOC2BB2e1O50u1wgdyer0+v0BIPB0jqyhhcMhzWxfmsGMGi30wUWuIQ+IkhMWxNJIW6YSpNLpDIOZwuV0gOFgyAICgUN1ub2BPzeEMUgsaIoRPhwg0siJJEjMvXR8rG-hwPWWcwxekMekWWo2WW2uz1zMNEGNpvNNwAql8ACLAt73D4AIUefxeAGl7VDHbD1M6EABaAK+DE2fpmMye8Ly6UTTG2CN9syLcKLSzRzi0uOM-Uso0ms0WtkV6FO0DNBukowBNvSnQ6JxRf2hQw4FUkzELYxjMyGMebScJg2slPzo0ASQgF0oADl7gANO38pCy7VvCoxRH4hiON0iKYv4tgWPKfQ6JM4Y2OM-iqjecTUjGE70vGTKPrOqYLjg76fr89wAGqvn86a3EuVbCquiBjL4Mx9vYPh6GMOhLIefE4LYzhDsiYzzKs2HavehEzsmWAAK5kGQvCUF8wL0fcjENCBtaWPpZhuuhlgdG2Ti7vKFgTOMzg+KiYzhjEUm4TqBHTkmOCKcpqk-PcDwAXIQFMTWLEIHxEzhI4YTdGiUUWR4iCOMJJ6LGYwRWCqEg6MYt6xvhU6Jk+XkqakP7-tpQohVoiANuBSzZeE-iQZ0rgJWBhiGUsxjCVlGF8bleG6rJHnFaplE0XRDGAQ6OnMdV9aqkYI76b00EOEMbVBFBhLZYsMwjgskEDa5BVEfJSklVQFUrvNqLHsEGImElQTwYYiE8TgXTEt4qJpR1OjHTJ7lFRdvA4IIBBKWgFD7DQADuZCUG8r5ltdumhc4EzzCZKx7VlqVyptUWWJMgRQXYOhRQsTnrOOJ0PnJnmgxQ4OQ2Q0NQLDBAI5QaNzc0Tgk3uth7VBGFzK1IxbSTg5WM4-aOPpkm03e+UMyNzNQDgwLKWzgi8PsABGhCCCw1C0PQAhsEULlA4VRqjSzOtHEp+sw8bQgsOUlQiNWNTTZWs1Vc0JiGf4aVDqJISRJLrEi0q16ODuEYeo9gNq8NIPeU7uuuwbHum+bdAMBUrDsLbGfAw7mva7nZBu5zBdewIVR+9IYiWIFM2VaBEbHqSe1OGS55+ptu7IT6lhmPMpg+g4UbOXTdtnUz2da87ev5ybZs0MXVvl0vlf2+da+1y79db573tCL74jt4YXeBz3tYLAY-jWHM3R47ujj+t2OAkgwjHSmPgsIqzykNKuJ9Lpn03jDCGUN4aI2eMCLMHxkaowDsBfmiVtqRhMj6bq7ZOgbSlnxRwn0bARCTt2NK6dIHH1XjAjeed4Fs2QEgygAAxV8X5Xy3AABIfBQWg3hfNg6IDukYXoHVwwmWEgsf0lN+5tlsPjSI3p2z0Lcowx2684ZEBhGw9m5AFJgEoC8P4X5kZfnTFpLBwVQImSVHYFUfEfoi13G9Ta-gKGmExCOcY+kZh6G0adRmejYGsM5pgWAsAiAwCLpbUu1tpJHxXpElhF8YaxPiTAa+rc74yAcUHUCdZgkpSSuGEc14bDLH9MTIMyJpRsXSlFMJ6snwKCIApM4bJfL+XEaBMISIOrdWyuQlYv82rSl8OiNEqd0QKI6ZnI03TemWmtLaIZelAi+G9M4MmiIdyWWyp9ZEu544OXCCsqBJdGBEDwKgCARtt6UEzDmPMhZiyYMftgiR9YqmTEgtBRw14mreJGNPAw8yOokhmGiGmOFD4MJXkQOJqAoCXV5iU5+oU6y7kWEZIcitKa9DgpZDc8wBiCynlYAaRx9j01gEk+5ZcbbjkZcygpt8yD+z+Y42sqEhI9BmCZPQwQTJJX9IiIMKpkRpSnlTHwtzGHopUFi1SHcBWlNrHWREEx7AiwVZTaUErTlKj3Kib0AR-CBFCVSI4EA4AaGKAKXV+K0qGXIaC8FwRIWsSJR6aYplPRpQdeApIPAKDurxfNPsJ4eIehJCnU80ypZomkYEQcPVuiXhyovVWQ0jgnCgbGm6zRiQAOJPYTRe5MR9HlA4ayZlvDTzCEOCNyKi06LOuW9G806wkiFiCqIYKTD+vlDYQyIsJVBG6g4Swe1VUrznGmCA-acH1msBMCVSUlhBGqaSKdg5ProkvF-dsRCV2MzXaRciYBN0AvKdYJp+6RyzHsmYSyCw3TcRHD-SMC9I301WdA3gT6ykSkqfYA9tS0SEylhGJUGi0qXiXR0ZW3aIG9oiTXBBJiYZIMg7WPc90l3EOlN4YI37NorGQraiwVhzChxvRrU+WSG6vM9iR0KnQUPeC-hqPotGpY8WsmC6hKclZsazswuuXGCMcO5lVf5oEfAUN3IEA9sUZjGBld0N0fYTDUqTqYWT1cOMGKMZzCGhGzG8fmh6AB8Ewj9jsBolYMqOibn0lHESBaQPLzwxxhTBtckJMfUFD181IJhymOiPd4QJX6aJqlM99hwypuURZ5M6y+mOeaOJHsVgTKStJLuVLIxZmJoWfYJZmpC04fCR5JgjznncdNoVmqZLgUdQWEOdskFbCHlsBPNs6EbAeg6ADJrg1cMeXVZiy63X6wjiJcSVK3oQw8TCF2S8bo9rDkpsEMbwHsM4C5feeA0W43NHsH4jE0EhxfXihmolyGp71bJAOWIsQgA */
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
              START: "running",
              UPDATE_BLOCK: "assigning",
            },

            entry: ["resetTimer", "stopTalking"],

            states: {
              Idle: {
                on: {
                  NEXT: {
                    target: "Idle",
                    cond: "nextBlockAvailable",
                    actions: "nextBlock",
                    internal: true,
                  },

                  PREVIOUS: {
                    target: "Idle",
                    cond: "previousBlockAvailable",
                    actions: "previousBlock",
                    internal: true,
                  },
                },

                description: `This is just stopped`,
              },
            },

            initial: "Idle",
            always: {
              target: "invalid block",
              cond: "isInvalid",
            },
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
                    {
                      target: "Announcing message",
                      cond: "isMessageBlock",
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

              "Announcing message": {
                invoke: {
                  src: "announceMessage",
                  onDone: {
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

          "invalid block": {
            on: {
              UPDATE_BLOCK: "assigning",
            },
          },

          assigning: {
            entry: ["updateBlock", "persistProgram"],

            always: "stopped",
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
        secondsRemaining <= 0 &&
        currentBlockIndex >= program.blocks.length,
      blockFinished: ({ program, currentBlockIndex, secondsRemaining }) =>
        !!program &&
        secondsRemaining <= 0 &&
        currentBlockIndex <= program.blocks.length,
      isTimerBlock: ({ program, currentBlockIndex }) =>
        !!program && program.blocks[currentBlockIndex].type === "timer",
      isPauseBlock: ({ program, currentBlockIndex }) =>
        !!program && program.blocks[currentBlockIndex].type === "pause",
      isMessageBlock: ({ program, currentBlockIndex }) =>
        !!program && program.blocks[currentBlockIndex].type === "message",
      previousBlockAvailable: ({ program, currentBlockIndex }) =>
        !!program && currentBlockIndex > 0,
      nextBlockAvailable: ({ program, currentBlockIndex }) =>
        !!program && currentBlockIndex < program.blocks.length - 1,
      isInvalid: ({ program }) =>
        !!program && !ProgramSchema.safeParse(program).success,
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
      updateBlock: immerAssign((context, event: UpdateBlockEvent) => {
        const { index, block } = event
        context.allPrograms[context.currentBlockIndex].blocks[index] = block
        context.program = context.allPrograms[context.currentBlockIndex]
      }),
      persistProgram: context =>
        localforage.setItem("allPrograms", context.allPrograms),
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
          else return Promise.resolve()
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
      announceMessage:
        ({ program, currentBlockIndex }) =>
        () => {
          const block = program?.blocks[currentBlockIndex]
          if (block?.type === "message") return speak(block.message)
          else return Promise.resolve()
        },
    },
  }
)

export default timerMachine
