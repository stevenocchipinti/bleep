import CardButton from "@/components/CardButton"
import Logo from "@/components/Logo"
import { SwipeableChild } from "@/components/SwipeableView"
import { SettingsIcon } from "@chakra-ui/icons"
import {
  Spacer,
  IconButton,
  VStack,
  Heading,
  Button,
  HStack,
  Flex,
} from "@chakra-ui/react"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import { Program } from "lib/dummyData"
import { useState } from "react"

interface HomeScreenProps {
  openSettingsModal: () => void
  selectedProgramIndex: number | null
  selectProgramByIndex: (index: number) => void
  programs: Program[]
  setPrograms: React.Dispatch<React.SetStateAction<Program[]>>
}

const HomeScreen = ({
  openSettingsModal,
  selectedProgramIndex,
  selectProgramByIndex,
  programs,
  setPrograms,
}: HomeScreenProps) => {
  const [_isDragging, setIsDragging] = useState(false)

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

  const onDragStart = () => {
    setIsDragging(true)
  }

  return (
    <SwipeableChild
      transparentHeader={
        <>
          <Spacer />
          <IconButton
            aria-label="Settings"
            variant="ghost"
            icon={<SettingsIcon />}
            fontSize="xl"
            onClick={openSettingsModal}
          />
        </>
      }
    >
      <Flex px={8} gap={6} justifyContent="center" alignItems="center">
        <Logo h={20} />
        <Heading as="h1" size="4xl">
          Bleep!
        </Heading>
      </Flex>

      <Heading as="h2" textAlign="center" px={8} size="xl">
        Choose your program
      </Heading>

      <DragDropContext onDragStart={onDragStart} onDragEnd={onProgramDragEnd}>
        <Droppable droppableId="program-cards" type="program">
          {provided => (
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
                      selected={selectedProgramIndex === index}
                      onClick={() => selectProgramByIndex(index)}
                      emoji={program.emoji}
                    />
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
              <Button
                colorScheme="blue"
                variant="outline"
                onClick={() => {
                  setPrograms(programs => [
                    ...programs,
                    {
                      id: `program-${programs.length}`,
                      name: "New Program",
                      description: "",
                      emoji: "👋",
                      blocks: [],
                    },
                  ])
                }}
              >
                Add Program
              </Button>
            </VStack>
          )}
        </Droppable>
      </DragDropContext>
    </SwipeableChild>
  )
}

export default HomeScreen
