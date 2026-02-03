import React, { useEffect, useState } from "react"
import { Flex, useDisclosure } from "@chakra-ui/react"

import { SwipableParent } from "components/SwipeableView"
import SettingsModal from "components/SettingsModal"

import HomeScreen from "screens/HomeScreen"
import ConfigScreen from "screens/ConfigScreen"
import TimerScreen from "screens/TimerScreen"
import HabitConfigScreen from "screens/HabitConfigScreen"
import { useTimerActor } from "lib/useTimerMachine"
import { currentProgramFrom, currentHabitFrom } from "lib/timerMachine"

const Page = () => {
  const [slideIndex, setSlideIndex] = useState(0)

  const { state, is, send } = useTimerActor()
  const { program } = currentProgramFrom(state.context)
  const habit = currentHabitFrom(state.context)

  // Setting modal
  const { isOpen, onOpen, onClose } = useDisclosure()

  // Make the browser back and forward button work for the slides
  // prettier-ignore
  useEffect(() => {
    const handler = ({state}: {state: any}) => {
      if ((program || habit) && typeof state.slide === "number") setSlideIndex(state.slide)
    }
    addEventListener("popstate", handler)
    return () => { removeEventListener("popstate", handler) }
  }, [program, habit])

  // When a program or habit is deleted, go back to the home screen
  // This might make the history stack a bit broken
  useEffect(() => {
    if (!program && !habit) setSlideIndex(0)
  }, [program, habit])

  const selectProgramById = (id: string, skip: boolean = false) => {
    if (state.context.selectedProgramId === id) {
      send({ type: "DESELECT_PROGRAM" })
      history.replaceState({ slide: 0 }, "")
      return
    }

    send({ type: "SELECT_PROGRAM", id })
    setSlideIndex(skip ? 2 : 1)

    // Set up a history stack for the 3 slides
    history.replaceState({ slide: 0 }, "")
    history.pushState({ slide: 1 }, "")
    history.pushState({ slide: 2 }, "")
    if (!skip) history.go(-1)
  }

  const selectHabitById = (id: string) => {
    // Deselect any selected program first
    if (state.context.selectedProgramId) {
      send({ type: "DESELECT_PROGRAM" })
    }

    if (state.context.selectedHabitId === id) {
      send({ type: "DESELECT_HABIT" })
      history.replaceState({ slide: 0 }, "")
      setSlideIndex(0)
      return
    }

    send({ type: "SELECT_HABIT", id })
    setSlideIndex(1)

    // Set up history for 2 slides (home -> habit config)
    history.replaceState({ slide: 0 }, "")
    history.pushState({ slide: 1 }, "")
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
          disabled={(!program && !habit) || is("running")}
          enableMouseEvents
        >
          <HomeScreen
            openSettingsModal={onOpen}
            selectProgramById={selectProgramById}
            selectHabitById={selectHabitById}
          />

          {/* Show ConfigScreen for programs, HabitConfigScreen for habits */}
          {program !== null ? (
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
          ) : habit !== null ? (
            <HabitConfigScreen
              key={habit?.id}
              goBack={() => {
                history.go(-1)
                setSlideIndex(0)
              }}
            />
          ) : (
            <></>
          )}

          {program !== null ? (
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
