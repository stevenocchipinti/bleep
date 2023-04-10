import Head from "next/head"
import { useState, useEffect } from "react"
import { playTone, speak } from "../lib/audio"

import styles from "@/pages/index.module.css"
import useWakeLock from "lib/useWakeLock"

interface Block {
  duration: number
  text: string
}

const Home = () => {
  const [blocks, setBlocks] = useState<Block[]>([])
  const [currentBlockText, setCurrentBlockText] = useState("")
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const [timerId, setTimerId] = useState<NodeJS.Timeout | null>(null)

  const {
    wakeLockEnabled,
    wakeLockSupported,
    toggleWakeLock,
    enableWakeLock,
    disableWakeLock,
  } = useWakeLock()

  const startTimer = (): void => {
    if (blocks.length === 0) return

    enableWakeLock()

    let currentBlockIndex = 0
    setCurrentBlockText(blocks[currentBlockIndex].text)

    setSecondsLeft(blocks[0].duration)

    const newTimerId: NodeJS.Timeout = setInterval(() => {
      setSecondsLeft((secondsLeft: number | null) => {
        const newSecondsLeft =
          secondsLeft !== null && secondsLeft > 0 ? secondsLeft - 1 : 0

        if (newSecondsLeft === 3) playTone(440, 0.2)
        if (newSecondsLeft === 2) playTone(440, 0.2)
        if (newSecondsLeft === 1) playTone(440, 0.2)
        if (newSecondsLeft === 0) {
          playTone(880, 0.8)

          const nextBlockIndex = currentBlockIndex + 1
          if (blocks[nextBlockIndex]) {
            const { duration, text } = blocks[nextBlockIndex]
            currentBlockIndex = nextBlockIndex
            setCurrentBlockText(text)
            return duration
          } else {
            disableWakeLock()
            clearInterval(newTimerId!)
            setTimerId(null)
            setCurrentBlockText("")
          }
        }

        return newSecondsLeft
      })
    }, 1000)
    setTimerId(newTimerId)
  }

  const stopTimer = (): void => {
    disableWakeLock()
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

  const handleBlocksChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>
  ): void => {
    const blocks = event.target.value
      .split("\n")
      .filter(Boolean)
      .map(l => {
        const parts = l.split(/ *: */)
        return {
          duration: parseInt(parts[0], 10),
          text: parts[1],
        }
      })
    const valid = blocks.every(b => b.duration > 0 && b.text)
    setBlocks(valid ? blocks : [])
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Timer</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <h1>{secondsLeft !== null ? formatTime(secondsLeft) : "00:00:00"}</h1>
        <h2>{currentBlockText}</h2>
        <label>
          Blocks
          <br />
          <textarea
            placeholder={"10: Rest\n30: Exercise"}
            onChange={handleBlocksChange}
          />
        </label>
        {timerId === null ? (
          <button disabled={blocks.length === 0} onClick={startTimer}>
            Start
          </button>
        ) : (
          <button onClick={stopTimer}>Stop</button>
        )}
        <button disabled={!wakeLockSupported} onClick={toggleWakeLock}>
          {wakeLockSupported && wakeLockEnabled ? "🔒 Disable" : "🔓 Enable"}{" "}
          Wake Lock
          {!wakeLockSupported && "WakeLock not supported"}
        </button>
      </main>
    </div>
  )
}

export default Home
