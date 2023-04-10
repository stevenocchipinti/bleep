import Head from "next/head"
import { useState, useEffect } from "react"

import { playTone } from "../lib/audio"
import useWakeLock from "../lib/useWakeLock"

import styles from "@/pages/index.module.css"

interface Block {
  duration: number
  text: string
}

const Home = () => {
  const [blocksText, setBlocksText] = useState("")
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

  useEffect(() => {
    const blocksText = localStorage.getItem("blocks")
    if (blocksText) {
      setBlocksText(blocksText)
      handleBlocksChange({
        target: { value: blocksText },
      } as React.ChangeEvent<HTMLTextAreaElement>)
    }
  }, [])

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
    const newBlocksText = event.target.value
    setBlocksText(newBlocksText)
    localStorage.setItem("blocks", newBlocksText)

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

        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
        <meta name="apple-mobile-web-app-title" content="Timer" />
        <meta name="application-name" content="Timer" />
        <meta name="msapplication-TileColor" content="#000000" />
        <meta name="theme-color" content="#000000" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.timerDisplay}>
          {secondsLeft !== null ? formatTime(secondsLeft) : "00:00:00"}
        </h1>
        <h2 className={styles.currentBlockDisplay}>
          {currentBlockText || "-"}
        </h2>
        <label>
          Blocks
          <br />
          <textarea
            className={styles.blocks}
            placeholder={"10: Rest\n30: Exercise"}
            value={blocksText}
            onChange={handleBlocksChange}
          />
        </label>

        {timerId === null ? (
          <button
            className={styles.timerButton}
            disabled={blocks.length === 0}
            onClick={startTimer}
          >
            Start
          </button>
        ) : (
          <button className={styles.timerButton} onClick={stopTimer}>
            Stop
          </button>
        )}

        <button
          className={styles.lockButton}
          disabled={!wakeLockSupported}
          onClick={toggleWakeLock}
          title={
            wakeLockSupported
              ? `Screen WakeLock ${wakeLockEnabled ? "enabled" : "disabled"}`
              : "WakeLock not supported"
          }
        >
          {wakeLockSupported && wakeLockEnabled ? "🔒" : "🔓"}
        </button>
      </main>
    </div>
  )
}

export default Home
