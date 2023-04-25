import { Card, CardBody, chakra, Flex, Heading } from "@chakra-ui/react"
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd"
import React, { forwardRef, ReactNode, useEffect, useState } from "react"
import SwipeableViews from "react-swipeable-views"

const Slide = ({ children }: { children: ReactNode }) => (
  <Flex direction="column" justifyContent="space-between" gap={4}>
    {children}
  </Flex>
)

const Headings = ({ children }: { children: ReactNode }) => (
  <Flex direction="column" gap={16} py={24}>
    {children}
  </Flex>
)

const H1 = ({ children }: { children: ReactNode }) => (
  <Heading textAlign="center" size="4xl" as="h1">
    {children}
  </Heading>
)

const H2 = ({ children }: { children: ReactNode }) => (
  <Heading textAlign="center" size="xl" as="h2">
    {children}
  </Heading>
)

const SwipableBody = chakra(SwipeableViews, {
  baseStyle: {
    flexGrow: 1,
    overflow: "hidden",
    "& > *": {
      height: "100%",
    },
    "& > * > * > *": {
      height: "100%",
    },
  },
})

type CardButtonProps = {
  onClick?: React.MouseEventHandler<unknown> | undefined
  selected?: boolean
  children: React.ReactNode
  isDragging: boolean
  emoji?: string
  style: any
}
const CardButton = forwardRef<HTMLDivElement, CardButtonProps>(
  ({ isDragging, selected, emoji, children, ...props }, ref) => (
    <Card variant={selected ? "filled" : undefined} ref={ref} {...props}>
      <CardBody css={{ p: "$lg" }}>
        <Heading size="md" as="h3">
          {emoji && `${emoji} `}
          {children} {selected && "*"}
        </Heading>
      </CardBody>
    </Card>
  )
)

CardButton.displayName = "CardButton"

const Dev = () => {
  const [workouts, setWorkouts] = useState([
    {
      id: "kaz",
      name: "Knee Ability Zero",
      emoji: "🦵",
      blocks: [
        { name: "Tibialis Raise", reps: 25 },
        { name: "FHL Calf Raise", reps: 25 },
        { name: "Tibialis Raise (again)", reps: 25 },
        { name: "KOT Calf Raise", reps: 25 },
        { name: "Patrick Step", reps: 25 },
        { name: "ATG Split Squat", reps: 25 },
        { name: "Elephant Walk", reps: 30 },
        { name: "L-Sit", seconds: 60 },
        { name: "Couch Stretch", seconds: 60 },
      ],
    },
    {
      id: "athx",
      name: "AthleanX anti-slouch",
      emoji: "🏋️",
      blocks: [
        { name: "Supermans", seconds: 30 },
        { name: "Glute march", seconds: 30 },
        { name: "Supermans", seconds: 30 },
        { name: "Glute march", seconds: 30 },
        { name: "Bridge reach over", seconds: 30 },

        { name: "Chair lat stretch reps", seconds: 30 },
        { name: "Wall DL", seconds: 30 },
        { name: "Chair lat stretch reps", seconds: 30 },
        { name: "Wall DL", seconds: 30 },
        { name: "Bridge reach over", seconds: 30 },
      ],
    },
    {
      id: "yoga",
      name: "Yoga",
      emoji: "🧘",
      blocks: [
        { name: "Downward Dog", seconds: 30 },
        { name: "Upward Dog", seconds: 30 },
        { name: "Cobra", seconds: 30 },
        { name: "Downward Dog", seconds: 30 },
        { name: "Upward Dog", seconds: 30 },
        { name: "Cobra", seconds: 30 },
        { name: "Child's Pose", seconds: 30 },
      ],
    },
  ])
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

  const onDragEnd = (result: any) => {
    if (!result.destination) return
    const { source, destination } = result
    if (source.index === destination.index) return
    setWorkouts(workouts => {
      const newWorkouts = [...workouts]
      const [removed] = newWorkouts.splice(source.index, 1)
      newWorkouts.splice(destination.index, 0, removed)
      return newWorkouts
    })
  }

  return (
    <Flex direction="column" h="100%">
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
          <Headings>
            <H1>Bleep!</H1>
            <H2>Choose your workout</H2>
          </Headings>

          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="workout-cards">
              {(provided, snapshot) => (
                <Flex
                  direction="column"
                  gap={4}
                  p={6}
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                >
                  {workouts.map((workout, index) => (
                    <Draggable
                      key={workout.id}
                      draggableId={workout.id}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <CardButton
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          isDragging={snapshot.isDragging}
                          style={provided.draggableProps.style}
                          selected={workoutIndex === index}
                          onClick={() => setWorkout(index)}
                          emoji={workout.emoji}
                        >
                          {workout.name}
                        </CardButton>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </Flex>
              )}
            </Droppable>
          </DragDropContext>
        </Slide>
        <Slide>
          <Headings>
            <H1>#{workoutIndex}</H1>
            <H2>Configure your workout</H2>
          </Headings>
          <DragDropContext onDragEnd={console.log}>
            <Droppable droppableId="block-cards">
              {(provided, snapshot) => (
                <Flex
                  direction="column"
                  gap={4}
                  p={4}
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                >
                  {workouts[workoutIndex || 0].blocks.map((block, index) => (
                    <Draggable
                      key={`${block.name}-${index}`}
                      draggableId={`${block.name}-${index}--TODO-needs-to-be-static`}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <CardButton
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          isDragging={snapshot.isDragging}
                          style={provided.draggableProps.style}
                          onClick={console.log}
                        >
                          {block.name}
                          {block.reps
                            ? ` ⨯${block.reps}`
                            : ` for ${block.seconds} seconds`}
                        </CardButton>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </Flex>
              )}
            </Droppable>
          </DragDropContext>
        </Slide>
        <Slide>
          <Headings>
            <Heading textAlign="center" as="h1" fontSize="9xl">
              ⏱️
            </Heading>
          </Headings>
        </Slide>
      </SwipableBody>
    </Flex>
  )
}

export default Dev
