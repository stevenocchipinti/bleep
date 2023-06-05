import { createMachine, assign } from "xstate"
import { assign as immerAssign } from "@xstate/immer"
import localforage from "localforage"

import defaultData from "./defaultData"
import { BlockSchema, ProgramSchema } from "./types"
import { Block, Program } from "./types"
import { playTone, speak } from "./audio"

// Program events
type LoadedEvent = { type: "LOADED"; data: Program[] }
type SelectProgramEvent = { type: "SELECT_PROGRAM"; id: string }
type DeselectProgramEvent = { type: "DESELECT_PROGRAM" }
type NewProgramEvent = { type: "NEW_PROGRAM" }
type MoveProgramEvent = {
  type: "MOVE_PROGRAM"
  fromIndex: number
  toIndex: number
}
type RenameProgramEvent = {
  type: "RENAME_PROGRAM"
  name: string
}
type UpdateProgramDescriptionEvent = {
  type: "UPDATE_PROGRAM_DESCRIPTION"
  description: string
}
type DuplicateProgramEvent = { type: "DUPLICATE_PROGRAM" }
type DeleteProgramEvent = { type: "DELETE_PROGRAM" }

// Block events
type AddBlockEvent = { type: "ADD_BLOCK" }
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
type DeleteBlockEvent = { type: "DELETE_BLOCK"; index: number }

// Timer events
type StartEvent = { type: "START" }
type ResetEvent = { type: "RESET" }
type PauesEvent = { type: "PAUSE" }
type TickEvent = { type: "TICK" }
type LeadTickEvent = { type: "LEAD_TICK" }
type FinishLeadIn = { type: "FINISH_LEAD_IN" }
type ContinueEvent = { type: "CONTINUE" }
type NextEvent = { type: "NEXT" }
type PreviousEvent = { type: "PREVIOUS" }

// Settings events
type SetVoiceEvent = { type: "SET_VOICE" }
type SetAllProgramsEvent = { type: "SET_ALL_PROGRAMS" }

type Events =
  // Program events
  | LoadedEvent
  | SelectProgramEvent
  | DeselectProgramEvent
  | NewProgramEvent
  | MoveProgramEvent
  | RenameProgramEvent
  | UpdateProgramDescriptionEvent
  | DuplicateProgramEvent
  | DeleteProgramEvent
  // Block events
  | AddBlockEvent
  | MoveBlockEvent
  | UpdateBlockEvent
  | DeleteBlockEvent
  // Timer events
  | StartEvent
  | ResetEvent
  | PauesEvent
  | TickEvent
  | LeadTickEvent
  | FinishLeadIn
  | ContinueEvent
  | NextEvent
  | PreviousEvent
  // Settings events
  | SetVoiceEvent
  | SetAllProgramsEvent

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
    /** @xstate-layout N4IgpgJg5mDOIC5QEMAOqB0AXAlgWzACcMAbAe2QhwDsoBiCM6sDGgNzIGsW1NcDi5SjSgJ2ZAMbJcTANoAGALoLFiUKjKwcM6mpAAPRAHYATBiNGALAE4TANgCM86wFYAHC5NGANCACeiF6WGNYOYSbWliY2DnYeAL7xvrzY+ESkFFS0dESEZMSoJNIAZvl4GCn86UJZouJSOioqehpaOnqGCADMThjylnbWXS5dll1uJvJuvgEIDi7yIdbLy-1GtiZeicnoqQIZlJB0ALIA8gBqAKIA+gAKAEqnAOL3AILHzUggrdo4TB2BLqRPqWKy2OIOIxueYzQKWFwhaFQzxuNx2KxGOzbECVNKCTJHADKlwAMpcAMIAFTujxe70+6k0v3+X06YTsCKcXW5HgmnhcdlhCBMkIw8OsmNMdkGlnmbmxuP2NSOADlLgB1GnPN4fJQtJntVmBJyLSJGJxudZDKxC6II6xIjwmVHoyzypI43ZVfGHCAYVB5KCEZB4AAEsDAJDAEiwRwAIpdiWSqVq6brVF8fobQJ0ulCQptZUMous4pYhTYjBhNi53A4vF1pZEugqvXiDhBIP7A8GwxGozGu7AsGR0F2AJIQKN0OMAVVuJPH5NelJuD219L1mYNf10Ru6kwwYXW0OlIvsoyFcqr-Tio088kcbtbfHbyr9AbIQZD4cj0djfrDqOqATlOYB0Pclwqu8a60jqDLfDuLI5og3KLA4Gz9OM0JuNyV55l0YouJKUwePIzguC+ezVASH49j+-b-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-27s3xcaKlPL6Qfn+lpPM-pvodZE6SVFNIQRu0FYOQvcYEfdD0DVo12ln8ukE0LUMUxE3pxlZUS4ZcT9+0hgKU-V0QFI8x-I1ltFZsLkR8ikt9jVTVzURF0EhEaBrUP85hiIC45QFhLRQZ9J9cNEXZGwFgopZ57sH9R835Y14DUUk0S1G9txaNwNb0QgAFNZAplgAsL4r8vARR9owt4QpghDyCT0z1IBGCe4zBZRApIQeM6wNJohN1uRZ9QgOQSDs09so1ANo0jDpdnQkkTpPdlCfBgYHxqw+1slXBURsMyBcMX5Kdk5adaxv9mF7AoUINEML5u96wIhjdP0TcTBKtos-tGDCsSU48ScFY8w2d9M3RPNZYlI74xgmpoYciZMagRBGDNgjwPBnd1DwURQ-CCtndtJyJ7tfNLQ3UGiYt3xGDQYEQLADplgtNIQACCt-oON7swgfUHtRi-tVt1soBGCGoFIIQ5keQFZHxRs+iJsZl2p75voICq8VdI09CBp08tjmjpCetjB9oQggRXYc5iw-VMk3toYOiHRBgNiYcMAcNocoid5adlk1py9ax0joQns9M5RzBXAlJ4RcIRQpgYFEggA */
    id: "app",

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
      timer: {
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
                      START: {
                        target: "running",
                        cond: "isValid",
                      },
                    },

                    entry: ["resetTimer", "stopTalking"],

                    states: {
                      Idle: {
                        on: {
                          ADD_BLOCK: {
                            target: "saving",
                            actions: ["addBlock"],
                          },

                          DELETE_BLOCK: {
                            target: "saving",
                            actions: ["deleteBlock"],
                          },

                          MOVE_BLOCK: {
                            target: "saving",
                            actions: ["moveBlock"],
                          },

                          RENAME_PROGRAM: {
                            target: "saving",
                            actions: ["renameProgram"],
                          },

                          UPDATE_PROGRAM_DESCRIPTION: {
                            target: "saving",
                            actions: ["updateProgramDescription"],
                          },

                          DUPLICATE_PROGRAM: {
                            target: "saving",
                            actions: ["duplicateProgram"],
                          },

                          DELETE_PROGRAM: {
                            target: "saving",
                            actions: ["deleteProgram"],
                          },

                          UPDATE_BLOCK: {
                            target: "saving",
                            actions: "updateBlock",
                          },
                        },

                        description: `Stopped, but valid and ready to start.`,
                      },

                      saving: {
                        invoke: {
                          src: "saveAllPrograms",
                          onDone: "Idle",
                        },
                      },
                    },

                    initial: "Idle",
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
                },

                on: {
                  DESELECT_PROGRAM: {
                    target: "program not selected",
                    actions: "unassignProgram",
                  },

                  PREVIOUS: {
                    target: "program selected",
                    cond: "previousBlockAvailable",
                    actions: "previousBlock",
                    description: `Previous block if there is one available.`,
                    internal: true,
                  },

                  NEXT: {
                    target: "program selected",
                    cond: "nextBlockAvailable",
                    actions: "nextBlock",
                    description: `Next block if there is one available.`,
                    internal: true,
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
                actions: ["moveProgram", "saveAllPrograms"],
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
                actions: ["newProgram", "saveAllPrograms"],
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

        initial: "loading",
      },

      settings: {
        states: {
          loading: {
            invoke: {
              src: "loadSettings",
              onDone: "loaded",
              onError: "no settings",
            },
          },

          loaded: {
            on: {
              SET_VOICE: {
                target: "saving",
                actions: "setVoice",
              },

              SET_ALL_PROGRAMS: {
                target: "saving",
                actions: "setAllPrograms",
              },
            },
          },

          saving: {
            invoke: {
              src: "persistSettings",
              onDone: "loaded",
            },
          },

          "no settings": {},
        },

        initial: "loading",
      },
    },

    predictableActionArguments: true,
    preserveActionOrder: true,
    type: "parallel",
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
      isValid: context => {
        const { program } = currentProgramFrom(context)
        return !!program && ProgramSchema.safeParse(program).success
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
      loadSettings: () =>
        localforage.getItem("settings").then(data => {
          if (data) return data
          else throw "No data found"
        }),
      saveDefaultData: () => {
        console.log("Loading default data")
        return localforage.setItem("allPrograms", defaultData)
      },
      saveAllPrograms: context =>
        localforage.setItem("allPrograms", context.allPrograms),
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
