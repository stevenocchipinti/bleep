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
} from "@chakra-ui/react"
import { ChevronLeftIcon, ChevronRightIcon, DeleteIcon } from "@chakra-ui/icons"
import { useTimerActor } from "lib/useTimerMachine"
import { ProgramCompletion } from "lib/types"

interface CompletionHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  programId: string
  programName: string
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

              {/* Calendar component - TODO: Implement in Phase 4 */}
              <Text color="gray.500" textAlign="center" py={8}>
                Calendar component coming in Phase 4
              </Text>

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
