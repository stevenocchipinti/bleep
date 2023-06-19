import React, { createContext, useContext } from "react"
import { InterpreterFrom } from "xstate"
import { useActor, useInterpret } from "@xstate/react"
import timerMachine from "./timerMachine"

const TimerActorContext = createContext(
  {} as InterpreterFrom<typeof timerMachine>
)

interface TimerProviderProps {
  children: React.ReactNode
  celebration: () => void
}
const TimerProvider = ({ children, celebration }: TimerProviderProps) => {
  const timerActor = useInterpret(timerMachine, { actions: { celebration } })

  return (
    <TimerActorContext.Provider value={timerActor}>
      {children}
    </TimerActorContext.Provider>
  )
}

const useTimerActor = () => {
  const timerActor = useContext(TimerActorContext)
  const [state, send] = useActor(timerActor)

  return {
    state,
    is: (partialState: string) =>
      JSON.stringify(state.value).includes(partialState),
    send,
  }
}

export { TimerProvider, useTimerActor }
