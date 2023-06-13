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
  const [hasNewProgram, setHasNewProgram] = useState(false)

  const { state, send } = useTimerActor()
  const { allPrograms, selectedProgramId } = state.context

  const programIds = allPrograms.map(program => program.id)

  useEffect(() => {
    if (hasNewProgram) {
      setHasNewProgram(false)
      selectProgramById(allPrograms[allPrograms.length - 1].id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasNewProgram])

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (active?.id && over?.id && active.id !== over?.id) {
      send({
        type: "MOVE_PROGRAM",
        fromIndex: allPrograms.findIndex(program => program.id === active.id),
        toIndex: allPrograms.findIndex(program => program.id === over.id),
      })
    }
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
        {allPrograms.length > 0
          ? "Choose your program"
          : "Create your first program below"}
      </Heading>

      <VStack spacing={4} alignItems="stretch" p={6}>
        <DndContext onDragEnd={onDragEnd} items={programIds}>
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
              />
            )
          })}
        </DndContext>
        <Button
          variant="outline"
          onClick={() => {
            send({ type: "NEW_PROGRAM" })
            setHasNewProgram(true)
          }}
        >
          New program
        </Button>
      </VStack>
    </SwipeableChild>
  )
}

export default HomeScreen
