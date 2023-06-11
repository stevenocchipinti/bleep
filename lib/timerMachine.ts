import { createMachine, assign } from "xstate"
import { assign as immerAssign } from "@xstate/immer"
import localforage from "localforage"

import defaultData from "./defaultData"
import { BlockSchema, ProgramSchema, SettingsSchema } from "./types"
import type { Block, Program, Settings } from "./types"
import { playTone, speak as speakFn } from "./audio"

// Program events
type AllProgramsLoadedEvent = { type: "PROGRAMS_LOADED"; data: Program[] }
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
type AllSettingsLoadedEvent = { type: "SETTINGS_LOADED"; data: Settings }
type SetVoiceEvent = { type: "SET_VOICE"; voiceURI: string }
type SetSoundEvent = { type: "SET_SOUND_ENABLED"; soundEnabled: boolean }
type SetAllProgramsEvent = { type: "SET_ALL_PROGRAMS"; allPrograms: Program[] }
type ResetAllProgramsEvent = { type: "RESET_ALL_PROGRAMS" }

type Events =
  // Program events
  | AllProgramsLoadedEvent
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
  | AllSettingsLoadedEvent
  | SetAllProgramsEvent
  | ResetAllProgramsEvent
  | SetVoiceEvent
  | SetSoundEvent

type Context = {
  allPrograms: Program[]
  settings: Settings
  selectedProgramId: string | null
  currentBlockIndex: number
  secondsRemaining: number
  leadSecondsRemaining: number
}

// Helpers

const speakerFrom =
  ({ settings }: Context) =>
  (text: string) =>
    settings.soundEnabled
      ? speakFn(text, settings.voiceURI || undefined)
      : Promise.resolve()

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
    /** @xstate-layout N4IgpgJg5mDOIC5QEMAOqB0AXAlgWzACcMAbAe2QhwDsoBiCM6sDGgNzIGsW1NcDi5SjSgJ2ZAMbJcTANoAGALoLFiUKjKwcM6mpAAPRAHYATBiNGALAE4TANgCM86wFYAHC5NGANCACeiF6WGNYOYSbWliY2DnYeAL7xvrzY+ESkFFS0dESEZMSoJNIAZvl4GCn86UJZouJSOioqehpaOnqGCADMThjylnbWXS5dll1uJvJuvgEIDi7yIdbLy-1GtiZeicnoqQIZlJB0ALIA8gBqAKIA+gAKAEqnAOL3AILHzUggrdo4TB2BLqRPqWKy2OIOIxueYzQKWFwhaFQzxuNx2KxGOzbECVNKCTJHADKlwAMpcAMIAFTujxe70+6k0v3+X06YTsCKcXW5HgmnhcdlhCBMkIw8OsmNMdkGlnmbmxuP2NSOADlLgB1GnPN4fJQtJntVmBJyLSJGJxudZDKxC6II6xIjwmVHoyzypI43ZVfGHCAYVB5KCEZB4AAEsDAJDAEiwRwAIpdiWSqVq6brVF8fobQJ0ulCQptZUMous4pYhTYjBhNi53A4vF1pZEugqvXiDhBIP7A8GwxGozGu7AsGR0ETKa97pSGd8DX9dEa5s5FrEOU4HG4BvILEKwpa+iYXPN4dFBhZW3x28q-QGyEGQ+HI9HY37h6PUEcHpdzgBJU4AVUJGcs3nAFukbDB3DsN1zQ3S0bX8RBoQcDAJmGExRjscZnGsC89mqAkbx7B9+2fIcRzHCA6DVAANac9UzOcWRzRBBjcatoOhVEwlrQVEIQZDUIwzxMPGBw8O9Dsu1ve8+yfQdXwoj8-R-CAozoV44zja4ACESVOckAGlgKYhcWO6FxrD6M95C6CJD0bPjZnrcYxWiaERJFTwJKvQjuzvXtHwHF8MDfSiMFU9SEzJSkbj0gzjIYxk2lAxdMPMOJrCmaIsphfiHDGLoMEbeR6wcHogXkLCfKVPyZMC0iFNCpSu0isATguOL9KMkyUuYgxEHQjKwgcFZ0XrIwXF3bkERcLdJrcCV5AWIwaoI31-NkoKyMU99WrU9r7kuFV3huB5tXpJLZz6syBvAxYxjiSbnA5FwjCq3cRis2tljmyxloWZY1p9TsiICkj5JCsLlIig66H-W441eWLUx1a4E0Jcl7h-W5KT-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-i13WeU+e6P2PifUX-ctdWGX0akwIhliPFH6EGU48jCcO9AqSfyMSoIpUYnxSb0bUSXB0TF5zCjADKOxTDDAciy62ilRmAliOD0yI6FzGYSbUa0ZgHMJ-iARQHW7BAbwuhiQTAeS7idbVjuCx5DALBujugejoqdjwBfC8B36sr9aHhl5WBeBDAbiDKxAfQm7LBFRHgOiWRhBjCQgvoAHehcF9JmB8imBVRAoOhAh9aeCvybD0zNhOzmjSjPaibUIiBKGLjvRCRvTewaHU74Irh6GZQ7ylibDzIWHmQTAHjvQAqjC2A2BdAVj5KmACgmimDz6YjYGNKVweHHrELeH4ZYQzIBFCimDBCpwiRDALweB1I+ZWI+pNI9wQCxFsj5hL6JF+E5SBH8SRDBBFioiWSNhhDrBRE2InxFGwxRglGBD2AJG+HJFDDLxVRl5sSGEShfS5GmH5HgbtF8wH4O5QDdEICx5l706uD9ALzbi0zOQFwhB8JWh6L9qtGLLIqypLHlTDEKy1hYaRA4ZCjNgcQOaLT0wDCxDHGkrzr+rBqFadJpJLGFici+yOCZb1jSi7iyjpbIQpq2Dbit7qpAE4H0I6rfoKpPI0rnFojr5NgjDcjLQIHjKyiMxBJ-SQg7zvFzp+orIonQbfFhr-H+z162QOYQjODLy-wFQCK4Ih7mjyFEqUaIlLILqvBLorpYpxJrrUAbrnEChoLjFeKeCDKbxTT5TZaoTwhkKPQJYiYKFiYNJtGCn+rUkdKwbIAwDSm9BQhJFdagiyjgnKZ1gno7yhG5Z5FgbAFNSgGQDnHnZihODFLZR1g8bBB8bbyb5Pb-58kIlbSmZzrSlmBBJQjvRGHLCQhChZxsYiiuBiKogcxhZj5LG1jsTjoWD2BYQ9DurgmOEv6LQuH0xuF76o5Fb-HsRmLvRRDbjSEiggoDZZRoKlSaGgm4JrC25FbbaLHyaHaDSnp5iYT9D2ASj2BXZIioTPFhA8izKTEAEp7XhLG4JmB2qggcalijRXazzVgKyNjcjvRAIjke6H5Yru5LEPb+LbjqbupjCpazD9bJyurogWBohEKWgmFbn7556NnsEJza6WhoIuToihkYROpfnLkdaazrmkK3mnxd6Nmj7yIQVILa5C6tlzkdmaZQ7fkDDoKOBQiLQjALQYWX4975kTna4WhoJjBjBOw1I5HdnkWzRojQoAU8jM6JDxBAA */
    id: "app",

    schema: {
      context: {} as Context,
      events: {} as Events,
    },

    context: {
      allPrograms: [],
      // Settings
      settings: {
        voiceURI: null,
        soundEnabled: true,
      },
      // Timer
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

                      PREVIOUS: {
                        cond: "previousBlockAvailable",
                        target: "stopped",
                        internal: true,
                        actions: "previousBlock",
                      },

                      NEXT: {
                        cond: "nextBlockAvailable",
                        target: "stopped",
                        internal: true,
                        actions: "nextBlock",
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

                      PREVIOUS: {
                        target: "running",
                        cond: "previousBlockAvailable",
                        actions: "previousBlock",
                        internal: true,
                      },

                      NEXT: {
                        target: "running",
                        cond: "nextBlockAvailable",
                        actions: "nextBlock",
                        internal: true,
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

                      NEXT: {
                        target: "stopped",
                        cond: "nextBlockAvailable",
                        actions: "nextBlock",
                      },

                      PREVIOUS: {
                        target: "stopped",
                        cond: "previousBlockAvailable",
                        actions: "previousBlock",
                      },
                    },
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
              onDone: {
                target: "loaded",
                actions: "setAllSettings",
              },
              onError: "no settings",
            },
          },

          loaded: {
            on: {
              SET_VOICE: {
                target: "saving settings",
                actions: "setVoiceURI",
              },

              SET_SOUND_ENABLED: {
                target: "saving settings",
                actions: "setSoundEnabled",
              },

              RESET_ALL_PROGRAMS: "resetting programs",
              SET_ALL_PROGRAMS: {
                target: "saving programs",
                actions: "setAllPrograms",
              },
            },
          },

          "saving settings": {
            invoke: {
              src: "saveSettings",
              onDone: "loaded",
            },
          },

          "no settings": {
            invoke: {
              src: "saveDefaultSettings",
              onDone: "loading",
            },
          },

          "resetting programs": {
            invoke: {
              src: "saveDefaultData",
              onDone: {
                target: "loaded",
                actions: "assignAllPrograms",
              },
            },
          },

          "saving programs": {
            invoke: {
              src: "saveAllPrograms",
              onDone: "loaded",
            },
          },
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
      beep: ({ settings, secondsRemaining }) => {
        if (!settings.soundEnabled) return
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
        allPrograms: (_, event: AllProgramsLoadedEvent) => event.data,
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

      // Settings actions
      setAllPrograms: assign({
        allPrograms: (_, { allPrograms }: SetAllProgramsEvent) => allPrograms,
      }),
      setAllSettings: assign({
        settings: (_, event: AllSettingsLoadedEvent) => event.data,
      }),
      setVoiceURI: immerAssign((context, event: SetVoiceEvent) => {
        context.settings.voiceURI = event.voiceURI
      }),
      setSoundEnabled: immerAssign((context, event: SetSoundEvent) => {
        context.settings.soundEnabled = event.soundEnabled
      }),
    },

    services: {
      // Data
      loadData: () =>
        localforage.getItem("allPrograms").then(data => {
          if (data) return data
          else throw "No data found"
        }),
      saveDefaultData: () => {
        console.log("Loading default data")
        return localforage.setItem("allPrograms", defaultData)
      },
      saveAllPrograms: ({ allPrograms }) =>
        localforage.setItem("allPrograms", allPrograms),

      // Settings
      loadSettings: () =>
        localforage.getItem("settings").then(data => {
          if (data) return data
          else throw "No data found"
        }),
      saveDefaultSettings: () =>
        localforage.setItem(
          "settings",
          SettingsSchema.parse({
            voiceURI: speechSynthesis.getVoices().find(v => v.default)
              ?.voiceURI,
          })
        ),
      saveSettings: ({ settings }) => localforage.setItem("settings", settings),

      // Timer
      startTimer: () => send => {
        const interval = setInterval(() => send("TICK"), 1000)
        return () => clearInterval(interval)
      },
      announceBlock: context => () => {
        const { blocks, currentBlockIndex } = currentProgramFrom(context)
        const speak = speakerFrom(context)
        const block = blocks[currentBlockIndex]
        if (block?.type === "timer")
          return speak(`${block.name} for ${block.seconds} seconds`)
        else if (block?.type === "pause" && block?.reps && block.reps > 0)
          return speak(`${block.name} for ${block.reps} reps`)
        else if (block?.type === "pause") return speak(block.name)
        else return Promise.resolve()
      },
      announceCountdown: context => send => {
        const speak = speakerFrom(context)
        speak("Starting in")
        const interval = setInterval(() => {
          if (context.leadSecondsRemaining === 0) send("FINISH_LEAD_IN")
          else speak(`${context.leadSecondsRemaining--}`)
        }, 1000)
        return () => clearInterval(interval)
      },
      announceMessage: context => () => {
        const { blocks, currentBlockIndex } = currentProgramFrom(context)
        const speak = speakerFrom(context)
        const block = blocks[currentBlockIndex]
        if (block?.type === "message") return speak(block.message)
        else return Promise.resolve()
      },
    },
  }
)

export default timerMachine
