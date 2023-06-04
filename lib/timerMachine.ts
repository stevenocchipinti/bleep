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
    /** @xstate-layout N4IgpgJg5mDOIC5QBcCWBbMAnAdAGwHsBDCVAOygGIICywdyA3Aga3rU10JPKgSYIBjImloBtAAwBdSVMSgADgVipRZeSAAeiALQA2AEwBGHAFYAnHqMBmA3oDs94wA5TAGhABPXUYnmczhIGQfYhtvam9gC+UR4c2PjEpBSU2FgEuAp4IgBmGeg48VxJvPxkzMJqsrIaSipqGtoIOgAsBs44EQbW5r0t5kbOdtYe3s3d9jhtlr6W5s4O0bEgRYkkkJQAsgDyAGoAogD6AAoAStsA4qcAgps1SCB1qqi0jYjm7TgGkS1D1qbOfr2UY+FqmHASQyWMESCS-YKmGJxDAJbgQDYAZX2ABl9gBhAAqJ3OV1u90UymerweTSM5gkXwkdIkziMTnsehathBzSMkQhCxaQT0piMwX+S2RnDW6IglAAcvsAOrEy43O7SWqUho0xCc8F6QJG0xw0LmYFeHzWEwAzlw6z2LmzAxIlYo4rrCA4BTpKBYIjoAAEsDAeDAgmQGwAIvssbjCarSRq5A8njrQE0dNY-DgjHp6aZrCLTN9rTy8wYcHo9D1OeYWv02S7lqs0ZBvb7-UGQ2GI9GAKrHbEASTx1wJRzOarJmtT2pe6l1CGtJgM5lMhpNRn62fM5dFnS5kKC68B+b0rtbSXbPoIfoDwdD4cjctO+3lt0nJPV5Me8+pGaIJEHTmgYjjBC0dbOCMloIHyJiOtmegngCkGWJe7oyjenYPj2z4bIOUbjl+06bIcMYYnipzDscBLDts8q-mmC5vAgQwmA47ROshgxgfuCFHsha6oeeGHSm2Xq3ve3ZPn2coxriE6Jj+s4UvULFLkYvEQqeQyhKyJrOOW1oQj064St8YItGJqLXpJOEyb2L44LAyAEAoCiYgS1ynASTH-ougEICa-iGI4EiFvWTjrnoPLQdYEJCo6Jb-Nujg2R6sodneXaPk57aue5nlyoRxGHAAQti2x4gA0v56kAVoPgirm3TVm0kKGBYsWwW0lYGAYVmuOetjmBlWH2TluGyc5hUeRs9VUoFTXjHyUwtHm5pBO0rLzDyDjgj0A2RNWfjFuNEnZdJeX4V6c3FTgw4QGGCr7AAGn5ql-g1y1NCKkwNjYhrOE4IqQjyJb+PWDaQ+YPR+GNLaYZdUm5XhckuW581ek9L1nPsuz0f2GKLemK3WL8OAU84HwDdmLSOj1YyQzg0NgmucP0r0F12VdaMzQVWMPbjYCUNcUZRhVVW1aTGlBdYJklgN3wxWuEX7YrkQhRuTLc0j4m86j035XdQvtiLlAKfsSmVdVdVfcxjVNKEehU7WCMDfY9buLBNY2lrfg63SiNSrZnp88bt2Y0V5vPaLOwHFLduy07QHGFT9bQV7NOAhTGv+xEgc8XroeZdhU2OVHWAAK5kGQvCUMc1zE-sKe-YgWkmYNwrWpYR08vYWlVh8piRPYNN2Ol+th1lRuVxjNd1w3b5Yp9KZqUtrFWC0Uzw3DhY1tYzhGbB8WJRIyXdKKDOSm6Bvh3PN0L7X9cpIqH1t6xWa9LmvyhCWaUj57lgr4OErMBpchLBYUU1oeYPwck-Zyi9X5UHxoTbYxNP5LlaGuUyfIVZBDpKKcseYd4I3NICPwfJnBwNngg9GSCX4NywUFNk-g7C+FFH4IUVgfZjCGDvI+ftQjHkMLQ8u10GHtmQbwHAggCC1zQBQQMNAADuZBKB0Rlg7AKrEtJgSrACQeNgFjHzBOWWEkwTGWW3PSbciJp5l0mpIgWXoZEUDkQosgSioAqIIOoygLCVpe36hfZCbRt7QRPmMTukxviuFAvmEsNDHETQjvPRhS8PHXDrl4wQvBAwACNCCCBYNQWg9ABBsEKMjQ29DXE4HcVAHAOSyB5IKcUoQLAygVBEAuaoOifqsRhBCUUWlYSQiLAzcs7QEp2CsLCdoAwR7iOcfzE2jSmHZNybXfJyjOmlPKXQBg5RWDsFqfAiuiDpFbOaa09p+ySndIEJUfp0gxBGHXt9TeS4uSVihHSBsYJfBe2MoECE1ZdoNh6LYayqSUb1I2U0lpOyyB7N8QcspNBjlVPOffOhVypFuNuSitpuyOlPJ6UIPp4h3kGC+Y7duCA2hkK5ArMCvwQaOn3GCXMYo+gX0GgrFJpc0mPyJZsrJdzUXosDPIxRaiNG4nFocLR9sGW6M0myBK-RfjWl4euDa-FJgbjsHpMGcLRUIsJQ05F9zyXKPld4xVlAABiw55TDgxAACUOMqyWHqglNHNOCQaJpFkAl8CKGZhgqamCsvSAaNYHFWrqTapFJLriqKIM8R1tAlHV1FniBidF5T9lboMn5QVvgMjYW0B0AwLARQMDMnoVZ2hMjaHmQ0gxVnpOucSqVpKHm+MwLAWARAYBHMqac6pV5LkuIzUO+1aKCljonTAKlrzaUyErWTJoDNWb1jFCyOGdhTwkJahYXoRYNz2CQn28VDSFBEGriGV8sZrZBo7hMswR9j6oXPb8fadh232N8NuTkbRH2Iqji+t9XkfJry1EMzSntOgREiEyXicJomIGMcPb4Y8J6LBg+mqOTAiB4FQBAIpTzKClRttLdVKGq0rR0PGqGg1BT1mQoPYBzMNpmHhCDRY-QmRkcXVHIg47UBQBQYEvdct2MOldjAk6yF2JaQtIJhK2cNq9FZBByT6zpOyfk8wz5rH926DAiBe99740WFZL8JmQFzQQm4Y5wILJugmYfG05AA7FMatQ0FDjsabAAn+BwhsgJywgyrEKUUa4okbWsONNpgY56wGnSc5gc7MJZZy1umlZABmhbY5mDaobBqOEiEfMUG4eQ6DpHphwEUJ4skgksZYbT0TwAeEUazynMz5gSh8Vzuq+N0hawrBK25bBHwvqemsF54UlAoCN1OzRDAJU4zWoV+YPgtbDUl2FxgwJhSCKs7bTL9C8smzxyCF9ZuwUrH4CKqEjFgQppau+M8JGmbkndr+FhJhPbrC9-jPJ2gmDZmtsCYELD+YyYLGOEBQeaR3vEh0NhzQnvHjBMYRZ-BArBOuf+YIMsbYXcD2aZscZxyx0FWNuPB49EHsEceENsxTGCPMKwBZ2gpoB04-tEqmks-Yx0UUon1zGD1ZyPDCBllViPktx0F9x7NlTXTyOz8h1Op8X49R0vg0tRZQ4WshYuUkM+AWEGYpB5GdvvOglUnDcoOHQ6jFTzzdASZBCK74T5gQfBiArS4JHeQwVhFX4qOB2Su9yu2VxvFUB9VyZasho-CAi9mFYysaJD-FcHyGsIMRVi7FbBr3sis05pN-I7x5BC2Z6TWYfB8wGZMkFHwjuDpZfVi9v8WsDpE+S8zTKtdcAN1gEz2234Yp6bj1FMm-cJlx4g0u9aOE8aJ-Ptfe+zPWk2QQkdFNhm8aL4gddoYbcQpoLxppiHav1rPfOUo9R2jmLM9ZkBOtP8FtIhEMAsPtA4J3pMk4GrEWFXu7kDgbs5DJioBZltnOGFuxulhhh8N2pFIQv3suK4J0GGhytpmuAzInoFgOn-huK7HYkKHnsjntKfP4E2qPA2LrJYIaJlgQNlg5INhvDZryIllBvooZK4GuKdrypyBds7tds2DEEAA */
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
