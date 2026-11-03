import { Ref, useRef } from "react"
import { Box, Flex } from "@chakra-ui/react"
import { TimerBlock } from "lib/types"
import { useTimerActor } from "lib/useTimerMachine"
import { currentProgramFrom } from "lib/timerMachine"
import { useBlockAnimation, useProgress } from "./useProgress"

export interface Segment {
  width: number
  percentDone: number
}

interface SegmentedBarProps {
  segments: Segment[]
  isAnimating: boolean
  /** Lets a caller animate one segment's fill directly. */
  fillRef?: { index: number; ref: Ref<HTMLDivElement> }
}

export const SegmentedBar = ({
  segments,
  isAnimating,
  fillRef,
}: SegmentedBarProps) => (
  <Flex justifyContent="space-between" bg="gray.700" gap={1}>
    {segments.map((segment, index) => (
      <Box
        key={index}
        bg="gray.600"
        position="relative"
        flex={segment.width}
        overflow="hidden"
        h="2px"
      >
        <Box
          ref={fillRef?.index === index ? fillRef.ref : undefined}
          position="absolute"
          inset={0}
          bg="teal.300"
          transition={isAnimating ? "1s linear" : undefined}
          transform={`scaleX(${segment.percentDone})`}
          transformOrigin="left"
        />
      </Box>
    ))}
  </Flex>
)

const SegmentedProgressBar = () => {
  const { state } = useTimerActor()
  const { program, currentBlockIndex } = currentProgramFrom(state.context)
  const { percentageLeft } = useProgress()
  const currentFillRef = useRef<HTMLDivElement>(null)

  useBlockAnimation(
    () => currentFillRef.current,
    left => ({ transform: `scaleX(${1 - left})` }),
  )

  if (!program) return null

  const { blocks } = program

  const timerBlocks = blocks.filter(
    block => block.type === "timer",
  ) as TimerBlock[]

  const averageBlockSeconds =
    timerBlocks.reduce((acc, block) => acc + block.seconds, 0) /
    timerBlocks.length

  const progressBarData: Segment[] = blocks.map((block, index) => {
    let percentDone = 0
    if (currentBlockIndex === index) {
      percentDone = block.type === "timer" ? 1 - percentageLeft : 0
    } else {
      percentDone = currentBlockIndex > index ? 1 : 0
    }

    return {
      width: block.type === "timer" ? block.seconds || 0 : averageBlockSeconds,
      percentDone,
    }
  })

  return (
    <SegmentedBar
      segments={progressBarData}
      isAnimating={false}
      fillRef={{ index: currentBlockIndex, ref: currentFillRef }}
    />
  )
}

export default SegmentedProgressBar
