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
    /** @xstate-layout N4IgpgJg5mDOIC5QEMAOqB0AXAlgWzACcMAbAe2QhwDsoBiCM6sDGgNzIGsW1NcDi5SjSgJ2ZAMbJcTANoAGALoLFiUKjKwcM6mpAAPRAHYATBiNGALAE4TANgCM86wFYAHC5NGANCACeiF6WGNYOYSbWliY2DnYeAL7xvrzY+ESkFFS0dESEZMSoJNIAZvl4GCn86UJZouJSOioqehpaOnqGCADMThjylnbWXS5dll1uJvJuvgEIDi7yIdbLy-1GtiZeicnoqQIZlJB0ALIA8gBqAKIA+gAKAEqnAOL3AILHzUggrdo4TB2BLqRPqWKy2OIOIxueYzQKWFwhaFQzxuNx2KxGOzbECVNKCTJHADKlwAMpcAMIAFTujxe70+6k0v3+X06YTsCKcXW5HgmnhcdlhCBMkIw8OsmNMdkGlnmbmxuP2NSOADlLgB1GnPN4fJQtJntVmBJyLSJGJxudZDKxC6II6xIjwmVHoyzypI43ZVfGHCAYVB5KCEZB4AAEsDAJDAEiwRwAIpdiWSqVq6brVF8fobQJ0ulCQptZUMous4pYhTYjBhNi53A4vF1pZEugqvXiDhBIP7A8GwxGozGu7AsGR0ETKa97pSGd8DX9dEa5s5FrEOU4HG4BvILEKwpa+iYXPN4dFBhZW3x28q-QGyEGQ+HI9HY37h6PUEcHpdzgBJU4AVUJGcs3nAFukbDB3DsN1zQ3S0bX8RBoQcDAJmGExRjscZnGsC89mqAkbx7B9+2fIcRzHCA6DVAANac9UzOcWRzRBBjcatoOhVEwlrQVEIQZDUIwzxMPGBw8O9Dsu1ve8+yfQdXwoj8-R-CAozoV44zja4ACESVOckAGlgKYhcWO6FxrD6M95C6CJD0bPjZnrcYxWiaERJFTwJKvQjuzvXtHwHF8MDfSiMFU9SEzJSkbj0gzjIYxk2lAxdMPMOJrCmaIsphfiHDGLoMEbeR6wcHogXkLCfKVPyZMC0iFNCpSu0isATguOL9KMkyUuYgxEHQjKwgcFZ0XrIwXF3bkERcLdJrcCV5AWIwaoI31-NkoKyMU99WrU9r7kuFV3huB5tXpJLZz6syBvAxYxjiSbnA5FwjCq3cRis2tljmyxloWZY1p9TsiICkj5JCsLlIig66H-W441eWLUx1a4E0Jcl7h-W5KT-FVeuZW7Oi8dj2QFVw7MmSEfHy6x0WKgUpmlAY4hMYGpLBrbGqhlqVLhuMEZJH9yWRs7aR1QnszuuzFkbewRPehZSt3SaioK0IN36Eajw569NoayHyL2-motJS4UfOtMpdS8zuSK2x61cCw7MtDxdw8Ky7HsCI2bszE9bq4i5OC43wra+HEbF3TusSjNkqJsDRgROzhglf6ok8fpd2guxzC8JwBktUFt0Djb6oh0PdvC2BkDYEQGCYFhxG4Co21q8vg+2proaHOuRDEagOAaecmiukD+s6TxglrdweVcNw8xMXcnZCUbUSqkVuW9svQYNyudowQgAFdqGoBvbleQDLhtyfEAK+sMDiIFAaw+QIlp5yLDzkYH8cVEMLlV3tJLuPMuwnzPg3I6xJ6Lx2uonRc4Q85ZUtPyB0-RLDlnyqCIqGEuhTFlDYRaLYPSKnWnvCuIdD4QPPtkL8v4AJAXHqZMCo1yoYHmM6KYaIsKbCckhUUThbBughD0LEpD27kJAeDKhTUaEN1orA-UN0wKbCGNWDcL937vUGEKJEHDnDuVEbEYBXNDZVyPqfWh9Bb7E3viacwbo5qlUwe-dE018zfy8KTU87odiXg7hQ0BRs-TyNoBgCQZBT64FoKGRgAB3agdA8Y9WYSoxczo4gHnNPCN0m4AaqwlGKNwtkH4lNlC4Ux+9ZEhTCVACJUTqAxKgHEsgiS6C2KTtlVCjg3rvzRFYLou5bJVgmBhZwR535vT8Z6AJUizEHzkVYkQGBXhn0aRIEQoYABG5AJCcEbswVgQ8uA8EkSDaR3MQmWMgeEtZ1ANlbN2ZITgg9h7SFHkoTpGSNx5zspgjCXgphTF3JsIq-1jxmnpvWKplDu61OWXc9Zp9NmxOefsw5zcTmtzIRchZNTwGIvqfcx5aK9mvPqB8uQXyHBwInnY4UkwzClQlOhSygNpr2GrFlUIaJuSYiiLC4JFi6mrORdQVFLT0UHMYEcluZy5l4uqfCwltziXislTs8lbzJBUuoE0EwdKWE-PUYVKE5qFijF3I9ay6IgXT1GkKmRKrQlErFQ8lFTzyWYuORwHF5zObKrAa6tV7rSVSu1ZSxoXyuhGvSeZTYtlipYTdJWPM+Cpr5Tmnnd6vLlhAjRIvJ1VyRVupJZ62JkTokJKSSkuOyiEEJpdJBKYDooh5O5Na2sT87CGNGPg4YJD-H4SVXC4NNzrFhorS0qtTSa0dLSY2u69g7IcLsnKEp79KyfWBKCN0ydlqLyLRIxVgax3XNFa8eJyBfiVqYDE4+7VySnBVHjFU-4b6LulmyX6HDIgiiGN7Oan97FjA4qNewHgjD8uLeY6hZaNVbIILAWuMAfXyrbqe-W57S2hvLRKpDcBUNgB1SPalygv22zupCdwqFYhQjCNuDW-ClybBCKYKE0Q9zcNg4shFeHkWauHMgQgzTQw0HQ9ihVI6z3CvgwJj1QmsAibEzQUjeqx5xqXSTb231txModLYb+01RTLXprWUEJSoK8YJTeZAx8IxUWgRbb55luNPy8EeZOe6HAe1BEJcqkRyp5gWDM3FsnnXjtQPZxzdBCQTinK56jR4qyNkbJCDO2EsFf0xJBHosp-5oSASemT2G5NNWiw51Ulw6JJbZKMYIgxISOEiP0sItpSkcJiOVXtAwi42Zdf6GLn4joMMAnV+++XUKtt7X0vcLGIONY5M6dt5UohhYDWV51DysAuoXVp7998RiQXGYXLwVg3TL34r2lCAoFhz2g5nVaJXJIPNDJQ2Akm-XSde2Qd7wdYDqejRRg7VHcy9H6IMQdYwJggrpuxZWIoPD4LGeI4dEYsDNNgB2BusqsXfcw6FMAmORDY5qAPKNnyQcNsOwgf6RVUQoJFM6CItlsuIAALRsRO+aZE3t4RzTwhjrHOPsi5HyP6IoWBSiEHKCkYXpPRd1BOWR-VXzKN3wQGuREas1v1k3Jm2YHOuKQVGlYdEr1YiVJKwr2gZPCJxYttcc4pwRaftB5rzi5g8xYUtMzQYV2jegirFCIsNhDwWHN0L4nIvryO+pISACKptLHVeHpS4cYJsCX884MYmwnZtqFBz4P5hNyjXD29Cw1v0cx8V3H5z1JXgkhJKjd4TCPcMty5B9wOFIT9CtfxYvApioWEPSMTYpho8k7t5zeP1wm8t6tjqdvNOwf3xesVSEG51iNgFSx4vFhS9RG3Gacqa2p8i9rvXWJtuoCfbx7605hPb-Y6v1sl-QOqdZ-cAiSas3fm74ShF4bgoSYhAi67bguJDqzJE7T534YBvYv5fZP7y614z6IFoF36f7kZZ7exkwTCLyTC1imBeBF6j5iiyjjALBBBVTiQ26YHY6EBwCYH-YyL35NyP7+qYAv5HzMFwGsGySA6U44Ea4MqLTe7QaQZMoMZDKD5EHTarCawn6WS4T0FwGv79yxIfbIFcGwGX6aEtIfbYFq7U6MTxp3SrAcIQbvz0wG6+aD4gEZTgG-yQEFQkIegPKdjwBfC8Cr6a4c6HgcJWBeBDC-KlS9r775qm7pwFqprFbDreh+EMpsZ8imBVTQgFpAjs4ICeAeYRCuCFyjTojQHhbk60BJFgTvRCRvSTCiKF7YIrhqKZTeylibCmIVGLgTDZK2RVSjDCJDAVjOD5yzzrBOyuLV4wGSRbYlo7QdFub4LdH4Ipr9GyGzCmDBCpzKxcgEITGlFByRbXK9wQBzHUb5jaI9HLE5SrGICRDBBFj0yHgT4tEDbjpHGwxRgnEkxcrnFLF9FXErxVQcJsTQbrBqyRAvGHF8yhQGGfHGBYQcJl6uD9CLzbggZzCFxrwOhWgYQwQlGbb7EzFLJqqwlzCDBWS9Efwig3b2BChDAIigieZZSTKLyWAQm4aTqzpiY1okn2CYLJochFyLSlTXGkn7juC8pUxgGbhsnyaTr4aarSo8lApiggHQj9KHjTD5S2RFQCikwmjmj0zPYJG+SdwHHskrLylbKcnclmHaaBCODqwpqTBTALCxDWqAnQr4IliWhxAylElynXq3ozr3o0CPoklm63b4LzCGl+55icrBDrCGKRBHgeR+n8ZymIaxLIbEbhkYjWR2QShUmlQ0nYK9CjEuSxBs4FRpmqoZmKbv7KaiZbI0A8m9JLDzCWSuLQSeArybh-oCqLSWSTTswvYmlBJmmHyVaObhmyhmCyjLR958jQh+ajJbxBb8q6yjmBKXKBQ7Yurhm5FcLmpMZkmQhChZzVjvyjRzQLwbanpvYfYkm1jsTyCon2BYQ9Dj7ukcJNGLQtEPEjk17qE8nsT57vTH6TShBUlF5ZR5wspWAjCTSQiLQX516ZAiAkmVQj6YT9D2CFn776KM6aw8hcaslqGx6EQkkAohAWaTSVjQrWBF5zzVgKxpZ5gTJ0FAX6HX4tIv4kkW6oQrTwjLT-LjBF7JyQQDIWBoh4KoKoXoF-Z8W2m04+k-m77by2CNiG6c6EWLTEXjCkXyXwFMG34CG9jeEJy05d4ijgWTCQX1iB6c7pSwXIWDkhZ3l6GK5v5aEA7hnMxij9rQbjBUEDDiXwiSXojSXew8iTSJCJBAA */
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
                      actions: "celebration",
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
      celebration: () => {
        // Do nothing, can be provided by the consuming code
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
