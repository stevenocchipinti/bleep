import { createMachine, assign, raise } from "xstate"
import { assign as immerAssign } from "@xstate/immer"
import localforage from "localforage"

import defaultData from "./defaultData"
import {
   AllProgramsSchema,
   BlockSchema,
   ProgramSchema,
   SettingsSchema,
   AllProgramCompletionsSchema,
   ProgramCompletionSchema,
 } from "./types"
 import type { Block, Program, Settings, ProgramCompletion, AllProgramCompletions } from "./types"
import { playTone, speak as speakFn } from "./audio"

declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

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
type DuplicateBlockEvent = { type: "DUPLICATE_BLOCK"; index: number }

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
type SetSoundEnabledEvent = { type: "SET_SOUND_ENABLED"; enabled: boolean }
type SetVoiceRecognitionEnabledEvent = {
  type: "SET_VOICE_RECOGNITION_ENABLED"
  enabled: boolean
}
type SetAllProgramsEvent = { type: "SET_ALL_PROGRAMS"; allPrograms: Program[] }
type ResetAllProgramsEvent = { type: "RESET_ALL_PROGRAMS" }

// Voice recognition
type StartListeningEvent = { type: "START_LISTENING" }
type StopListeningEvent = { type: "STOP_LISTENING" }
type DenyListeningEvent = { type: "DENY_LISTENING" }
type AllowListeningEvent = { type: "ALLOW_LISTENING" }

// Completions
type AllCompletionsLoadedEvent = { type: "COMPLETIONS_LOADED"; data: AllProgramCompletions }
type AddCompletionEvent = { type: "ADD_COMPLETION"; completion: ProgramCompletion }
type UpdateCompletionEvent = { type: "UPDATE_COMPLETION"; completionId: string; completedAt: string }
type DeleteCompletionEvent = { type: "DELETE_COMPLETION"; completionId: string }
type SetAllCompletionsEvent = { type: "SET_ALL_COMPLETIONS"; completions: AllProgramCompletions }

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
  | DuplicateBlockEvent
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
  | SetSoundEnabledEvent
  | SetVoiceRecognitionEnabledEvent
  // Voice recognition
  | StartListeningEvent
  | StopListeningEvent
  | DenyListeningEvent
  | AllowListeningEvent
  // Completions
  | AllCompletionsLoadedEvent
  | AddCompletionEvent
  | UpdateCompletionEvent
  | DeleteCompletionEvent
  | SetAllCompletionsEvent

type Context = {
  allPrograms: Program[]
  programCompletions: ProgramCompletion[]
  settings: Settings
  selectedProgramId: string | null
  currentBlockIndex: number
  secondsRemaining: number
  leadSecondsRemaining: number
}

// Helpers

export const speakerFrom =
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
    /** @xstate-layout N4IgpgJg5mDOIC5QEMAOqB0AXAlgWzACcMAbAe2QhwDsoBiCM6sDGgNzIGsW1NcDi5SjSgJ2ZAMbJcTANoAGALoLFiUKjKwcM6mpAAPRAHYATBiNGALAE4TANgCM86wFYAHC5NGANCACeiF6WGNYOYSbWliY2DnYeAL7xvrzY+ESkFFS0dESEZMSoJNIAZvl4GCn86UJZouJSOioqehpaOnqGCADMThjylnbWXS5dll1uJvJuvgEIDi7yIdbLy-1GtiZeicnoqQIZlJB0ALIA8gBqAKIA+gAKAEqnAOL3AILHzUggrdo4TB2BLqRPqWKy2OIOIxueYzQKWFwhaFQzxuNx2KxGOzbECVNKCTJHADKlwAMpcAMIAFTujxe70+6k0v3+X06YTsCKcXW5HgmnhcdlhCBMkIw8OsmNMdkGlnmbmxuP2NSOADlLgB1GnPN4fJQtJntVmBJyLSJGJxudZDKxC6II6xIjwmVHoyzypI43ZVfGHCAYVB5KCEZB4AAEsDAJDAEiwRwAIpdiWSqVq6brVF8fobQJ0ulCQptZUMous4pYhTYjBhNi53A4vF1pZEugqvXiDhBIP7A8GwxGozGu7AsGR0ETKa97pSGd8DX9dEa5s5FrEOU4HG4BvILEKwpa+iYXPN4dFBhZW3x28q-QGyEGQ+HI9HY37h6PUEcHpdzgBJU4AVUJGcs3nAFukbDB3DsN1zQ3S0bX8RBoQcDAJmGExRjscZnGsC89mqAkbx7B9+2fIcRzHCA6DVAANac9UzOcWRzRBBjcatoOhVEwlrQVEIQZDUIwzxMPGBw8O9Dsu1ve8+yfQdXwoj8-R-CAozoV44zja4ACESVOckAGlgKYhcWO6FxrD6M95C6CJD0bPjZnrcYxWiaERJFTwJKvQjuzvXtHwHF8MDfSiMFU9SEzJSkbj0gzjIYxk2lAxdMPMOJrCmaIsphfiHDGLoMEbeR6wcHogXkLCfKVPyZMC0iFNCpSu0isATguOL9KMkyUuYgxEHQjKwgcFZ0XrIwXF3bkERcLdJrcCV5AWIwaoI31-NkoKyMU99WrU9r7kuFV3huB5tXpJLZz6syBvAxYxjiSbnA5FwjCq3cRis2tljmyxloWZY1p9TsiICkj5JCsLlIig66H-W441eWLUx1a4E0Jcl7h-W5KT-FVeuZW7Oi8dj2QFVw7MmSEfHy6x0WKgUpmlAY4hMYGpLBrbGqhlqVLhuMEZJH9yWRs7aR1QnszuuzFkbewRPehZSt3SaioK0IN36Eajw569NoayHyL2-motJS4UfOtMpdS8zuSK2x61cCw7MtDxdw8Ky7HsCI2bszE9bq4i5OC43wra+HEbF3TusSjNkqJsDRgROzhglf6ok8fpd2guxzC8JwBktUFt0Djb6oh0PdvC2BkDYEQGCYFhxG4Co21q8vg+2proaHOuRDEagOAaecmiukD+s6TxglrdweVcNw8xMXcnZCUbUSqkVuW9svQYNyudowQgAFdqGoBvbleQDLhtyfEHmSaxTBcYFmGTcnPvqFgihb2xnsJwRS72kl3HmXYT5nwbkdYk9F47XUToueY3IMCjVcG6YYphZ67lBHnJsbpFqYgKo2IBXNDZVyPqfc+2Qvy-gAkBcepkwKjXKsglEUw0RYU2B-ASoonC2DdBCHoWIPSKnWnvCuIdD7gMofQWiMD9Q3TApsIY1YNxAgWF4Kq1ghRImQc4dyAjYjEP3hIpqUiG632JvfFaII7JDHmNBTEU18p5iKkCZ0XR+juAwatYR7dRHAPBiYkKZjaAYAkGQU+uBaChkYAAd2oHQPGPV6EKMXBEHoblPCHlzu9aY+V1hmDcGsaEGEBiWXZr4y8HcxEgKNn6EJUAwkROoFEqAMSyDxLoBYpOvDkEAKGA6RsAxyz5XkBhfOzoqqvSGLWIx4ju7BIoSIDArwz7NIkCIUMAAjcgEhOCN2YKwIeXAeB+JBgE7mdTyEQNCas6g6zNk7MkJwQew9pCjyUN0tJOUJmvyiJrZau4RTsSlKVDkPIBQVJ2FU-xJCD6mKWbctZp8NnRKeXsg5zdjmtxEecuFQSwGIsaXch5aLdkvPqO8uQnyHCwInpY4UCsxSQg8rKKEYRabOTsihRwIwPBxCKVMFwczalkIaSs5F1BUVtPRfsxghyW6nJhXi4xCzCU3OJZK6V2zyWvMkFS6gTQTB0oYd8gUqEehoiKfbIZWCMlAjCJEJw0osItkqfhFV8zQH1KJRK+5KLHnksxUcjgOKzmc1Vd6650i-WkplbqyljRPldBNak8ynC84EIFEeWW3JPpRD6NvCmTr6xCOhR6iNXqrnipJQG6J4TIlxISUkuO8j4HpsiFZLK71oL-XNMMLoWCFiIi+v0TcllTAisCWqn1GrY11raQ2lpTaukpPbXdewrhIIeIwotdwtZl75XcFZK0Hj7HyGysK91kl9ZVrFb614sTkC-HrUwKJx92rklOCqPGKp-w3zXdLEmy12LlIiK4SYm4hgr1clBIEDq5RhCnZc+9c7a1Ss2QQWAtcYDBsVW3ZVlbRWSIfVqzDcAcNgD1SPalyhAO2zupCdwqFYjsqcOaGwXCAFmAlKTaIe42HIdISRtDyLtXDmQIQVpoYaB4exUqitt7iMItE-68TWBJPSZoNRg1Y9U3rpJoMHjy13EFQWtNesxVNz1gchhMZuFr2+U7tOqNqBkDHwjFRKBFsvnmSdurESkJlhOAFCM5ym4qwTHKs2CEYyy2ekI0plzVy3MefHJOORjE02MZGGYCdDopiWDdG6Jx4XQRCWi49aEYz3TlpvUHZLZDUueeopcOivnGOjGCIMSEjhIg1bCLaWyKENZhBKsMuIQn4UhWa5+I6NDAIdbZD0YIRTFp2GWu9PcXG+EYGlCiKIspRjOim2Ge5WAZ2rv00BqxRURKlX6F4KwbpD2zA2yhbNIGXGZx8XV9s9zQziNgHJ0NCnJIA6BzppNdHrsMdzL0fogwB1jAmFMXcDpIIXuBSMbK9g8IRiwK02AHYG7yqxaDgjoUwCE5EMTmoA9E0fJh22m7CB-pFVRFlKLzoIi2TC4gAAtGxSCBdkS-1rJYfH1Oick+yLkfI-oihYFKIQcoKQCcy-p7QKHTOlusSPIiNW5VZTOnhEKAXXFIKjSsOiV6sQr3lo17TzmdBoHXHOKcEWAHYd3wQEMRYEw4h2UcO9TEr3BfYItbypEjhGwOcd9L5315XcW2uISACKptLHVeHpS4cY9dzC5E-Ra8GPEeAFObyPi9o+9fKoMeL6vE+0Dp4ROg3nqSvBJCSVG7w6E+4ZZiDivIcKQn6KMSv5q8xKw8FTSd7qnfN5d27zv3erY6j7yzuHn87LmBQTZjbVhbKV4sFb7kzoHSuG9pNKXNPF-J7dx7r31wjpfqeCqH8eNv3XGz7n-P9HfflQQQbbLRdblRY55KzAC5V6NjlTOg-yjBuoJ635QDE61z1zRIL4oEg4nKU6YGoH9wYFN4oE660YF77rmBMxHhoiNjrCcqC4bgoSYhAhG7bilRjA34y4A54HYFhqYB4EYBcFEGwAkGGqfL-4MrexkwTCLyTC1imBeDm4WAPRHYeBjKH6OAcHO6EBwBEGA7BzA5k4ho4GN7IHE7aGYF6GBLCGM6kHiFgSLTmAuL2Co6kzlTm6yGoQ4TOBhDbiuBAzz5CGhQEFtJA48EKb8FoGbKQ42GiHM5ZYGb3zex5yeCjReD2RRDojm4MFij+70wDqwGbh4QcA4ASBgChjaHhJQDnw6ACFkAXYkA4DDhgDSKu4ThTjXDCyEixTv4qhPAF6Hioh7amDrxwbch0EIAC7HosZQhVRvRrh47urFGlHlHRh3jVHzi1H1GNGxgtFdEZYdE-hdHHQ-i9GyC0qb6+6Hi2B9Jpw-Tl6Ar8RQGODVh2QUwcgOijQN67BLFlEVFrFEykDbHNENxdGnC3AHFHE9F9F2FpQAwhBYS+H0ykylaC7jCuIciuoo5FahBFFkAlG-GrFVEAm3h4CoCtJ0AJgqgACaEJ3RJx0J-eiiEQVYzqT0h4kwHiKJEx5oCINgoQcQ3slk-08eCWGAPxKxlR6xTA-kpJ5JK+pwmonRdJpxMJ6aEQKEF6R4wKbKFejxxW1Y3htYqIxcCx5a4pfxRJNRkRhBphYRlO5phJUp1AQR6BbSeBIhemFxDKh4UwqEkozoZUI05ussxUcolo-u8Ib0iQHo9ynY8AXwvAXpYEAuh4yCVgXgdiaIYKH0jxywd2nxWOowRSh4wMSZ3yQkb0kwAigykQQonge2dmUQmwHkdkkujm1SIgZZ5k70FZpgVU0IQIm4WCK4SimUV+SJUKop9WvoXZd0EwB470HiWENgOUg6-Ewp+cIwYwhCcB8wp2M6s5y2iwahtkVUowfC0G-EpgwQqczoIw3IJYv2U5TmNSjWh8vcEAh5n87EJ5S555q5QokQwQRYBCUQ1q9Y+5UaH5sMUYX5jKecv5Z5K5Nga5zkzqyCbERgeYEoX0bZf21SFywmPcfMLpnZ8RrOTByC1mrgY6HiO4+Uhca8DoVopSloiBz5BF+KM60aZFCcrOsQyw1ktiwx729ggFwwT8d5AoFg9uIpuKRGb5KmMaS60mTacFGiVYmIAwGioIPQupzkbMa8jY6iXEgekF1apG-qGGZKzy6l9sLGSR22lBu4NWqElo7kVUBUso5lqGMa6G2qKlal5FW+wotukEvKWOhUqiw5Zgd5Ml9spUmwPlImflT6L6i6b6NAH66lYyZg-0doFggei04ecw7ie2x4shFgHxyVSlyy-l5G2GyAMAcFkI5WZ5zJIoolXGsoiw6w4QgifOBUNViyqmES6mmmmyNA6l6IVk4weRfhi0oI4xHK30mw7IpUQIeRw10k7mnmLVJuzKy0o+fI0IHs5WUWQIR2eYus7ZsKqq52B5wVAB9ZkyUIoeAloQ4xWcBpIoqCC8tWHF6QEO+hcFRpfQ24UorqiCJVBUI5vs62GZ3sk5JhRO6l7Ea170UQ24lkZUXCAuWUCFnxWFys8w9Mmhd+mQvFcCrOlUxUWFW4GRvGeNOinOmsPI-GeFop-B14cFRWPGEuk0lY9Mo05uc81YCsjYYxzgN1SBMu1pbpQhcFHGbkxV6wIBIwXJUBIo1Y-0PhaCHI-Q5NKBtRj4phcFloecLk6I28tgxl5uLNi0bN4wHNRtZhOhyBlhsk8ZfFIVg+GNj22NoQmwwZAwIQnlUIe611ANKNzu8tntvY3t1NIVkImwFq70Eooei8R+jxycoZx6i0awW2T5KQDpkp669KTJEEb08w7gkGZo9t5q6w-CEQi0RSRWuJ+JEp-xNRD1DRTR0i6lWF6sRWaIvWA5Iwihgw1YZoRSch6p0d3xeJyxFpTpgJ-dVNFdaS8hUe9gK225DgIdGps9RW6IgeW8Hdy9jpxJeQspG9pq6arxYoRZ3KG2kyeNUxjoIBE0b8F9BJZdVpwRptqNT13ppukEPJtdUw9dOd8IedrdWUS1pU0Z8QQAA */
    id: "app",

    schema: {
      context: {} as Context,
      events: {} as Events,
    },

    context: {
      allPrograms: [],
      programCompletions: [],
      // Settings
      settings: {
        voiceURI: null,
        soundEnabled: true,
        voiceRecognitionEnabled: null,
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

                          DUPLICATE_BLOCK: {
                            target: "saving",
                            actions: ["duplicateBlock"],
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
                            actions: ["deleteProgram", "deleteCompletionsForProgram"],
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

                        entry: "startListening",
                        exit: "stopListening",
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
                      actions: ["celebration", "recordCompletion"],
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

              SET_VOICE_RECOGNITION_ENABLED: {
                target: "saving settings",
                actions: "setVoiceRecognitionEnabled",
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

      "voice recognition": {
        states: {
          "not listening": {
            on: {
              START_LISTENING: [
                {
                  target: "prompting",
                  cond: "voiceRecognitionNotConfigured",
                },
                {
                  target: "listening",
                  cond: "voiceRecognitionEnabled",
                },
              ],
            },
          },

          listening: {
            on: {
              STOP_LISTENING: "not listening",
            },

            invoke: {
              src: "listen",
            },
          },

          prompting: {
            on: {
              DENY_LISTENING: {
                target: "not listening",
                actions: "denyListening",
              },

              ALLOW_LISTENING: {
                target: "saving settings",
                actions: "allowListening",
              },
            },
          },

          "saving settings": {
            invoke: {
              src: "saveSettings",
              onDone: "listening",
            },
          },
        },

         initial: "not listening",
       },

       completions: {
         states: {
           loading: {
             invoke: {
               src: "loadCompletions",
               onDone: {
                 target: "loaded",
                 actions: assign({
                   programCompletions: (_, event) => event.data,
                 }),
               },
               onError: {
                 target: "loaded",
                 actions: assign({
                   programCompletions: () => [],
                 }),
               },
             },
           },

           loaded: {
             on: {
               ADD_COMPLETION: {
                 target: "saving",
                 actions: "addCompletion",
               },
               UPDATE_COMPLETION: {
                 target: "saving",
                 actions: "updateCompletion",
               },
               DELETE_COMPLETION: {
                 target: "saving",
                 actions: "deleteCompletion",
               },
               SET_ALL_COMPLETIONS: {
                 target: "saving",
                 actions: "setAllCompletions",
               },
             },
           },

           saving: {
             invoke: {
               src: "saveCompletions",
               onDone: "loaded",
               onError: "loaded",
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
      voiceRecognitionEnabled: ({ settings }) =>
        !!settings.voiceRecognitionEnabled && navigator.onLine,
      voiceRecognitionNotConfigured: ({ settings }) =>
        settings.voiceRecognitionEnabled === null,
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
      startListening: raise("START_LISTENING"),
      stopListening: raise("STOP_LISTENING"),
      denyListening: raise({
        type: "SET_VOICE_RECOGNITION_ENABLED",
        enabled: false,
      }),
      allowListening: raise({
        type: "SET_VOICE_RECOGNITION_ENABLED",
        enabled: true,
      }),
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
      duplicateBlock: immerAssign((context, event: DuplicateBlockEvent) => {
        const blocks = currentProgramFrom(context).blocks
        const blockToDuplicate = blocks[event.index]
        if (!blockToDuplicate) return
        
        // Create a copy of the block with a new ID and modified name
        const duplicatedBlock = BlockSchema.parse({
          ...blockToDuplicate,
          id: undefined, // Will generate a new ID via the schema default
          name: `${blockToDuplicate.name} (copy)`,
        })
        
        // Insert the duplicated block right after the original
        blocks.splice(event.index + 1, 0, duplicatedBlock)
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
      setSoundEnabled: immerAssign((context, event: SetSoundEnabledEvent) => {
        context.settings.soundEnabled = event.enabled
      }),
      setVoiceRecognitionEnabled: immerAssign(
        (context, event: SetVoiceRecognitionEnabledEvent) => {
          context.settings.voiceRecognitionEnabled = event.enabled
        }
      ),

      // Completion actions
      recordCompletion: immerAssign(context => {
        const program = context.allPrograms.find(p => p.id === context.selectedProgramId)
        if (!program) return

        const completion = ProgramCompletionSchema.parse({
          programId: context.selectedProgramId,
          programName: program.name,
          completedAt: new Date().toISOString(),
        })
        context.programCompletions.push(completion)
      }),

      addCompletion: immerAssign((context, event: AddCompletionEvent) => {
        context.programCompletions.push(event.completion)
      }),

      updateCompletion: immerAssign((context, event: UpdateCompletionEvent) => {
        const completion = context.programCompletions.find(c => c.id === event.completionId)
        if (completion) {
          completion.completedAt = event.completedAt
        }
      }),

      deleteCompletion: immerAssign((context, event: DeleteCompletionEvent) => {
        context.programCompletions = context.programCompletions.filter(
          c => c.id !== event.completionId
        )
      }),

      deleteCompletionsForProgram: immerAssign(context => {
        context.programCompletions = context.programCompletions.filter(
          c => c.programId !== context.selectedProgramId
        )
      }),

      setAllCompletions: immerAssign((context, event: SetAllCompletionsEvent) => {
        context.programCompletions = event.completions
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
          if (data) return SettingsSchema.parse(data)
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
          return speak(
            `${block.pronunciation ?? block.name} for ${block.seconds} seconds`
          )
        else if (block?.type === "pause" && block?.reps && block.reps > 0)
          return speak(
            `${block.pronunciation ?? block.name} for ${block.reps} reps`
          )
        else if (block?.type === "pause")
          return speak(block.pronunciation ?? block.name)
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

       // Voice recognition
       listen:
         ({ settings }) =>
         send => {
           if (!settings.voiceRecognitionEnabled) return

           const SpeechRecognition =
             window?.SpeechRecognition || window?.webkitSpeechRecognition
           if (!SpeechRecognition) {
             console.error("Speech recognition not supported")
             return
           }

           const recognition = new SpeechRecognition()
           recognition.continuous = true

           // Speech recognition will stop automatically:
           //  - After 5 seconds if no speech is detected
           //  - After 60 seconds of listening either way
           //
           // While this flag is false, anytime the speech recognition stops, it
           // will automatically be started again by the code below.
           let reallyStop = false

           recognition.addEventListener("result", (e: any) => {
             const results: any[] = Array.from(e.results)
             const result = results[results.length - 1]
             const sentence = result[0].transcript
             console.log(`🗣️ ${sentence}`)

             if (sentence.includes("continue")) send("CONTINUE")
             if (sentence.includes("next")) send("CONTINUE")
           })

           recognition.addEventListener("end", () => {
             if (reallyStop) send("STOP_LISTENING")
             else recognition.start()
           })

           recognition.start()
           return () => {
             reallyStop = true
             recognition.stop()
           }
         },

       // Completions
       loadCompletions: () =>
         localforage.getItem("programCompletions").then(data => {
           if (data) return AllProgramCompletionsSchema.parse(data)
           return []
         }),

       saveCompletions: ({ programCompletions }) =>
         localforage.setItem("programCompletions", programCompletions),
    },
  }
)

export default timerMachine
