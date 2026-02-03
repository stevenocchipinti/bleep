import CardButton from "@/components/CardButton"
import CompletionHeatmap from "@/components/CompletionHeatmap"
import Logo from "@/components/Logo"
import { SwipeableChild } from "@/components/SwipeableView"
import { SettingsIcon, ChevronDownIcon, ChevronRightIcon } from "@chakra-ui/icons"
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

import { Program, ProgramSchema, Habit, HabitSchema } from "lib/types"
import { useTimerActor } from "lib/useTimerMachine"
import { useEffect, useState, useMemo } from "react"

interface HomeScreenProps {
  openSettingsModal: () => void
  selectProgramById: (id: string, skip?: boolean) => void
  selectHabitById: (id: string) => void
}

const HomeScreen = ({
  openSettingsModal,
  selectProgramById,
  selectHabitById,
}: HomeScreenProps) => {
  const [hasNewProgram, setHasNewProgram] = useState(false)
  // Initialize with all groups expanded
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  const { state, send } = useTimerActor()
  const {
    allPrograms,
    allHabits,
    selectedProgramId,
    selectedHabitId,
    completions,
  } = state.context

  type Trackable =
    | { type: "program"; id: string; data: Program }
    | { type: "habit"; id: string; data: Habit }

  const trackables: Trackable[] = [
    ...allPrograms.map(p => ({ type: "program" as const, id: p.id, data: p })),
    ...allHabits.map(h => ({ type: "habit" as const, id: h.id, data: h })),
  ]

  const trackableIds = trackables.map(t => t.id)

  // Group trackables by category
  type TrackableGroup = {
    category: string
    trackables: Trackable[]
  }

  const groupedTrackables: TrackableGroup[] = useMemo(() => {
    const groups = new Map<string, Trackable[]>()

    // Separate trackables with and without categories
    const trackablesWithCategory: Trackable[] = []
    const trackablesWithoutCategory: Trackable[] = []

    trackables.forEach(t => {
      if (t.data.category) {
        trackablesWithCategory.push(t)
      } else {
        trackablesWithoutCategory.push(t)
      }
    })

    // If no trackables have categories, return flat list (no grouping)
    if (trackablesWithCategory.length === 0) {
      return []
    }

    // Build groups from trackables with categories
    trackablesWithCategory.forEach(t => {
      const category = t.data.category!
      if (!groups.has(category)) groups.set(category, [])
      groups.get(category)!.push(t)
    })

    // Convert to array and sort alphabetically
    const result = Array.from(groups.entries())
      .map(([category, items]) => ({
        category,
        trackables: items,
      }))
      .sort((a, b) => a.category.localeCompare(b.category))

    // Add Uncategorized group only if there are trackables without categories
    if (trackablesWithoutCategory.length > 0) {
      result.push({
        category: "Uncategorized",
        trackables: trackablesWithoutCategory,
      })
    }

    return result
  }, [trackables])

  const toggleGroup = (category: string) => {
    const updated = new Set(expandedGroups)
    if (updated.has(category)) {
      updated.delete(category)
    } else {
      updated.add(category)
    }
    setExpandedGroups(updated)
  }

  const isCompletedToday = (habitId: string): boolean => {
    const today = new Date().toISOString().split("T")[0]
    return completions.some(
      c =>
        c.trackableId === habitId &&
        c.trackableType === "habit" &&
        c.completedAt.startsWith(today),
    )
  }

  useEffect(() => {
    if (hasNewProgram) {
      setHasNewProgram(false)
      selectProgramById(allPrograms[allPrograms.length - 1].id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasNewProgram])

  // Auto-expand all groups when categories appear
  useEffect(() => {
    if (groupedTrackables.length > 0 && expandedGroups.size === 0) {
      const allCategories = new Set(groupedTrackables.map(g => g.category))
      setExpandedGroups(allCategories)
    }
  }, [groupedTrackables, expandedGroups.size])

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (active?.id && over?.id && active.id !== over?.id) {
      const activeTrackable = trackables.find(t => t.id === active.id)
      const overTrackable = trackables.find(t => t.id === over.id)

      // Only allow reordering within the same type for now
      if (
        activeTrackable?.type === "program" &&
        overTrackable?.type === "program"
      ) {
        send({
          type: "MOVE_PROGRAM",
          fromIndex: allPrograms.findIndex(p => p.id === active.id),
          toIndex: allPrograms.findIndex(p => p.id === over.id),
        })
      } else if (
        activeTrackable?.type === "habit" &&
        overTrackable?.type === "habit"
      ) {
        send({
          type: "MOVE_HABIT",
          fromIndex: allHabits.findIndex(h => h.id === active.id),
          toIndex: allHabits.findIndex(h => h.id === over.id),
        })
      }
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
        {allPrograms.length === 0 &&
          allHabits.length === 0 &&
          "Create your first program or habit below"}
      </Heading>

      <VStack spacing={4} alignItems="stretch" p={6}>
        {groupedTrackables.length > 0 ? (
          // Grouped view (categories exist)
          groupedTrackables.map(group => {
            const isExpanded = expandedGroups.has(group.category)
            return (
              <Box key={group.category}>
                {/* Group header */}
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
                  px={4}
                >
                  {group.category}
                </Button>

                {/* Collapse animation */}
                <Collapse in={isExpanded} animateOpacity>
                  <DndContext
                    onDragEnd={onDragEnd}
                    items={group.trackables.map(t => t.id)}
                  >
                    <VStack spacing={3} alignItems="stretch" pl={2}>
                      {group.trackables.map(trackable => {
                        if (trackable.type === "program") {
                          const program = trackable.data as Program
                          const isValid = ProgramSchema.safeParse(program)
                            .success
                          return (
                            <CardButton
                              key={program.id}
                              id={program.id}
                              text={program.name}
                              trackableType="program"
                              selected={selectedProgramId === program.id}
                              onClick={() => selectProgramById(program.id)}
                              error={!isValid}
                              innerButtonOnClick={e => {
                                e.stopPropagation()
                                selectProgramById(program.id, isValid)
                              }}
                              heatmapContent={
                                <CompletionHeatmap
                                  completions={completions}
                                  trackableId={program.id}
                                  trackableType="program"
                                />
                              }
                            />
                          )
                        } else {
                          const habit = trackable.data as Habit
                          const isValid = HabitSchema.safeParse(habit).success
                          return (
                            <CardButton
                              key={habit.id}
                              id={habit.id}
                              text={habit.name}
                              trackableType="habit"
                              isCompletedToday={isCompletedToday(habit.id)}
                              selected={selectedHabitId === habit.id}
                              onClick={() => selectHabitById(habit.id)}
                              error={!isValid}
                              innerButtonOnClick={e => {
                                e.stopPropagation()
                                send({
                                  type: "TOGGLE_HABIT_COMPLETION",
                                  habitId: habit.id,
                                })
                              }}
                              heatmapContent={
                                <CompletionHeatmap
                                  completions={completions}
                                  trackableId={habit.id}
                                  trackableType="habit"
                                />
                              }
                            />
                          )
                        }
                      })}
                    </VStack>
                  </DndContext>
                </Collapse>
              </Box>
            )
          })
        ) : (
          // Flat view (no categories)
          <DndContext onDragEnd={onDragEnd} items={trackableIds}>
            <VStack spacing={3} alignItems="stretch">
              {trackables.map(trackable => {
                if (trackable.type === "program") {
                  const program = trackable.data as Program
                  const isValid = ProgramSchema.safeParse(program).success
                  return (
                    <CardButton
                      key={program.id}
                      id={program.id}
                      text={program.name}
                      trackableType="program"
                      selected={selectedProgramId === program.id}
                      onClick={() => selectProgramById(program.id)}
                      error={!isValid}
                      innerButtonOnClick={e => {
                        e.stopPropagation()
                        selectProgramById(program.id, isValid)
                      }}
                      heatmapContent={
                        <CompletionHeatmap
                          completions={completions}
                          trackableId={program.id}
                          trackableType="program"
                        />
                      }
                    />
                  )
                } else {
                  const habit = trackable.data as Habit
                  const isValid = HabitSchema.safeParse(habit).success
                  return (
                    <CardButton
                      key={habit.id}
                      id={habit.id}
                      text={habit.name}
                      trackableType="habit"
                      isCompletedToday={isCompletedToday(habit.id)}
                      selected={selectedHabitId === habit.id}
                      onClick={() => selectHabitById(habit.id)}
                      error={!isValid}
                      innerButtonOnClick={e => {
                        e.stopPropagation()
                        send({
                          type: "TOGGLE_HABIT_COMPLETION",
                          habitId: habit.id,
                        })
                      }}
                      heatmapContent={
                        <CompletionHeatmap
                          completions={completions}
                          trackableId={habit.id}
                          trackableType="habit"
                        />
                      }
                    />
                  )
                }
              })}
            </VStack>
          </DndContext>
        )}

        <Button
          variant="outline"
          onClick={() => {
            send({ type: "NEW_PROGRAM" })
            setHasNewProgram(true)
          }}
        >
          New program
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            send({ type: "NEW_HABIT" })
            // Select the newly created habit after a short delay
            setTimeout(() => {
              const newHabit =
                state.context.allHabits[state.context.allHabits.length - 1]
              if (newHabit) selectHabitById(newHabit.id)
            }, 100)
          }}
        >
          New habit
        </Button>
      </VStack>
    </SwipeableChild>
  )
}

export default HomeScreen
