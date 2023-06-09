import { useEffect } from "react"
import CircularProgressBar from "components/CircularProgressBar"
import { SwipeableChild, FooterButton } from "components/SwipeableView"
import { ArrowBackIcon, LockIcon, UnlockIcon } from "@chakra-ui/icons"
import { IconButton, Heading, Text, Flex, Button } from "@chakra-ui/react"

import { Block, ProgramSchema } from "lib/types"
import useWakeLock from "lib/useWakeLock"
import { useTimerActor } from "lib/useTimerMachine"
import {
  PauseIcon,
  PlayIcon,
  StopIcon,
  RewindIcon,
  FastForwardIcon,
  ExclamationIcon,
} from "components/icons"
import { currentProgramFrom } from "lib/timerMachine"
import { motion } from "framer-motion"

const Body = motion(Flex)

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
  // console.log(JSON.stringify(state.value))
  // console.table(state.context)

  const isRunning = is("running")

  useEffect(() => {
    isRunning ? enableWakeLock() : disableWakeLock()
  }, [disableWakeLock, enableWakeLock, isRunning])

  const { program } = currentProgramFrom(state.context)
  if (!program) return null
  const isValid = ProgramSchema.safeParse(program).success

  const { currentBlockIndex } = state.context
  const blocks = program.blocks.filter(b => !b.disabled)

  const currentBlock: Block | null =
    blocks.length > 0 ? blocks[currentBlockIndex] : null

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
      showProgress
      footer={
        <>
          <FooterButton
            variant="ghost"
            isDisabled={!state.can({ type: "PREVIOUS" })}
            onClick={() => send("PREVIOUS")}
          >
            <RewindIcon maxH={7} />
          </FooterButton>

          <FooterButton
            variant="ghost"
            isDisabled={!state.can({ type: "RESET" })}
            onClick={() => send("RESET")}
          >
            <StopIcon maxH={7} />
          </FooterButton>

          {state.can({ type: "PAUSE" }) ? (
            <FooterButton
              variant="ghost"
              isDisabled={blocks.length === 0 || is("Awaiting continue")}
              onClick={() => send("PAUSE")}
            >
              <PauseIcon maxH={7} />
            </FooterButton>
          ) : (
            <FooterButton
              variant="ghost"
              isDisabled={!state.can({ type: "START" })}
              onClick={() => send("START")}
            >
              <PlayIcon maxH={7} />
            </FooterButton>
          )}

          <FooterButton
            variant="ghost"
            isDisabled={!state.can({ type: "NEXT" })}
            onClick={() => send("NEXT")}
          >
            <FastForwardIcon maxH={7} />
          </FooterButton>
        </>
      }
    >
      <Body
        key={currentBlock?.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        direction="column"
        justifyContent="space-evenly"
        flex={1}
        gap={12}
        p={8}
      >
        {currentBlock && isValid ? (
          <>
            {currentBlock.type === "timer" && <CircularProgressBar />}

            {currentBlock.type === "pause" && (
              <Button
                onClick={() => send("CONTINUE")}
                isDisabled={!state.can({ type: "CONTINUE" })}
                variant="unstyled"
                borderRadius="50%"
                mx="auto"
                h="300px"
                w="300px"
                fontSize="3xl"
                borderWidth={4}
                borderColor="teal.200"
                bgColor="teal.900"
                _active={{
                  bgColor: "teal.600",
                }}
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
              <Text
                display="flex"
                justifyContent="center"
                alignItems="center"
                textAlign="center"
                fontStyle="italic"
                fontSize="xl"
                bg="blackAlpha.300"
                p={8}
                borderRadius="3xl"
                flexGrow={1}
                position="relative"
                _before={{
                  display: "block",
                  position: "absolute",
                  content: "'❞'",
                  fontSize: "6rem",
                  opacity: 0.05,
                  top: 0,
                  left: "1.25rem",
                }}
              >
                {currentBlock.message}
              </Text>
            )}
          </>
        ) : (
          <ExclamationIcon stroke="red.200" />
        )}
      </Body>
    </SwipeableChild>
  )
}

export default TimerScreen
