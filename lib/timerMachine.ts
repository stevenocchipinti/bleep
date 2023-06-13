import { createMachine, assign } from "xstate"
import { assign as immerAssign } from "@xstate/immer"
import localforage from "localforage"

import defaultData from "./defaultData"
import {
  AllProgramsSchema,
  BlockSchema,
  ProgramSchema,
  SettingsSchema,
} from "./types"
import type { Block, Program, Settings } from "./types"
import { playTone, speak as speakFn } from "./audio"
import { current } from "immer"

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
  currentBlock: Block
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
  const currentBlock = blocks[currentBlockIndex]
  return {
    program,
    blocks,
    currentBlockIndex,
    currentBlock,
    secondsRemaining,
    leadSecondsRemaining,
  }
}

const timerMachine = createMachine(
  {
    /** @xstate-layout N4IgpgJg5mDOIC5QEMAOqB0AXAlgWzACcMAbAe2QhwDsoBiCM6sDGgNzIGsW1NcDi5SjSgJ2ZAMbJcTANoAGALoLFiUKjKwcM6mpAAPRAHYATBiNGALAE4TANgCM86wFYAHC5NGANCACeiF6WGNYOYSbWliY2DnYeAL7xvrzY+ESkFFS0dESEZMSoJNIAZvl4GCn86UJZouJSOioqehpaOnqGCADMThjylnbWXS5dll1uJvJuvgEIDi7yIdbLy-1GtiZeicnoqQIZlJB0ALIA8gBqAKIA+gAKAEqnAOL3AILHzUggrdo4TB2BLqRPqWKy2OIOIxueYzQKWFwhaFQzxuNx2KxGOzbECVNKCTJHADKlwAMpcAMIAFTujxe70+6k0v3+X06YTsCKcXW5HgmnhcdlhCBMkIw8OsmNMdkGlnmbmxuP2NSOADlLgB1GnPN4fJQtJntVmBJyLSJGJxudZDKxC6II6xIjwmVHoyzypI43ZVfGHCAYVB5KCEZB4AAEsDAJDAEiwRwAIpdiWSqVq6brVF8fobQJ0ulCQptZUMous4pYhTYjBhNi53A4vF1pZEugqvXiDhBIP7A8GwxGozGu7AsGR0ETKa97pSGd8DX9dEa5s5FrEOU4HG4BvILEKwpa+iYXPN4dFBhZW3x28q-QGyEGQ+HI9HY37h6PUEcHpdzgBJU4AVUJGcs3nAFukbDB3DsN1zQ3S0bX8RBoQcDAJmGExRjscZnGsC89mqAkbx7B9+2fIcRzHCA6DVAANac9UzOcWRzRBBjcatoOhVEwlrQVEIQZDUIwzxMPGBw8O9Dsu1ve8+yfQdXwoj8-R-CAozoV44zja4ACESVOckAGlgKYhcWO6FxrD6M95C6CJD0bPjZnrcYxWiaERJFTwJKvQjuzvXtHwHF8MDfSiMFU9SEzJSkbj0gzjIYxk2lAxdMPMOJrCmaIsphfiHDGLoMEbeR6wcHogXkLCfKVPyZMC0iFNCpSu0isATguOL9KMkyUuYgxEHQjKwgcFZ0XrIwXF3bkERcLdJrcCV5AWIwaoI31-NkoKyMU99WrU9r7kuFV3huB5tXpJLZz6syBvAxYxjiSbnA5FwjCq3cRis2tljmyxloWZY1p9TsiICkj5JCsLlIig66H-W441eWLUx1a4E0Jcl7h-W5KT-FVeuZW7Oi8dj2QFVw7MmSEfHy6x0WKgUpmlAY4hMYGpLBrbGqhlqVLhuMEZJH9yWRs7aR1QnszuuzFkbewRPehZSt3SaioK0IN36Eajw569NoayHyL2-motJS4UfOtMpdS8zuSK2x61cCw7MtDxdw8Ky7HsCI2bszE9bq4i5OC43wra+HEbF3TusSjNkqJsDRgROzhglf6ok8fpd2guxzC8JwBktUFt0Djb6oh0PdvC2BkDYEQGCYFhxG4Co21q8vg+2proaHOuRDEagOAaecmiukD+s6TxglrdweVcNw8xMXcnZCUbUSqkVuW9svQYNyudowQgAFdqGoBvbleQDLhtyfEAK+sMDiIFAaw+QIlp5yLDzkYH8cVEMLlV3tJLuPMuwnzPg3I6xJ6Lx2uonRc4Q85ZUtPyB0-RLDlnyqCIqGEuhTFlDYRaLYPSKnWnvCuIdD4QPPtkL8v4AJAXHqZMC8xSqoUxOvWI9h0TTH4oJNCNgjxAipuJUh7dyEgPBlQpqNCG60VgfqG6rDuIhFlFCMYGFCFYNmAIrRrhypDE2GInYl4O4UNAUbP0cjsi32JvfE05hp6gjfoeFW2D5ioSPJ4Z0tkJQFWAVzQ2Vcj6n1oVADAEgyCn1wLQUMjAADu1A6B4x6sw5Ri5nRxAPOaeEbpNwA1VhKMUbhbIP1KbKFwgT94yJCjYiJUSYkiHiWQJJdA7FJ2yqhRwb135oisF0XctkqwTAws4I8783rulMfhEGUjuZWNCZA2gGBXhn2idQCQzSABG5AJCcEbswVgQ8uA8AkXMoJB9ZFhJEKs9Zp8tlxN2ZITgg9h7SFHkoDpmSNx5zspgjCXgphTF3JsIq-1jxmnpvWaplDu51JuSstZ1ANmPKgKGZ5+zDnNxOa3MhFyanwvAYiiJyLUU7L2a8+oHy5BfIcHAie9jhSTDMKVCU6FLKA2mvYasWVQhom5JiKIsLLEhPqXclFDyKUvOxccjgeLzmc0JWA6xJKJXkqeZSt5kgaXUCaCYBlLCflDDFIKt2z1Ri7ketZdEQLp6jRFdIolqrlmkvuZs6VWLGBHJbmcsxkjLm1OJa69VUrNUvO1SPWlyguiGoyeZTYtlipYTdJWPM+Cpr5Tmnnd6-LlhAjRIvR1CyxVqrJWG9FjTqBYESck1JcclEIITS6SCUwHRRHydyK1tYn52GcFo-BwwSEzMkvrOFKqlnhNDR6uJVaa2tOSd8hNWEzDlS8hvd+lZPrAlBG6ZOy1F5FvEf6gl47FniteAk5AvxZ1MFicfdq5JTgqjxiqf8N90lNruqNVwGBRpRFGvLOan8HFjA4qNewHgjCCuLcE6hZb3VotDAQWAtcYCyt9W3E9Sqz2lpDeWmd6KUNobAJG3VY841frZAtVCsQoRhG3BrJy9935mAlKTaIe4pjTM9Nhsdor4P4fuUh4cyBCCxPRTQDDuK-WzJwwJ65QnJUiawGJiToYaBkcaF8z90sSbe2+tuFlDpbDf2mqKZa9NayglKVBWDVyQqoGQMfCMVFoEWyXd+rWT8vDCLyVYBwHtQRCUMbKQVCweP4vk06idTmXPjknIoxi8bv1HirI2RskIM7YR0ffb+kEeiyn-mhIBx65P8Zi4suLrnqKXDop5tkoxgiDEhI4SIfSwi2jKX+mI5U+0DCLvZoNN5nM1foX+QCDX76FdQm2vtvS9zMbmLYZrHJnQdvKlESLiqKtbRRVgZ17TdO21S0VESpV+heCsG6Ze-E+0oQFAsOe0HM6rTK5JFFoZKGwGk-K2TH2yBfeDrALTnzlDHbvt0Xo-RBhDrGBMEFdN2LKxFB4fBoysRlYjFgCTsAOwN29Tiv7WHQpgBxyIPHNQB7Uu0+DyjenED-SKqiFBIpnQRFsrlhAABaNikEC7Im9vCOaeFse4-x9kXI+R-RFCwKUQg5QUhi4pxLuoJyo16p0-Tk7nQ1yIjVpt+sm5M2zG51xSCo0rDolerEKpWOyfi+vHQGB1xzinBFh+7XkPOLmDzFhS0zNBi3dN6CKsGj-22DehYAYouHcq6dy7wkAEVTaWOq8PSlw4xTYEsF5wmi2fLE3EKbnofzCbgj4eCwk1Y-k9oJTwidB3PUleCSEkqN3hMK90yzEHFeQ4UhP0S1-ES8CmKhYA9IxNimBr47hvLuW9t6tjqTvjaGdLnpsVSEG51iNiFUtkvFgy9RG3Gacqm2Z8q9rvXOJyu6+-dOST2-UA8dX+aU-kHNOwfZ-cAiSa83fm74SjF4bgoSYhAgG7bilRjAX514YCfbv734KqYDv5wGA7v6g7RrZ7exkwTCLyTC1imBeDF7j5ihhYeDvxWBVQmK8ak617P5HxwBx5xLfaIGyYoGECMF0FA7SIf7q7kZa6r465IRWTQbQaQYsr0aDLD74GzarCawn6WS4T250Ev79zMHA6sGP5MH0Gv7qE8EYGa506CGQ6rB-oQbvz0zG6BbD4gEZTgG-yQEFQkIegoqdjwBfC8DGFMrc6Hh-pWBeBDC-KlR9r775oW4Si1ilJIj2DAxeFgSbBCRvSTAQgFpAhc6eA+a+yYKEIQjbZ8aZAiBxGLjvSJGmBVTQgFpc4FQribCWH0wBHezszva+S+hFHmQTA5K2RVSjArZDAVjOD5wEHogiSEJDbOptHfr4KdH4Ipq9FSGzCmDBCpw2BCKLRjBKEjotEWKVYhK9wQATHUbsQUFdGzE5TzGICRDBBFioKQhojLCY6bHmLzJwY9x8ywxRgHGBA8rHEzE9FnErxVR-psSiERFpFjETp7GhRqFQCfEIBgF-rl6uD9CLzbggZzCFxrwOhWhaKWjDo0GjpBw7GCbhKwmxDLDWR2TsaxClT2BChDAIighXZQhZRuhTDgnnpqpzrNK1qwn2CYLJochFyLSlTnFzBPSQSLQbhUxgGbjsl4ZToEZIaYqcC8lApiggHQh9KHh8LOS2Rnbez0byCMb0xvaPEBrKoclKYaqVobLzpJK8mODqwpqTBTALCxBWqAnQr4IliWhxBynEm3KXrXrqZRLVo0APqkn+IFalSWS8LvR5jcrBDrD9qRBHgeT+mKYKmIbNLEbIAwCkkYgUkfwij3a0keKLDrDhA9B9qjABLNFPGBrOqTqBnCZv6qbibNI0AOmeLLDzCWSYJVQngrybh-oSicSuARFNFmmnoKaOajaQCkmyhmCyjLQD58jQhBYjJbyRDlR5i6z1nmlwr7bjHJZUb3wZG+JQjvTmiDChBolZzVjvyjRzQLx5FyafbfawmRF9Cok8LcjzB2Qel-q1GZQGn1FTk0Hv68nsTGLvTH6TShAlnF5ZR5xsqTRG5lgx7KGz7CC0CwmVRj6YSXZnhlmm5IioSLSaw8icaWAwH0HXiwkAohDWaTSVjQrWDF5zzVgKwZZ5jjLUFK7aGqHX7opQWnlr7W5eLbjwjLT-LjDF7JwSnogWBoh4KoJ0V47wFCWwm+nAW77by2CNgm6IBm6igs5UXjA0UaUMFP7cGyTuEJxr496wWXbbiWT1jB4mXpQoW3GLQjALTWW6HoqfniVCFLhoimpjDQbjDjDZoKXwhKVV6qU8jV6JDxBAA */
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

                        exit: "stopTalking",
                      },

                      "Announcing block": {
                        invoke: {
                          src: "announceBlock",

                          onDone: [
                            {
                              target: "Annoucing starting in",
                              cond: "isTimerBlockWithLeadIn",
                            },
                            {
                              target: "Awaiting continue",
                              cond: "isPauseBlock",
                            },
                            {
                              target: "Announcing message",
                              cond: "isMessageBlock",
                            },
                            {
                              target: "counting down",
                              cond: "isTimerBlock",
                            },
                          ],
                        },

                        exit: "stopTalking",
                      },

                      "Announcing countdown": {
                        invoke: [
                          {
                            src: "startTimer",
                          },
                        ],

                        exit: "stopTalking",

                        on: {
                          TICK: {
                            target: "Announcing countdown",
                            internal: true,
                            actions: [
                              "decrementLeadTimer",
                              "announceCountdown",
                            ],
                          },
                        },

                        entry: "announceCountdown",

                        always: {
                          target: "counting down",
                          cond: "leadCountdownFinished",
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

                      "Annoucing starting in": {
                        invoke: {
                          src: "announceStartingIn",
                          onDone: "Announcing countdown",
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
      leadCountdownFinished: context =>
        currentProgramFrom(context).leadSecondsRemaining <= 0,
      isTimerBlockWithLeadIn: context => {
        const { program, currentBlock } = currentProgramFrom(context)
        return (
          !!program &&
          currentBlock.type === "timer" &&
          currentBlock.leadSeconds > 0
        )
      },
      isTimerBlock: context => {
        const { program, currentBlock } = currentProgramFrom(context)
        return !!program && currentBlock.type === "timer"
      },
      isPauseBlock: context => {
        const { program, currentBlock } = currentProgramFrom(context)
        return !!program && currentBlock.type === "pause"
      },
      isMessageBlock: context => {
        const { program, currentBlock } = currentProgramFrom(context)
        return !!program && currentBlock.type === "message"
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
      decrementLeadTimer: assign({
        leadSecondsRemaining: ({ leadSecondsRemaining }) =>
          leadSecondsRemaining - 1,
      }),
      beep: ({ settings, secondsRemaining }) => {
        if (!settings.soundEnabled) return
        if (secondsRemaining === 3) playTone(440, 0.3)
        if (secondsRemaining === 2) playTone(440, 0.3)
        if (secondsRemaining === 1) playTone(440, 0.3)
        if (secondsRemaining === 0) playTone(880, 0.8)
      },
      announceCountdown: context => {
        const speak = speakerFrom(context)
        speak(`${context.leadSecondsRemaining}`)
      },
      nextBlock: assign({
        currentBlockIndex: ({ currentBlockIndex }) => currentBlockIndex + 1,
        leadSecondsRemaining: context => {
          const { blocks, currentBlockIndex } = currentProgramFrom(context)
          const block = blocks[currentBlockIndex + 1]
          return block?.type === "timer" ? block.leadSeconds : 0
        },
        secondsRemaining: context => {
          const { blocks, currentBlockIndex } = currentProgramFrom(context)
          const block = blocks[currentBlockIndex + 1]
          return block?.type === "timer" ? block.seconds : 0
        },
      }),
      previousBlock: assign({
        currentBlockIndex: ({ currentBlockIndex }) => currentBlockIndex - 1,
        leadSecondsRemaining: context => {
          const { blocks, currentBlockIndex } = currentProgramFrom(context)
          const block = blocks[currentBlockIndex - 1]
          return block?.type === "timer" ? block.leadSeconds : 0
        },
        secondsRemaining: context => {
          const { blocks, currentBlockIndex } = currentProgramFrom(context)
          const block = blocks[currentBlockIndex - 1]
          return block?.type === "timer" ? block.seconds : 0
        },
      }),
      resetTimer: assign({
        currentBlockIndex: 0,
        leadSecondsRemaining: context => {
          const { blocks } = currentProgramFrom(context)
          const block = blocks[0]
          return block?.type === "timer" ? block.leadSeconds : 0
        },
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
        allPrograms: (_, { allPrograms }: SetAllProgramsEvent) =>
          AllProgramsSchema.parse(allPrograms),
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
          if (data) return AllProgramsSchema.parse(data)
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
        const { currentBlock: block } = currentProgramFrom(context)
        const speak = speakerFrom(context)
        if (block?.type === "timer")
          return speak(`${block.name} for ${block.seconds} seconds`)
        else if (block?.type === "pause" && block?.reps && block.reps > 0)
          return speak(`${block.name} for ${block.reps} reps`)
        else if (block?.type === "pause") return speak(block.name)
        else return Promise.resolve()
      },
      announceStartingIn: context => () => {
        const speak = speakerFrom(context)
        return speak("Starting in")
      },
      announceMessage: context => () => {
        const { currentBlock } = currentProgramFrom(context)
        const speak = speakerFrom(context)
        if (currentBlock?.type === "message") return speak(currentBlock.message)
        else return Promise.resolve()
      },
    },
  }
)

export default timerMachine
