import React, { useEffect, useState } from "react"
import { Flex, useDisclosure } from "@chakra-ui/react"

import { SwipableParent } from "components/SwipeableView"
import dummyData from "lib/dummyData"
import SettingsModal from "components/SettingsModal"

import HomeScreen from "screens/HomeScreen"
import ConfigScreen from "screens/ConfigScreen"
import TimerScreen from "screens/TimerScreen"

const Page = () => {
  const [programs, setPrograms] = useState(dummyData)
  const [slideIndex, setSlideIndex] = useState(0)
  const [selectedProgramIndex, setSelectedProgramIndex] = useState<
    number | null
  >(null)

  const { isOpen, onOpen, onClose } = useDisclosure()
  // Make the browser back and forward button work for the slides
  // prettier-ignore
  useEffect(() => {
    const handler = ({state}: {state: any}) => { setSlideIndex(state.slide) }
    addEventListener("popstate", handler)
    return () => { removeEventListener("popstate", handler) }
  }, [])

  const selectProgramByIndex = (index: number) => {
    setSelectedProgramIndex(index)
    setSlideIndex(1)

    // Set up a history stack for the 3 slides
    history.replaceState({ slide: 0 }, "")
    history.pushState({ slide: 1 }, "")
    history.pushState({ slide: 2 }, "")
    history.go(-1)
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
          enableMouseEvents
        >
          <HomeScreen
            openSettingsModal={onOpen}
            selectedProgramIndex={selectedProgramIndex}
            selectProgramByIndex={selectProgramByIndex}
            programs={programs}
            setPrograms={setPrograms}
          />

          <ConfigScreen
            openSettingsModal={onOpen}
            programs={programs}
            selectedProgramIndex={selectedProgramIndex}
            goForward={() => {
              history.go(1)
              setSlideIndex(2)
            }}
            goBack={() => {
              history.go(-1)
              setSlideIndex(0)
            }}
          />

          <TimerScreen
            goBack={() => {
              history.go(-1)
              setSlideIndex(1)
            }}
            selectedProgramIndex={selectedProgramIndex}
          />
        </SwipableParent>
      </Flex>
    </>
  )
}

export default Page
