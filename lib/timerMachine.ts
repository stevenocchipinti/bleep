import { createMachine, assign } from "xstate"
import { assign as immerAssign } from "@xstate/immer"
import localforage from "localforage"

import defaultData from "./defaultData"
import { ProgramSchema } from "./types"
import { Block, Program } from "./types"
import { playTone, speak } from "./audio"

type LoadedEvent = { type: "LOADED"; data: Program[] }
type StartEvent = { type: "START" }
type ResetEvent = { type: "RESET" }
type PauesEvent = { type: "PAUSE" }
type TickEvent = { type: "TICK" }
type LeadTickEvent = { type: "LEAD_TICK" }
type FinishLeadIn = { type: "FINISH_LEAD_IN" }
type SelectProgramEvent = { type: "SELECT_PROGRAM"; index: number }
type ContinueEvent = { type: "CONTINUE" }
type NextEvent = { type: "NEXT" }
type PreviousEvent = { type: "PREVIOUS" }
type UpdateBlockEvent = {
  type: "UPDATE_BLOCK"
  index: number
  block: Block
}
type ReorderProgramsEvent = {
  type: "REORDER_PROGRAMS"
  sourceIndex: number
  destinationIndex: number
}

type Events =
  | LoadedEvent
  | SelectProgramEvent
  | StartEvent
  | ResetEvent
  | PauesEvent
  | TickEvent
  | LeadTickEvent
  | FinishLeadIn
  | ContinueEvent
  | NextEvent
  | PreviousEvent
  | UpdateBlockEvent
  | ReorderProgramsEvent

const timerMachine = createMachine(
  {
    /** @xstate-layout N4IgpgJg5mDOIC5QBcCWBbMAnAdAGwHsBDCVAOygGIICywdyA3Aga3rU10JPKgSYIBjImloBtAAwBdSVMSgADgVipRZeSAAeiAGwBmHACYALPoCcOgIw6JAVj1mAHDoA0IAJ6JDO2zmPGJS2NDCUdDe2M9WwBfaLcObHxiUgpKbCwCXAU8EQAzTPQcBK5k3n4yZmE1WVkNJRU1DW0EE18wxz0JCT09R0jbSz03TwRLCWMcHy7bSMNLQ0MAdkXHWPiMRIUMqCwidAACMgJkfdgwPDBBZEhKAGUAUQAZe4BhABUAfQAFACUAeQA4j8AIIAWVqSBA9VUqFoTUQtl8xj6iwkiz0OhWPXGw0QxlRfjRxjMEgWXV6QTWIGKOC2BB2e1O50u1wgdyer0+v0BIPB0jqyhhcMhzWxfmsGMGi30wUWuIQ+IkhMWxNJIW6YSpNLpDIOZwuV0gOFgyAICgUN1ub2BPzeEMUgsaIoRPhwg0siJJEjMvXR8rG-hwPWWcwxekMekWWo2WW2uz1zMNEGNpvNN3tUMdsPUzoQAFoBo4cCtLNLkV1ItZ-aFDMXIlErHMgoZVnFqTHaXHGfqWUaTWaLcmAJIQC6UABy9wAGnb+ZDoU7QM1BkiW91EZj-LYLPK+jpJuGbON-KrDNHOJ36fGmQbWSmB0aR2PfvcAGpDv4AVVuGYX2fhox2DgMy2OEGL2GMOhLNWUHAc4iwmI4YzzK26wXjq149kmOBYAArmQZC8JQXzAt+9y-lmwpLogli0WYbrHpYHRmCxziuB4iAWBM4xsbYqJjOGMRttqXYJreRp4QRRE-PcDyznI86UTm1EIFBEzhI4YTdGimk6OxIyOLYRbLGYwRWCqEg6MY56bKJN69smkmEakk4zhRDT-rmeb9EYZbhP4LadPpNHhvRSzGEZlknlBNmxle3aJneTlES+75fj+c4Oh5VFaIg3kkr5tGDI464OEMHGjOWhJWYsMyLPMCyoe26F2VhSX4c5VDuUKym5QgqK1sEGKIQMEVmIYu56JYOAVuNmLesEFixZeur2dhyUUDgggEPhaAUPsNAAO5kJQbxDi8ADS3WLn1zgTPMTErLVlmLGYcoVUxSGTIEJV2DomkLEJaG2fFYkOThHW8FtO1kHtUAHQQx2UNdnkqU4006GYfGRSeczBZVX1vVYzgRkZtFNSJoNre1UmbcCBEw4IvD7AARoQggsNQtD0AIbBFB2GEJeJjmQ3TDP4Uz+1s0ILDlJUIjZjUmWZtlvXNCY9H+KZCEIcE4wYv6fFKuNjjSlBU32DFwkC61iUSaLUA4PTRwS8z0sc1zdAMBUrDsDbVNtfbtOO87jNu+zssCFUivSGIlgKVlPUARGtakrVThkpiSzlSM1h6TgPqWGY8ymD6DhRtbLUB3bIvB074tkJL8Pu5zNBe7zftV6tge1519cu434cy3LQgK+IseGAnKtJ7mCwGP41hzN0z16Y4-plgXx7+Bi-0+Gelcg93NcQ3Xoeu-t227UdJ3PMCAAiHxnZdKM5c0mlKpGTE+mN9jdP6UFFksnYPQyJlhWVMstQWYN1oO37mHC+MNkDX0oAAMSHOOIctwAASHxb4P3QS-NWiABpGF6IYH0cxDJhAmh9f6qcWK2BepEb0WNIG22FifPuwJDpEBhAg2G5BcJgEoC8P444zrjk-ORZWf5X40RKjNPipgFiYj4npGhud-BFlMJieq4xaIzD0Gw6uHCNohwbk3fYmBYCwCIDAT2PMfZ80pkfUxsCz6D32tY2xMAR7R3HjIGRSkAJ5gMcWFY9glhF28Gid6udNLTRAabKwdgzKaWMa48GCgiC4TOGyGSclCEATCKuUytgrIAJWGvCq0pfDojRB6SMURNQHzipk7C2TcmWmtLaIpuZkK+G9M4H6iIzbyi4jNZEekjYCXCMtI4+woGwAcd7ZgziOwLKWX4seZAlZT1kUQhAh5gI9BmExEBlDDKG18JGLRpki4Ax8BkzCx8LRYBUCaIifSVJ5m8GFUkEU0RonGlWCqZSC6NMxuc0yptnlC3Bv2NMbJPxfDvsCN49wPgACFHh-GfkE1WITQLTRJP9MY6JOhohzsQqykxMagWMEXRaaI4XQLvEQGxqAoCdWRgSmePzXoGCsiVRlWMTAUl3NuAudDvCRj6HjVl1MjQcpUNyr58cBSEq8v9Awy8goWFLH0Mw4zTB0stiKy2cxFU91WUQPAqAICswjpQFFaKMXYtxfi-ZwSvJvSVNYd+nQNIkmpQgYuBhdZGVegMMYzhYhtiOBAOAGhiiav5X1UJll9wBpKkGoyJINE0UWG6Rh+tMRBCskxfewMSg8AoGmm6zRQLFimh6AtU0VROGrMWiMgQ3qRW6Iy6yrSVrXiOCcHuDbUZ9WJAXYkv8WKY0xH0eUDhuIsTmsXMICEjEjqgUqiAU65H5mQkWHN2lg1-wqtuIs+gYl6XXAJa1x9EWDiPYc0JtKkmgXqrMAa8pd5ukPKWMC4Vn0cNfY+UcYB30hNovub9US-19vGQsN0PhP6r0jBXGto74UwODrBryEpwmGXDPVOasT-QqLgjC0kLFIg6HA+DMx0NdrM2vkRlSmNBqlixpGKCVlyHr2cISYkekJTjWJMxgjXCLFDw5lxvqlK-AxMjBqI1-oprcUcPx5EEYioU39u0mmcmB6WMvrDTjiktXcaMnSwIUSdIzGMIbboJaFiMo0iqJje72EsfcTwvh8NtoCLIEIpTy5fBYwzqTVJnQViGw6EYRlIHgjwWHbh-dNrWMeMsd4uxMGbPpvVrpvwUwKX6YiK5j6pt6JonsOGAz0oWlZf8x0nJeTIs0UCBMCTTFghjG8FZeUtSW0NPsOiIy1bmqHxeRwpgdqHVOplt1-Mv10MYl0yTImthqzlILmXHoxJnAgZk3eN5Hy4Zre8n0QkDWbD4krKh42HoAg2BmKZN68yCCLNEvAYrjaES9D8BidcCEKx6W7aQvtk2ySgTMOd5VnK1X1sB9O5oeYOjcV6JiTGdgzaFv6oy9DWNTBk3Id0eN0QgA */
    id: "timer",

    initial: "loading",

    schema: {
      context: {} as {
        allPrograms: Program[]
        selectedProgramIndex: number | null
        program: Program | null
        currentBlockIndex: number
        secondsRemaining: number
        leadSecondsRemaining: number
      },
      events: {} as Events,
    },

    context: {
      allPrograms: [],
      selectedProgramIndex: null,
      program: null,
      currentBlockIndex: 0,
      secondsRemaining: 0,
      leadSecondsRemaining: 0,
    },

    states: {
      loading: {
        invoke: {
          src: "loadData",

          onDone: {
            target: "program not selected",
            actions: "assignAllPrograms",
          },

          onError: "no programs",
        },
      },

      "program not selected": {
        on: {
          SELECT_PROGRAM: {
            target: "program selected",
            actions: "assignProgram",
          },
        },
      },

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
                },

                description: `This is just stopped`,
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
            entry: () => console.warn("INVALID BLOCK"),

            on: {
              UPDATE_BLOCK: "assigning",
            },
          },

          persisting: {
            always: "stopped",
            entry: "persistProgram",
          },

          assigning: {
            entry: "updateBlock",

            always: [
              {
                target: "invalid block",
                cond: "isInvalid",
              },
              "persisting",
            ],
          },
        },

        on: {
          SELECT_PROGRAM: {
            target: "program selected",
            internal: false,
            actions: "assignProgram",
          },
        },

        initial: "stopped",
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
      timerFinished: ({ program, currentBlockIndex, secondsRemaining }) =>
        !!program &&
        secondsRemaining <= 0 &&
        currentBlockIndex >= program.blocks.length,
      blockFinished: ({ program, currentBlockIndex, secondsRemaining }) =>
        !!program &&
        secondsRemaining <= 0 &&
        currentBlockIndex <= program.blocks.length,
      isTimerBlock: ({ program, currentBlockIndex }) =>
        !!program && program.blocks[currentBlockIndex].type === "timer",
      isPauseBlock: ({ program, currentBlockIndex }) =>
        !!program && program.blocks[currentBlockIndex].type === "pause",
      isMessageBlock: ({ program, currentBlockIndex }) =>
        !!program && program.blocks[currentBlockIndex].type === "message",
      previousBlockAvailable: ({ program, currentBlockIndex }) =>
        !!program && currentBlockIndex > 0,
      nextBlockAvailable: ({ program, currentBlockIndex }) =>
        !!program && currentBlockIndex < program.blocks.length - 1,
      isInvalid: ({ program }) => {
        const x = !!program && !ProgramSchema.safeParse(program).success
        console.warn("isInvalid", x, ProgramSchema.safeParse(program))
        return x
      },
    },

    actions: {
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
        currentBlockIndex: ({ currentBlockIndex }) => {
          console.log(
            `nextBlock - from:${currentBlockIndex} to:${currentBlockIndex + 1}`
          )
          return currentBlockIndex + 1
        },
        secondsRemaining: ({ program, currentBlockIndex }) => {
          const block = program?.blocks[currentBlockIndex + 1]
          return block?.type === "timer" ? block.seconds : 0
        },
      }),
      previousBlock: assign({
        currentBlockIndex: ({ currentBlockIndex }) => currentBlockIndex - 1,
        secondsRemaining: ({ program, currentBlockIndex }) => {
          const block = program?.blocks[currentBlockIndex - 1]
          return block?.type === "timer" ? block.seconds : 0
        },
      }),
      resetTimer: assign({
        leadSecondsRemaining: 3,
        currentBlockIndex: 0,
        secondsRemaining: ({ program }) => {
          const block = program?.blocks[0]
          return block?.type === "timer" ? block.seconds : 0
        },
      }),
      stopTalking: () => {
        speechSynthesis.cancel()
      },
      assignProgram: assign({
        selectedProgramIndex: (_, event: SelectProgramEvent) => event.index,
        program: ({ allPrograms }, event: SelectProgramEvent) =>
          allPrograms[event.index],
      }),
      assignAllPrograms: assign({
        allPrograms: (_, event: LoadedEvent) => event.data,
      }),
      updateBlock: immerAssign((context, event: UpdateBlockEvent) => {
        const { index, block } = event
        context.allPrograms[context.currentBlockIndex].blocks[index] = block
        context.program = context.allPrograms[context.currentBlockIndex]
      }),
      persistProgram: () => console.log("PERSISTING PROGRAM"),
    },

    services: {
      loadData: () =>
        localforage.getItem("allPrograms").then(data => {
          if (data) return data
          else throw "No data found"
        }),
      saveDefaultData: () => localforage.setItem("allPrograms", defaultData),
      startTimer: () => send => {
        const interval = setInterval(() => send("TICK"), 1000)
        return () => clearInterval(interval)
      },
      announceBlock:
        ({ program, currentBlockIndex }) =>
        () => {
          const block = program?.blocks[currentBlockIndex]
          if (block?.type === "timer")
            return speak(`${block.name} for ${block.seconds} seconds`)
          else if (block?.type === "pause" && block?.reps && block.reps > 0)
            return speak(`${block.name} for ${block.reps} reps`)
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
      announceMessage:
        ({ program, currentBlockIndex }) =>
        () => {
          const block = program?.blocks[currentBlockIndex]
          if (block?.type === "message") return speak(block.message)
          else return Promise.resolve()
        },
    },
  }
)

export default timerMachine
