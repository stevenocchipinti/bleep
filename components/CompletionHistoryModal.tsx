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
import { Completion, CompletionSchema } from "lib/types"

interface CompletionHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  trackableId: string
  trackableName: string
  trackableType: "program" | "habit"
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
  completions: Completion[],
): boolean => {
  if (!date) return false
  // Compare using local date strings (YYYY-MM-DD) to avoid timezone issues
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const dateStr = `${year}-${month}-${day}`

  return completions.some(c => {
    // Parse the stored ISO timestamp and convert to local date string
    const completionDate = new Date(c.completedAt)
    const compYear = completionDate.getFullYear()
    const compMonth = String(completionDate.getMonth() + 1).padStart(2, "0")
    const compDay = String(completionDate.getDate()).padStart(2, "0")
    const compDateStr = `${compYear}-${compMonth}-${compDay}`
    return compDateStr === dateStr
  })
}

const isSameDay = (date1: Date | null, date2: Date | null): boolean => {
  if (!date1 || !date2) return false
  return date1.toISOString().split("T")[0] === date2.toISOString().split("T")[0]
}

// Convert ISO string to datetime-local input format (YYYY-MM-DDTHH:mm)
const toDateTimeLocalString = (isoString: string) => {
  const date = new Date(isoString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

// Convert datetime-local input to ISO string (preserve local timezone)
const fromDateTimeLocalString = (localString: string) => {
  // datetime-local format: YYYY-MM-DDTHH:mm
  // Parse it manually to avoid timezone conversion
  const [datePart, timePart] = localString.split("T")
  const [year, month, day] = datePart.split("-")
  const [hours, minutes] = timePart.split(":")

  // Create date in local timezone
  const date = new Date(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day),
    parseInt(hours),
    parseInt(minutes),
    0,
  )

  return date.toISOString()
}

interface MonthCalendarProps {
  month: Date
  selectedDate: Date | null
  onSelectDate: (date: Date) => void
  completions: Completion[]
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
              variant="ghost"
              onClick={() => date && onSelectDate(date)}
              isDisabled={!date}
              position="relative"
              h="40px"
              borderWidth={isSelected ? "2px" : "0"}
              borderColor={isSelected ? "teal.400" : "transparent"}
            >
              {date ? (
                <>
                  <Text
                    position="relative"
                    zIndex={1}
                    fontWeight={isToday ? "bold" : "normal"}
                    color={hasData ? "teal.400" : undefined}
                  >
                    {date.getDate()}
                  </Text>
                  {hasData && (
                    <Box
                      position="absolute"
                      bottom="4px"
                      left="50%"
                      transform="translateX(-50%)"
                      w="4px"
                      h="4px"
                      borderRadius="full"
                      bg="teal.400"
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
  trackableId,
  trackableName,
  trackableType,
}: CompletionHistoryModalProps) => {
   const { state, send } = useTimerActor()

   // Filter completions for current trackable (program or habit)
   const completions = state.context.completions
     .filter(c => c.trackableId === trackableId && c.trackableType === trackableType)
     .sort(
       (a, b) =>
         new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
     )

  // Calendar state
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  // Delete confirmation state
  const [completionToDelete, setCompletionToDelete] = useState<string | null>(
    null,
  )
  const deleteCancelRef = useRef<any>()

   // Edit completion state
   const [editingCompletion, setEditingCompletion] =
     useState<Completion | null>(null)
  const [editDateTime, setEditDateTime] = useState("")
  const editCancelRef = useRef<any>()

  // Add completion state
  const [isAddingCompletion, setIsAddingCompletion] = useState(false)
  const [addDateTime, setAddDateTime] = useState("")
  const addCancelRef = useRef<any>()

  // Get completions for selected date
  const completionsForSelectedDate = selectedDate
    ? completions.filter(c => {
        const completionDate = new Date(c.completedAt)
        return (
          completionDate.getFullYear() === selectedDate.getFullYear() &&
          completionDate.getMonth() === selectedDate.getMonth() &&
          completionDate.getDate() === selectedDate.getDate()
        )
      })
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

      {/* Edit completion dialog */}
      <AlertDialog
        isOpen={!!editingCompletion}
        leastDestructiveRef={editCancelRef}
        onClose={() => {
          setEditingCompletion(null)
          setEditDateTime("")
        }}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent mx={4}>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Edit completion
            </AlertDialogHeader>

            <AlertDialogBody>
              <FormControl>
                <FormLabel>Date and Time</FormLabel>
                <Input
                  type="datetime-local"
                  value={editDateTime}
                  onChange={e => setEditDateTime(e.target.value)}
                />
              </FormControl>
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button
                ref={editCancelRef}
                onClick={() => {
                  setEditingCompletion(null)
                  setEditDateTime("")
                }}
              >
                Cancel
              </Button>
              <Button
                colorScheme="teal"
                onClick={() => {
                  if (editingCompletion && editDateTime) {
                    send({
                      type: "UPDATE_COMPLETION",
                      completionId: editingCompletion.id,
                      completedAt: fromDateTimeLocalString(editDateTime),
                    })
                  }
                  setEditingCompletion(null)
                  setEditDateTime("")
                }}
                ml={3}
                isDisabled={!editDateTime}
              >
                Save
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      {/* Add completion dialog */}
      <AlertDialog
        isOpen={isAddingCompletion}
        leastDestructiveRef={addCancelRef}
        onClose={() => {
          setIsAddingCompletion(false)
          setAddDateTime("")
        }}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent mx={4}>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Add completion
            </AlertDialogHeader>

            <AlertDialogBody>
              <FormControl>
                <FormLabel>Date and Time</FormLabel>
                <Input
                  type="datetime-local"
                  value={addDateTime}
                  onChange={e => setAddDateTime(e.target.value)}
                />
              </FormControl>
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button
                ref={addCancelRef}
                onClick={() => {
                  setIsAddingCompletion(false)
                  setAddDateTime("")
                }}
              >
                Cancel
              </Button>
              <Button
                colorScheme="teal"
                onClick={() => {
                   if (addDateTime) {
                     send({
                       type: "ADD_COMPLETION",
                       completion: CompletionSchema.parse({
                         trackableId,
                         trackableType,
                         trackableName,
                         completedAt: fromDateTimeLocalString(addDateTime),
                       }),
                     })
                  }
                  setIsAddingCompletion(false)
                  setAddDateTime("")
                }}
                ml={3}
                isDisabled={!addDateTime}
              >
                Add
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      {/* Main modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl" isCentered>
        <ModalOverlay />
        <ModalContent mx={4}>
           <ModalHeader>{trackableName}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={6} align="stretch">
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

              {/* Selected date completions */}
              {selectedDate ? (
                <VStack spacing={3} align="stretch">
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
                        cursor="pointer"
                        _hover={{ bg: "whiteAlpha.100" }}
                        onClick={() => {
                          setEditingCompletion(completion)
                          setEditDateTime(
                            toDateTimeLocalString(completion.completedAt),
                          )
                        }}
                      >
                        <Text>{formatDateTime(completion.completedAt)}</Text>
                        <IconButton
                          aria-label="Delete"
                          icon={<DeleteIcon />}
                          size="sm"
                          variant="ghost"
                          onClick={e => {
                            e.stopPropagation()
                            setCompletionToDelete(completion.id)
                          }}
                        />
                      </HStack>
                    ))
                  )}
                </VStack>
              ) : (
                <Text color="gray.500" textAlign="center">
                  Select a day to view or add completions
                </Text>
              )}
            </VStack>
          </ModalBody>

          <ModalFooter mt={4}>
            <Button
              colorScheme="teal"
              onClick={() => {
                if (!selectedDate) return
                // Create new date to avoid mutating selectedDate
                const defaultDate = new Date(selectedDate)
                defaultDate.setHours(new Date().getHours())
                defaultDate.setMinutes(new Date().getMinutes())
                setAddDateTime(toDateTimeLocalString(defaultDate.toISOString()))
                setIsAddingCompletion(true)
              }}
              isDisabled={!selectedDate}
              mr={3}
            >
              Add
            </Button>
            <Button onClick={onClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}

CompletionHistoryModal.displayName = "CompletionHistoryModal"
export default CompletionHistoryModal
