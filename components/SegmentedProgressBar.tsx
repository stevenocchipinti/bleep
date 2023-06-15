import { Box, Flex } from "@chakra-ui/react"
import { TimerBlock } from "lib/types"
import { useTimerActor } from "lib/useTimerMachine"
import { currentProgramFrom } from "lib/timerMachine"
import { useProgress } from "./useProgress"

interface Segment {
  width: number
  percentDone: number
}

const SegmentedProgressBar = () => {
  const { state } = useTimerActor()
  const { program, currentBlockIndex } = currentProgramFrom(state.context)
  const { isAnimating, targetPercentageLeft } = useProgress()

  if (!program) return null

  const { blocks } = program

  const timerBlocks = blocks.filter(
    block => block.type === "timer"
  ) as TimerBlock[]

  const averageBlockSeconds =
    timerBlocks.reduce((acc, block) => acc + block.seconds, 0) /
    timerBlocks.length

  const progressBarData: Segment[] = blocks.map((block, index) => {
    let percentDone = 0
    if (currentBlockIndex === index) {
      percentDone = block.type === "timer" ? 1 - targetPercentageLeft : 0
    } else {
      percentDone = currentBlockIndex > index ? 1 : 0
    }

    return {
      width: block.type === "timer" ? block.seconds || 0 : averageBlockSeconds,
      percentDone,
    }
  })

  return (
    <Flex justifyContent="space-between" bg="gray.700" gap={1}>
      {progressBarData.map((block, index) => (
        <Box
          key={index}
          bg="gray.600"
          position="relative"
          flex={block.width}
          overflow="hidden"
          h="2px"
          _before={{
            content: '""',
            display: "block",
            bg: "teal.300",
            width: "full",
            transition: isAnimating ? "1s linear" : undefined,
            transform: `scaleX(${block.percentDone})`,
            transformOrigin: "left",
            height: "100%",
            position: "absolute",
          }}
        />
      ))}
    </Flex>
  )
}

export default SegmentedProgressBar
