import { useEffect, useRef } from "react"
import { useTimerActor } from "lib/useTimerMachine"
import { currentProgramFrom } from "lib/timerMachine"
import { Block } from "lib/types"

// How far the animation may drift from the ticks before it's nudged back
const MAX_DRIFT_MS = 250

export const useProgress = () => {
  const { is, state } = useTimerActor()
  const { program } = currentProgramFrom(state.context)

  const { currentBlockIndex, secondsRemaining } = state.context
  const blocks = program?.blocks.filter(b => !b.disabled) ?? []

  const currentBlock: Block | null =
    blocks.length > 0 ? blocks[currentBlockIndex] : null

  const totalSeconds = currentBlock?.type === "timer" ? currentBlock.seconds : 0
  const percentageLeft = totalSeconds > 0 ? secondsRemaining / totalSeconds : 0

  const pad = (s: number) => String(s).padStart(2, "0")
  const minutes = Math.floor(secondsRemaining / 60)
  const seconds = secondsRemaining % 60
  const text = minutes > 0 ? `${pad(minutes)}:${pad(seconds)}` : pad(seconds)

  return {
    percentageLeft,
    totalSeconds,
    secondsRemaining,
    currentBlockIndex,
    isCountingDown: is("counting down"),
    text,
  }
}

/**
 * Animates an element through the rest of the current timer block in one
 * continuous pass. A 1s transition per tick leaves gaps on slower devices:
 * each one starts late, gets cut short by the next tick and snaps forward.
 *
 * Outside of counting down, the element should render `keyframe` for
 * `percentageLeft` itself (e.g. via its inline style).
 */
export const useBlockAnimation = (
  getElement: () => Element | null | undefined,
  keyframe: (percentageLeft: number, element: Element) => Keyframe,
) => {
  const {
    percentageLeft,
    totalSeconds,
    secondsRemaining,
    currentBlockIndex,
    isCountingDown,
  } = useProgress()

  const getElementRef = useRef(getElement)
  getElementRef.current = getElement
  const keyframeRef = useRef(keyframe)
  keyframeRef.current = keyframe

  const current = useRef<{
    animation: Animation
    element: Element
    blockIndex: number
    startSeconds: number
    lastSeconds: number
  } | null>(null)

  useEffect(() => {
    const element = getElementRef.current()
    const running = current.current

    const stop = () => {
      running?.animation.cancel()
      current.current = null
    }

    if (
      !element ||
      typeof element.animate !== "function" ||
      !isCountingDown ||
      totalSeconds <= 0
    )
      return stop()

    // A normal tick: keep going, nudging back in line if the ticks drifted
    if (
      running &&
      running.element === element &&
      running.blockIndex === currentBlockIndex &&
      secondsRemaining === running.lastSeconds - 1
    ) {
      running.lastSeconds = secondsRemaining
      const expected = (running.startSeconds - secondsRemaining) * 1000
      const actual = Number(running.animation.currentTime ?? expected)
      if (Math.abs(actual - expected) > MAX_DRIFT_MS)
        running.animation.currentTime = expected
      return
    }

    // Anything else (new block, resume, skip, rewind): start a fresh pass
    stop()
    current.current = {
      animation: element.animate(
        [
          keyframeRef.current(percentageLeft, element),
          keyframeRef.current(0, element),
        ],
        {
          duration: secondsRemaining * 1000,
          easing: "linear",
          fill: "forwards",
        },
      ),
      element,
      blockIndex: currentBlockIndex,
      startSeconds: secondsRemaining,
      lastSeconds: secondsRemaining,
    }
  }, [
    isCountingDown,
    currentBlockIndex,
    secondsRemaining,
    totalSeconds,
    percentageLeft,
  ])

  useEffect(
    () => () => {
      current.current?.animation.cancel()
      current.current = null
    },
    [],
  )
}
