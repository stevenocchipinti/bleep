import React, { useState } from "react"
import {
  ArrowBackIcon,
  HamburgerIcon,
  DeleteIcon,
  CalendarIcon,
} from "@chakra-ui/icons"
import {
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Button,
  Flex,
  Text,
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Editable,
  EditableInput,
  EditablePreview,
} from "@chakra-ui/react"
import { useDebouncedCallback } from "use-debounce"

import CompletionHistoryModal from "@/components/CompletionHistoryModal"
import CategoryAutocomplete from "@/components/CategoryAutocomplete"
import { SwipeableChild } from "@/components/SwipeableView"
import { useTimerActor } from "lib/useTimerMachine"
import { currentHabitFrom } from "lib/timerMachine"

interface HabitConfigScreenProps {
  goBack: () => void
}

const HabitConfigScreen = ({ goBack }: HabitConfigScreenProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [historyModalIsOpen, setHistoryModalIsOpen] = useState(false)
  const deleteCancelRef = React.useRef<any>()

  const { state, send } = useTimerActor()
  const habit = currentHabitFrom(state.context)
  const { allPrograms, allHabits } = state.context

  const debouncedSend = useDebouncedCallback(message => {
    send(message)
  }, 100)

  if (habit === null) return null

  return (
    <>
      {/* Delete confirmation dialog */}
      <AlertDialog
        isOpen={showDeleteDialog}
        leastDestructiveRef={deleteCancelRef}
        onClose={() => setShowDeleteDialog(false)}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent mx={4}>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete habit
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete{" "}
              <Text as="strong">{habit.name}</Text>? This will also delete all
              completion history for this habit.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button
                ref={deleteCancelRef}
                onClick={() => setShowDeleteDialog(false)}
              >
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={() => {
                  send({ type: "DELETE_HABIT" })
                  setShowDeleteDialog(false)
                  goBack()
                }}
                ml={3}
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      <SwipeableChild
        header={
          <>
            <IconButton
              aria-label="Back"
              variant="ghost"
              icon={<ArrowBackIcon />}
              onClick={goBack}
              fontSize="xl"
            />
            <Editable defaultValue={habit.name} flex={1}>
              <EditablePreview
                fontSize="3xl"
                fontWeight="thin"
                textAlign="center"
                minH="full"
                minW="full"
                p={0}
                lineHeight={1.3}
                as="h1"
                bg={habit.name ? undefined : "rgba(254, 178, 178, 0.16)"}
              />
              <EditableInput
                fontSize="3xl"
                fontWeight="thin"
                textAlign="center"
                required
                onChange={e =>
                  debouncedSend({
                    type: "RENAME_HABIT",
                    name: e.target.value,
                  })
                }
              />
            </Editable>
            <Menu>
              <MenuButton
                as={IconButton}
                aria-label="Options"
                icon={<HamburgerIcon />}
                variant="outline"
              />
              <MenuList>
                <MenuItem
                  icon={<CalendarIcon />}
                  onClick={() => setHistoryModalIsOpen(true)}
                >
                  History
                </MenuItem>
                <MenuItem
                  icon={<DeleteIcon />}
                  onClick={() => setShowDeleteDialog(true)}
                >
                  Delete
                </MenuItem>
              </MenuList>
            </Menu>
          </>
        }
      >
        <Flex
          direction="column"
          alignItems="stretch"
          justifyContent="flex-start"
          flex={1}
          p={8}
          gap={6}
        >
          <CategoryAutocomplete
            value={habit.category || ""}
            allCategories={[
              ...allPrograms
                .filter(p => p.category)
                .map(p => p.category!)
                .filter((cat, idx, arr) => arr.indexOf(cat) === idx),
              ...allHabits
                .filter(h => h.category)
                .map(h => h.category!)
                .filter((cat, idx, arr) => arr.indexOf(cat) === idx),
            ]}
            onChange={(category: string) =>
              debouncedSend({
                type: "UPDATE_HABIT_CATEGORY",
                category,
              })
            }
          />

          <Text fontSize="xl" color="gray.400" textAlign="center">
            Track this habit daily by tapping the check button on the home
            screen.
          </Text>
        </Flex>
      </SwipeableChild>

      <CompletionHistoryModal
        isOpen={historyModalIsOpen}
        onClose={() => setHistoryModalIsOpen(false)}
        trackableId={habit.id}
        trackableName={habit.name}
        trackableType="habit"
      />
    </>
  )
}

HabitConfigScreen.displayName = "HabitConfigScreen"

export default HabitConfigScreen
