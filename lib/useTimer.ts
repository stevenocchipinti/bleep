import { useState, useRef } from "react"
import { playTone } from "../lib/audio"
/* import data from "../data/dummyData" */

type Status = "running" | "paused" | "stopped"

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
