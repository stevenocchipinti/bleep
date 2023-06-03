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
type DeselectProgramEvent = { type: "DESELECT_PROGRAM" }
type ContinueEvent = { type: "CONTINUE" }
type NextEvent = { type: "NEXT" }
type PreviousEvent = { type: "PREVIOUS" }
type AddBlockEvent = { type: "ADD_BLOCK" }
type DeleteBlockEvent = { type: "DELETE_BLOCK"; index: number }
type MoveBlockEvent = {
  type: "MOVE_BLOCK"
  fromIndex: number
  toIndex: number
}
type UpdateBlockEvent = {
  type: "UPDATE_BLOCK"
  index: number
  block: Block
}
type MoveProgramEvent = {
  type: "MOVE_PROGRAM"
  fromIndex: number
  toIndex: number
}

type Events =
  | LoadedEvent
  | SelectProgramEvent
  | DeselectProgramEvent
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
  | MoveBlockEvent
  | UpdateBlockEvent
  | MoveProgramEvent

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
    /** @xstate-layout N4IgpgJg5mDOIC5QBcCWBbMAnAdAGwHsBDCVAOygGIICywdyA3Aga3rU10JPKgSYIBjImloBtAAwBdSVMSgADgVipRZeSAAeiALQA2AEwBGHAFYAnHqMBmA3oDs94wA5TAGhABPXUYnmczhIGQfYhtvam9gC+UR4c2PjEpBSU2FgEuAp4IgBmGeg48VxJvPxkzMJqsrIaSipqGtoIOgAsBs44EQbW5r0t5kbOdtYe3s3d9jhtlr6W5s4O0bEgRYkkkJQAsgDyAGoAogD6AAoAStsA4qcAgps1SCB1qqi0jYiRLThGbd0tei3WPSWPSjHwtT7OIwGcxOYGmVxGPQxOIYBLcCCQHAKdJQLBEdAAAlgYDwYEEyA2ABF9gBlfYAGX2AGEAConc5XW73RTKZ6vB5NZwdCQtewtCSmfpivTWIzmUEIREGHB6GWWfrggZOZErVHFdYQLE4vGE4mk8mY2DIAgKBQbGks66nFncx68hoC95+FUGRwSnqi6GmEFeRDOazWHAiiRi0zdUzfRw61bozHYgi4-FEklkimGq02u0QSgAVWOlOuLKOACF6dsmQBpV1PD2gJo6RGmL7dVVtCSqgwWENjH44AwGFqS1xAmXQ5N6tYYw3pzOmnMW-PW20bZvul7qT3jIxd8GImFBdqQ+YKhxdnrjyKqvx6UymeecRdp41Zs25y1boscAASQgUlKAAOX2AANF1pFqPd+TbRAX0mU9ASFJwX37BU438cxwUnaFzB6PxzHfNEki-DMTWzc08xwAtt0NECwLOfZdiA7YSxpXd6n3N4EGsFoOiE5xzHHboRWlHDoRwfDwVw4jzFI8j9SXI1qJ-dd6MYwCWLAShrkpSlDlresmzgh4W34w8IxMOMJIsYNoQlG9ZTMSJTD8YMJDlMjlhTSjl2-Nc6P-QtMX0yhqUZKtTLrRteL5A8kIQUI9BwCNLFI8d7Hw9xQwQGV7M87y9F83pVM-YLNNCv9Nwi5jQIMnYDni8yktbLR3mMTL8PDPKxOcAEWjckqIjKir-JRD9Uxq1daPqnAsAAVzIMheEoY5rm4-ZOps1KjBsEwJyCYrLHvBV7COlVxNfRwxLsJMAoXOaNIW38N2WtaNpSU5aX2WC5CshCUu6orvimEjiNMQEIyFBVw0jaNY3jRMlhmiiDXemjPvo1b1s2yCYP2xDwZ0Hp-G+ZxQjjRNrDEhVfBFOTxwBOMnOOqq3pXXHtMxAnfqoNiOK4njLJ5PiyfbaYo1lDnlOMcwEyZxFPlImFhr8Y9nG5oKca0sLDUFzbSbBpojDyscrAlWZxSsAqxiGT4GeK0J+37Aw9ex3nDaWk2KBwQQCDWtAKAJGgAHcyEoFkgMSiW3Sl83ECO30VXha6bAWIVJyZiQYy+BnBxab5lO+N8Xtm-Xfbqr6A6gIOQ7IMOoAjgho8oM2BLy5Vgnscq2isYSGdV6xJkHVwYTsZX2m99Ta8W+uft4HBrnW5vBF4AkACNCEEFhqFoegBDYQpXprkKl-xlfA-XshN+3vehBYMoKhEfdqkT6zpcQScJCjAmI6Bd+yAlFEzdokY7A2yCGJOUg555UQ+vzY2t9G730fuHZ+B8j50AYOUVg7AL4+yvnjAWaC14bzWlvLB+9X4CEqJ-aQYgjDA0lslASAJlSGAGPJScvg8pMwZgA-segrzgh6LYFoiD5p8yNt9Qmd8qFkBoW3bBh8aB4NPkQ6uJDarX3IYo9ByjVG7zoW-IQH9xDMIMGwpOHDDxtHVgCCMvphI0zFEzSUXY059BjBOeGMiDZ1xvkYyhD9qHb2DqHKOMdGRGUOHHBOdif4p0VJbSMGpwyImPMrUuXjLZmEMGI30WFpFVyxgvUhKCFFC3CZgtu0SW6xMoAAMSAuBICNIAAShx4kmQ6d3Q8MIuwTi8gXSevgXwQMMJlbx-QLwykrpjNSSC5H+wodcSORBnjh2Di3cgK0DJMm2OBOO4ESx7W-qDASg4AGW3whMAYFgJQGAgT0H0gRvjGFVJCXWFTVmyL9svMJGDInh0wLAWARAYC4JPgQs+gU9HIPkQ3ep4K26QuhTACxjDrEyGucnThkw+hQgkGJWwQJ4SqxfGYXoxEXwOGsP2IJi8yHLiICtYkxZ-p0iBvBIlh5mYANhkKVww0Z7CRvHYH0FdfDfH+G0Vl1T5EKE5dyygDonT8pBoKw6uVOgREiL5QYwQpWFSzrdQckR7CPUWMq-R7L8GMCIHgVAEAzEv1LOWSsNYEoWRSTcw8OhJR4QnAsDU5VrrykKpKeywl2gD0cAsowDqUVLSIFC1AUAhZd0JQ41KFMB5mBsI+cqQwjqWxwgCTo8xS69EhPKtN6yvqZpUDm02rCBUFvJr6DoMJx7WG8fMamw53gwijH4UUQ7Ajku6DIzVDJmRsjOJcG4dx81dQtqXQBXlgxCmZQm5wCoOyRCjBGs6CZghDoxrqD8D8CS11gHC51hDz73oII+kKsBcVWLIF-QNeryal1GRORwkQGZQmDCeuUkYk0SkeuSv4t6kVVP0Q-ZABjixDNSuPSYMogjM3Hq4PwIxCqDHw+KK98wGal2sDEZYD8MTwAeEUbtW7dBAkjOJYS-x8JRrlCeiMkZvi2FhpbVU9hx7lJWYuXg7GDrk0MJGUNdyAlAnEiesZKouFtChAPX0QQZEKd-s0f4XYeMRv4zGQT5H7LHgg0JP4EgGbj2bcCvMJm0khonZZvjzno0KnaCYPhQ67IufBCh4haH01fV0pALzAlIaT3HjYGEZLbVkbGICfwBE-gjNfAy9zITwpMWAs1RLh5Zkpeuj0a6-dj2xuZVMYI8wrDKTjK4YrWHanyd1T29sHQEw0ypcYEe-xGtjF4SqYuconAKVht1p1aKmmt3btHSrqVLAngnEy7bDNHCq3aHJBD9XrqNqi7omLLbQl1LBSop+dDNvgy8iYEIT5+iQl8thOzx4TvwlwhGCUwkls1LRfd0xq3YnPaaMREwqoxF+GGnlQw9ghGzJcwD48Moab-NkzzFVGzQXbN2Y02gYcjkw8QOODKCZcLI98hGx2qdiNFIcDDHoMpLuVLWR5wxd2THbyxTCsAVPBK5chJJUUCIllePcrammxhui+EnDJu9POgUlY5VyhL-WOPpMKTGcEEbRSShjNKjKhhvjinDFOSqALqrBJ60wV17rPUHzFxTYaUx2bnjFMXBYN4HAltAU4Fy6FQfyLbdmoWnu6OGvEoiF8JFjDM8Eq4ToYy3FHVhKKbrGGsNi-HsqCNVhHBylhhYUahVehRgczbQY2cjpVQfU+z3FGdOlyg+S1w0ItOTh01IpXBnQhewY0AA */
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
            target: "loaded",
            actions: "assignAllPrograms",
          },

          onError: "no programs",
        },
      },

      loaded: {
        states: {
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
                        actions: ["addBlock", "persistAllPrograms"],
                        internal: true,
                      },

                      DELETE_BLOCK: {
                        target: "Idle",
                        internal: true,
                        actions: ["deleteBlock", "persistAllPrograms"],
                      },

                      MOVE_BLOCK: {
                        target: "Idle",
                        internal: true,
                        actions: ["moveBlock", "persistAllPrograms"],
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
                entry: ["updateBlock", "persistAllPrograms"],

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
              DESELECT_PROGRAM: {
                target: "program not selected",
                actions: "unassignProgram",
              },
            },

            initial: "stopped",
          },

          "program not selected": {
            always: {
              target: "program selected",
              cond: "hasProgramSelected",
            },
          },
        },

        initial: "program not selected",

        on: {
          MOVE_PROGRAM: {
            target: "loaded",
            internal: true,
            actions: ["moveProgram", "persistAllPrograms"],
          },

          SELECT_PROGRAM: {
            target: "loaded",
            actions: "assignProgram",
            internal: true,
            description: `A program can be selected regardless of being currently selected or unselected`,
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
      hasProgramSelected: ({ selectedProgramId }): boolean =>
        !!selectedProgramId,
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
      // Timer actions
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

      // Program actions
      assignProgram: assign({
        selectedProgramId: (_context, { id }: SelectProgramEvent) => id,
      }),
      unassignProgram: assign({ selectedProgramId: null }),
      assignAllPrograms: assign({
        allPrograms: (_, event: LoadedEvent) => event.data,
      }),
      moveProgram: immerAssign(
        ({ allPrograms }, { fromIndex, toIndex }: MoveProgramEvent) => {
          allPrograms.splice(toIndex, 0, allPrograms.splice(fromIndex, 1)[0])
        }
      ),
      persistAllPrograms: context =>
        localforage.setItem("allPrograms", context.allPrograms),

      // Block actions
      updateBlock: immerAssign(
        (context, { index, block }: UpdateBlockEvent) => {
          currentProgramFrom(context).blocks[index] = block
        }
      ),
      addBlock: immerAssign(context => {
        currentProgramFrom(context).blocks.push(
          BlockSchema.parse({
            type: "message",
            name: "Untitled block",
            message: "A new block",
          })
        )
      }),
      deleteBlock: immerAssign((context, event: DeleteBlockEvent) => {
        currentProgramFrom(context).blocks.splice(event.index, 1)
      }),
      moveBlock: immerAssign(
        (context, { fromIndex, toIndex }: MoveBlockEvent) => {
          const program = currentProgramFrom(context)
          program.blocks.splice(
            toIndex,
            0,
            program.blocks.splice(fromIndex, 1)[0]
          )
        }
      ),
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
