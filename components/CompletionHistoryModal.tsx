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
  FormHelperText,
  Select,
} from "@chakra-ui/react"
import { ChevronLeftIcon, ChevronRightIcon, DeleteIcon } from "@chakra-ui/icons"
import { useTimerActor } from "lib/useTimerMachine"
import { Completion, CompletionSchema } from "lib/types"
import { DurationInput } from "components/DurationInput"

interface CompletionHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  programId: string
  programName: string
  /** Which completions to show, if not just those for `programId`. */
  matches?: (completion: Completion) => boolean
  /**
   * Programs a completion can be assigned to (e.g. breathing patterns). When
   * given, the add and edit forms let you choose one.
   */
  programOptions?: ProgramOption[]
}

interface ProgramOption {
  id: string
  name: string
}

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  if (minutes === 0) return `${rest}s`
  return rest === 0 ? `${minutes} min` : `${minutes} min ${rest}s`
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
              bg={isToday ? "whiteAlpha.200" : undefined}
              _hover={{
                bg: isToday ? "whiteAlpha.300" : undefined,
              }}
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

interface CompletionFormValues {
  programId: string
  programName: string
  completedAt: string
  durationSeconds?: number
}

interface CompletionFormDialogProps {
  title: string
  submitLabel: string
  initial: CompletionFormValues
  programOptions?: ProgramOption[]
  onCancel: () => void
  onSubmit: (values: CompletionFormValues) => void
}

/** Add or edit every stored field of a completion. */
const CompletionFormDialog = ({
  title,
  submitLabel,
  initial,
  programOptions,
  onCancel,
  onSubmit,
}: CompletionFormDialogProps) => {
  const cancelRef = useRef<any>()
  const [programId, setProgramId] = useState(initial.programId)
  const [dateTime, setDateTime] = useState(
    toDateTimeLocalString(initial.completedAt),
  )
  const [duration, setDuration] = useState(initial.durationSeconds ?? 0)

  return (
    <AlertDialog
      isOpen
      leastDestructiveRef={cancelRef}
      onClose={onCancel}
      isCentered
    >
      <AlertDialogOverlay>
        <AlertDialogContent mx={4}>
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            {title}
          </AlertDialogHeader>

          <AlertDialogBody>
            <VStack spacing={4} align="stretch">
              {programOptions && (
                <FormControl>
                  <FormLabel>Pattern</FormLabel>
                  <Select
                    value={programId}
                    onChange={e => setProgramId(e.target.value)}
                  >
                    {programOptions.map(option => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </Select>
                </FormControl>
              )}

              <FormControl>
                <FormLabel>Date and Time</FormLabel>
                <Input
                  type="datetime-local"
                  value={dateTime}
                  onChange={e => setDateTime(e.target.value)}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Duration</FormLabel>
                <DurationInput totalSeconds={duration} onChange={setDuration} />
                <FormHelperText>
                  Leave at 0 if it wasn&apos;t timed
                </FormHelperText>
              </FormControl>
            </VStack>
          </AlertDialogBody>

          <AlertDialogFooter>
            <Button ref={cancelRef} onClick={onCancel}>
              Cancel
            </Button>
            <Button
              colorScheme="teal"
              ml={3}
              isDisabled={!dateTime}
              onClick={() =>
                onSubmit({
                  programId,
                  programName:
                    programOptions?.find(option => option.id === programId)
                      ?.name ?? initial.programName,
                  completedAt: fromDateTimeLocalString(dateTime),
                  durationSeconds: duration > 0 ? duration : undefined,
                })
              }
            >
              {submitLabel}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  )
}

const CompletionHistoryModal = ({
  isOpen,
  onClose,
  programId,
  programName,
  matches,
  programOptions,
}: CompletionHistoryModalProps) => {
  const { state, send } = useTimerActor()

  // Filter completions for current program
  const completions = state.context.completions
    .filter(matches ?? (c => c.programId === programId))
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
  const [editingCompletion, setEditingCompletion] = useState<Completion | null>(
    null,
  )

  // Add completion state: the date and time to start the new entry at
  const [addingAt, setAddingAt] = useState<string | null>(null)

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

  // The calendar already shows the day, so entries only need the time (HH:mm)
  const formatTime = (isoString: string) => {
    const date = new Date(isoString)
    const hours = String(date.getHours()).padStart(2, "0")
    const minutes = String(date.getMinutes()).padStart(2, "0")
    return `${hours}:${minutes}`
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
      {editingCompletion && (
        <CompletionFormDialog
          title="Edit completion"
          submitLabel="Save"
          initial={editingCompletion}
          programOptions={programOptions}
          onCancel={() => setEditingCompletion(null)}
          onSubmit={values => {
            send({
              type: "UPDATE_COMPLETION",
              completionId: editingCompletion.id,
              ...values,
              durationSeconds: values.durationSeconds ?? null,
            })
            setEditingCompletion(null)
          }}
        />
      )}

      {/* Add completion dialog */}
      {addingAt && (
        <CompletionFormDialog
          title="Add completion"
          submitLabel="Add"
          initial={{
            programId: programOptions?.[0]?.id ?? programId,
            programName: programOptions?.[0]?.name ?? programName,
            completedAt: addingAt,
          }}
          programOptions={programOptions}
          onCancel={() => setAddingAt(null)}
          onSubmit={values => {
            send({
              type: "ADD_COMPLETION",
              completion: CompletionSchema.parse(values),
            })
            setAddingAt(null)
          }}
        />
      )}

      {/* Main modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl" isCentered>
        <ModalOverlay />
        <ModalContent mx={4}>
          <ModalHeader>{programName}</ModalHeader>
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
                        onClick={() => setEditingCompletion(completion)}
                      >
                        <Text>
                          {formatTime(completion.completedAt)}
                          {matches && ` · ${completion.programName}`}
                          {completion.durationSeconds !== undefined &&
                            ` · ${formatDuration(completion.durationSeconds)}`}
                        </Text>
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
                setAddingAt(defaultDate.toISOString())
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
