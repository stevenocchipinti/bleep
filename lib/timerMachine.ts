import { createMachine, assign } from "xstate"
import { assign as immerAssign } from "@xstate/immer"
import localforage from "localforage"

import defaultData from "./defaultData"
import { BlockSchema, ProgramSchema } from "./types"
import { Block, Program } from "./types"
import { playTone, speak } from "./audio"

type LoadedEvent = { type: "LOADED"; data: Program[] }
type StartEvent = { type: "START" }
type ResetEvent = { type: "RESET" }
type PauesEvent = { type: "PAUSE" }
type TickEvent = { type: "TICK" }
type LeadTickEvent = { type: "LEAD_TICK" }
type FinishLeadIn = { type: "FINISH_LEAD_IN" }
type SelectProgramEvent = { type: "SELECT_PROGRAM"; id: string }
type ContinueEvent = { type: "CONTINUE" }
type NextEvent = { type: "NEXT" }
type PreviousEvent = { type: "PREVIOUS" }
type AddBlockEvent = { type: "ADD_BLOCK" }
type DeleteBlockEvent = { type: "DELETE_BLOCK"; index: number }
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
  | DeleteBlockEvent
  | UpdateBlockEvent
  | ReorderProgramsEvent

type Context = {
  allPrograms: Program[]
  selectedProgramId: string | null
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
    selectedProgramId,
    currentBlockIndex,
    secondsRemaining,
    leadSecondsRemaining,
  } = context
  const program = allPrograms.find(p => p.id === selectedProgramId) || null
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
    /** @xstate-layout N4IgpgJg5mDOIC5QBcCWBbMAnAdAGwHsBDCVAOygGIICywdyA3Aga3rU10JPKgSYIBjImloBtAAwBdSVMSgADgVipRZeSAAeiAGwBmHACYALPoCcOgIw6JAVj1mAHDoA0IAJ6JDO2zmPGJS2NDCUdDe2M9WwBfaLcObHxiUgpKbCwCXAU8EQAzTPQcBK5k3n4yZmE1WVkNJRU1DW0EE18wxz0JCT09R0jbSz03TwRLCWMcHy7bSMNLQ0MAdkXHWPiMRIUMqCwidAACMgJkfdgwPDBBZEhKAGUAUQAZe4BhABUAfQAFACUAeQA4j8AIIAWVqSBA9VUqFoTUQtl8xj6iwkiz0OhWPXGw0QxlRfjRxjMEgWXV6QTWIGKOC2BB2e1O50u1wgdyer0+v0BIPB0jqyhhcMhzWxfmsGMGi30wUWuIQ+IkhMWxNJIW6YSpNLpDIOZwuV0gOFgyAICgUN1ub2BPzeEMUgsaIsQK0MOEWITMIUMekGaKGHkQYzMZj8fR6+kMjlsHsMWo2WW2uz1zMNEGNpvNNwAql8ACLAt73D4AIUefxeAGl7VDHbD1M6EABaAK+DE2fohxFe2zy6UTTG2H1DswemOWeOcWlJxn6llGk1mi1smvQp2gZot0lGAIh6U6HROKLysZhd2qzELYzBuNxakJ6f05NMg2sjNLo0ASQgF0oADl7gADTtflITXet4VGWxQy6KxelsDp0Q9Rx5WjGCZnxGwBkcMwHEnTYZxTV8F0zZccG-X9fnuAA1T8-mzW5VzrYUNzxQIcGsaU+hmXpFhDVDoJwOx-GlOxLBwvC721QiX3ndNFyzdMKLAShgTzPNS3LKsmIaCDG0sQS9xVJx8XCeZ5QsSwcFscZnDQ3DFkpKSHx1Z85zTd9FPIn8VLzDki00itq1Ah1dJYrRED0SIjBDSxHMiLpxgDEZLOs2yVR9FUUXwxMn1nVM3ywABXMgyF4SgvmBBj7h0oUG1Y0YJCcIwbDMMZIjaroUMDBBUoPQILDReZHGsHLH11WSPOK0ryp+e4HhAuQwOY+qIoQDpfDivQVV6aMrEiE9xh0SZHFJMJ-H0MI9DG1z8uI9NprK1IAOA2r1zWlsoiMftwn8KNOlcHrBkMUMlmMBCJB0fxTFvdYp1uoi5JwR7yqo2j6MYkLazC1bN1Vb7LEJ3punsXCT2RJUAihxYZkchYoxumT3MKkqnqoN69IaiScCcRwVVCUIOjMPsSUma8aZ6fEh2WRm8sRqbWd4HBBAIEq0AofYaAAdzISg3k-bSsfA8LmmcCZ5nElYachvi5SBxwRsmQJTrsHQHYWGJnPhpmCqNFGKGV1WyHVqBNYIHXKA5k3ECcKzDxjCHobmQGRiCR3RysZxhxG8TZYm5m-cVgPgVKoPBF4fYACNCEEFhqFoegBDYIoXJ9+7kaLqAcBLo4SvLjXq6EFhykqER6xqI2VsgkxQ38MxTI9YIkpToMYyVL0+YPH0DIxWH729uXJpZmbi9LvuK8H2v67oBgKlYdhW8PguHs77uz7IfvQ8v4eBCqcfpDEJYJaoU6rTz0G6UkNMnBkkvOiE8B5jq4UsG1Ewh4eijjzm5X2L8T5dx7mXC+Nc640Bvk3B+B987YI7rgt+vcP6EKHiPIQY9xAAMMMA7GoDGwLAMP4awcxujWwPN1VO-YebjGhu2ZwQ5MF3SRv7PB79P77BVmrbWutnhqQ+PrQ2HDja40QA7JU21xK4XBmYew3R4FRiElhKKfN+zz1kfLY+bNaEEI1qo4O6jKAADFPx-k-LcAAEh8TRGkAlRwMQgVEbofRhFwnMaMYRDDwLPE1CxNsEpdmcUfQuNDgRayIDCTxtB1ZFRUi8P4f59Z-mzDVSeONILiSVHYFUOgFiDn3KkoG-hHB+APMsdqhMeK5OftQtx+Dz4a0wLAWARAYDX0bnfZu0kn5UIUe46ZodZnzJgEwv+rCZCNK4Q1JsIz3QrHsEsZB3g0R21Tg7Ky9jpRjBmN4B2YyqEKCIEVM4bI5oLSiZBMIzyBH8wQksfiPVHJWR9JDHwNk+J8y+e3H5fzLTWltMC-SyDjrhBphbZwUUEIWRCOKEGwQXbWBRV7Ai6z25MCIHgVAEAq5EMoLmAsAUyxBRxWclYoYDxjDuVDDCwsepmJaqdKWyCVTINRUjIgczUBQDZpHE571Nw2AMEESB4luymTJW6Le88fDRiWIeRVHllUqDVeVQBeip6NhbBYSYMYnBWD4uqSwFkaZGCSeiQZHT0RjSOPsBGsAlm32YKsh84bI0HJYWQCeTqmmNnAcdewURrwdGCOJaMJ5EQ4G2n0+eyD3Y+FiHeI4EA4AaGKAKdNZyHa+GFaSGwYq54nkWBxGy3REk22sODMa3AUhQCbactaQ53S+gMiSbexkRFBjREYTocqIbdGvMYXJRwTjP0nVqvEoZ54WM6CGQ8mI+jygcBMDJXpDziSWD6a1rJD2cw+ohSYVgO2Q3Bt2nqVgrLCREp2-QvpX0kQ-BAd90dmwSj8BYlYfNzG7hXggQ8-TEQXTuY5HCe81mUPbgpMiylYPRPOQZRDMYHYqmgruB5hjBL2DGP6HhSHIM4LZuRyC5z9CXOjOAxyD77knk6dZHCCEhzzFaJxiZSsvEhzDjrHjjZDxunFme6U3hggStEc4QkxJhXmBnnJzZUz6EDyIaphqnRKZ3O2hqPoemgy+jvZJ+x29CarDpblIj8jX4WeUYp9RNm1rmu-YEG5aJoz+CLd0PtV55gIXaWZwLRSSmhxVsHcgFSwvNCoxY6Bw5hKdBWEWjoO5CaLyjJiHdvnxpYPbuZpRFddkLLAPlrwOEBlIslmECIxgTx8xghLcBi63YEcfv5jy6L-ldcaqOHmKH0S3odkNmFhM112C7HhlYE4GsIzyemJlLK2XfwW02KwQruzzBJBKcyQN7nWQxHxAGY47Bydtaq7jy1m0fR8AYSxOEQxJyan2Kw7o-SQyCCGTKYaCARsIvAP7U7mj2H6ZEHVMZ1SmHQ2MXt8LkH2FjHYEG1bohAA */
    id: "timer",

    initial: "loading",

    schema: {
      context: {} as Context,
      events: {} as Events,
    },

    context: {
      allPrograms: [],
      selectedProgramId: null,
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

                  DELETE_BLOCK: {
                    target: "Idle",
                    internal: true,
                    actions: ["deleteBlock", "persistProgram"],
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
        selectedProgramId: ({ selectedProgramId }, event: SelectProgramEvent) =>
          selectedProgramId === event.id ? null : event.id,
      }),
      assignAllPrograms: assign({
        allPrograms: (_, event: LoadedEvent) => event.data,
      }),
      updateBlock: immerAssign((context, event: UpdateBlockEvent) => {
        const { index, block } = event
        context.allPrograms[context.currentBlockIndex].blocks[index] = block
      }),
      addBlock: immerAssign(context => {
        context.allPrograms[context.currentBlockIndex].blocks.push(
          BlockSchema.parse({
            type: "message",
            name: "Untitled block",
            message: "A new block",
          })
        )
      }),
      deleteBlock: immerAssign((context, event: DeleteBlockEvent) => {
        context.allPrograms[context.currentBlockIndex].blocks.splice(
          event.index,
          1
        )
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
      saveDefaultData: () => {
        console.log("Loading default data")
        return localforage.setItem("allPrograms", defaultData)
      },
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
