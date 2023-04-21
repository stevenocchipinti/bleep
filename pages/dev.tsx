import { Card, Text, styled, Collapse } from "@nextui-org/react"
import React, { ReactNode, useEffect, useState } from "react"
import SwipeableViews from "react-swipeable-views"

const Slide = styled("div", {
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  gap: "$8",
  padding: "$8",
})

const Layout = styled("div", {
  display: "flex",
  flexDirection: "column",
  height: "100%",
})

const Header = styled(Text, {
  padding: "$12 $8",
  textAlign: "center",
})

const Headers = styled("div", {
  display: "flex",
  flexDirection: "column",
  gap: "$8",
  padding: "$16 0",
})

const Cards = styled("div", {
  display: "flex",
  flexDirection: "column",
  gap: "$8",
  padding: "$8",
})

const SwipableBody = styled(SwipeableViews, {
  flexGrow: 1,
  overflow: "hidden",
  "& > *": {
    height: "100%",
  },
  "& > * > * > *": {
    height: "100%",
  },
})

interface CardButtonProps {
  onClick?: React.MouseEventHandler<unknown> | undefined
  selected?: boolean
  children: ReactNode
  emoji?: string
}
const CardButton = ({
  children,
  emoji,
  selected,
  ...props
}: CardButtonProps) => (
  <Card
    isPressable
    isHoverable
    variant={selected ? "bordered" : undefined}
    borderWeight="bold"
    {...props}
  >
    <Card.Body css={{ p: "$lg" }}>
      <Text h3 size="$2xl" css={{ m: 0 }}>
        {emoji || "💪"} &nbsp; {children}
      </Text>
    </Card.Body>
  </Card>
)

const Dev = () => {
  const [slideIndex, setSlideIndex] = useState(0)
  const [workoutIndex, setWorkoutIndex] = useState<number | null>(null)

  // prettier-ignore
  useEffect(() => {
    const handler = ({state}: {state: any}) => { setSlideIndex(state.slide) }
    addEventListener("popstate", handler)
    return () => { removeEventListener("popstate", handler) }
  }, [])

  const setWorkout = (index: number) => {
    setWorkoutIndex(index)
    setSlideIndex(1)

    // Set up a history stack for the 3 slides
    history.replaceState({ slide: 0 }, "")
    history.pushState({ slide: 1 }, "")
    history.pushState({ slide: 2 }, "")
    history.go(-1)
  }

  return (
    <Layout>
      <SwipableBody
        index={slideIndex}
        onChangeIndex={(newIndex, oldIndex) => {
          history.go(newIndex - oldIndex)
          setSlideIndex(newIndex)
        }}
        disabled={workoutIndex === null}
        enableMouseEvents
      >
        <Slide>
          <Headers>
            <Header h1 size="$6xl">
              Bleep!
            </Header>
            <Header h2 size="$3xl" css={{ fontWeight: "$normal" }}>
              Choose your workout
            </Header>
          </Headers>
          <Cards>
            <CardButton
              selected={workoutIndex === 0}
              onClick={() => setWorkout(0)}
              emoji="🦵"
            >
              Knee ability zero
            </CardButton>
            <CardButton
              selected={workoutIndex === 1}
              onClick={() => setWorkout(1)}
              emoji="🏋️"
            >
              AthleanX anti-slouch
            </CardButton>
            <CardButton
              selected={workoutIndex === 2}
              onClick={() => setWorkout(2)}
              emoji="🧘"
            >
              Yoga
            </CardButton>
          </Cards>
        </Slide>
        <Slide>
          <Headers>
            <Header h1 size="$6xl">
              #{workoutIndex}
            </Header>
            <Header h2 size="$3xl" css={{ fontWeight: "$normal" }}>
              Configure your workout
            </Header>
          </Headers>
          <Cards>
            <Collapse.Group splitted css={{ p: "0" }}>
              <Collapse title="Step A" css={{ p: "$8" }}>
                <Text>
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed
                  do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                  Ut enim ad minim veniam, quis nostrud exercitation ullamco
                  laboris nisi ut aliquip ex ea commodo consequat.
                </Text>
              </Collapse>
              <Collapse title="Step B">
                <Text>
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed
                  do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                  Ut enim ad minim veniam, quis nostrud exercitation ullamco
                  laboris nisi ut aliquip ex ea commodo consequat.
                </Text>
              </Collapse>
              <Collapse title="Step C">
                <Text>
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed
                  do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                  Ut enim ad minim veniam, quis nostrud exercitation ullamco
                  laboris nisi ut aliquip ex ea commodo consequat.
                </Text>
              </Collapse>
            </Collapse.Group>
          </Cards>
        </Slide>
        <Slide>
          <Headers>
            <Header h1 size="$9xl">
              ⏱️
            </Header>
          </Headers>
        </Slide>
      </SwipableBody>
    </Layout>
  )
}

export default Dev
