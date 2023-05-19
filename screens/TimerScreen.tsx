import { useEffect } from "react"
import { useMachine } from "@xstate/react"
import CircularProgressBar from "components/CircularProgressBar"
import SegmentedProgressBar from "components/SegmentedProgressBar"
import { SwipeableChild, FooterButton } from "components/SwipeableView"
import { ArrowBackIcon, LockIcon, UnlockIcon } from "@chakra-ui/icons"
import { IconButton, Heading, Flex } from "@chakra-ui/react"
import { Program } from "lib/dummyData"
import useTimer from "lib/useTimer"
import useWakeLock from "lib/useWakeLock"
import timerMachine from "lib/timerMachine"

interface TimerScreenProps {
  program: Program
  goBack: () => void
}
const TimerScreen = ({ program, goBack }: TimerScreenProps) => {
  const [state, send] = useMachine(timerMachine)
  console.log(state.value)
  // console.table(state.context)

  const currentBlockIndex = state.context.currentBlockIndex
  const currentBlock = program.blocks[currentBlockIndex]
  const secondsLeftOfBlock = state.context.secondsRemaining

  const {
    wakeLockEnabled,
    wakeLockSupported,
    toggleWakeLock,
    enableWakeLock,
    disableWakeLock,
  } = useWakeLock()

  useEffect(() => {
    state.matches("running") ? enableWakeLock() : disableWakeLock()
  }, [disableWakeLock, enableWakeLock, state])

  // Used for the circular progress bar
  const currentBlockPercent = (n: number) => {
    const currentBlockSeconds = program.blocks[currentBlockIndex].seconds
    if (program.blocks.length === 0) return 0
    return ((secondsLeftOfBlock + n) / currentBlockSeconds) * 100
  }
  const from = state.matches({ running: "counting down" })
    ? currentBlockPercent(0)
    : 100
  const to = state.matches({ running: "counting down" })
    ? currentBlockPercent(-1)
    : 100

  // Used for the segmented progress bar
  const progressBarData = program.blocks.map((block, index) => ({
    width: block.seconds || 0,
    percentDone:
      currentBlockIndex === index
        ? state.matches("stopped") ? 0 : 1 - secondsLeftOfBlock / block.seconds
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
            isDisabled={state.matches("running")}
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
              isDisabled={program.blocks.length === 0}
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
          animate={state.matches("running")}
        />

        <CircularProgressBar
          from={from}
          to={to}
          text={`${secondsLeftOfBlock}` || "00:00"}
        ></CircularProgressBar>

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
