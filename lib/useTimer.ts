import { useCallback, useEffect, useState } from "react"
import { playTone } from "../lib/audio"
import type { Block, Program } from "../lib/dummyData"

type Status = "running" | "paused" | "stopped"

interface BlockController {
  start: () => Promise<void>
  stop: () => void
  pause: () => void
  resume: () => void
  block: Block
}

const createBlockController = (
  block: Block,
  onTick: (secondsLeft: number) => void
): BlockController => {
  const { seconds } = block

  if (seconds <= 0) throw new Error("Duration must be greater than 0")
  let secondsLeft = seconds

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
    block,
  }
}

const useTimer = ({ blocks }: Program) => {
  const [status, setStatus] = useState<Status>("stopped")
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0)
  const [currentBlockController, setCurrentBlockController] =
    useState<BlockController | null>(null)

  const [secondsLeftOfBlock, setSecondsLeftOfBlock] = useState(0)
  const [text, setText] = useState("")

  const reset = useCallback(() => {
    if (currentBlockController) currentBlockController.stop()
    setCurrentBlockController(null)
    setStatus("stopped")
    setCurrentBlockIndex(0)
    setSecondsLeftOfBlock(blocks[0].seconds)
    setText(blocks[0].name)
  }, [blocks, currentBlockController])

  // Reset everything if the blocks change due to a change of program
  // Otherwise old blocks will be used
  // prettier-ignore
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { reset() }, [blocks])

  const start = useCallback(async () => {
    const blockControllers = blocks.map(block =>
      createBlockController(block, secondsLeft => {
        if ([1, 2, 3].includes(secondsLeft)) playTone(440, 0.3)
        if (secondsLeft === 0) playTone(880, 0.8)
        setSecondsLeftOfBlock(secondsLeft)
        setText(block.name)
      })
    )

    try {
      for (const [index, blockController] of blockControllers.entries()) {
        setStatus("running")
        setCurrentBlockIndex(index)
        setCurrentBlockController(blockController)
        await blockController.start()
      }
      reset()
    } catch (e) {
      // Timer stopped, that's ok, do nothing
    }
  }, [blocks, reset])

  const pause = useCallback(() => {
    if (currentBlockController) currentBlockController.pause()
    setStatus("paused")
  }, [currentBlockController])

  const resume = useCallback(() => {
    if (currentBlockController) currentBlockController.resume()
    setStatus("running")
  }, [currentBlockController])

  const toggle = useCallback(() => {
    if (status === "running") pause()
    if (status === "paused") resume()
    if (status === "stopped") start()
  }, [status, pause, resume, start])

  useEffect(() => {
    if (blocks[0]?.name) setText(blocks[0].name)
    if (blocks[0]?.seconds) setSecondsLeftOfBlock(blocks[0].seconds)
  }, [blocks])

  return {
    toggle,
    reset,
    currentBlockIndex,
    secondsLeftOfBlock,
    text,
    status,
  }
}

export default useTimer
