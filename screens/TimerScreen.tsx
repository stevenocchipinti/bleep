import { useEffect } from "react"
import CircularProgressBar from "components/CircularProgressBar"
import SegmentedProgressBar from "components/SegmentedProgressBar"
import { SwipeableChild, FooterButton } from "components/SwipeableView"
import { ArrowBackIcon, LockIcon, UnlockIcon } from "@chakra-ui/icons"
import { IconButton, Heading, Flex, Button } from "@chakra-ui/react"
import { Program, TimerBlock } from "lib/defaultData"
import useWakeLock from "lib/useWakeLock"
import { useTimerActor } from "lib/useTimerMachine"

// The nested states are long and error prone now, this is just for short-hand
const states = {
  running: { "program selected": "running" },
  countingDown: { "program selected": { running: "counting down" } },
  stopped: { "program selected": "stopped" },
  waiting: { "program selected": { running: "Awaiting continue" } },
}

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

  const [state, send] = useTimerActor()
  console.log(state.value)
  // console.table(state.context)

  useEffect(() => {
    state.matches(states.running) ? enableWakeLock() : disableWakeLock()
  }, [disableWakeLock, enableWakeLock, state])

  const program = state.context.program
  if (!program) return null

  const currentBlockIndex = state.context.currentBlockIndex
  const currentBlock = program.blocks[currentBlockIndex]
  const secondsLeftOfBlock = state.context.secondsRemaining

  // Used for the circular progress bar
  const currentBlockPercent = (n: number) => {
    if (currentBlock.type !== "timer") return 0
    const currentBlockSeconds = currentBlock.seconds
    if (program.blocks.length === 0) return 0
    return ((secondsLeftOfBlock + n) / currentBlockSeconds) * 100
  }
  const from = state.matches(states.countingDown) ? currentBlockPercent(0) : 100
  const to = state.matches(states.countingDown) ? currentBlockPercent(-1) : 100

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
        ? state.matches(states.stopped)
          ? 0
          : 1 - secondsLeftOfBlock / (block.type === "timer" ? block.seconds : 0)
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
            isDisabled={state.matches(states.running)}
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
            isDisabled={!state.can({ type: "RESET" })}
            onClick={() => send("RESET")}
          >
            Reset
          </FooterButton>

          {state.can({ type: "PAUSE" }) && (
            <FooterButton
              isDisabled={
                program.blocks.length === 0 || state.matches(states.waiting)
              }
              onClick={() => send("PAUSE")}
            >
              Pause
            </FooterButton>
          )}

          {state.can({ type: "START" }) && (
            <FooterButton
              isDisabled={!state.can({ type: "START" })}
              onClick={() => send("START")}
            >
              Start
            </FooterButton>
          )}
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
          animate={state.matches(states.running)}
        />

        {currentBlock.type === "timer" && (
          <CircularProgressBar
            from={from}
            to={to}
            text={`${secondsLeftOfBlock}` || "00:00"}
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
            colorScheme="teal"
            bgGradient="linear-gradient(to-br, teal.200, green.200)"
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
          {currentBlock.name}
        </Heading>
      </Flex>
    </SwipeableChild>
  )
}

export default TimerScreen
