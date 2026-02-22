import CardButton from "@/components/CardButton"
import CompletionHeatmap from "@/components/CompletionHeatmap"
import Logo from "@/components/Logo"
import { SwipeableChild } from "@/components/SwipeableView"
import { SparklesIcon } from "@/components/icons"
import {
  SettingsIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from "@chakra-ui/icons"
import {
  Spacer,
  IconButton,
  VStack,
  Heading,
  Button,
  Flex,
  Box,
  Collapse,
} from "@chakra-ui/react"

import DndContext from "@/components/DndContext"
import { DragEndEvent } from "@dnd-kit/core"

import { Program, ProgramSchema } from "lib/types"
import { useTimerActor } from "lib/useTimerMachine"
import { useEffect, useState, useMemo } from "react"

interface HomeScreenProps {
  openSettingsModal: () => void
  selectProgramById: (id: string, skip?: boolean) => void
}

const HomeScreen = ({
  openSettingsModal,
  selectProgramById,
}: HomeScreenProps) => {
  const [hasNewProgram, setHasNewProgram] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  const { state, send } = useTimerActor()
  const { allPrograms, completions } = state.context

  const programIds = allPrograms.map(p => p.id)

  // Group programs by category
  type ProgramGroup = {
    category: string
    programs: Program[]
  }

  const groupedPrograms: ProgramGroup[] = useMemo(() => {
    const groups = new Map<string, Program[]>()

    const withCategory: Program[] = []
    const withoutCategory: Program[] = []

    allPrograms.forEach(p => {
      if (p.category) {
        withCategory.push(p)
      } else {
        withoutCategory.push(p)
      }
    })

    // If no programs have categories, return flat list (no grouping)
    if (withCategory.length === 0) {
      return []
    }

    withCategory.forEach(p => {
      const category = p.category!
      if (!groups.has(category)) groups.set(category, [])
      groups.get(category)!.push(p)
    })

    const result = Array.from(groups.entries())
      .map(([category, items]) => ({ category, programs: items }))
      .sort((a, b) => {
        const aIsArchive = a.category.toLowerCase().includes("archive")
        const bIsArchive = b.category.toLowerCase().includes("archive")
        if (aIsArchive && !bIsArchive) return 1
        if (!aIsArchive && bIsArchive) return -1
        return a.category.localeCompare(b.category)
      })

    if (withoutCategory.length > 0) {
      result.unshift({
        category: "__uncategorized__",
        programs: withoutCategory,
      })
    }

    return result
  }, [allPrograms])

  const toggleGroup = (category: string) => {
    const updated = new Set(expandedGroups)
    if (updated.has(category)) {
      updated.delete(category)
    } else {
      updated.add(category)
    }
    setExpandedGroups(updated)
  }

  const isCompletedToday = (programId: string): boolean => {
    const today = new Date().toISOString().split("T")[0]
    return completions.some(
      c => c.programId === programId && c.completedAt.startsWith(today),
    )
  }

  useEffect(() => {
    if (hasNewProgram) {
      setHasNewProgram(false)
      selectProgramById(allPrograms[allPrograms.length - 1].id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasNewProgram])

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!active?.id || !over?.id || active.id === over.id) return

    // Build visual order of program IDs
    const visualOrder: string[] = []
    if (groupedPrograms.length > 0) {
      groupedPrograms.forEach(group => {
        group.programs.forEach(p => visualOrder.push(p.id))
      })
    } else {
      allPrograms.forEach(p => visualOrder.push(p.id))
    }

    const fromIndex = visualOrder.indexOf(active.id as string)
    const toIndex = visualOrder.indexOf(over.id as string)
    if (fromIndex === -1 || toIndex === -1) return

    const newOrder = [...visualOrder]
    const [moved] = newOrder.splice(fromIndex, 1)
    newOrder.splice(toIndex, 0, moved)

    const reordered = newOrder.map(id => allPrograms.find(p => p.id === id)!)
    send({ type: "SET_ALL_PROGRAMS", allPrograms: reordered })
  }

  const renderProgramCard = (program: Program) => {
    const isValid = ProgramSchema.safeParse(program).success
    const isHabitStyle = program.blocks.length === 0

    return (
      <CardButton
        key={program.id}
        id={program.id}
        text={program.name}
        showCompletionToggle={isHabitStyle}
        isCompletedToday={isHabitStyle ? isCompletedToday(program.id) : false}
        onClick={() => selectProgramById(program.id)}
        error={!isValid}
        innerButtonOnClick={
          isHabitStyle
            ? e => {
                e.stopPropagation()
                send({
                  type: "TOGGLE_PROGRAM_COMPLETION",
                  programId: program.id,
                })
              }
            : e => {
                e.stopPropagation()
                selectProgramById(program.id, isValid)
              }
        }
        heatmapContent={
          <CompletionHeatmap completions={completions} programId={program.id} />
        }
      />
    )
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
        {allPrograms.length === 0 && "Create your first program below"}
      </Heading>

      <VStack spacing={4} alignItems="stretch" p={6}>
        {groupedPrograms.length > 0 ? (
          // Grouped view (categories exist)
          groupedPrograms.map(group => {
            const isExpanded = expandedGroups.has(group.category)
            const isUncategorized = group.category === "__uncategorized__"
            return (
              <Box key={group.category}>
                {!isUncategorized && (
                  <Button
                    variant="ghost"
                    width="100%"
                    justifyContent="flex-start"
                    leftIcon={
                      isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />
                    }
                    onClick={() => toggleGroup(group.category)}
                    fontSize="lg"
                    fontWeight="semibold"
                    px={2}
                    _hover={{}}
                  >
                    {group.category}
                  </Button>
                )}
                <Collapse in={isUncategorized || isExpanded} animateOpacity>
                  <DndContext
                    onDragEnd={onDragEnd}
                    items={group.programs.map(p => p.id)}
                  >
                    <VStack spacing={3} alignItems="stretch">
                      {group.programs.map(renderProgramCard)}
                    </VStack>
                  </DndContext>
                </Collapse>
              </Box>
            )
          })
        ) : (
          // Flat view (no categories)
          <DndContext onDragEnd={onDragEnd} items={programIds}>
            <VStack spacing={3} alignItems="stretch">
              {allPrograms.map(renderProgramCard)}
            </VStack>
          </DndContext>
        )}

        <Box pt={8}>
          <Flex gap={3} width="full">
            <Button
              variant="outline"
              flex="1"
              onClick={() => {
                send({ type: "NEW_PROGRAM" })
                setHasNewProgram(true)
              }}
            >
              New program
            </Button>
            <IconButton
              as="a"
              href="https://gemini.google.com/gem/1oFUSgMNfEIpFR2iIkYgA051cSdrRpI65?usp=sharing"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="AI suggestions"
              variant="outline"
              icon={<SparklesIcon />}
              p={2}
            />
          </Flex>
        </Box>
      </VStack>
    </SwipeableChild>
  )
}

export default HomeScreen
