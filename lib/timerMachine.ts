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
type AddBlockEvent = { type: "ADD_BLOCK" }
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
  | AddBlockEvent
  | UpdateBlockEvent
  | ReorderProgramsEvent

type Context = {
  allPrograms: Program[]
  selectedProgramIndex: number | null
  currentBlockIndex: number
  secondsRemaining: number
  leadSecondsRemaining: number
}

export interface CurrentProgram {
  program: Program | null
  blocks: Block[]
  currentBlockIndex: number
  secondsRemaining: number
  leadSecondsRemaining: number
}
export const currentProgramFrom = (context: Context): CurrentProgram => {
  const {
    allPrograms,
    selectedProgramIndex,
    currentBlockIndex,
    secondsRemaining,
    leadSecondsRemaining,
  } = context
  const program =
    typeof selectedProgramIndex === "number"
      ? allPrograms[selectedProgramIndex]
      : null
  const blocks = program ? program.blocks : []
  return {
    program,
    blocks,
    currentBlockIndex,
    secondsRemaining,
    leadSecondsRemaining,
  }
}

const timerMachine = createMachine(
  {
    /** @xstate-layout N4IgpgJg5mDOIC5QBcCWBbMAnAdAGwHsBDCVAOygGIICywdyA3Aga3rU10JPKgSYIBjImloBtAAwBdSVMSgADgVipRZeSAAeiAGwBmHACYALPoCcOgIw6JAVj1mAHDoA0IAJ6JDO2zmPGJS2NDCUdDe2M9WwBfaLcObHxiUgpKbCwCXAU8EQAzTPQcBK5k3n4yZmE1WVkNJRU1DW0EE18wxz0JCT09R0jbSz03TwRLCWMcHy7bSMNLQ0MAdkXHWPiMRIUMqCwidAACMgJkfdgwPDBBZEhKAGUAUQAZe4BhABUAfQAFACUAeQA4j8AIIAWVqSBA9VUqFoTUQtl8xj6iwkiz0OhWPXGw0QxlRfjRxjMEgWXV6QTWIGKOC2BB2e1O50u1wgdyer0+v0BIPB0jqyhhcMhzWxfmsGMGi30wUWuIQ+IkhMWxNJIW6YSpNLpDIOZwuV0gOFgyAICgUN1ub2BPzeEMUgsaIoRPhwg0siJJEjMvXR8rG-hwPWWcwxekMekWWo2WW2uz1zMNEGNpvNNwAql8ACLAt73D4AIUefxeAGl7VDHbD1M6EABaAK+DE2fpmMye8Ly6UTTG2CN9syLcKLSzRzi0uOM-Uso0ms0WtkV6FO0DNBukowBNvSnQ6JxRf2hQw4FUkzELYxjMyGMebScJg2slPzo0ASQgF0oADl7gANO38pCy7VvCLTdEGJKOB6Q6mIEMzyo4thmDgdj+NKdiWI4PpRnE1IxhO9Lxkyj6zqmC44O+n6-PcABqr5-OmtxLlWwqrog8zIfM4ZQb0+IBrYh5zJMlgibue4Rvot6xoRU6Jk+WAAK5kGQvCUF8wKMfczENCBtYiZYnHjJeHRtk4u7yhYEzjM4PiomM4YxLh2r3sRM7JopymqT89wPABchASxNZsQgOgmEYtiOGE3RopF5keIgiGOCeixmMEVgqhIOjGFJBG6q5SY4B5KmpD+-7aUKQVaIgDZREY3bhP4hgdJl-rhshSzGBFmX+KYN5OfhOpEdOBVFap1F0QxTGAQ6OmsVV9aqnV+m9N09g+v6yJKgEWWLDMI4LE1OWDbJJHuUpxVUOVK7zaix7BBiJiIUESGGAheiWCh4zXpi3rBBYR0ucN8nnbwOCCAQSloBQ+w0AA7mQlBvK+ZZXbpwXOBM8yYSsu2ZSlcrxaMkUfTYmHTDokULI56zjsdD5uYVIMUGDENkFDUAwwQ8OUKjc3NE4JPtrtjhGcE1gbVBOCDlYzj9lBmEAzJ9MjUzUA4MCyms4IvD7AARoQggsNQtD0AIbBFANgNyUao3MxrRxKdr0P60ILDlJUIjVjU02VrNlXNCYyH+KlQ4wSEkSuIT0FKtejg7hGHoPYreVAzbqvq5rjs6y7hvG3QDAVKw7CW0r+XA55duZ2QTscznbsCFUXvSGIlj+TNFWgRGx6krtThkuefpR2JUvvWY8ymD6Dg4TTd6l6nZ0V2r9ta9nBtGzQ+dm8XtNW6djOLxnDvV6vrvu0InviM3hht77He1gsBj+NYczdLju6OP63ZS6LEcUz4fUz2kina2C8LqHxXtDcGkM4YI2eMCLMHwkYox9sBPmCURZBhHFhPQnV2ydCGEPJqKEbARDjt2VKychogP3mA5eWdIGs2QDAygAAxV8X5Xy3AABIfDgQg9hvN-aIFukYXohgfRzESgsf0FNu5tlsHjSI3p2yUJOgzW2S9YZEBhAwtm5AFJgEoC8P4X4kZfnTFpFBgVQJkxQrYFUoVvC7XjhtZEfhdzLADCJGYehVHK3LrQquNd9iYFgLAIgMA86m0LubZyc9qEaPAfQjmoTwkwDPo3S+MgrF+1AnWbxyVELhhHN9NEBMRiYUljguOVhULeEin4suRoFBEAUmcNk3lfKCNAmEJE4jOpZVCnHSKXZXTojRIndEEUAF4R3vEveLS2mWmtLabpek4IoTMoERC9i4ojEsihZEu57GBG6OERp88C6MCIHgVAEA9Zr0oJmHMeZCzFmQTfVBQj6wrGQruMY3huozGJBZHBRgKbjF2gZFUBkLnUKIGE1AUALo8xyXfYKdYbAGCCD3TCnp8SvUJteY8u5+k+EQksPcOUjj7DprAKJVyi4W3HDSulGSL5kG9p86xtZww6BwPYKIxkcGSMQv6REmD-BYUvE4MIPg4V7wRSoZFqkW7ctybWBsFhJj2LMpYFK6pLAWV2kYSR6IPGhXRAqhmc40zJkooY+BCCiwlnLGi66a5QqTA6O9ROAwDqRwqdMHAIsRabUjFBfEsRcJHAgHADQxQBQaoxZFXw-zSQ2CysCswn83QKNQnxeYKwdA5W4CkKASb0XzT7CeX1SFSTvVPB-KOaJRGBEHF1bol5sr9TmXlI4Jx56Vo9XiZCqU8HKL3JiPo8oHBWVMt4MeYQhy+N7bPYBp1h1o3mnWDoixJi1MBVm4O8orAfQLUcqZMFrUFVtQuLdaD6wSj8ELSKKokJbkDboJwArgVIRSu6QIN6nx3rfB+MAD7vn5I9C++xb7cFbnKQlJCAr3pdHRA-IWwG06L0g3k59ywilLAMoC5Y-o5j7p9IiUIEVQr7mw6A0GUC9HQxgXh2s4lxQpXsNKbwf1P7OEJMSf55hA4MZoaDOhx9nZr3Y8FToW1AWRg1H0HNUd3pWSwqQhOIlVhrqAVQveiSpPBOY0wrmlUvmgXJQewIxGYrAvFeBD0F55gRQceJ4zWidEc3Bixgxcn5owfbH3fsqFOgrHFR0TcIkw7OBVJ59OJmdapIiRBgKyb5pNSDlMdE1Twg4OMP6OOyE0SCofvq2R4nFntMC80MYQQD26bFhmrKozfDjJHDxqImp9O5UMwzJgNy7kPNdnV6qVg-meg4oEfQ8xDzLFQ5iH0eNwh2HE0qpFF1xv1h8AYewoRTI9RCGpkY0oPojgU1YYk15IzUoILS+88AMtVuaPYJKEdVpDi6KYL9oxW0RnbTxskA5o3RCAA */
    id: "timer",

    initial: "loading",

    schema: {
      context: {} as Context,
      events: {} as Events,
    },

    context: {
      allPrograms: [],
      selectedProgramIndex: null,
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

                  ADD_BLOCK: {
                    target: "Idle",
                    actions: ["addBlock", "persistProgram"],
                    internal: true,
                  },
                },

                description: `Stopped, but valid and ready to start`,
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

            always: [
              {
                target: "invalid block",
                cond: "isInvalid",
              },
              "stopped",
            ],
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
      timerFinished: (context): boolean => {
        const { program, blocks, secondsRemaining, currentBlockIndex } =
          currentProgramFrom(context)
        return (
          !!program &&
          secondsRemaining <= 0 &&
          currentBlockIndex >= blocks.length
        )
      },
      blockFinished: context => {
        const { program, blocks, currentBlockIndex, secondsRemaining } =
          currentProgramFrom(context)
        return (
          !!program &&
          secondsRemaining <= 0 &&
          currentBlockIndex <= blocks.length
        )
      },
      isTimerBlock: context => {
        const { program, blocks, currentBlockIndex } =
          currentProgramFrom(context)
        return !!program && blocks[currentBlockIndex].type === "timer"
      },
      isPauseBlock: context => {
        const { program, blocks, currentBlockIndex } =
          currentProgramFrom(context)
        return !!program && blocks[currentBlockIndex].type === "pause"
      },
      isMessageBlock: context => {
        const { program, blocks, currentBlockIndex } =
          currentProgramFrom(context)
        return !!program && blocks[currentBlockIndex].type === "message"
      },
      previousBlockAvailable: context => {
        const { program, blocks, currentBlockIndex } =
          currentProgramFrom(context)
        return !!program && blocks.length > 0 && currentBlockIndex > 0
      },
      nextBlockAvailable: context => {
        const { program, blocks, currentBlockIndex } =
          currentProgramFrom(context)
        return !!program && currentBlockIndex < blocks.length - 1
      },
      isInvalid: context => {
        const { program } = currentProgramFrom(context)
        return !!program && !ProgramSchema.safeParse(program).success
      },
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
        secondsRemaining: context => {
          const { blocks, currentBlockIndex } = currentProgramFrom(context)
          const block = blocks[currentBlockIndex + 1]
          return block?.type === "timer" ? block.seconds : 0
        },
      }),
      previousBlock: assign({
        currentBlockIndex: ({ currentBlockIndex }) => currentBlockIndex - 1,
        secondsRemaining: context => {
          const { blocks, currentBlockIndex } = currentProgramFrom(context)
          const block = blocks[currentBlockIndex - 1]
          return block?.type === "timer" ? block.seconds : 0
        },
      }),
      resetTimer: assign({
        leadSecondsRemaining: 3,
        currentBlockIndex: 0,
        secondsRemaining: context => {
          const { blocks } = currentProgramFrom(context)
          const block = blocks[0]
          return block?.type === "timer" ? block.seconds : 0
        },
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
      updateBlock: immerAssign((context, event: UpdateBlockEvent) => {
        const { index, block } = event
        context.allPrograms[context.currentBlockIndex].blocks[index] = block
      }),
      addBlock: immerAssign(context => {
        context.allPrograms[context.currentBlockIndex].blocks.push({
          type: "message",
          name: "Untitled block",
          message: "A new block",
        })
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
      announceBlock: context => () => {
        const { blocks, currentBlockIndex } = currentProgramFrom(context)
        const block = blocks[currentBlockIndex]
        if (block?.type === "timer")
          return speak(`${block.name} for ${block.seconds} seconds`)
        else if (block?.type === "pause" && block?.reps && block.reps > 0)
          return speak(`${block.name} for ${block.reps} reps`)
        else if (block?.type === "pause") return speak(block.name)
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
      announceMessage: context => () => {
        const { blocks, currentBlockIndex } = currentProgramFrom(context)
        const block = blocks[currentBlockIndex]
        if (block?.type === "message") return speak(block.message)
        else return Promise.resolve()
      },
    },
  }
)

export default timerMachine
