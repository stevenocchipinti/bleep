import { createMachine, assign, send } from "xstate"
import defaultData, { Program } from "./defaultData"
import { playTone, speak } from "./audio"
import localforage from "localforage"

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
  | ReorderProgramsEvent

const timerMachine = createMachine(
  {
    /** @xstate-layout N4IgpgJg5mDOIC5QBcCWBbMAnAdAGwHsBDCVAOygGIICywdyA3Aga3rU10JPKgSYIBjImloBtAAwBdSVMSgADgVipRZeSAAeiAGwBmHACYALPoCcOgIw6JAVj1mAHDoA0IAJ6JDO2zmPGJS2NDCUdDe2M9WwBfaLcObHxiUgpKbCwCXAU8EQAzTPQcBK5k3n4yZmE1WVkNJRU1DW0EE18wxz0JCT09R0jbSz03TwRLCWMcHy7bSMNLQ0MAdkXHWPiMRIUMqCwidAACMgJkfdgwPDBBZEhKAGUAUQAZe4BhABUAfQAFACUAeQA4j8AIIAWVqSBA9VUqFoTUQtl8xj6iwkiz0OhWPXGw0QxlRfjRxjMEgWXV6QTWIGKOC2BB2e1O50u1wgdyer0+v0BIPB0jqyhhcMhzWxfmsGMGi30wUWuIQ+IkhMWxNJIW6YSpNLpDIOZwuV0gOFgyAICgUN1ub2BPzeEMUgsaIsQenCOEc4x8DnGjjMQWM8rMrqMOiDxls3X9hjMWo2WW2uz1zMNEGNpvNNwAcvcABp2-mQ6FO0DNAC00aV3WCvQ6QQWZnl0omxkstmWxMWC1msc4tITjP1LKNJrNFrZv3uADUAJJ-ACqt3tUMdsPUzoQpcsZkMOEs1kWEb9znCco8iEcizMOBWtiWZnDi39MTi1LjffpiaZBtZOCwAFcyDIXhKC+YEF3uJci1XeEEAvK9lgPQZoxmElTxGRwBhwJxSV9DFt16Qwe02fsk2-I1-0A4CfnuB58zkQsV2FEsXRJSZEMcDoL2lSxHHlRw9xwGYI2jX1Bgw1YX21EivyHVMKKA1JszzSDGLXZiN0iK9ZVdUM9EiXo0MQeZrBwbpO07QwOn8MxFiI+MPwHZMf3k4CJxnedFwLB0Gmg9dS2JZsyVbZDxhVeVBkxXdQ33PdSTGZ91l7HVP0HFNfwAhSqBUnymK0PFbCvWwOjMArOw1exG0vd0wnGLtLxMWzJLfZLHLIuSMt4HBBAIAC0AofYaAAdzISg3mnF4AGlsqFNS8tggrTPvJYwj0TsisMcKdB0Hdjxbbw9C3S87PfXUZLSlyKC6nqyD6qABoIYbKGm4s5psnRJh0fi23sMYukscL9qMDFLzCJwLA6Y6WtI2T0soy7gUA67BF4fYACNCEEFhqFoegBDYIpmuk1LnI6+HEYA5H+vRoQWHKSoRFXGovOXHLZuaExAp4iyxhWaNwqiHceKDXn71DJZIaJpzyNJqAcARo4KZR6nMexugGAqVh2EJhzofOmW5fJshKbu5XaYEKpGekMRLHo7yZpghZ3rMZ3neWNFwnmXiz1GfxHF3bdb3DV1iW2iWdbOkm4dl+WkaVjGsZoNW8a1pLJba2HMoNhWjbjmm6aEBnxCtwxbZZ+31zmP2WwCEJA9CW8hm91tTCiiNbB0SIujmRrEuI8PielqOs9j-rut6oaRueYEABEPjGybnt89SL18PTgm3UWxg48KAivV091Me9QjsGMmtT-upfaoeY8V0fruQCfKAAMWnTNp1uAAJD4p9n1-F9y5ooZFhGDGGLVEAwbCGR9voHAGJAg8Q9NtduYdToDyvpnYEg0iAwjvjdcgf4wCUBeH8TMY1MxzggszKCACjIHlMiJKwB4WyIh4gDaM14li9AOuMbhEle72VQZfDOnUb4536pgWAsAiAwFVrjDW+MpIX3ThdaOhtjb7AkVImA+cLZFxkFQ1SMFNwhHdBIKwPRDA6TCHMTa21JgSGFgdSwKpwh6BQSlIRCgiB-jOGyaitF-5swRBhSY4RIjbX8C2DujZxjXgCg4ZwNlwzGHca1GGXifGWmtLaQJMFli+GWNYCwiElh8UwthSyQYxYEWOkcfYUNYCyPVswBRb46kNJ0YXMgTNS7UKCQgHSgkegzB4npSuGFwqIlgSqZE94twcW8M+F8RwIBwA0MUAUrMjEFSVMEEIwUSqhVsOFYBrYuhWDmIsvcJVjrcBSFATZ5d1K3mvE4nZljnHEi9iMHmQNAg2SKuSauqSDhHBOGgx5L1mjEiwsSewDiLDFL6PKBwEwEXbmimETsbiz590EW1SFS85qlhmDuPZgRbyHPxMc72jCjDxJ8M4LaGIQUR2HOmMchKaEIHvH4EwiL7wdFRHzb2j4CkzMsiEDu1hWVoOERQLl-TNyfVMeY10ViFjhS6MAjCFLVrLGijoWVQiVFXV6ijCeiqYKfWAd6KIwdtxzADE3duwCtqIl5ksUIlJcUCI8co-Woj1GmytRXEqsCnDhNvKSphWrw1RECKYDi21PqEV9Sdf1MNTVBpRmPG6lqGJbPXF6SYrpbw+HvLMBsTdLLNk9vYfeJJwjGoDdfLBOC7rdTwWQAhob1JjCwq6BYozHxzH0PzDuglAgrGsqM8YLas2BrUSjTR0iwB9rmrWvwq18SWT0h0DaTctpKmGZW6MxIGoLrShk3xG7mj5Ngb0BxioegohiRMFU94VTgPMWm-hOB2kkXgIWp5c17BVzgVEMqnpXBNzRH8rc9gLJ2GjLEWIQA */
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
              START: {
                target: "running",
              },

              NEXT: {
                target: "stopped",
                cond: "nextBlockAvailable",
                actions: "nextBlock",
                internal: true,
              },

              PREVIOUS: {
                target: "stopped",
                cond: "previousBlockAvailable",
                actions: "previousBlock",
                internal: true,
              },
            },

            entry: ["resetTimer", "stopTalking"],
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
