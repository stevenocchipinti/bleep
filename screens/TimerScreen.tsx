import SegmentedProgressBar from "@/components/SegmentedProgressBar"
import { SwipeableChild, FooterButton } from "@/components/SwipeableView"
import { ArrowBackIcon, LockIcon, UnlockIcon } from "@chakra-ui/icons"
import {
  IconButton,
  Heading,
  Flex,
  CircularProgress,
  CircularProgressLabel,
} from "@chakra-ui/react"
import { Program } from "lib/dummyData"
import useTimer from "lib/useTimer"
import useWakeLock from "lib/useWakeLock"
import { useEffect } from "react"

interface TimerScreenProps {
  program: Program
  goBack: () => void
}
const TimerScreen = ({ program, goBack }: TimerScreenProps) => {
  const { toggle, reset, currentBlockIndex, secondsLeftOfBlock, text, status } =
    useTimer(program)

  const {
    wakeLockEnabled,
    wakeLockSupported,
    toggleWakeLock,
    enableWakeLock,
    disableWakeLock,
  } = useWakeLock()

  useEffect(() => {
    status === "running" ? enableWakeLock() : disableWakeLock()
  }, [disableWakeLock, enableWakeLock, status])

  // Used for the progress bars
  const currentBlockPercent =
    (secondsLeftOfBlock / program.blocks[currentBlockIndex].seconds) * 100
  const progressBarData = program.blocks.map((block, index) => ({
    width: block.seconds,
    percentDone:
      currentBlockIndex === index
        ? status === "stopped" ? 0 : 1 - secondsLeftOfBlock / block.seconds
        : currentBlockIndex > index ? 1 : 0, // prettier-ignore
  }))

  return (
    <SwipeableChild
      header={
        <>
          <IconButton
            aria-label="Back"
            variant="ghost"
            icon={<ArrowBackIcon />}
            isDisabled={status === "running"}
            onClick={goBack}
            fontSize="xl"
          />
          <Heading fontWeight="thin" textAlign="center" as="h1">
            {program.name}
          </Heading>
          <IconButton
            isDisabled={!wakeLockSupported}
            colorScheme={wakeLockEnabled ? "red" : "green"}
            aria-label="Wake lock"
            variant="outline"
            icon={wakeLockEnabled ? <LockIcon /> : <UnlockIcon />}
            onClick={toggleWakeLock}
          />
        </>
      }
      footer={
        <>
          <FooterButton isDisabled={status === "stopped"} onClick={reset}>
            Reset
          </FooterButton>
          <FooterButton onClick={toggle}>
            {status === "running" ? "Pause" : "Start"}
          </FooterButton>
        </>
      }
    >
      <Flex
        direction="column"
        justifyContent="space-evenly"
        flex={1}
        gap={12}
        p={8}
      >
        <SegmentedProgressBar
          blocks={progressBarData}
          animate={status === "running"}
        />
        <CircularProgress
          transition="1s linear"
          trackColor="gray.700"
          color="teal.300"
          capIsRound
          size="full"
          value={currentBlockPercent}
        >
          <CircularProgressLabel fontSize="6xl">
            {secondsLeftOfBlock || "00:00"}
          </CircularProgressLabel>
        </CircularProgress>
        <Heading size="3xl" textAlign="center">
          {text}
        </Heading>
      </Flex>
    </SwipeableChild>
  )
}

export default TimerScreen
