import React, { useState, useRef } from "react"
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Button,
  VStack,
  HStack,
  Text,
  IconButton,
  Divider,
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Grid,
  Box,
  FormControl,
  FormLabel,
  Input,
} from "@chakra-ui/react"
import { ChevronLeftIcon, ChevronRightIcon, DeleteIcon } from "@chakra-ui/icons"
import { useTimerActor } from "lib/useTimerMachine"
import { ProgramCompletion, ProgramCompletionSchema } from "lib/types"

interface CompletionHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  programId: string
  programName: string
}

// Helper functions for calendar operations
const getDaysInMonth = (date: Date): (Date | null)[] => {
  const year = date.getFullYear()
  const month = date.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  const days: (Date | null)[] = []

  // Add empty days for padding (start of week)
  const startDayOfWeek = firstDay.getDay() // 0 = Sunday
  for (let i = 0; i < startDayOfWeek; i++) {
    days.push(null)
  }

  // Add all days in month
  for (let day = 1; day <= lastDay.getDate(); day++) {
    days.push(new Date(year, month, day))
  }

  return days
}

const hasCompletions = (
  date: Date | null,
  completions: ProgramCompletion[]
): boolean => {
  if (!date) return false
  const dateStr = date.toISOString().split("T")[0]
  return completions.some(c => c.completedAt.startsWith(dateStr))
}

const isSameDay = (date1: Date | null, date2: Date | null): boolean => {
  if (!date1 || !date2) return false
  return (
    date1.toISOString().split("T")[0] === date2.toISOString().split("T")[0]
  )
}

interface MonthCalendarProps {
  month: Date
  selectedDate: Date | null
  onSelectDate: (date: Date) => void
  completions: ProgramCompletion[]
}

const MonthCalendar = ({
  month,
  selectedDate,
  onSelectDate,
  completions,
}: MonthCalendarProps) => {
  const days = getDaysInMonth(month)
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  return (
    <VStack spacing={2}>
      {/* Week day headers */}
      <Grid templateColumns="repeat(7, 1fr)" gap={1} w="full">
        {weekDays.map(day => (
          <Box key={day} textAlign="center" fontSize="sm" color="gray.500">
            {day}
          </Box>
        ))}
      </Grid>

      {/* Calendar days */}
      <Grid templateColumns="repeat(7, 1fr)" gap={1} w="full">
        {days.map((date, index) => {
          const isSelected = isSameDay(date, selectedDate)
          const hasData = date ? hasCompletions(date, completions) : false
          const isToday = date ? isSameDay(date, new Date()) : false

          return (
            <Button
              key={index}
              size="sm"
              variant={isSelected ? "solid" : "ghost"}
              colorScheme={isSelected ? "teal" : undefined}
              onClick={() => date && onSelectDate(date)}
              isDisabled={!date}
              position="relative"
              h="40px"
            >
              {date ? (
                <>
                  <Text
                    position="relative"
                    zIndex={1}
                    fontWeight={isToday ? "bold" : "normal"}
                  >
                    {date.getDate()}
                  </Text>
                  {hasData && !isSelected && (
                    <Box
                      position="absolute"
                      top="50%"
                      left="50%"
                      transform="translate(-50%, -50%)"
                      w="32px"
                      h="32px"
                      borderRadius="full"
                      bg="teal.100"
                      zIndex={0}
                    />
                  )}
                </>
              ) : null}
            </Button>
          )
        })}
      </Grid>
    </VStack>
  )
}

const CompletionHistoryModal = ({
  isOpen,
  onClose,
  programId,
  programName,
}: CompletionHistoryModalProps) => {
  const { state, send } = useTimerActor()

  // Filter completions for current program
  const completions = state.context.programCompletions
    .filter(c => c.programId === programId)
    .sort((a, b) =>
      new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    )

  // Calendar state
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  // Delete confirmation state
  const [completionToDelete, setCompletionToDelete] = useState<string | null>(
    null
  )
  const deleteCancelRef = useRef<any>()

  // Get completions for selected date
  const selectedDateStr = selectedDate?.toISOString().split("T")?.[0] // YYYY-MM-DD
  const completionsForSelectedDate =
    selectedDate && selectedDateStr
      ? completions.filter(c => c.completedAt.startsWith(selectedDateStr))
      : []

  // Format date for display (Australian format: YYYY/MM/DD HH:mm)
  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    const hours = String(date.getHours()).padStart(2, "0")
    const minutes = String(date.getMinutes()).padStart(2, "0")
    return `${year}/${month}/${day} ${hours}:${minutes}`
  }

  // Navigate months
  const goToPreviousMonth = () => {
    setSelectedMonth(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(newDate.getMonth() - 1)
      return newDate
    })
  }

  const goToNextMonth = () => {
    setSelectedMonth(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(newDate.getMonth() + 1)
      return newDate
    })
  }

  return (
    <>
      {/* Delete confirmation dialog */}
      <AlertDialog
        isOpen={!!completionToDelete}
        leastDestructiveRef={deleteCancelRef}
        onClose={() => setCompletionToDelete(null)}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent mx={4}>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete completion
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete this completion entry?
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button
                ref={deleteCancelRef}
                onClick={() => setCompletionToDelete(null)}
              >
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={() => {
                  if (completionToDelete) {
                    send({
                      type: "DELETE_COMPLETION",
                      completionId: completionToDelete,
                    })
                  }
                  setCompletionToDelete(null)
                }}
                ml={3}
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      {/* Main modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl" isCentered>
        <ModalOverlay />
        <ModalContent mx={4}>
          <ModalHeader>History: {programName}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              {/* Month navigation */}
              <HStack justify="space-between">
                <IconButton
                  aria-label="Previous month"
                  icon={<ChevronLeftIcon />}
                  onClick={goToPreviousMonth}
                  variant="ghost"
                />
                <Text fontSize="lg" fontWeight="bold">
                  {selectedMonth.toLocaleString("en-AU", {
                    month: "long",
                    year: "numeric",
                  })}
                </Text>
                <IconButton
                  aria-label="Next month"
                  icon={<ChevronRightIcon />}
                  onClick={goToNextMonth}
                  variant="ghost"
                />
              </HStack>

               {/* Calendar component */}
               <MonthCalendar
                 month={selectedMonth}
                 selectedDate={selectedDate}
                 onSelectDate={setSelectedDate}
                 completions={completions}
               />

              <Divider />

              {/* Selected date completions */}
              {selectedDate ? (
                <VStack spacing={3} align="stretch">
                  <Text fontWeight="bold">
                    {selectedDate.toLocaleDateString("en-AU")}
                  </Text>

                  {completionsForSelectedDate.length === 0 ? (
                    <Text color="gray.500">No completions for this day</Text>
                  ) : (
                    completionsForSelectedDate.map(completion => (
                      <HStack
                        key={completion.id}
                        justify="space-between"
                        p={2}
                        borderWidth={1}
                        borderRadius="md"
                      >
                        <Text>{formatDateTime(completion.completedAt)}</Text>
                        <HStack>
                          {/* Edit button - TODO: Implement in Phase 5 */}
                          <Button size="sm" variant="ghost">
                            Edit
                          </Button>
                          <IconButton
                            aria-label="Delete"
                            icon={<DeleteIcon />}
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setCompletionToDelete(completion.id)
                            }
                          />
                        </HStack>
                      </HStack>
                    ))
                  )}

                  {/* Add button - TODO: Implement in Phase 5 */}
                  <Button variant="outline" size="sm">
                    Add completion
                  </Button>
                </VStack>
              ) : (
                <Text color="gray.500" textAlign="center">
                  Select a day to view or add completions
                </Text>
              )}
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button onClick={onClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}

CompletionHistoryModal.displayName = "CompletionHistoryModal"
export default CompletionHistoryModal
