import React, { ReactNode, useEffect, useState } from "react"
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd"
import {
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
  VStack,
  chakra,
  useDisclosure,
} from "@chakra-ui/react"
import {
  ArrowBackIcon,
  ArrowForwardIcon,
  CopyIcon,
  DeleteIcon,
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
import useTimer from "lib/useTimer"
import CardButton from "components/CardButton"
import SettingsModal from "components/SettingsModal"

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

const Page = () => {
  const [programs, setPrograms] = useState(dummyData)
  const [slideIndex, setSlideIndex] = useState(0)
  const [programIndex, setProgramIndex] = useState<number | null>(null)

  const [isDragging, setIsDragging] = useState(false)
  const { isOpen, onOpen, onClose } = useDisclosure()
  const {
    wakeLockEnabled,
    wakeLockSupported,
    toggleWakeLock,
    enableWakeLock,
    disableWakeLock,
  } = useWakeLock()

  // TODO: Make this the chosen program program
  const program = dummyData[0]

  const { toggle, reset, currentBlockIndex, secondsLeftOfBlock, text, status } =
    useTimer(program)

  useEffect(() => {
    status === "running" ? enableWakeLock() : disableWakeLock()
  }, [disableWakeLock, enableWakeLock, status])

  // Used for the progress bars
  const currentBlockPercent =
    (secondsLeftOfBlock / program.blocks[currentBlockIndex].seconds) * 100
  const progressBarData = program.blocks.map((block, index) => ({
    width: block.seconds,
    percentDone:
      currentBlockIndex === index
        ? status === "stopped" ? 0 : 1 - secondsLeftOfBlock / block.seconds
        : currentBlockIndex > index ? 1 : 0, // prettier-ignore
  }))

  // prettier-ignore
  useEffect(() => {
    const handler = ({state}: {state: any}) => { setSlideIndex(state.slide) }
    addEventListener("popstate", handler)
    return () => { removeEventListener("popstate", handler) }
  }, [])

  const setProgram = (index: number) => {
    setProgramIndex(index)
    setSlideIndex(1)

    // Set up a history stack for the 3 slides
    history.replaceState({ slide: 0 }, "")
    history.pushState({ slide: 1 }, "")
    history.pushState({ slide: 2 }, "")
    history.go(-1)
  }

  const onProgramDragEnd = (result: any) => {
    setIsDragging(false)
    if (!result.destination) return
    const { source, destination } = result
    if (source.index === destination.index) return
    setPrograms(programs => {
      const newPrograms = [...programs]
      const [removed] = newPrograms.splice(source.index, 1)
      newPrograms.splice(destination.index, 0, removed)
      return newPrograms
    })
  }

  const onBlockDragEnd = () => {
    setIsDragging(false)
  }

  const onDragStart = () => {
    setIsDragging(true)
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
          disabled={programIndex === null || isDragging}
          enableMouseEvents
        >
          {/* Home screen */}
          <SwipeableChild
            transparentHeader={
              <>
                <Spacer />
                <IconButton
                  aria-label="Settings"
                  variant="ghost"
                  icon={<SettingsIcon />}
                  fontSize="xl"
                  onClick={onOpen}
                />
              </>
            }
          >
            <Headings>
              <H1>Bleep!</H1>
              <H2>Choose your program</H2>
            </Headings>

            <DragDropContext
              onDragStart={onDragStart}
              onDragEnd={onProgramDragEnd}
            >
              <Droppable droppableId="program-cards" type="program">
                {(provided, snapshot) => (
                  <VStack
                    spacing={4}
                    alignItems="stretch"
                    p={6}
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                  >
                    {programs.map((program, index) => (
                      <Draggable
                        key={program.id}
                        draggableId={program.id}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <CardButton
                            text={program.name}
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            handleProps={provided.dragHandleProps}
                            isDragging={snapshot.isDragging}
                            style={provided.draggableProps.style}
                            selected={programIndex === index}
                            onClick={() => setProgram(index)}
                            emoji={program.emoji}
                          />
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </VStack>
                )}
              </Droppable>
            </DragDropContext>
          </SwipeableChild>

          {/* Config screen */}
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
                  {dummyData[programIndex || 0].name}
                </Heading>
                <Menu>
                  <MenuButton
                    as={IconButton}
                    aria-label="Options"
                    icon={<HamburgerIcon />}
                    variant="outline"
                  />
                  <MenuList>
                    <MenuGroup>
                      <MenuItem icon={<DeleteIcon />}>Delete</MenuItem>
                      <MenuItem icon={<LinkIcon />}>Share</MenuItem>
                      <MenuItem icon={<CopyIcon />}>Duplicate</MenuItem>
                    </MenuGroup>
                    <MenuDivider />
                    <MenuGroup>
                      <MenuItem onClick={onOpen} icon={<SettingsIcon />}>
                        Settings
                      </MenuItem>
                    </MenuGroup>
                  </MenuList>
                </Menu>
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
              {dummyData[programIndex || 0].description}
            </Text>

            <DragDropContext
              onDragStart={onDragStart}
              onDragEnd={onBlockDragEnd}
            >
              <Droppable droppableId="block-cards" type="block">
                {(provided, snapshot) => (
                  <Flex
                    direction="column"
                    gap={4}
                    p={4}
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                  >
                    {programs[programIndex || 0].blocks.map((block, index) => (
                      <Draggable
                        key={`${block.name}-${index}`}
                        draggableId={`${block.name}-${index}--TODO-needs-to-be-static`}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <CardButton
                            text={`${block.name} for ${block.seconds} seconds`}
                            togglesBody
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            handleProps={provided.dragHandleProps}
                            isDragging={snapshot.isDragging}
                            style={provided.draggableProps.style}
                            onClick={console.log}
                          >
                            <chakra.ul ml={10}>
                              <li>Wait until done</li>
                              <li>Lead time</li>
                              <li>Announcement</li>
                              <li>Beeps</li>
                            </chakra.ul>
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

          {/* Timer screen */}
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
                  {dummyData[programIndex || 0].name}
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
                <FooterButton isDisabled={status === "stopped"} onClick={reset}>
                  Reset
                </FooterButton>
                <FooterButton onClick={toggle}>
                  {status === "running" ? "Pause" : "Start"}
                </FooterButton>
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
                animate={status === "running"}
              />
              <CircularProgress
                transition="1s linear"
                trackColor="gray.700"
                color="teal.300"
                capIsRound
                size="full"
                value={currentBlockPercent}
              >
                <CircularProgressLabel fontSize="6xl">
                  {secondsLeftOfBlock || "00:00"}
                </CircularProgressLabel>
              </CircularProgress>
              <Heading size="3xl" textAlign="center">
                {text}
              </Heading>
            </Flex>
          </SwipeableChild>
        </SwipableParent>
      </Flex>
    </>
  )
}

export default Page
