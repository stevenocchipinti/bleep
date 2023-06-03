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
type DeleteProgramEvent = { type: "DELETE_PROGRAM"; id: string }
type AddProgramEvent = { type: "ADD_PROGRAM" }
type DuplicateProgramEvent = { type: "DUPLICATE_PROGRAM"; id: string }
type RenameProgramEvent = {
  type: "RENAME_PROGRAM"
  id: string
  name: string
}
type UpdateProgramDescriptionEvent = {
  type: "UPDATE_PROGRAM_DESCRIPTION"
  id: string
  description: string
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
  | DeleteProgramEvent
  | AddProgramEvent
  | DuplicateProgramEvent
  | RenameProgramEvent
  | UpdateProgramDescriptionEvent

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
    /** @xstate-layout N4IgpgJg5mDOIC5QBcCWBbMAnAdAGwHsBDCVAOygGIICywdyA3Aga3rU10JPKgSYIBjImloBtAAwBdSVMSgADgVipRZeSAAeiALQA2AEwBGHAFYAnHqMBmA3oDs94wA5TAGhABPXUYnmczhIGQfYhtvam9gC+UR4c2PjEpBSU2FgEuAp4IgBmGeg48VxJvPxkzMJqsrIaSipqGtoIOgAsBs44EQbW5r0t5kbOdtYe3s3d9jhtlr6W5s4O0bEgRYkkkJQAsgDyAGoAogD6AAoAStsA4qcAgps1SCB1qqi0jYimEtY45m09RvZGNoSGwtUY+FotAJGAzmJyWPSmVxGPQxOIYBLcCCQHAKdJQLBEdAAAlgYDwYEEyA2ABF9gBlfYAGX2AGEAConc5XW73RTKZ6vB5NHTWPw4ZHmCSmawI0wGaVGMEIZEGHB6PQ9PT9CEDJyolbo4rrCA4vEE4mk8mU7GwZAEBQKDZ0tnXU5s3mPfkNIXvMWGRxSnotOGmPRK5zWL4SFoSewtOXWUyAxz61aY7G4gj4wkkskUqkm232x0QSgAVWO1OubKOACFGdsWQBpD1Pb2gYXI0zi7rqoHq+WWJVtVUGAzxlquPSWWzmVOGtZYk2Z7MWvPWwt2h0bVtel7qH3jIzdiES0Jj5zOIzzJUObs9MeRdV+WXzziLjNmnOW-M2rclnAAEkIHJSgADl9gADXdaRaj3QUO0QBFJlPGVLycBEJDDLx3hhb4IXjGFzB6Pw52WNMkk-LNzVzK0CxwIttxNYDQLOfZdkA7YyzpXd6n3N4EGsSccCE5xzDHbpozjbCxjlfwfghOTiMlXo3wxSjly-Nc6L-YtsRYsBKGualqUOetGxbWCHjbfjD0jEw5QkixQxhKVb2sBzIg+cxQ2BVTyIXdNNOo7913oxiAIMyhaWZGszIbZteIFA9EIQUI9BEzVSLHewfncHCEA1TyIj8XzrzItF3yC00Qu039Nz05iQMMnYDniiykvbLRcJMIMI1ysTnBaIT3OK7yyv8yr1ONGrV1o+qcCwABXMgyF4Shjmubj9k62zUqMGwTHHIIipncSlQBExp3lSJ7DEuwUwCqqNNmmifw3RaVrWlJTnpfYYLkaz4JS7rCsBKYSOI6UNWsS9w0jHBo1jQjE2TJYpqNJdXtCnSTWW1b1og6DdoQ0GRV6cVJ1COVk1h8wlV8aNvjHYa5Wcw61Mxqi5ve+j8e+qg2I4rieKsvk+NJ4VpkRjy2clYwfMVAqDq1RHelhIa-GPZxOY-YKebC7F+fWkmQaaf5-DsXwkz8GMrHysYhkhWGitCLCsIMXXqpXN7Dbxr7eBwQQCBWtAKCJGgAHcyEoNlAMSsXPQls3EAOgxJgRZxLpdy94wZiRY3FWH5RaQFJUBUwvZen2cYW42KCDkOyDDqAI4IaPKFNgTctHWM9GjK3J1hhmbEmeVXFhOwfPaKuZpruqPvrqAcGuVam8EXgiQAI0IQQWGoWh6AENhCkC6utPmxeA4b1eyHXzed6EFgygqER92qRObMlxB4wkRGkwOgXLCMpgwM3aF8OwVgC7tAGOJSuT1ppY3npfPm19l633vuHR+e8D50AYOUVg7Az5zwvrzI2aCV5rxWhvLBu9n4CEqO-aQYgjCA3FslASw1VSGFgQRG2uUGawz-lhPQV4FI9FsC0WeSDSF+0+gTG+VCyA0Nbtg-eNA8HHyIc9EhtUUHkIUegpRKjt50JfkIN+4hmEGDYUnDhh42iQmjJGcIk4s5xgZqYeM4poR9FjOOSMOsEFc31r7XG8iBaULvtQzewdQ5RxjsyYyhw44J1sV-FOyp-hfG1BGZEx4fKl08f8MwhhRHp0wlI4JetsYL1QYYqJmDW5xObgkygAAxQCYFAJ0gABKHCSaZLpXdDywm7OOD40DES+ARGAwwIkvFePlsMeBGManILIf7Bp1xI5EGeOHYOzdyBLUMiybYYE45gTLDtT+wMBLyj-hbX4uUClSgMGAnoap2jAjaMiURgxpHczCXXChGCYnh0wLAWARAYC4KPgQk+FFdEG3CUvRp4LW6QuhTAcxjCrEyFucnThkw+jQgkGJWw05EQjwRGYdWMpQz2FFCiap3tZHhIUEQJapJSy-QZADOCRLDyMz-tKS8rghpT0nLeOwXyK6+EBFqNogLQm1w+py7lToXRuhGftHKnQIiRGBIMYI0qCqXTVHA2691Fgqtqfok0TAiB4FQBAUxT9yyVmrHWBKll0l3MPDoJZzNJxah+P3AE9MCpeIcpOdo9hFj9GBHajZciiBQtQFAAWndCX2NSiKBNZgbBPn7kMA6-wlReK+ANUuvQrwKpTeyha6aVBZpNqwwVeaybpw6LCawTLFnzEBAsStsJEa2wHYEcl3QVWUAZMydknJLg3DuLmrqTRQg4DHPMLCYk7pKodj4SIiMFgxjsEmYIiZ0YGnfHfIk89YBwvwcwRFC470PtxZYsgH9-VCvzaXcZ45HCRFhtCUMSodDXmrQ4KU91yUtAcI2vRd9kAOpzb+rtwoXJF0RImQek5QTKyzmqGMF75iw1LtYWdMV-pHDOMunka69qgwiBlQYk7+1LJGgVSDTNbBeIjDGJlThPasvPnozZ0UKyMnjt6pd3JV0YfXe8RwaogiBCznTQI7zlZJk6MNd2MJEQIeIkhlF9VKC-TArcOjXIV26tBkNbswCs69B+cEGSqc9NxmZUEHyQ1pxUbE8aIyJl5P2aY9-ZUxr8Jamkh8LxEQIO+GdiXfunxBgWATWZ4FG5PVVjivRhThxaR0hZKcQCxw47nIc+bclkwAQymCLMQIFbdMmB84Z-zJmgvLDvlieADwiiduU80QLIbT3htjNeCDLjKb8Y8gmhw-bpG8BG8x4UhgvhLIeQE6c50eMTJI5I4wFT05BBVetqL+hvHiVDdqCNM2Cqqj8FKdUTgAvHRZWstlEm-ZXcyUGsdd3JsIem1GsY7QTAKVZvZT4EJr1IpkX98JEVIAA4EuDce-abCwjJXdEYBUZT+AIiZw1FgZQ5bVeFf8+lmoY8PPM7HjW8fBDupW0UUxgjzCsJKOUrgqd1IMQLBn+aOhJizlS4wQ8tTOCVLAtUxdrxOEUtKQXDqImBxaS3Nu0dReg0sCeccy3Dew0cCPdo3xYMAnToMA6iPiHI-M1fbZxiH50P100D4JgQjPn6FeYEWER7Hit4iOSkYpSTnV5szXijonKNiU3ZACTPeIGIlddUgR5jBksOnQR8zPhh+PBqLOQSfvied-UyJOy9k68OWHE5qeEBjgykmOSQ1QiDC1Ie5U-bxfvahpqFbwWne5ar4HMFCeIVwGxWAJvnzJzQlFMGJEGoe-Hg8p0dCp2PLRi8dHuRGqeVN-LZMZG93gxeNjDKjKhhAQxgjAJyaN7EFAup9iJ1Lq3VqKbyKIaUxWZYRkZi4R0Cp3si1gERNJQ0ID9wkW1M0RcgY-0yZKMDVxI-lpR5ZjwlRYZuwVc5Q4x7cYRgx1cUMHVf9QwMpy4Yw-AhgIgbwCoxI6UpQvEYxypM9dZ30tJBt2FRtINiMlU04PhLw5IIMjstQTtoQE1ztRMYggA */
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

              DUPLICATE_PROGRAM: {
                target: "program selected",
                internal: true,
                description: `TODO`,
              },

              RENAME_PROGRAM: {
                target: "program selected",
                description: `TODO`,
                internal: true,
              },

              UPDATE_PROGRAM_DESCRIPTION: {
                target: "program selected",
                internal: true,
                description: `TODO`,
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

          DELETE_PROGRAM: {
            target: "loaded",
            internal: true,
            description: `TODO`,
          },

          ADD_PROGRAM: {
            target: "loaded",
            internal: true,
            description: `TODO`,
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
