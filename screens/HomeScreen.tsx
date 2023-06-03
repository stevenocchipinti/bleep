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

import DndContext from "@/components/DndContext"
import { DragEndEvent } from "@dnd-kit/core"

import { Program, ProgramSchema } from "lib/types"
import { useTimerActor } from "lib/useTimerMachine"
import { useEffect, useState } from "react"

interface HomeScreenProps {
  openSettingsModal: () => void
  selectProgramById: (id: string, skip?: boolean) => void
}

const HomeScreen = ({
  openSettingsModal,
  selectProgramById,
}: HomeScreenProps) => {
  const [programIds, setProgramIds] = useState<string[]>([])

  const { state, send } = useTimerActor()
  const { allPrograms, selectedProgramId } = state.context

  useEffect(() => {
    if (allPrograms.length > 0)
      setProgramIds(allPrograms.map(program => program.id))
  }, [allPrograms])

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (active?.id && over?.id && active.id !== over?.id) {
      send({
        type: "MOVE_PROGRAM",
        fromIndex: allPrograms.findIndex(program => program.id === active.id),
        toIndex: allPrograms.findIndex(program => program.id === over.id),
      })
    }
  }

  const onDragStart = () => {}

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

      <VStack spacing={4} alignItems="stretch" p={6}>
        <DndContext
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          items={programIds}
        >
          {programIds.map(id => {
            const program: Program = allPrograms.find(p => p.id === id)!
            const isValid = ProgramSchema.safeParse(program).success
            return (
              <CardButton
                key={id}
                id={id}
                text={program.name}
                selected={selectedProgramId === program.id}
                onClick={() => selectProgramById(program.id)}
                error={!isValid}
                innerButtonOnClick={e => {
                  e.stopPropagation()
                  selectProgramById(program.id, isValid)
                }}
                emoji={program.emoji}
              />
            )
          })}
        </DndContext>
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
    </SwipeableChild>
  )
}

export default HomeScreen
