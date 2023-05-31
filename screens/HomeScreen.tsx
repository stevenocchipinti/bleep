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
  Flex,
} from "@chakra-ui/react"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import { ProgramSchema } from "lib/types"
import { useTimerActor } from "lib/useTimerMachine"
import { useState } from "react"

interface HomeScreenProps {
  openSettingsModal: () => void
  selectProgramByIndex: (index: number, skip?: boolean) => void
}

const HomeScreen = ({
  openSettingsModal,
  selectProgramByIndex,
}: HomeScreenProps) => {
  const [_isDragging, setIsDragging] = useState(false)

  const { state, send } = useTimerActor()
  const { allPrograms, selectedProgramIndex } = state.context

  const onProgramDragEnd = (result: any) => {
    setIsDragging(false)
    if (!result.destination) return
    const { source, destination } = result
    if (source.index === destination.index) return
    // TODO: Implement reordering of programs
    // setPrograms(programs => {
    //   const newPrograms = [...programs]
    //   const [removed] = newPrograms.splice(source.index, 1)
    //   newPrograms.splice(destination.index, 0, removed)
    //   console.log({ source, destination })
    //   return newPrograms
    // })
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
      <Flex px={8} gap={5} justifyContent="center" alignItems="center">
        <Logo h={20} />
        <Heading as="h1" fontSize="7xl" fontFamily="dancing script">
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
              {allPrograms.map((program, index) => {
                const isValid = ProgramSchema.safeParse(program).success
                return (
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
                        error={!isValid}
                        innerButtonOnClick={e => {
                          e.stopPropagation()
                          selectProgramByIndex(index, isValid)
                        }}
                        emoji={program.emoji}
                      />
                    )}
                  </Draggable>
                )
              })}
              {provided.placeholder}
              <Button
                variant="outline"
                onClick={() => {
                  // TODO: Implement adding new programs
                  // setPrograms(programs => [
                  //   ...programs,
                  //   {
                  //     id: `program-${programs.length}`,
                  //     name: "New Program",
                  //     description: "",
                  //     emoji: "👋",
                  //     blocks: [],
                  //   },
                  // ])
                }}
              >
                New program
              </Button>
            </VStack>
          )}
        </Droppable>
      </DragDropContext>
    </SwipeableChild>
  )
}

export default HomeScreen
