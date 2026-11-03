import React, { useEffect, useState } from "react"
import { Flex, useDisclosure } from "@chakra-ui/react"
import { useMachine } from "@xstate/react"

import { SwipableParent } from "components/SwipeableView"
import SettingsModal from "components/SettingsModal"

import HomeScreen from "screens/HomeScreen"
import ConfigScreen from "screens/ConfigScreen"
import TimerScreen from "screens/TimerScreen"
import { useTimerActor } from "lib/useTimerMachine"
import { currentProgramFrom } from "lib/timerMachine"
import breathingMachine, { isRecordableSession } from "lib/breathingMachine"
import { patternById } from "lib/breathingPatterns"
import { breathingProgramId } from "lib/breathingHistory"
import { CompletionSchema } from "lib/types"
import PatternPicker from "components/breathwork/PatternPicker"
import BreathingSession from "components/breathwork/BreathingSession"

const Page = () => {
  const [slideIndex, setSlideIndex] = useState(0)

  const { state, is, send } = useTimerActor()
  const { program, blocks } = currentProgramFrom(state.context)
  const hasBlocks = (blocks?.length ?? 0) > 0

  // Slides 1 and 2 show either the selected program or breathing, whichever
  // was opened last from the home screen
  const [mode, setMode] = useState<"program" | "breathe">("program")
  const [breathState, breathSend] = useMachine(breathingMachine, {
    actions: {
      // Log every real session, including open-ended and stopped-early ones
      sessionEnded: context => {
        if (!isRecordableSession(context)) return
        const pattern = patternById(context.patternId)
        send({
          type: "ADD_COMPLETION",
          completion: CompletionSchema.parse({
            programId: breathingProgramId(pattern.id),
            programName: pattern.name,
            completedAt: new Date().toISOString(),
            durationSeconds: context.elapsedSeconds,
          }),
        })
      },
    },
  })
  const isBreathing = mode === "breathe"
  const hasSlides = isBreathing || program !== null

  // Setting modal
  const { isOpen, onOpen, onClose } = useDisclosure()

  // Make the browser back and forward button work for the slides
  // prettier-ignore
  useEffect(() => {
    const handler = ({state}: {state: any}) => {
      if (hasSlides && typeof state.slide === "number") setSlideIndex(state.slide)
    }
    addEventListener("popstate", handler)
    return () => { removeEventListener("popstate", handler) }
  }, [hasSlides])

  // When a program is deleted, go back to the home screen
  useEffect(() => {
    if (!hasSlides) setSlideIndex(0)
  }, [hasSlides])

  // Clamp slideIndex to valid range when blocks change
  useEffect(() => {
    const maxSlide = isBreathing || hasBlocks ? 2 : 1
    if (slideIndex > maxSlide) {
      setSlideIndex(maxSlide)
    }
  }, [isBreathing, hasBlocks, slideIndex])

  // Pause a breathing session that's navigated away from (e.g. back button)
  const breathRunning = breathState.matches("running")
  useEffect(() => {
    if (breathRunning && slideIndex !== 2) breathSend({ type: "PAUSE" })
  }, [breathRunning, slideIndex, breathSend])

  // Leaving breathing for a program ends any unfinished session
  useEffect(() => {
    if (!isBreathing) breathSend({ type: "STOP" })
  }, [isBreathing, breathSend])

  const openBreathing = () => {
    setMode("breathe")
    setSlideIndex(1)
    // Same 3-slide history stack as a program with a timer
    history.replaceState({ slide: 0 }, "")
    history.pushState({ slide: 1 }, "")
    history.pushState({ slide: 2 }, "")
    history.go(-1)
  }

  const startPattern = (patternId: string) => {
    // End any paused session first, otherwise START would resume it
    breathSend({ type: "STOP" })
    breathSend({ type: "SET_PATTERN", patternId })
    breathSend({ type: "START" })
    history.go(1)
    setSlideIndex(2)
  }

  const selectProgramById = (id: string, skip: boolean = false) => {
    const selectedProgram = state.context.allPrograms.find(p => p.id === id)
    const selectedHasBlocks = (selectedProgram?.blocks.length ?? 0) > 0

    send({ type: "SELECT_PROGRAM", id })
    setMode("program")

    // For habit-only programs (no blocks), there are only 2 slides (home & config)
    // For programs with blocks, there are 3 slides (home & config & timer)
    if (selectedHasBlocks) {
      setSlideIndex(skip ? 2 : 1)
      // Set up a history stack for the 3 slides
      history.replaceState({ slide: 0 }, "")
      history.pushState({ slide: 1 }, "")
      history.pushState({ slide: 2 }, "")
      if (!skip) history.go(-1)
    } else {
      setSlideIndex(1)
      // Set up a history stack for the 2 slides (no timer)
      history.replaceState({ slide: 0 }, "")
      history.pushState({ slide: 1 }, "")
    }
  }

  return (
    <>
      <SettingsModal isOpen={isOpen} onClose={onClose} />

      <Flex direction="column" h="100%">
        <SwipableParent
          index={slideIndex}
          onChangeIndex={(newIndex, oldIndex) => {
            history.go(newIndex - oldIndex)
            setSlideIndex(newIndex)
          }}
          disabled={!hasSlides || is("running") || breathRunning}
          enableMouseEvents
        >
          <HomeScreen
            openSettingsModal={onOpen}
            selectProgramById={selectProgramById}
            openBreathing={openBreathing}
          />

          {isBreathing ? (
            <PatternPicker
              targetSeconds={breathState.context.targetSeconds}
              onTargetChange={targetSeconds =>
                breathSend({ type: "SET_TARGET", targetSeconds })
              }
              onSelect={startPattern}
              onClose={() => {
                history.go(-1)
                setSlideIndex(0)
              }}
            />
          ) : program !== null ? (
            <ConfigScreen
              key={program?.id}
              openSettingsModal={onOpen}
              goForward={() => {
                history.go(1)
                setSlideIndex(2)
              }}
              goBack={() => {
                history.go(-1)
                setSlideIndex(0)
              }}
            />
          ) : (
            <></>
          )}

          {isBreathing ? (
            <BreathingSession
              state={breathState}
              send={breathSend}
              onBack={() => {
                breathSend({ type: "STOP" })
                history.go(-1)
                setSlideIndex(1)
              }}
              onDone={() => {
                history.go(-2)
                setSlideIndex(0)
              }}
            />
          ) : program !== null ? (
            <TimerScreen
              goBack={() => {
                history.go(-1)
                setSlideIndex(1)
              }}
            />
          ) : (
            <></>
          )}
        </SwipableParent>
      </Flex>
    </>
  )
}

export default Page
