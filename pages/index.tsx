import Head from "next/head"
import { useState, useEffect } from "react"
import { playTone, speak } from "../lib/audio"

import styles from "@/pages/index.module.css"

function Timer(): JSX.Element {
  const [duration, setDuration] = useState<number>(0)
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const [timerId, setTimerId] = useState<NodeJS.Timeout | null>(null)

  const startTimer = (): void => {
    if (duration <= 0) return
    setSecondsLeft(duration)

    const newTimerId: NodeJS.Timeout = setInterval(() => {
      console.log(".")
      setSecondsLeft((secondsLeft: number | null) => {
        const newSecondsLeft =
          secondsLeft !== null && secondsLeft > 0 ? secondsLeft - 1 : 0
        if (newSecondsLeft === 3) playTone(440, 0.2)
        if (newSecondsLeft === 2) playTone(440, 0.2)
        if (newSecondsLeft === 1) playTone(440, 0.2)
        if (newSecondsLeft === 0) {
          playTone(880, 0.8)
          clearInterval(newTimerId!)
          setTimerId(null)
        }
        return newSecondsLeft
      })
    }, 1000)
    setTimerId(newTimerId)
  }

  const stopTimer = (): void => {
    clearInterval(timerId!)
    setSecondsLeft(0)
    setTimerId(null)
  }

  const formatTime = (seconds: number): string => {
    const hours: number = Math.floor(seconds / 3600)
    const minutes: number = Math.floor((seconds - hours * 3600) / 60)
    const remainingSeconds: number = seconds - hours * 3600 - minutes * 60
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  const handleDurationChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ): void => {
    const newDuration: number = parseInt(event.target.value, 10) || 0
    setDuration(newDuration)
  }

  return (
    <div>
      <h1>{secondsLeft !== null ? formatTime(secondsLeft) : "00:00:00"}</h1>
      <label>
        Duration (seconds):
        <br />
        <input type="number" min="0" onChange={handleDurationChange} />
      </label>
      {timerId === null ? (
        <button onClick={startTimer}>Start</button>
      ) : (
        <button onClick={stopTimer}>Stop</button>
      )}
    </div>
  )
}

export default function Home() {
  return (
    <div className={styles.container}>
      <Head>
        <title>Timer</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <Timer />
      </main>
    </div>
  )
}
