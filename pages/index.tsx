import React, { useEffect, useState } from "react"
import { Flex, useDisclosure } from "@chakra-ui/react"

import { SwipableParent } from "components/SwipeableView"
import SettingsModal from "components/SettingsModal"

import HomeScreen from "screens/HomeScreen"
import ConfigScreen from "screens/ConfigScreen"
import TimerScreen from "screens/TimerScreen"
import { useTimerActor } from "lib/useTimerMachine"
import { currentProgramFrom } from "lib/timerMachine"

const Page = () => {
  const [slideIndex, setSlideIndex] = useState(0)

  const { state, is, send } = useTimerActor()
  const { program } = currentProgramFrom(state.context)

  // Setting modal
  const { isOpen, onOpen, onClose } = useDisclosure()

  // Make the browser back and forward button work for the slides
  // prettier-ignore
  useEffect(() => {
    const handler = ({state}: {state: any}) => {
      if (program && typeof state.slide === "number") setSlideIndex(state.slide)
    }
    addEventListener("popstate", handler)
    return () => { removeEventListener("popstate", handler) }
  }, [program])

  // When a program is deleted, go back to the home screen
  // This might make the history stack a bit broken
  useEffect(() => {
    if (!program) setSlideIndex(0)
  }, [program])

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
          disabled={!program || is("running")}
          enableMouseEvents
        >
          <HomeScreen
            openSettingsModal={onOpen}
            selectProgramById={selectProgramById}
          />

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
