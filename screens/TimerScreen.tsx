import CircularProgressBar from "components/CircularProgressBar"
import SegmentedProgressBar from "components/SegmentedProgressBar"
import { SwipeableChild, FooterButton } from "components/SwipeableView"
import { ArrowBackIcon, LockIcon, UnlockIcon } from "@chakra-ui/icons"
import { IconButton, Heading, Flex } from "@chakra-ui/react"
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

  // Used for the circular progress bar
  const currentBlockPercent = (n: number) => {
    const currentBlockSeconds = program.blocks[currentBlockIndex].seconds
    if (program.blocks.length === 0) return 0
    return ((secondsLeftOfBlock + n) / currentBlockSeconds) * 100
  }

  const from = status === "stopped" ? 100 : currentBlockPercent(0)
  const to = status === "stopped" ? 100 : currentBlockPercent(-1)

  // Used for the segmented progress bar
  const progressBarData = program.blocks.map((block, index) => ({
    width: block.seconds || 0,
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
          <FooterButton
            isDisabled={program.blocks.length === 0}
            onClick={toggle}
          >
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

        <CircularProgressBar
          from={from}
          to={to}
          text={`${secondsLeftOfBlock}` || "00:00"}
        ></CircularProgressBar>

        <Heading size="3xl" textAlign="center">
          {text}
        </Heading>
      </Flex>
    </SwipeableChild>
  )
}

export default TimerScreen
