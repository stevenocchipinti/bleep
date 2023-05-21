import { createMachine, assign, send } from "xstate"
import defaultData, { Program } from "./defaultData"
import { speak } from "./audio"
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
  | ReorderProgramsEvent

const timerMachine = createMachine(
  {
    /** @xstate-layout N4IgpgJg5mDOIC5QBcCWBbMAnAdAGwHsBDCVAOygGIICywdyA3Aga3rU10JPKgSYIBjImloBtAAwBdSVMSgADgVipRZeSAAeiAGwBmHACYALPoCcOgIw6JAVj1mAHDoA0IAJ6JDO2zmPGJS2NDCUdDe2M9WwBfaLcObHxiUgpKbCwCXAU8EQAzTPQcBK5k3n4yZmE1WVkNJRU1DW0EE18wxz0JCT09R0jbSz03TwRLCWMcHy7bSMNLQ0MAdkXHWPiMRIUMqCwidAACMgJkfdgwPDBBZEhKAGUAUQAZe4BhABUAfQAFACUAeQA4j8AIIAWVqSBA9VUqFoTUQtl8xj6iwkiz0OhWPXGw0QxlRfjRxjMEgWXV6QTWIGKOC2BB2e1O50u1wgdyer0+v0BIPB0jqyhhcMhzWxfmsGMGi30wUWuIQ+IkhMWxNJIW6YSpNLpDIOZwuV0gOFgyAICgUN1ub2BPzeEMUgsaIsQYx0OA6wSCtiWi0MZn88rMekM7p0MuxYXCiy1Gyy212euZhogOCwAFcyGReJQvsCAKoPe1Qx2w9TOhDOEOdQKI7xh5GuDyIRwDHBOUmOIM6MyGXqGGOcWnxxn6llG9OZ7M-e4PO38yHQp2gUUkyaLAaODqOZZWRzyxyWSw4Ga2UlOMyDFurOLU2ND+kJpkG1mpjNZ1JFxel+EK2xmY8dGYf6+hq9jyss-6biEwQmIsPb4gOmzDomz7jm+vA4IIBAZmgFD7DQADuZCUG8ACSLwANKfiWwrLgi9g4KEhjOC2+LbhY8qWNKIYWHoqLemGZjojoiFxg+I5Ji+E7vlAmHYWQuFQPhBBEZQ1ENN+5YXiGOh+j4JIWOEm6cZYLaMaZxi2GEOhhMi-Y3tqyFPmOKbSRhwKZvJgi8PsABGhCCCw1C0PQAhsEUd46o+o7Jq+k4UDgHlHBm3l4f5QgsOUlQiKWNTzg6Gm0VoiB6PiOCSv44wtiYxKcZ0BgSPBcEklYtjRg5kVOTFUnoQlSVeT5WE4YRxHPMCAAiHxkZR6lCmWdEIIibrzH+yJ-t2VjGJxMwTNKjh2Cs+hSnoon3rqzmxW5fWeSlg3ycgI2UAAYqRABypG3AAEh8Y2TW9s1LsVCDdosRgSJiESbnxYbbf6RgOCqxhcfoDgiR1g5RRJqEpgoRBpmcbLTrOAOaQtVm+LpMwYjVSM6FtTYIKiu3EpETgg5ZxinZjKEubSeME3c1q2iTRXNMsvjLNYFjrvMcoMy2R7tsxXY9n2p1HPs3OwMFdAMBUrDsHeGta1lQg5eI0gi-NQPBm69hREjHpzJutjbb4fH+J2SNONZMTo0h4k85dvWyf1t1pQFQU0LrYWGxjXWSWh8WhzdZCpUp6WBabVS5ZblhyAuNHW80h5Ht0kt0+D1iHZxSNKnTSz+sEPZhCd-tied3VJzJiUEUQMJ4VhCnkGmYCUC8fyvWRr15vcVs-iE-7emYJILKiQbeq7DOHj0RiHt2DsnvYsQ3kcEBwBoxQCoVxeIAAtEEIaNeuwSenByOcaDlinnYdnehitZTrcBSFAa+c0fzehwOiQ8f5SR6C4sSPc280Tw0CEJKy5Ikac3bmdR8RwThdwgGAwGzRiRtmJPYRqFhpZ9HlA4CYVCezdlMksXsXME7Y2IaTIGd84bPxmCYOY79pTyisKDEwTdy58QEewwOF0XwmjNBaIhhcb4-jhvYb+0osQDECOBLi7o5iN38IeLo2D1jxzkYQuKMkuGi3vqYRi6DX5CIvCI5BwYcCmQPPtYkjdrwWIDp3ROrkQ5yRwj5Eadjb7A23OVEkURgx+LmI2EY1dQa00alEXSnYliyOCdjGx7lU7pz8pHaJP5ggSwhpZVWzEowmUsP+GyYQgimFJJTfJ0UQlFOuslNOd1hoqWtl+exwMGL6HCNiboPZwi1zmGuBwzFSrIk9F0rGvNcb40gBU8s4tyq9EaoqHoKJwLjCgSzFU-ErDBnVgQTWyF4CqPAeWewjg-AYm6G1dUphUkuhQb2NB9hfQhGXusoOPVk6937opfYQ9cKj12QtRWpJLLrhWCEWyCwTK2GWlBfEQRBjBDbrEIAA */
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
                      actions: "decrementTimer",
                    },
                  ],
                },

                always: {
                  target: "Announcing block",
                  cond: "blockFinished",
                  actions: "incrementBlock",
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
                    actions: "incrementBlock",
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

        initial: "stopped",

        on: {
          SELECT_PROGRAM: {
            target: "program selected",
            internal: false,
            actions: "assignProgram",
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
      timerFinished: ({ program, currentBlockIndex, secondsRemaining }) =>
        !!program &&
        secondsRemaining === 0 &&
        currentBlockIndex === program.blocks.length - 1,
      blockFinished: ({ program, currentBlockIndex, secondsRemaining }) =>
        !!program &&
        secondsRemaining === 0 &&
        currentBlockIndex < program.blocks.length - 1,
      isTimerBlock: ({ program, currentBlockIndex }) =>
        !!program && program.blocks[currentBlockIndex].type === "timer",
      isPauseBlock: ({ program, currentBlockIndex }) =>
        !!program && program.blocks[currentBlockIndex].type === "pause",
    },

    actions: {
      decrementTimer: assign({
        secondsRemaining: ({ secondsRemaining }) => secondsRemaining - 1,
      }),
      incrementBlock: assign({
        currentBlockIndex: ({ currentBlockIndex }) => currentBlockIndex + 1,
        secondsRemaining: ({ program, currentBlockIndex }) => {
          const block = program?.blocks[currentBlockIndex + 1]
          return block?.type === "timer" ? block.seconds : 0
        },
      }),
      resetTimer: assign({
        leadSecondsRemaining: 3,
        currentBlockIndex: 0,
        secondsRemaining: ({ program, currentBlockIndex }) => {
          const block = program?.blocks[currentBlockIndex + 1]
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
        () =>
          speak(program?.blocks[currentBlockIndex].name || ""),
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
    },
  }
)

export default timerMachine
