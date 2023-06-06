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
    /** @xstate-layout N4IgpgJg5mDOIC5QEMAOqB0AXAlgWzACcMAbAe2QhwDsoBiCM6sDGgNzIGsW1NcDi5SjSgJ2ZAMbJcTANoAGALoLFiUKjKwcM6mpAAPRAHYATBiNGALAE4TANgCM86wFYAHC5NGANCACeiF6WGNYOYSbWliY2DnYeAL7xvrzY+ESkFFS0dESEZMSoJNIAZvl4GCn86UJZouJSOioqehpaOnqGCADMThjylnbWXS5dll1uJvJuvgEIDi7yIdbLy-1GtiZeicnoqQIZlJB0ALIA8gBqAKIA+gAKAEqnAOL3AILHzUggrdo4TB2BLqRPqWKy2OIOIxueYzQKWFwhaFQzxuNx2KxGOzbECVNKCTJHADKlwAMpcAMIAFTujxe70+6k0v3+X06YTsCKcXW5HgmnhcdlhCBMkIw8OsmNMdkGlnmbmxuP2NSOADlLgB1GnPN4fJQtJntVmBJyLSJGJxudZDKxC6II6xIjwmVHoyzypI43ZVfGHCAYVB5KCEZB4AAEsDAJDAEiwRwAIpdiWSqVq6brVF8fobQJ0ulCQptZUMous4pYhTYjBhNi53A4vF1pZEugqvXiDhBIP7A8GwxGozGjg9LucAJKnACqhIZ3wNf10Rrm1nRGA59fhcTsk1sQpcDmsYuG8iMe+XmwSHsV1QJfoDZCDIfDkejsYgdDVAA1KTOs-OAcLhjMeQgTiKw7DzE9y38RBT0PBYT33LdnRcVs+HbZVbx7R9+xfLtYCwMh0CJSlXnub89UzOcWRzRAwnkBFQKhUZHFcUYhSGLo+ihZ1UXkeQ7D4hxUL2a9fW7e9eyfAdXwwfDCNQLtRwgKM6FeOM42uAAhElTnJABpH8qIXGjuncDA+WAkx3FlLc3Cg2YnFMDAuhrHpzViPcjGE70Oy7O8Hz7Z9Bz9OSiL9JSVITMlKRubTdIMijGTaP9F2YjBPCiPMXEsfjZSsoV6xXKymIsYt+O89Cb3EgKpNwkKCLCjAIrAE4LlinT9MM5LqIMRBAPS2JLBsHjuWsArYgPIa81sPMOQWSwKqVKr-MknDgtkhqFPC5SWvuS4VXeG4Hm1elEtnbrjN67oukWfdNn6cZoTcbkCrzTj4UlKYPD41xFtEztMIk7Cgpk0Ktqana6AnW441eGLUx1a4E0Jcl7lHW5KXHFUuuZS7Oi8KtLQcNwHQmcZnQKtx5AcasRipnp7GJ+Y-p9AHqtWkG8M2xTIbjaGSVHck4aO2kdRx7Mrpc27IQdWIt0KtjoLmdwq36OJRk8fiHDdFnfMBmq1tB7ntsi0lLnh4603FlKTO5Tj0XsCx6K3LcfCViaaaceFtccWJYi8y82yWsSVuB6SufknmVOh2H4bizqzt-Hrc3hLiSfsQYVeegq3UWLc3RFOWJX6XWMPZsO6o2yOQuQNgRAYJgWHEbgKiD-6-KwwLw-q6vZNrkQxGoDgGnnJpE6M-8MucsJYh6S0BkV2Zl04pEXAlE1nvcUvls72r1sIABXahqHr25XinS5reT2i8tXKn6PranRhhd2OWCNFMS8IYBPg7eQ93w2XZD7H3rntYk5EMxJVxv+MIUQxT2H6HxCI1p7K0UGuYZs0pwImmPH-Nmocu6V2ASfbIV88ZoNiNWQY0JiZGGGPucalD3DZWPGMDKeCO5A0IfvI+JCoAYAkGQI+uBaChkYAAd2oHQTGCdIHnWgYuaIIpzITBsPfDwdhUFzGGAiY86wrACklHmDh+sObdwwMQkQAihHUBEVAMRZBJF0DIf+KylD1gRCcA4PMwExpKxdH0IE2t1iglcM4Ex5duEyUsbQDArxj42IkCIUMAAjcgEhOAN2YKwIeXAeBt1Zpwg2nM-QxP4fE6giTklpMkJwQew9pCjyUC4xcxNlHRGPCTFwUo3QuAKsBNwtNXBjCMNTbKQIIkEL3tE3hViKlVNETUjJWSm65JbleQppiK48JAbE+ZR8kmLPSXU+ojS5DNIcHIpO5C5j03MsTaw8gazOmlONGwgTNHLFMN4vckyAElIsbMvZCSDnVOOSsnJHB1kFL1pE6ZQCgXlJBdQQ59ilknNySPc5ygTBXInq09YCITDcmAp-cCuUCrOjMF4EUApkILxbIHNCwd8H-PMWUuJyLUWhkEcIiRUiyRqWuDIhKeKLquPhAiEm1MEFr0bK892zgGKIViGiJmW8mUiU2XCwBpTEWcsqaC0RvLbH8roAAMVHCqUchIAAS1xBUaStS0kymwVz7ipieLwaq-EOVnquD1Ep1Yf0ZTsZl7ctlRIRbs8p4jkC-GNUwERB8WrklOCqTGKoJyX3HuK1pAkzATE0QhAUrDBRKwdAeKwERxnzCsOVTVPky5TN1YCmNBqFn2IILAWAyAYAQubvk8N2qW0Ao5fslFyTu29pgPUyQZzqBjzFQoky3jpRihsMBQYfF0TmiFGiSadNnCWiefWFCjbKr-y4fC28yAD4RjfGA82LqrphCptWYC2VWLPQGNMd2qjqw3R8XZLw-EsQXpZUUsxldUB3ofXQQkJEyIvrZJ4ICNhHDDGLhTV+2VzLoldt-eiuCIMRrhZUrAN7nG5pXa+kY6ViXU36ATIaEwhQCRpgKBY7g3pRG6brSpoYCGwAHWsodWqMCCeE3OrFi7mk0YlrmXoashgjDGBMKYBUHTpSQcTEYUw3XCQjFgOxsAOz10YNkwdrdMDGdM+Z2gMmF1Lv1HmkyOUV7SomPWCYjzF6IAALTUIY+aZE+dawLU1XZkQZmaj11yPkf0RQsClEIOUFI0XaCxcyAPU5jR5PLsU4gNciITw9Gfs6eEQoAtPQGhKAYmJaweSM2AEzMW9YIfNtcc4pxBY5sKzbK6mjBl0MxOMUZaJBgmGq6CKsUIizDW6RYAYLW2tZY6+A64hJJwqg0vtV42lLhxhQ4gOyqtmybHrMsOyM2LDmDsvuRbFgTyrfsxhOgT7qSvBJCSBG7xpwKcG50TEVDeTOFCKMsYWiAsbmck7ZhLkaWvfa+9zb33fuWx1ADgb185jODsNPc0lpv6YgGLdubIHjxmm8d4yLYbZKtfs72uuojMtQBE5Z1ZULxNs7M8z5JvOnP5eUID3HzDzClr3GiRs+jqtM3MOBCUIxHLUzGMj9bgneeie5zZhna32eSbIE+fXsAhdNJFzjm5tkMBtOepMWspgvDVadhu7x30gha3VwbwgcBGfJOE9rvJuvecWN9-roTndTd5fNydhAJNzBvXsBp713jqv2-MuD5wdFCXLC93z-uoiA+c8hUHjLfv1v88L5Hs32LY+rBt3dJ5y47J7jl9CBXQIysq+1oyj0lTOzwC+LwVztHOgBasjb6t6w54cYEuW2YAXlicVPJBVEPtzQsxH0V4UhbiqTAhECZ6kRdxmC3DdaIoyltr3dPTptOXaBb6B8YRYfJTD8WhIfrR2tbqbGb2eUsmwJij+uO7e3EWG4ITWxMFYzg5gVkC8xGxKoIfy16uqwBNyV292xKa8EBe4UBSs269ydCywYQjY12yBxS5iYMkAaBMCd2YB2B9gkBf6swFggybknk3I5ozE5B0G60VBJsYANBiiE+9BywjBuBzBiAkQiw-EJ4jyBMAy1gPB2yRsvcleUAQhJkn8IQQIGUo0xY7E4whBa8miTeB6yhUaeqMamhr6c8G6fm26she6SsUINMrEgwg0u6FgFhN6bafC1iwiyS-KNh+MxUzk0ImioIzgs0X+YRNKPm5oa8SqPhra46XKYKtSIRtElogyxGYwcQIoyIfS-i76D0VMdkHIAkJcpGI6bKRC+qE63KJqWAwRlEbmV0mwxKq4xKNCVkqmvqUhK4z0UoYIYSQwKRY6DRcaCa9igitiNAKaWRys6wNuzCUwCEDMX+wS6UjYCwPs9Ec8Ex7KDR6Roi06faghbRo+tEaGIQ1Cbk9ExBlK3S1Y3yLsNg8IUwRxMGcG1BVx2+2s9YYoTgnkBmdYlM0QgGwEpBWeHIoanow6sKUyFGN6Sx8w1KnqJ65ogwEOJ+iwkwIowyrgqIAmRuwmSxtYuReiGc3I8wLkOcP+EQcQ-+Z4JgeeSxzo1YhRzGx4a89YsQ1WjyBO1MSuW42BmUeeDmGh-xT+3QjycOzEzGgwUo1WSIKixB3i5MsodOCJeub2N4SxQ0Zgrg2UkEEoy4DCSsAWPGXJcJ4EPirgQkUW5eBu6hxupmSxBG5k8EnxIw0Q4w1WGs6UH8rBZ+42569OIemuLpg+UC2+loBO9YMu3IU2uxqpooqIGpPI0Q2skpPubOEeXCsZ8i2+IOl2kOkwch9Y02VpaUQpkImZIwJ4N+upIebp5JMpuOFoBOUOb04w4w2U8+gWQZ7gXhaIxK4ZiQiQQAA */
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
