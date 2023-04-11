import { useState, useEffect } from "react"

import { playTone } from "../lib/audio"

interface Block {
  duration: number
  text: string
}

const useTimer = () => {
  const [blocks, setBlocks] = useState<Block[]>([])
  const [currentBlockText, setCurrentBlockText] = useState("")
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const [timerId, setTimerId] = useState<NodeJS.Timeout | null>(null)
  const [blocksText, setBlocksText] = useState("")

  const setBlocksFromText = (text: string): void => {
    setBlocksText(text)

    const blocks = text
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
    if (valid) {
      setBlocks(valid ? blocks : [])
      localStorage.setItem("blocks", text)
    }
  }

  useEffect(() => {
    const blocksText = localStorage.getItem("blocks")
    if (blocksText) setBlocksFromText(blocksText)
  }, [])

  const startTimer = (): void => {
    if (blocks.length === 0) return

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

  return {
    startTimer,
    stopTimer,
    timerRunning: timerId !== null,
    currentBlockText: currentBlockText || "-",
    secondsLeft,
    timerString: secondsLeft !== null ? formatTime(secondsLeft) : "00:00:00",
    setBlocksFromText,
    blocksText,
    blocks,
  }
}

export default useTimer
