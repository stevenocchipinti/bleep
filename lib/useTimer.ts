import { useState } from "react"
import { playTone } from "../lib/audio"

type Status = "running" | "paused" | "stopped"

interface Block {
  start: () => Promise<void>
  stop: () => void
  pause: () => void
  resume: () => void
}

const createIntervalBlock = (
  duration: number,
  onTick: (secondsLeft: number) => void
): Block => {
  if (duration <= 0) throw new Error("Duration must be greater than 0")
  let secondsLeft = duration

  let interval: NodeJS.Timeout | null = null
  let rejectPromise = () => {}
  let resolvePromise = () => {}

  const tick = () => {
    if (secondsLeft === 0) {
      resolvePromise()
      clearInterval(interval!)
    }
    onTick(secondsLeft--)
  }

  const start = () =>
    new Promise<void>((resolve, reject) => {
      resolvePromise = resolve
      rejectPromise = reject
      tick()
      interval = setInterval(tick, 1000)
    })

  const stop = () => {
    if (interval) {
      clearInterval(interval)
      rejectPromise()
    }
  }

  const pause = () => {
    if (interval) clearInterval(interval)
  }

  const resume = () => {
    interval = setInterval(tick, 1000)
  }

  return {
    start,
    stop,
    pause,
    resume,
  }
}

const useTimer = (durations: number[]) => {
  const [status, setStatus] = useState<Status>("stopped")
  const [currentBlock, setCurrentBlock] = useState<any>(null)
  const [secondsLeftOfBlock, setSecondsLeftOfBlock] = useState(durations[0])

  const secondsLeftOfProgram = 0
  const text = ""

  const blocks = durations.map(duration =>
    createIntervalBlock(duration, secondsLeft => {
      console.log("beep", secondsLeft)
      playTone(440, 0.3)
      setSecondsLeftOfBlock(secondsLeft)
    })
  )

  const start = async () => {
    try {
      for (const block of blocks) {
        setStatus("running")
        setCurrentBlock(block)
        await block.start()
      }
      reset()
    } catch (e) {}
  }

  const reset = () => {
    if (currentBlock) currentBlock.stop()
    setCurrentBlock(null)
    setStatus("stopped")
    setSecondsLeftOfBlock(durations[0])
  }

  const pause = () => {
    if (currentBlock) currentBlock.pause()
    setStatus("paused")
  }

  const resume = () => {
    if (currentBlock) currentBlock.resume()
    setStatus("running")
  }

  const toggle = () => {
    if (status === "running") pause()
    if (status === "paused") resume()
    if (status === "stopped") start()
  }

  return {
    toggle,
    reset,
    pause,
    resume,
    secondsLeftOfBlock,
    secondsLeftOfProgram,
    text,
    status,
  }
}

export default useTimer
