import { useEffect, useState } from "react"
import { StateFrom } from "xstate"
import { ArrowBackIcon, ChevronDownIcon } from "@chakra-ui/icons"
import {
  Button,
  Flex,
  Heading,
  IconButton,
  Menu,
  MenuButton,
  MenuItemOption,
  MenuList,
  MenuOptionGroup,
  Text,
} from "@chakra-ui/react"

import breathingMachine, { BreathingEvent } from "lib/breathingMachine"
import useWakeLock from "lib/useWakeLock"
import {
  TARGET_OPTIONS,
  patternById,
  phaseEndLevel,
  targetFromKey,
  targetKey,
} from "lib/breathingPatterns"
import { FooterButton, SwipeableChild } from "components/SwipeableView"
import { Segment, SegmentedBar } from "components/SegmentedProgressBar"
import { CheckIcon, PauseIcon, PlayIcon, VibrateIcon } from "components/icons"
import { useTimerActor } from "lib/useTimerMachine"

import BreathingCircle from "./BreathingCircle"
import useBreathingHaptics, { canVibrate } from "./useBreathingHaptics"

interface BreathingSessionProps {
  state: StateFrom<typeof breathingMachine>
  send: (event: BreathingEvent) => void
  onBack: () => void
  onDone: () => void
}

const SEGMENT_SECONDS = 60

const formatDuration = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

/** One segment per minute of the session, like blocks in a workout. */
const sessionSegments = (target: number, done: number): Segment[] =>
  Array.from({ length: Math.ceil(target / SEGMENT_SECONDS) }, (_, i) => {
    const start = i * SEGMENT_SECONDS
    const width = Math.min(SEGMENT_SECONDS, target - start)
    return {
      width,
      percentDone: Math.min(1, Math.max(0, (done - start) / width)),
    }
  })

const BreathingSession = ({
  state,
  send,
  onBack,
  onDone,
}: BreathingSessionProps) => {
  const {
    patternId,
    phaseIndex,
    phaseSecondsRemaining,
    phaseTotalSeconds,
    targetSeconds,
    elapsedSeconds,
    cycles,
  } = state.context

  const pattern = patternById(patternId)
  const phase = pattern.phases[phaseIndex]
  const running = state.matches("running")
  const paused = state.matches("paused")
  const complete = state.matches("complete")
  const status = running ? "running" : paused ? "paused" : "idle"

  const phaseKey = `${cycles}:${phaseIndex}`

  const { state: appState, send: appSend } = useTimerActor()
  const hapticsEnabled = appState.context.settings.breathingHapticsEnabled
  // Checked after mount so the server and first client render agree
  const [hapticsSupported, setHapticsSupported] = useState(false)
  useEffect(() => setHapticsSupported(canVibrate()), [])
  useBreathingHaptics({
    enabled: hapticsEnabled,
    status,
    phaseKey,
    kind: phase.kind,
  })

  const toggle = () =>
    send({ type: running ? "PAUSE" : paused ? "RESUME" : "START" })

  const { enableWakeLock, disableWakeLock } = useWakeLock()

  // Keep the screen awake while breathing
  useEffect(() => {
    if (running) enableWakeLock()
    else disableWakeLock()
  }, [running, enableWakeLock, disableWakeLock])

  useEffect(() => disableWakeLock, [disableWakeLock])

  const header = (
    <>
      <IconButton
        aria-label="Back to patterns"
        variant="ghost"
        icon={<ArrowBackIcon />}
        fontSize="xl"
        onClick={onBack}
      />
      <Heading
        fontWeight="thin"
        textAlign="center"
        as="h1"
        noOfLines={1}
        cursor="default"
      >
        {pattern.name}
      </Heading>
      {hapticsSupported ? (
        <IconButton
          aria-label={
            hapticsEnabled ? "Turn vibration off" : "Turn vibration on"
          }
          aria-pressed={hapticsEnabled}
          variant="ghost"
          color={hapticsEnabled ? undefined : "gray.500"}
          icon={<VibrateIcon off={!hapticsEnabled} boxSize={6} />}
          onClick={() =>
            appSend({
              type: "SET_BREATHING_HAPTICS_ENABLED",
              enabled: !hapticsEnabled,
            })
          }
        />
      ) : (
        <Flex boxSize={10} flexShrink={0} />
      )}
    </>
  )

  if (complete) {
    return (
      <SwipeableChild header={header}>
        <Flex
          direction="column"
          flex={1}
          align="center"
          justify="center"
          gap={4}
          p={8}
          textAlign="center"
        >
          <CheckIcon filled boxSize={16} color="green.300" />
          <Heading fontWeight="thin" cursor="default">
            Well done
          </Heading>
          <Text color="gray.400">
            {formatDuration(elapsedSeconds)} · {cycles}{" "}
            {cycles === 1 ? "breath" : "breaths"}
          </Text>
          <Flex gap={3} pt={6}>
            <Button variant="outline" onClick={() => send({ type: "START" })}>
              Again
            </Button>
            <Button variant="brand" onClick={onDone}>
              Done
            </Button>
          </Flex>
        </Flex>
      </SwipeableChild>
    )
  }

  const time =
    targetSeconds !== null
      ? `${formatDuration(Math.max(0, targetSeconds - elapsedSeconds))} left`
      : formatDuration(elapsedSeconds)

  // Like the workout timer, aim for where we'll be after the next tick and
  // let the 1s transition carry the bar there.
  const progressDone = running
    ? Math.min(targetSeconds ?? 0, elapsedSeconds + 1)
    : elapsedSeconds

  return (
    <SwipeableChild
      header={header}
      progress={
        targetSeconds !== null && (
          <SegmentedBar
            segments={sessionSegments(targetSeconds, progressDone)}
            isAnimating={running}
          />
        )
      }
      footer={
        <FooterButton
          span={4}
          variant="ghost"
          aria-label={running ? "Pause" : paused ? "Resume" : "Start"}
          onClick={toggle}
        >
          {running ? <PauseIcon maxH={7} /> : <PlayIcon maxH={7} />}
        </FooterButton>
      }
    >
      <Flex
        direction="column"
        flex={1}
        align="center"
        justify="center"
        gap={10}
        p={8}
      >
        <BreathingCircle
          phaseKey={phaseKey}
          kind={phase.kind}
          endLevel={phaseEndLevel(pattern, phaseIndex)}
          secondsRemaining={phaseSecondsRemaining}
          totalSeconds={phaseTotalSeconds}
          status={status}
          onToggle={toggle}
        />

        <Flex direction="column" align="center" gap={1} minH="5.5rem">
          <Heading fontWeight="thin" size="2xl" cursor="default">
            {paused ? "Paused" : running ? phase.label : "Ready"}
          </Heading>

          <Menu placement="bottom" autoSelect={false}>
            <MenuButton
              as={Button}
              variant="ghost"
              size="sm"
              color="gray.500"
              fontWeight="normal"
              rightIcon={<ChevronDownIcon />}
              sx={{ fontVariantNumeric: "tabular-nums" }}
            >
              {time}
            </MenuButton>
            <MenuList minW="10rem">
              <MenuOptionGroup
                type="radio"
                title="Duration"
                value={targetKey(targetSeconds)}
                onChange={key =>
                  send({
                    type: "SET_TARGET",
                    targetSeconds: targetFromKey(key as string),
                  })
                }
              >
                {TARGET_OPTIONS.map(option => (
                  <MenuItemOption
                    key={option.label}
                    value={targetKey(option.value)}
                    // A length that has already passed would end the session
                    // immediately.
                    isDisabled={
                      option.value !== null && option.value <= elapsedSeconds
                    }
                  >
                    {option.label}
                  </MenuItemOption>
                ))}
              </MenuOptionGroup>
            </MenuList>
          </Menu>
        </Flex>
      </Flex>
    </SwipeableChild>
  )
}

export default BreathingSession
