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
type DeleteProgramEvent = { type: "DELETE_PROGRAM" }
type NewProgramEvent = { type: "NEW_PROGRAM" }
type DuplicateProgramEvent = { type: "DUPLICATE_PROGRAM" }
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
  | NewProgramEvent
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
    /** @xstate-layout N4IgpgJg5mDOIC5QBcCWBbMAnAdAGwHsBDCVAOygGIICywdyA3Aga3rU10JPKgSYIBjImloBtAAwBdSVMSgADgVipRZeSAAeiALQA2AEwBGHAFYAnHqMBmA3oDs94wA5TAGhABPXUYnmczhIGQfYhtvam9gC+UR4c2PjEpBSU2FgEuAp4IgBmGeg48VxJvPxkzMJqsrIaSipqGtoIOgAsBs44EQbW5r0t5kbOdtYe3s3d9jhtlr6W5s4O0bEgRYkkkJQAsgDyAGoAogD6AAoAStsA4qcAgps1SCB1qqi0jYjm7TgGkS1D1qbOfr2UY+FqmHASQyWMESCS-YKmGJxDAJbgQDYAZX2ABl9gBhAAqJ3OV1u90UymerweTSM5gkXwkdIkziMTnsehathBzSMkQhCxaQT0piMwX+S2RnDW6IglAAcvsAOrEy43O7SWqUho0xCc8F6QJG0xw0LmYFeHzWEwAzlw6z2LmzAxIlYo4rrCA4BTpKBYIjoAAEsDAeDAgmQGwAIvssbjCarSRq5A8njrQE0dNY-DgjHp6aZrCLTN9rTy8wYcHo9D1OeYWv02S7lqs0ZBvb7-UGQ2GI9GAKrHbEASTx1wJRzOarJmtT2pe6l1CAM9g6EQcpha9iLK-6enLfK+zl6ouc9kG29draS7Z9BD9AeDofDkblp328tuk5J6vJj3n1IZogkQdOaK5OHCdbOCMloIHyJiOtmehBOYAItPmehXu6Mq3p2j49i+GyDlG47ftOmyHDGGJ4qcw7HASw7bPKf5pgubwIEMJgOO0TrIYMK7lqKnRcpCKFoRhWHSm2Xp3g+3bPn2coxriE6Jr+s4UvUbFLkY-EQqhzhDKErIms45bWhCPSoRK3xgi0kmojeMl4fJvavjgsDIAQCgKJiBLXKcBIsQBi5AQgJr+IYjgSIW9ZOKh+6wdB1gQkKjolv8RhbpKbpSU5Hb3l2T5ue2nneb5crEaRhwAELYtseIANLBVpgFaD4Iq5t01ZtJChgWIlYxtJWBgGHZrgYbY5gOR6soFXJxWEV6ZU+RsLVUqF7XjIeDZ5uaQTtKy8w8huOA9KNkTVn4xYzThzmFfhCnuStFU4MOEBhgq+wABpBRp-6tZtTQipMu1FoZTgipCPIlv49YNrD5g9H400tth0nzUVBGKR5XmrV672fWc+y7Ix-YYut6ZbdYvxnb8HyjdmW7oTDBhww2YJs0j9K9LdGOyVjT2lXjr2E2AlDXFGUa1fVTWU9pYXWBZJajd8CVszFJ3K5EEWmHxvNo3lnqY49JXLSL7Zi5Qyn7KpdUNc1-2sW1TShHoZ21ijo32PW7iwTWNo634etMgbUqOcbAum0tuPlZbH3izsBwyw78su8BxhnfW0E+8egI01rgcRMH+uo+Hs24Q9rkx1gACuZBkLwlDHNc5P7GnQOILpFljcK1qWOdPLnlxHymJEq4fIsfP5VH1c43XDdN++WJ-SmmkbexVgtFMyNI4WNbWIZPLJalEjpd0orZdPkcuYt8-143KSKr9HfsVmvS5r8oQlll27HuWsJt4My5CWCwoprTXzmrPO+7kF6PyoMTUm2xyavyXK0Nmlk+RqyCHSUUB5OT6V6KuIUAwASQMrgtbGsCH5N1QWFNk-g7C+FFH4IUVg-ZjCGNvQ+AdQiiUMOQ+6lChZejgbwHAggCD1zQBQQMNAADuZBKAMTlk7EK7FdIrirACYePDDJggAWfXMh9bJZXpFlREhsI5QNvlQ9sYiKASKkWQGRUA5EEEUZQOhW0fYjTPshNoW9oJmVgt3SY3xXBgXzCWZwgiTZz2oYvRx1wG7OMELwQMAAjQgggWDUFoPQAQbBCjoxnrYkROAHFQBwCksgaSMnZKECwMoFQRALmqGowG7EYQQlFLpWEkIixbnLO0FKdgrCwnaAMUecToF2NETQ5JqT67pNkY03J+S6AMHKKwdgpSb5VxgfYxZ1Tan1LWTk5pAhKjtOkGIIwa8AYbyXFySsUI6QcxYT7cygQITViOg2Hoth7JWIrkIwWZtKknJqcssgqy3HrLyTQLZRS9lGxsYc+ZUKkmnNhfCrJlyWlCDaeIO5BhHnO07ggNo297RK13BDR0gkwS5jFH0M+Y0laxNBXdeJRyFk4phXUlZGTJHSIUUo3EktDgqMdhS9ROk2QpX6L8a07DUItCMIJNkZhDCGhXFDEF5deVzIqVUoV5y3FipcRKygAAxYc8phwYgABKHCldLR13imjmnBGNE0kyAS+BFCMwwZ1NybnpKNGsljjX83KZC811x5FEGeLIyRLjyC13FniJiDF5T9nbp055YVvgMgYW0B0pCCwGBGT0Ks7QmRtDzIaQYsyE012hWckVsjMCwFgEQGAmzCk7OKdeA5wjE1drxRkvtA6YBEpuaSmQxaqZNC3DgPoYoWRIzsAZfB4ILC9CLHrbckJ22YoqQoIgtcQxvljLbb1XcBlmEPoZNCe7fgnTsA2ixvgsqcjaBeydMdr23r8gFVeWouk6W9p0CIkQmT8ThCEsYw8qyj3HseOwjhgMQpjkwIgeBUAQAJU0ygVU7ayzldBktW0dCRs3WNQU9ZkLnnMDDTVZh4RnkWP0JkeHo44yIP21AUB4FeNXQrejDp3bgMushTiukLRjE3ClXOmreisn-YJhJ7YRMqHE7Qh5tG126BXKBbc24I3zCygsGG5oISsOs4EFk3RdOBjqcgflkn5UwbCgxsNNgAT-CYQ2QE5YzxViFKKNmwTNXWFunUwMs9YDDu2cwMd2FkupcXSSsgHS-N0czJqv1Y1HCREPmKPWPIdB0nUw4GK2GWToSWMsOp6J4APCKKZ6TmZ8wpQ+L8Os6Ez50lq0rFKWVbCHzPjumsmEeVol4L19OzRDApUjWWzl+YPi1f9dF4FxgDUriCII1bVL9AsqGyx0b7GeSVj8DFNCOiVw0yNblaxFD8OKQu2-CwkwbsjbY+N2C7QTDw3QjudkFgPNYpepAP7Olt4RIdDYc027VwwTGEWfwHMwSoW-mCRLS2ymXshQjgmCckdhTDaj88PRzzBFXDDbMUxgjzCsDW1wcOzUnJp-Rjop4OSoWMKqzkqH3h0irIfGbjoz6rmbHGsnIH76Cuta49xiiBc+s6jShwtZCxnhU13MUoEmtM-PNpnK46MWq8SfAi1PaEWXJ18BJkEIDUBNs0yaGoTdLggLK4NmSsYq-F51OwV3a4WiuccgCVbuEBIy4v8vwgIfZRXMmGiQ-xXB8hrGeblyuJ0-Yd+I5NqbNcZpkdmxP0azBYPmFuJkgoOFdwdEL6sPt-i1gdBHztUeZ29rgPOsAif62-DFEzVcooY2CQsquM8x3rRwk3P3nGYG72J90jqs+4XAMRDSt+92hgspCmgpuY8ZdPtgr5ViwjxHSOIsT1mQEUwQH7UQkMez-sHAN8GU4BrODOvu5AZmJvAi-glvBh8C2rFDgm3ggIfOCE4JzI6MpmzFuB5l5vyi-nrO7OYkKGniuBYJLhxP4BYM9g2KHJYIaElgQCli5F1uvGZryFFoBpoqZMHhxrBDoAdpyEdmKByKds2DEEAA */
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
                actions: ["duplicateProgram", "persistAllPrograms"],
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

              DELETE_PROGRAM: {
                target: "program selected",
                internal: true,
                actions: ["deleteProgram", "persistAllPrograms"],
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

          NEW_PROGRAM: {
            target: "loaded",
            internal: true,
            actions: ["newProgram", "persistAllPrograms"],
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
      newProgram: immerAssign(context => {
        context.allPrograms.push(
          ProgramSchema.parse({
            name: "Untitled program",
            description: "A new program",
            blocks: [
              {
                type: "message",
                name: "Welcome",
                message: "Welcome to your new Bleep program!",
              },
            ],
          })
        )
      }),
      deleteProgram: immerAssign(context => {
        context.allPrograms = context.allPrograms.filter(
          program => program.id !== context.selectedProgramId
        )
        context.selectedProgramId = null
      }),
      moveProgram: immerAssign(
        ({ allPrograms }, { fromIndex, toIndex }: MoveProgramEvent) => {
          allPrograms.splice(toIndex, 0, allPrograms.splice(fromIndex, 1)[0])
        }
      ),
      duplicateProgram: immerAssign(context => {
        const { program } = currentProgramFrom(context)
        if (!program) return
        const newProgram = ProgramSchema.parse({
          ...program,
          id: undefined,
          name: `Copy of ${program.name}`,
          blocks: [...program.blocks.map(b => ({ ...b, id: undefined }))],
        })
        context.allPrograms.push(newProgram)
        context.selectedProgramId = newProgram.id
      }),
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
