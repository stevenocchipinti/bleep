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
type NewProgramEvent = { type: "NEW_PROGRAM" }
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
    /** @xstate-layout N4IgpgJg5mDOIC5QBcCWBbMAnAdAGwHsBDCVAOygGIICywdyA3Aga3rU10JPKgSYIBjImloBtAAwBdSVMSgADgVipRZeSAAeiALQA2AEwBGHAFYAnHqMBmA3oDs94wA5TAGhABPXUYnmczhIGQfYhtvam9gC+UR4c2PjEpBSU2FgEuAp4IgBmGeg48VxJvPxkzMJqsrIaSipqGtoIOgAsBs44EQbW5r0t5kbOdtYe3s3d9jhtlr6W5s4O0bEgRYkkkJQAsgDyAGoAogD6AAoAStsA4qcAgps1SCB1qqi0jYgRJi32rnoWei1fcwGUY+AEBIwGcxOSy-VxGPQxOIYBLcCAbADK+wAMvsAMIAFRO5yut3uimUz1eDyaoRwBkhgT0zihCwB7i8PkiOAkrKCvwhEmskURK2RxXWEEoABFsft8UczpcbndpLUKQ1qYhfEZ-AZTO1TM4dS1nN8WiDmhCWjg9H4FkaYb8JKYRatURsAHL7ADqRKVpNVDyeGtATX6BjMsIkttNpgh5gtOhsJkN-2sEhsjgkLRdyzdSUgOAU6SgWCI6AABLAwHgwIJkBsZZicQS-SSVXIg+qXupNc10-54eZndZfvrTNYjBb4RG9Hoev9zACBk5XWK1miIEWS2XK9Xa-XGwBVY5YgCSuOu8rbyrJj27VNDiEik1t7R59mszMCwI5CCMcadC06ZvuYhotHo5jWGunAboWxYEKW5ZVjWdYNpKpz7B6twKsSt6BuS9Q9m8CDODm3LzqavQZm00bToB9jAdGQRgWRkHQXm67uluCFIXuqGHpKJ5SleuH+pshxNripxnsc+JntsHp3sGxF9r4pqdDYhgZnaGb2PRJiMSBLHgexMEogWPE7sh+5oYWsDIAQCgKBi+LXKc+LKQ+vZPggph+DaBhZhOS7QqYegWs41jWNyLQSIx+pCkYXxLEisHcduiG7ihB7oTgDlOS5QnHCJ14AEJYtsuIANJeURj5aD4vw4BCo7-MEc56pYFptBG9I5ia4WWLY5jmeKm6ZXxOV2VuBXORsdWUj5jXjABUwtEOoT0s4DrOBaDimDgPT0pEc5+GOY1wVZWU2QJeVzUVOBnhAtaUF6AAankEfe9XLU0vyTACWk7U4ToRX++r+EubKQlBw69JdGW8dltmCfljnzVuz2vWc+y7ApR7ootIYrdYJpHSaQL0umXwQRakM4NDOawz0fijZx6WWZNKN3fZGOPdjYCUNcUpSocFVVbV30qQ1TTRSm9InWBhjDuyYzzimkT+crGYIxzFkStzt25XzhWFoL0qyuVlU1cTqm+aEehHQubP0vYS5q4gGtmFrfjhbr7NpQbE3I8bM3o2bWMvULOwHOLNtS52hFLSR+omD0JrWO737Aeaf7e6Yvs6zqgeipzhuh-xJtblgACuZBkLwlDHNchP7HbstasmdJxcMOrzkCFr2EYJiQXqL7MnYjiI1zlfTWjdcN03mGYl9Sc-SnfZWNawHw0Ko7RTtkXRbF8XM0lKUzxX1lV+Hi+NykH1r2qv0kToPSDiaoRp18X4Jn+vhsyM36kKLqcZJxXxDjfeeeV75N1xvjbYhMO5-V0NMbkk5xzDmMGBKcAD4TWjZiyOKAxDSQPgtA1GsD64PyoCgkiRh3Z0isM6WYcUrCe1IgYa0X4NahGYoYch10ppUMLHAigOBBAEHrmgCgFYaAAHcyCUHkrbaW3kGEQlfIaYeNh7RkU4YAyYei9QbX6DRXMQdxoUJurfBeNDeCSOkWQWRUB5EECUZQehfZ3Z9XiraNo28op7XwVnOkhoLCgzAu0IRRs7HUKXhI64DdnGCF4BWAARoQQQLBqC0HoAINghQuKz0obzGuDikkpPrmkuRWShAsDKBUEQPZqjqNfn2HMEhuRxhHhIfp85-j6QAe0GKdgWFBGZDqPUsS56iIqYkqAOBklkFSek+pOS8l0AYOUVg7ASnX1sTAsRlSlkrLWXU7JjSBCVFadIMQRh14y1QQgYCs5ITGjZL4d204vzdOjEyT5PRbAtFmWU6uOBxFnOqWQWpbiNm5JoNswp+zy5QKOfMyFpzlkwrhZkq5TShAtPEPcgwTyNGdO4bFaK4QTSmkYvRciI9YZxScMBL8YKMXlKxYsnFqyanpKkTIxRyicQi0OKoxOL9N6+RHp+KYS4orwgAmBDaBlJjhTsEMewTpQX62scInmEKoV8ouW4oVLiRWUAAGJng9GedEAAJQ4YqxZ2u8b5KEh1uH+X6XqI00ZDF2AjEKAa2DhiWLLsHGxIjuUmuuAoogzw5FSJceQWuQtcSKXkh6I87d2kypWnqbpjClwTFIarX8YxWr+EMIEZKxg5xGmcJy2NxrsXnIFXIzAsBYBEBgFsgpuyin5kOW2u+HbcXpJ7X2mAhLbkkpkAWkmYZJh9AFMyWwkFDTTnhIdCwvRRzhU-NGVtRrw4KCILXasGF9irw9StQB3SJw7VcGROwir9p2ECslOMNF-htDPWHNGl7r2uXcs-LsHTZVu06BESIGZBjBBNEPEeNogSF0cJPRYQH4mFiYEQPAqAID4oaZQYSol46SwfU0HQph+jAJNIuCC8UdT0w2mYE07QdWOHMUYXDxytxEF7agKAtCvHLvtitd+OqzA2FOjGYwcr2MxWzhtXoRptQCcxcJlQYmm4PPJdB6TQUOhQizqGiwRomP0yhNyPwv9DT9KGBxKxV04kVlWcgQTEmjOFto5qlqQoor6m3iaPO1aNL-FYQyL8G1XNRtwKsisldYCDp2cwEd65kupfncSsgbS-MrrQWtfqjhIhfghOFRMOpVMOGdJPHkEEljLFWWieADwijSuK80dijHWRLltMPf+Yx34n2SrYCcjC5yflSoljcvButSdo4YGK9GMNBGApBQef4dA+ptG8toWjDBbSEUtzuvXyJAiY-0Fjw2LQRj8M6Gb7QILcNPfq9zczynnZeXRuz12Bt3bY3+doJgmb70nIKAEc3R3ovHWjB6kBfsMOtP6rONgoQCm+CMP8o5-AAgBJBeDFhRzae5UjqOtYUdbz6oaDHPRh7BG+PTdMUxgjzCsJW1w5P22LJp75HQHQ4ymm3cYTO-wQljAGLWr8OC2U5no7zidvKLWuPcUogXK1LCHTaM1hcL7HC7vaIzBrTPh6adhwc+H577G8s7bC9ZVytdNH8iYEIZ1+gBt8ODatI9Dqq1cJCaKzoTTK7t7Q01XbzXOOQCKl3iAoKjybXaQEJ3fmGAwREgClFvjh4SZHhNSb1eptkRmhPCB6ROzjJDMioRBj-EMVnYXM2oIhXnFbtFMbbcF8cQ7vFM7+1gArz0KYRpujZm+HGechipudBBsYbovgBr5-glem9FeR6MO5IxG7Xx6PxS-U7QwyU4ohcpqXOH3fgN5QI0RkjCKK-vzIutIUUIz5y4WPtBwcnoxZ3pMOKOC2p9kjOCuHLpqJrQk-vFnBkCPCL8KzMYJwl+IdGyvqIxHKpCF8AJl5oJk-uFE7MOMlP0vMEFFZpFP4BYM6PRnFCXE2pdDljfB1snD1kmFFkDFVjyEHiNroPtmmNwovjqkFEEDEDEEAA */
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
