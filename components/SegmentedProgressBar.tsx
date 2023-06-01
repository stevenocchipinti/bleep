import { Box, Flex } from "@chakra-ui/react"
import { TimerBlock } from "lib/types"
import { useTimerActor } from "lib/useTimerMachine"
import { currentProgramFrom } from "lib/timerMachine"

interface Segment {
  width: number
  percentDone: number
}

const SegmentedProgressBar = () => {
  // BUG: Seems to start too early for the first step and too late for the last step

  const { is, state } = useTimerActor()
  const { program, currentBlockIndex, secondsRemaining } = currentProgramFrom(
    state.context
  )
  if (!program) return null

  const { blocks } = program
  const animate = is("running")

  const timerBlocks: TimerBlock[] = blocks.filter(
    block => block.type === "timer"
  ) as TimerBlock[]

  const averageBlockSeconds =
    timerBlocks.reduce((acc, block) => acc + block.seconds, 0) /
    timerBlocks.length

  const progressBarData: Segment[] = blocks.map((block, index) => ({
    width: block.type === "timer" ? block.seconds || 0 : averageBlockSeconds,
    percentDone:
      currentBlockIndex === index
        ? !is("running")
          ? 0
          : 1 - secondsRemaining / (block.type === "timer" ? block.seconds : 0)
        : currentBlockIndex > index ? 1 : 0, // prettier-ignore
  }))

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
            transition: animate ? "1s linear" : undefined,
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
