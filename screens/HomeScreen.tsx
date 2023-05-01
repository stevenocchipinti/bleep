import CardButton from "@/components/CardButton"
import { SwipeableChild } from "@/components/SwipeableView"
import { SettingsIcon } from "@chakra-ui/icons"
import { Spacer, IconButton, VStack, Flex, Heading } from "@chakra-ui/react"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import { Program } from "lib/dummyData"
import { ReactNode, useState } from "react"

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
  const [isDragging, setIsDragging] = useState(false)

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
      <Headings>
        <H1>Bleep!</H1>
        <H2>Choose your program</H2>
      </Headings>

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
            </VStack>
          )}
        </Droppable>
      </DragDropContext>
    </SwipeableChild>
  )
}

export default HomeScreen
