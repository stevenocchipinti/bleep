import { useState, useEffect } from "react"
import { useTimerActor } from "lib/useTimerMachine"
import { currentProgramFrom } from "lib/timerMachine"
import { Block } from "lib/types"

export const useProgress = () => {
  const { is, state } = useTimerActor()
  const { program } = currentProgramFrom(state.context)

  const { currentBlockIndex, secondsRemaining } = state.context
  const blocks = program?.blocks.filter(b => !b.disabled) ?? []

  const currentBlock: Block | null =
    blocks.length > 0 ? blocks[currentBlockIndex] : null

  const currentBlockPercent = (n: number) => {
    if (!currentBlock) return 0
    if (currentBlock.type !== "timer") return 0
    const currentBlockSeconds = currentBlock.seconds
    if (blocks.length === 0) return 0
    return (secondsRemaining + n) / currentBlockSeconds
  }

  const from = currentBlockPercent(0)
  const to = is("counting down") ? currentBlockPercent(-1) : from

  const [isAnimating, setIsAnimating] = useState(false)
  const [targetPercentageLeft, setTargetPercentageLeft] = useState(from)

  useEffect(() => {
    setIsAnimating(false)
    setTargetPercentageLeft(from)
    setTimeout(() => {
      setIsAnimating(true)
      setTargetPercentageLeft(to)
    }, 10)
  }, [from, to])

  const pad = (s: number) => String(s).padStart(2, "0")
  const minutes = Math.floor(secondsRemaining / 60)
  const seconds = secondsRemaining % 60
  const text = minutes > 0 ? `${pad(minutes)}:${pad(seconds)}` : pad(seconds)

  return {
    isAnimating,
    targetPercentageLeft,
    text,
  }
}
