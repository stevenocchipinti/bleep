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
    /** @xstate-layout N4IgpgJg5mDOIC5QBcCWBbMAnAdAGwHsBDCVAOygGIICywdyA3Aga3rU10JPKgSYIBjImloBtAAwBdSVMSgADgVipRZeSAAeiALQA2AEwBGHAFYAnHqMBmA3oDs94wA5TAGhABPXUYnmczhIGQfYhtvam9gC+UR4c2PjEpBSU2FgEuAp4IgBmGeg48VxJvPxkzMJqsrIaSipqGtoIOgAsBs44EQbW5r0t5kbOdtYe3s3d9jhtlr6W5s4O0bEgRYkkkJQAsgDyAGoAogD6AAoAStsA4qcAgps1SCB1qqi0jYjm7TgGkS1D1qbOfr2UY+FqmHASQyWMESCS-YKmGJxDAJbgQDYAZX2ABl9gBhAAqJ3OV1u90UymerweTSM5gkXwkdIkziMTnsehathBzSMkQhCxaQT0piMwX+S2RnDW6IglAAcvsAOrEy43O7SWqUho0xCc8F6QJG0xw0LmYFeHzWEwAzlw6z2LmzAxIlYo4rrCA4BTpKBYIjoAAEsDAeDAgmQGwAIvssbjCarSRq5A8njrQE0dNY-DgjHp6aZrCLTN9rTy8wYcHo9D1OeYWv02S7lqs0ZBvb7-UGQ2GI9GAKrHbEASTx1wJRzOarJmtT2pe6l1CAM9g6EQcpha9iLK-6enLfK+zl6ouc9kG29draS7Z9BD9AeDofDkblp328tuk5J6vJj3n1IZogpiGrm-xDL0sL1kMB7gu0vS2MY9hzNYzhXu6Mq3p2j49i+GyDlG47ftOmyHDGGJ4qcw7HASw7bPKf5pgubwIEMJgOO0Tp6EyQwWmMfImI62bcQY5gAi0+Z6Oh0ptl6d4Pt2z59nKMa4hOia-rOFL1MxS5GIMlZ+ACvEsnyLLltaEI9GJErfGCLTSaiN5ydhim9q+OCwMgBAKAomIEtcpwEoxAGLkBCAmv4hiOBIhb1k4Yn7parHWNYEJCo6Jb-EYW6Sm6MnOR295dk+7ntl5Pl+XKBFEYcABC2LbHiADSIU6YBWg+CKubdNWbSQoYFhJWMbSVgYBj2a4km2OYjkerKRUKaVeFehVvkbG1VJhZ14yHg2ebmkE7SsvMPIbjgPTjZE1Z+MWc2YS5xU4UpHlrVVODDhAYYKvsAAawVaf+7XbU0IqTPtRbOGedgmsNwGiTg9YNiWCH0r092yYtJW4cpnneetXqfd9Zz7LsdH9him3pjt1i-BdvwfON2ZbhJPIo4jDZgqJ5g9H4s0thhmPydjL3lfj71E2AlDXFGUb1Y1LVU7p4WpTa41XYlomxWdlmmJEkUgUy6MCwVnpY89ZWreL7aS5Qqn7OpDVNa1gNMR1TShHoF21nz43IWCOs2vrRncXS-NSk5ZvCxbK145VNtfVLOwHPLztK+78MmD0vwOvM8xci0gdmMHiVG+H+WRwt0dubHWAAK5kGQvCUMc1wU-s6cg4g+mWRNwrWpYl08ue7EfHrjjHnYjgY4V1fLbj9eN8375YgDKbaVtLFWC0Uy8zzhY1qhzg8s4qXpRImXdKKuUz1Hrnzx5i9Nykir-Z3LFZr0ua-KEJY5dux5yywh3ozLkJYLCimtLfKu98caPwbs-KgJMybbApu-JcrQEYSGtOA+kxgxJGAPJyCEvRzSAj8HyNCJtK5YSejXBeCDm7oPCmyfwdhfCij8EKKw7hkpDB3qhGsbJYTcUMNA2hS04HtifrwHAggCANzQBQQMNAADuZBKC0UVq7UKLF9IrirACEegioYB2Sr4C+YEhibhyvSHKiJqHzQkSLS2OAZEUDkQosgSioAqIIOoygzCdrITGhfbibRt6n2PuYmwkxviuHNHYMS7RxGPUkaLL07ioA4GuI3LxgheCBgAEaEEECwagtB6ACDYIUQWs9YEZLcYwjxuSyD5MKSUoQLAygVBEAuaoOjgYsRhBCUU+lYSQiLFucs7Q0p2CsLCeCdJvipPNvQ+BS8Wl5IbgU5RnSykVLoAwcorB2B1LvnQh+0jmnZNae0vZpTukCEqP06QYgjDryBpvJcXJKxQjpJzThyELKBAhNWE6DYei2Aco4h6ayrmZJuTk7ZZBdm+P2eUmgRzqlnNNjAy5UjEWbNuSitFxTHk9KEH08QbyDCfLdl3BAbQd72lSruKGjhC7mM3OCfRfQL4TVSlQiOTi0kuNrkiu5OzCnyMUWojRuIZaHC0S7elui9JsjSv0HOeY+RiRaIQ7lbIzCGENCuEUcJVlz0JU04lyK2nSuUbK7x8rKAADFhzymHBiAAEocRVctPVBKaOaOCMJFkAl8CKGZhgLo8v6EdGsDiRVwutY0rJOTVFEGeE62gSi65SzxPRWi8p+wd0Gd88K3wGSsLaLnPVsUDAzJ6FWdoTI2h5kNIMK1DTXEZqlaiwpmBYCwCIDAQ5VSTk1OvBc9JfbJWkqHXAUdMBKUvJpTICt1MmhbkRvWMULIeZJIBEQ8EFgEIigcMJHtBLGkKCIHXEMb5YwO2Dd3CZZgj6uEBEk34Z07Ctvsb4HKnI2g3rnbHe9j7-KBTXlqIZek-adAiJEJkBk4TRLGCPKsY9Iirg+IscD4rcZMCIHgVAEByVdMoDVR2CtVXwcrTtHQm5-AfF+HWCSF86RswNWYeEZ5FgJqMERmOuMiAjtQFARBgSt3K2Yw6L2kDrrcTYvpPiwEuSdHzmHVkwHRPrPbBJlQ0mmEfMY9u3QK4OjmgdP8ME8wcoLDZuaCEXDtwAlhH8AzgY2nIARbJtVCHwosdjTYAE-x2ENkBOWM8VYhSilElEg11h7ptMDNXWAE7jnMGnRhdLmW13UrIAMoLTHMwGrghNRwkRUJihAjyHQdI0ocl-pPFkEkljLDaeieADwigWfk5mfMaV2OCnrNxc85hGupTSjlWw2YuF8m+FJWFaJeCDYzs0QwaVWPVsFfmD4jWJoGl+R281K4gipM24y-QYJEYTXG1xqbPJDIFhsA6FkEoRSpbW-U29lsbsfwsJMMbnHJs8eSu0EwSMUu2FrcKiuor4U2repAIHekd7xIdDYc0B7VwjGSkWfwnN7KRbEpEHzqPraE0Thj8Ksbsfnh6OeYIq42bZimMEeYVgCztGTUj1NvaJXEvp8xjop4OTJKc1MzD7w6RVlQgParYoGxU-TUi51Pi-HqLFyG7qzKr2WELGeDTCB9E2dimeMU549N5RnfiiDDC7UDrJRivXwEmQQnNeExzTJIQHkPAWVwolUqxV+Or+dLvF25rlf47aDKWI83YuCvwgJkLRQsrG7BAJRQgVQquSPIvEGZuzdr+R3jyAFo98uADeektbh4vqCyq4TUOH3rWB0Rfncl9d0ukdY6wA15bb8MUzNVyiiTeWQsgkOXGG6L4ey3ePJQafTX-SxqL7RdAxEDK-6vaGBykKU+m5jzlwd84sTHlSPkco+7ucwWFOAimGAw6QkhjOeStWSYnCaxOC1pDMvkZpJqZhQDXq0DYMhh8J2nFEEHyDyKhOCE4FzI6OpqJFuD5n5giuASBF7HYkKGniuBYHLqxP4BYLFJuEKGHOCmlgQBlq5H1hvJZryHFqBvoiaFDCjMdvdpyNCvPhyJds2DEEAA */
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
                internal: true,
                actions: ["renameProgram", "persistAllPrograms"],
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
      renameProgram: immerAssign((context, { name }: RenameProgramEvent) => {
        const { program } = currentProgramFrom(context)
        if (!program) return
        program.name = name
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
