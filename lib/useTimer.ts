import { useState, useRef } from "react"
import { playTone } from "../lib/audio"
/* import data from "../data/dummyData" */

type Status = "running" | "paused" | "stopped"

const createPromise = (
  duration: number,
  onTick: (secondsLeft: number) => void
) => {
  let interval: NodeJS.Timeout | null = null
  let rejectPromise = () => {}

  if (duration <= 0) throw new Error("Duration must be greater than 0")
  let secondsLeft = duration

  const promise = new Promise<void>((resolve, reject) => {
    rejectPromise = reject
    interval = setInterval(() => {
      if (secondsLeft === 0) {
        resolve()
        clearInterval(interval!)
      }
      onTick(secondsLeft--)
    }, 1000)
  })

  const stop = () => {
    if (interval) {
      clearInterval(interval)
      rejectPromise()
    }
  }

  return {
    promise,
    stop,
  }
}

/* if (typeof window === "object") window.createPromise = createPromise */

const useTimer = (duration: number) => {
  const [status, setStatus] = useState<Status>("stopped")
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const [secondsLeftOfBlock, setSecondsLeftOfBlock] = useState(duration)

  const secondsLeftOfProgram = 0
  const text = ""

  const startInterval = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      console.log("beep")
      playTone(440, 0.3)
      setSecondsLeftOfBlock(secondsLeftOfBlock => {
        const newSecondsLeftOfBlock = secondsLeftOfBlock - 1
        if (newSecondsLeftOfBlock === 0) {
          reset()
        }
        return newSecondsLeftOfBlock
      })
    }, 1000)
  }

  const stopInterval = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
  }

  const start = () => {
    if (secondsLeftOfBlock === 0) setSecondsLeftOfBlock(duration)
    startInterval()
    setStatus("running")
  }

  const reset = () => {
    setSecondsLeftOfBlock(duration)
    stopInterval()
    setStatus("stopped")
  }

  const pause = () => {
    stopInterval()
    setStatus("paused")
  }

  return {
    start,
    reset,
    pause,
    secondsLeftOfBlock,
    secondsLeftOfProgram,
    text,
    status,
  }
}

export default useTimer
