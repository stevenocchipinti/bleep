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
type AddBlockEvent = { type: "ADD_BLOCK" }
type DeleteBlockEvent = { type: "DELETE_BLOCK"; index: number }
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
  | AddBlockEvent
  | DeleteBlockEvent
  | UpdateBlockEvent
  | ReorderProgramsEvent

type Context = {
  allPrograms: Program[]
  selectedProgramIndex: number | null
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
    selectedProgramIndex,
    currentBlockIndex,
    secondsRemaining,
    leadSecondsRemaining,
  } = context
  const program =
    typeof selectedProgramIndex === "number"
      ? allPrograms[selectedProgramIndex]
      : null
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
    /** @xstate-layout N4IgpgJg5mDOIC5QBcCWBbMAnAdAGwHsBDCVAOygGIICywdyA3Aga3rU10JPKgSYIBjImloBtAAwBdSVMSgADgVipRZeSAAeiAGwBmHACYALPoCcOgIw6JAVj1mAHDoA0IAJ6JDO2zmPGJS2NDCUdDe2M9WwBfaLcObHxiUgpKbCwCXAU8EQAzTPQcBK5k3n4yZmE1WVkNJRU1DW0EE18wxz0JCT09R0jbSz03TwRLCWMcHy7bSMNLQ0MAdkXHWPiMRIUMqCwidAACMgJkfdgwPDBBZEhKAGUAUQAZe4BhABUAfQAFACUAeQA4j8AIIAWVqSBA9VUqFoTUQtl8xj6iwkiz0OhWPXGw0QxlRfjRxjMEgWXV6QTWIGKOC2BB2e1O50u1wgdyer0+v0BIPB0jqyhhcMhzWxfmsGMGi30wUWuIQ+IkhMWxNJIW6YSpNLpDIOZwuV0gOFgyAICgUN1ub2BPzeEMUgsaIsQK0MOEWITMIUMekGaKGHkQYzMZj8fR6+kMjlsHsMWo2WW2uz1zMNEGNpvNNwAql8ACLAt73D4AIUefxeAGl7VDHbD1M6EABaAK+DE2fohxFe2zy6UTTG2H1DswemOWeOcWlJxn6llGk1mi1smvQp2gZot0lGAIh6U6HROKLysZhd2qzELYzBuNxakJ6f05NMg2sjNLo0ASQgF0oADl7gADTtflITXet4VGWxQy6KxelsDp0Q9Rx5WjGCZnxGwBkcMwHEnTYZxTV8F0zZccG-X9fnuAA1T8-mzW5VzrYUNzxQIcGsaU+hmXpFhDVDoJwOx-GlOxLBwvC721QiX3ndMsAAVzIMheEoL5gQY+4mIaCDG0sSwvRwRxjMsGZHD4n1BnlCwJnGZwfFRMY9G8fDEyfWdUzfRTlNUn57geEC5DA5iG1YhAOl8SwkMiYzbCsSIT3GHRJkcUkwn8fQwj0VzH11WS0xwbyVNSADgO0oVQq0RAWyiIx+3Cfwo06VxA1GZzQyWYwEIkHR-FMW91inHVnznAqitUqjaPoxjQIdHSWKq5tVTq-TBlSqIHADEYglSwlesWGZFnmBZVikh9ho84j5KU4qqHK9dFoknAnHMgJUuMhw+xJSZrwOnp8SHZYcouoi5MKm7eBwQQCCUtAKH2GgAHcyEoN5Pyre7dLC5wJnmcSVgOnq+LlVrxMcSxJkCVK7B0YyFhiM6hpk0avIhigoZhsg4agBGCGRyhMYW5onApw8Y26vq5ha7bkQp0crGcYdyfE4Hmc8o1xvZ4FlM5wReH2AAjQhBBYahaHoAQ2CKc61au8GfK1nWlL1+GjaEFhykqER6xqWba3myrmhMUN-DMfElhMEJImloMYyVL1zIPSz7B0Ab7yZ9zQbGtmoBwbWjmd-W3ZNs26AYCpWHYG3M-y1mHdz-PdaL42PYEKofekMRLCCuaKsgn03VJA6nDJS90RPA9ktwgz5lMXCHEWVWa5ZjWc7zp2yBdnni9Nmgy8tquM7ylfrvr9eC835v3c9oRvfETvDB7-2+8bBYDH8aw5m6QmDxQ0n+2euMPq7ZnBDiXsfdWp9brnybvDaGsMkYo2eMCPMHw0YYz9uBIWiBjJKj0EdCSXUzD2G6BPKMQksJ6GRMsXqYdwEjUgfbaBjdC5wM5sgRBlAABin4-yfluAACQ+Mg1BvDBaBxdNuH0YRcJzGjGEQwE8zwSC7ETSIKjiH0MumDTWDdEZEBhGwrm5AFJgEoC8P4f40Z-mzFpTBIVILiSVHYFUqdvAHX3Io0m-hHB+APMsMY15TKRC0VnOuzCN5b32JgWAsAiAwFLhbCuVtpLL0YbomBrCeYxLiTAG+7d74yHsQHSCTZ9K+GWNGZyR0vQ2GWCeEyOAqGJzGDMbwxlQm1yNAoIgCkzhsj8gFcRkEwgU2cmMFUdgwh8TMH2fSRhmo+FsGiJwi9GYETSXbHpfTLTWltMMvS4RkqBCCEOcYVNMTWUGDuKw0EQzEP7J0k+5dGBEDwKgCAhsW6UFzAWIspZywYKflgiRzYVihgPGMbwPUuqh2slQowtNxgHQMiqAyTzGFEFiagKAt0BbFJfmFJsNgDBBCHuJbs4drILEmKnMOPhoxLEPDlI4+wQawESS8yu1spysvZfku+ZBfbAocY2ZyyV7BRGvB0YIZNeyk0RE0lUyIw4GTpj4DFdssUqFxapLuIqSmNhbBYSYMYnBWAsl0Sw1kDpGDkeifxqd0SarBouLM6YKJmJQagssFZqwEoes0UyoY9wqicOHAYXiRgWApss5EtM7n4MpOstyEC7ZurIp6ygeYOT-N9UCgUhqwpUIMIYEMUUgidC6AlVqMacBxtej6FUKJYh3iOBAOAGhiiFsJYtJssVaVQpsL1DCsz-4cWWcJfE+kljOBytwFIUAe2BoRG6dE5SSSWTDX-baaIFmBFHN1bo15jCdKOCcE+y6saLWJM9YkJCQyHkxH0eUDhbL3O8GYcSEdsoptygwq6V7sHNkQoO0kw7YXEnlFYCmU7Ab2GMviF1BUM2QCA6Csp+g-APOMiqaCu4Y4IEPL4xEGVeKfxMMht8qGPU-jAOh0p5TsMxlw0Q3cJMRhoXrb6Lo6I34PKo6veuDGjUSndCsewSwDLQvqaTOYixnpRGWfIulHRBNQMhvA4x8NEEibCoeN0v1iH4NTr1MtJ4VjJQCMSSF5hg7qaYZDFhl9XYtz04tKtfhoX4I1H0Md21fS2RwhELKq1TqDQ2WmnRa9nNRK0xwvmlUQWQQZbSwIUm0TRn8CeZZpKhwmHmAhVxDmMnAn0YYnm0NtOmPc0G3wxCR7DmEp0FYOWOg7n0h6YIzgVQlZi5E-WOT4n0eCkWxaUYQ5THRM08IVDjANL4kJP6zkt20zTqkqLBVtn9Nq0GaTkwggeNSmGqKfYQj1vBdJ36Za1kRdTQBsGTA3kfK+e7XbzYrAQu7PMEkEp5iJWWNxzEuEibhDsA57VOLbrveJfYbjoR7mSxUX2Kw7o-Q9SCCGJtLKCBssIvAUbvbmgIb8BiboMZ1SmEIxM-dBl7CxjsGW1t0QgA */
    id: "timer",

    initial: "loading",

    schema: {
      context: {} as Context,
      events: {} as Events,
    },

    context: {
      allPrograms: [],
      selectedProgramIndex: null,
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

                  ADD_BLOCK: {
                    target: "Idle",
                    actions: ["addBlock", "persistProgram"],
                    internal: true,
                  },

                  DELETE_BLOCK: {
                    target: "Idle",
                    internal: true,
                    actions: ["deleteBlock", "persistProgram"],
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
            entry: ["updateBlock", "persistProgram"],

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
      assignProgram: assign({
        selectedProgramIndex: (_, event: SelectProgramEvent) => event.index,
      }),
      assignAllPrograms: assign({
        allPrograms: (_, event: LoadedEvent) => event.data,
      }),
      updateBlock: immerAssign((context, event: UpdateBlockEvent) => {
        const { index, block } = event
        context.allPrograms[context.currentBlockIndex].blocks[index] = block
      }),
      addBlock: immerAssign(context => {
        context.allPrograms[context.currentBlockIndex].blocks.push({
          type: "message",
          name: "Untitled block",
          message: "A new block",
        })
      }),
      deleteBlock: immerAssign((context, event: DeleteBlockEvent) => {
        context.allPrograms[context.currentBlockIndex].blocks.splice(
          event.index,
          1
        )
      }),
      persistProgram: context =>
        localforage.setItem("allPrograms", context.allPrograms),
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
