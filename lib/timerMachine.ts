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
    /** @xstate-layout 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-xawOmLzOmPNq+2yIHYusAteG2-DFLTVcoo416vVquUGU-fCk77+HKDT7a+acmMfWLoGIjJX-S7QwwkhQH2Grrf71TAdkfKBRqjNGim16zICKYwDtqOlQu0BmnezBhodINPSEWO2lTkkmHCZtJuZhQM-mlshh8DxJFNgq3ggKhOCE4CzI6A7uNFuJrgFrCs-iBC7JYkKH4GxBYArqxP4BYBFJuEKAHGnpNEVg5ANsvNZryAlqBpoiaPonDMdvdpyGdnbpds2DEEAA */
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
                actions: ["updateProgramDescription", "persistAllPrograms"],
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
      updateProgramDescription: immerAssign(
        (context, { description }: UpdateProgramDescriptionEvent) => {
          const { program } = currentProgramFrom(context)
          if (!program) return
          program.description = description
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
