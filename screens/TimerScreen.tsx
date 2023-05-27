import { useEffect } from "react"
import CircularProgressBar from "components/CircularProgressBar"
import SegmentedProgressBar from "components/SegmentedProgressBar"
import { SwipeableChild, FooterButton } from "components/SwipeableView"
import { ArrowBackIcon, LockIcon, UnlockIcon } from "@chakra-ui/icons"
import { IconButton, Heading, Text, Flex, Button } from "@chakra-ui/react"

import { TimerBlock } from "lib/defaultData"
import useWakeLock from "lib/useWakeLock"
import { useTimerActor } from "lib/useTimerMachine"
import {
  PauseIcon,
  PlayIcon,
  StopIcon,
  RewindIcon,
  FastForwardIcon,
} from "components/icons"

interface TimerScreenProps {
  goBack: () => void
}
const TimerScreen = ({ goBack }: TimerScreenProps) => {
  const {
    wakeLockEnabled,
    wakeLockSupported,
    toggleWakeLock,
    enableWakeLock,
    disableWakeLock,
  } = useWakeLock()

  const { state, is, send } = useTimerActor()
  console.log(JSON.stringify(state.value))
  // console.table(state.context)

  const isRunning = is("running")

  useEffect(() => {
    isRunning ? enableWakeLock() : disableWakeLock()
  }, [disableWakeLock, enableWakeLock, isRunning])

  const { program } = state.context
  if (!program) return null

  const { currentBlockIndex, secondsRemaining } = state.context
  const currentBlock = program.blocks[currentBlockIndex]

  // Used for the circular progress bar
  const currentBlockPercent = (n: number) => {
    if (currentBlock.type !== "timer") return 0
    const currentBlockSeconds = currentBlock.seconds
    if (program.blocks.length === 0) return 0
    return ((secondsRemaining + n) / currentBlockSeconds) * 100
  }
  const from = is("counting down") ? currentBlockPercent(0) : 100
  const to = is("counting down") ? currentBlockPercent(-1) : 100

  // Used for the segmented progress bar
  // BUG: Seems to start too early for the first step and too late for the last step
  const timerBlocks: TimerBlock[] = program.blocks.filter(
    block => block.type === "timer"
  ) as TimerBlock[]
  const averageBlockSeconds =
    timerBlocks.reduce((acc, block) => acc + block.seconds, 0) /
    timerBlocks.length
  const progressBarData = program.blocks.map((block, index) => ({
    width: block.type === "timer" ? block.seconds || 0 : averageBlockSeconds,
    percentDone:
      currentBlockIndex === index
        ? is("stopped")
          ? 0
          : 1 - secondsRemaining / (block.type === "timer" ? block.seconds : 0)
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
            isDisabled={is("running")}
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
          <FooterButton
            variant="ghost"
            isDisabled={!state.can({ type: "PREVIOUS" })}
            onClick={() => send("PREVIOUS")}
          >
            <RewindIcon />
          </FooterButton>

          <FooterButton
            variant="ghost"
            isDisabled={!state.can({ type: "RESET" })}
            onClick={() => send("RESET")}
          >
            <StopIcon />
          </FooterButton>

          {state.can({ type: "PAUSE" }) && (
            <FooterButton
              variant="ghost"
              isDisabled={
                program.blocks.length === 0 || is("Awaiting continue")
              }
              onClick={() => send("PAUSE")}
            >
              <PauseIcon />
            </FooterButton>
          )}

          {state.can({ type: "START" }) && (
            <FooterButton
              variant="ghost"
              isDisabled={!state.can({ type: "START" })}
              onClick={() => send("START")}
            >
              <PlayIcon />
            </FooterButton>
          )}

          <FooterButton
            variant="ghost"
            isDisabled={!state.can({ type: "NEXT" })}
            onClick={() => send("NEXT")}
          >
            <FastForwardIcon />
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
          animate={is("running")}
        />

        {currentBlock.type === "timer" && (
          <CircularProgressBar
            from={from}
            to={to}
            text={`${secondsRemaining}` || "00:00"}
          ></CircularProgressBar>
        )}

        {currentBlock.type === "pause" && (
          <Button
            isDisabled={!state.can({ type: "CONTINUE" })}
            borderRadius="50%"
            mx="auto"
            h="300px"
            w="300px"
            fontSize="3xl"
            variant="brand"
            onClick={() => send("CONTINUE")}
          >
            Continue
          </Button>
        )}

        <Heading
          display="flex"
          justifyContent="center"
          alignItems="center"
          flexGrow={1}
          size="3xl"
          textAlign="center"
        >
          {currentBlock.type === "pause" &&
            currentBlock?.reps &&
            currentBlock.reps > 0 &&
            `${currentBlock.reps}⨯ `}
          {currentBlock.name}
        </Heading>

        {currentBlock.type === "message" && (
          <Text textAlign="center" flexGrow={1}>
            {currentBlock.message}
          </Text>
        )}
      </Flex>
    </SwipeableChild>
  )
}

export default TimerScreen
