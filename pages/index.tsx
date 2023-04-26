import React, { forwardRef, ReactNode, useEffect, useState } from "react"
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd"
import {
  Card,
  CardBody,
  Flex,
  Heading,
  Text,
  IconButton,
  Spacer,
  CircularProgress,
  CircularProgressLabel,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  MenuDivider,
  MenuGroup,
} from "@chakra-ui/react"
import {
  ArrowBackIcon,
  ArrowForwardIcon,
  CopyIcon,
  DeleteIcon,
  DragHandleIcon,
  HamburgerIcon,
  LinkIcon,
  SettingsIcon,
  UnlockIcon,
  LockIcon,
} from "@chakra-ui/icons"

import {
  FooterButton,
  SwipableParent,
  SwipeableChild,
} from "components/SwipeableView"
import SegmentedProgressBar from "components/SegmentedProgressBar"
import dummyData from "lib/dummyData"
import useWakeLock from "lib/useWakeLock"

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
      <CardBody
        display="flex"
        alignItems="center"
        gap="0.25rem"
        padding={3}
        paddingLeft="0.25rem"
      >
        <DragHandleIcon color="gray.600" />
        <Text fontSize="lg">
          {emoji && `${emoji} `}
          {children} {selected && "*"}
        </Text>
      </CardBody>
    </Card>
  )
)

CardButton.displayName = "CardButton"

const Dev = () => {
  const [workouts, setWorkouts] = useState(dummyData)
  const [slideIndex, setSlideIndex] = useState(0)
  const [workoutIndex, setWorkoutIndex] = useState<number | null>(null)

  const { wakeLockEnabled, wakeLockSupported, toggleWakeLock } = useWakeLock()

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
      <SwipableParent
        index={slideIndex}
        onChangeIndex={(newIndex, oldIndex) => {
          history.go(newIndex - oldIndex)
          setSlideIndex(newIndex)
        }}
        disabled={workoutIndex === null}
        enableMouseEvents
      >
        <SwipeableChild
          transparentHeader={
            <>
              <Spacer />
              <IconButton
                aria-label="Settings"
                variant="ghost"
                icon={<SettingsIcon />}
                fontSize="xl"
              />
            </>
          }
        >
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
        </SwipeableChild>
        <SwipeableChild
          header={
            <>
              <IconButton
                aria-label="Back"
                variant="ghost"
                icon={<ArrowBackIcon />}
                onClick={() => {
                  history.go(-1)
                  setSlideIndex(0)
                }}
                fontSize="xl"
              />
              <Heading fontWeight="thin" textAlign="center" as="h1">
                {dummyData[workoutIndex || 0].name}
              </Heading>
              <IconButton
                aria-label="Wake lock"
                variant="outline"
                icon={<HamburgerIcon />}
                onClick={console.log}
              />
            </>
          }
          footer={
            <FooterButton
              span={2}
              onClick={() => {
                history.go(1)
                setSlideIndex(2)
              }}
              rightIcon={<ArrowForwardIcon />}
            >
              Go
            </FooterButton>
          }
        >
          <Text textAlign="center" fontSize="xl" p={4} pb={8}>
            {dummyData[workoutIndex || 0].description}
          </Text>

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
        </SwipeableChild>
        <SwipeableChild
          header={
            <>
              <IconButton
                aria-label="Back"
                variant="ghost"
                icon={<ArrowBackIcon />}
                onClick={() => {
                  history.go(-1)
                  setSlideIndex(1)
                }}
                fontSize="xl"
              />
              <Heading fontWeight="thin" textAlign="center" as="h1">
                {dummyData[workoutIndex || 0].name}
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
              <FooterButton onClick={console.log}>Reset</FooterButton>
              <FooterButton onClick={console.log}>Start</FooterButton>
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
              blocks={[
                { width: 10, percentDone: 1 },
                { width: 20, percentDone: 0.5 },
                { width: 30, percentDone: 0 },
              ]}
            />
            <CircularProgress
              trackColor="gray.700"
              color="teal.300"
              capIsRound
              size="full"
              value={40}
            >
              <CircularProgressLabel fontSize="6xl">
                00:00
              </CircularProgressLabel>
            </CircularProgress>
            <Heading size="3xl" textAlign="center">
              Supermans
            </Heading>
          </Flex>
        </SwipeableChild>
      </SwipableParent>
    </Flex>
  )
}

export default Dev
