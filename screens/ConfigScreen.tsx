import React, { useState } from "react"
import {
  ArrowBackIcon,
  HamburgerIcon,
  DeleteIcon,
  LinkIcon,
  CopyIcon,
  SettingsIcon,
  ArrowForwardIcon,
} from "@chakra-ui/icons"
import {
  IconButton,
  Heading,
  Menu,
  MenuButton,
  MenuList,
  MenuGroup,
  MenuItem,
  MenuDivider,
  Flex,
  Text,
  Button,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Switch,
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

import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import DndContext from "@/components/DndContext"

import CardButton from "@/components/CardButton"
import { ChipTab } from "@/components/Chip"
import { DurationInput } from "@/components/DurationInput"
import { SwipeableChild, FooterButton } from "@/components/SwipeableView"
import { useTimerActor } from "lib/useTimerMachine"
import { currentProgramFrom } from "lib/timerMachine"
import {
  BlockSchema,
  ProgramSchema,
  TimerBlock,
  PauseBlock,
  MessageBlock,
  TimerBlockSchema,
  PauseBlockSchema,
  MessageBlockSchema,
} from "lib/types"
import { DragEndEvent } from "@dnd-kit/core"

const OptionalIndicator = () => (
  <Text color="gray.400" fontSize="xs" ml={2} as="span">
    (optional)
  </Text>
)

const FlexTabPanel = ({ children }: { children: React.ReactNode }) => (
  <TabPanel px={0}>
    <Flex gap={4} direction="column">
      {children}
    </Flex>
  </TabPanel>
)

interface ConfigScreenProps {
  openSettingsModal: () => void
  goBack: () => void
  goForward: () => void
}
const ConfigScreen = ({
  openSettingsModal,
  goBack,
  goForward,
}: ConfigScreenProps) => {
  const [currentBlock, setCurrentBlock] = useState<number | null>(null)

  // Delete modal
  type ThingToDelete =
    | { type: "block"; index: number }
    | { type: "program" }
    | null
  const [thingToDelete, setThingToDelete] = useState<ThingToDelete>(null)
  const cancelRef = React.useRef<any>()

  const { state, send } = useTimerActor()
  const { program, blocks } = currentProgramFrom(state.context)

  if (program === null) return null

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (active?.id && over?.id && active.id !== over?.id) {
      send({
        type: "MOVE_BLOCK",
        fromIndex: program.blocks.findIndex(block => block.id === active.id),
        toIndex: program.blocks.findIndex(block => block.id === over.id),
      })
    }
  }

  const onDragStart = () => {
    setCurrentBlock(null)
  }

  return (
    <>
      <AlertDialog
        isOpen={!!thingToDelete}
        leastDestructiveRef={cancelRef}
        onClose={() => setThingToDelete(null)}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent mx={4}>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete {thingToDelete?.type}
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete the {thingToDelete?.type}:{" "}
              <Text as="strong">
                {thingToDelete && thingToDelete.type === "block"
                  ? blocks[thingToDelete.index].name
                  : program.name}
              </Text>
              ?
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={() => setThingToDelete(null)}>
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={() => {
                  if (thingToDelete === null) return
                  else if (thingToDelete.type === "block")
                    send({ type: "DELETE_BLOCK", index: thingToDelete.index })
                  else if (thingToDelete?.type === "program")
                    send({ type: "DELETE_PROGRAM" })

                  setThingToDelete(null)
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
            <Editable value={program.name} flex={1}>
              <EditablePreview
                fontSize="3xl"
                fontWeight="thin"
                textAlign="center"
                minH="full"
                minW="full"
                p={0}
                lineHeight={1.3}
                as="h1"
              />
              <EditableInput
                fontSize="3xl"
                fontWeight="thin"
                textAlign="center"
                required
                onChange={e =>
                  send({ type: "RENAME_PROGRAM", name: e.target.value })
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
                <MenuGroup>
                  <MenuItem
                    icon={<LinkIcon />}
                    onClick={() => console.log("Not implemented yet")}
                  >
                    Share
                  </MenuItem>
                  <MenuItem
                    icon={<CopyIcon />}
                    onClick={() => send({ type: "DUPLICATE_PROGRAM" })}
                  >
                    Duplicate
                  </MenuItem>
                  <MenuItem
                    icon={<DeleteIcon />}
                    onClick={() => setThingToDelete({ type: "program" })}
                  >
                    Delete
                  </MenuItem>
                </MenuGroup>
                <MenuDivider />
                <MenuGroup>
                  <MenuItem onClick={openSettingsModal} icon={<SettingsIcon />}>
                    Settings
                  </MenuItem>
                </MenuGroup>
              </MenuList>
            </Menu>
          </>
        }
        footer={
          <FooterButton
            variant="brand"
            span={4}
            onClick={goForward}
            rightIcon={<ArrowForwardIcon />}
          >
            Go
          </FooterButton>
        }
      >
        <Text
          display="flex"
          alignItems="center"
          justifyContent="center"
          flexGrow={1}
          textAlign="center"
          fontSize="xl"
          p={4}
          pb={8}
        >
          {program.description}
        </Text>

        <Flex direction="column" gap={4} p={4} pb={0}>
          <DndContext
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            items={program.blocks.map(b => b.id)}
          >
            {program.blocks.map((block, index) => {
              const blockTypes = ["timer", "pause", "message"] as const

              const onTypeChange = (typeIndex: number) => {
                const newBlocks: {
                  timer: TimerBlock
                  pause: PauseBlock
                  message: MessageBlock
                } = {
                  timer: TimerBlockSchema.parse({
                    type: "timer",
                    name: block.name,
                    seconds: 30,
                  }),
                  pause: PauseBlockSchema.parse({
                    type: "pause",
                    name: block.name,
                  }),
                  message: MessageBlockSchema.parse({
                    type: "message",
                    name: block.name,
                    message: "A message goes here",
                  }),
                }
                send({
                  type: "UPDATE_BLOCK",
                  index,
                  block: newBlocks[blockTypes[typeIndex]],
                })
              }

              const onNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                const name = e.target.value
                if (block.name !== name)
                  send({
                    type: "UPDATE_BLOCK",
                    index,
                    block: { ...block, name },
                  })
              }

              const onSecondsChange = (newSeconds: number) => {
                if (block.type === "timer" && newSeconds !== block.seconds)
                  send({
                    type: "UPDATE_BLOCK",
                    index,
                    block: {
                      ...block,
                      type: "timer",
                      seconds: newSeconds,
                    },
                  })
              }

              const onRepsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                const reps = parseInt(e.target.value) || undefined
                if (block.type === "pause" && reps !== block.reps)
                  send({
                    type: "UPDATE_BLOCK",
                    index,
                    block: {
                      ...block,
                      type: "pause",
                      reps,
                    },
                  })
              }

              const onMessageChange = (
                e: React.ChangeEvent<HTMLTextAreaElement>
              ) => {
                const message = e.target.value
                if (block.type === "message" && message !== block.message)
                  send({
                    type: "UPDATE_BLOCK",
                    index,
                    block: {
                      ...block,
                      type: "message",
                      message,
                    },
                  })
              }

              const onDisabledChange = (
                e: React.ChangeEvent<HTMLInputElement>
              ) => {
                const checked = e.target.checked
                send({
                  type: "UPDATE_BLOCK",
                  index,
                  block: {
                    ...block,
                    disabled: !checked,
                  },
                })
              }

              return (
                <CardButton
                  key={block.id}
                  id={block.id}
                  text={block.name}
                  seconds={block.type === "timer" ? block.seconds : undefined}
                  reps={block.type === "pause" ? block?.reps || 0 : undefined}
                  message={block.type === "message"}
                  error={!BlockSchema.safeParse(block).success}
                  disabled={block.disabled}
                  isExpanded={currentBlock === index}
                  onClick={() =>
                    setCurrentBlock(currentBlock === index ? null : index)
                  }
                >
                  <Tabs
                    index={blockTypes.indexOf(block.type)}
                    onChange={onTypeChange}
                    variant="unstyled"
                  >
                    <TabList display="grid" gridTemplateColumns="1fr 1fr 1fr">
                      <ChipTab isDisabled={block.disabled} colorScheme="blue">
                        Timer
                      </ChipTab>
                      <ChipTab isDisabled={block.disabled} colorScheme="purple">
                        Pause
                      </ChipTab>
                      <ChipTab isDisabled={block.disabled} colorScheme="green">
                        Message
                      </ChipTab>
                    </TabList>
                    <TabPanels>
                      <FlexTabPanel>
                        <FormControl isDisabled={block.disabled}>
                          <FormLabel>Name</FormLabel>
                          <Input
                            value={block.name}
                            placeholder="Name"
                            variant="filled"
                            onChange={onNameChange}
                          />
                        </FormControl>
                        <FormControl isDisabled={block.disabled}>
                          <FormLabel>Duration</FormLabel>
                          <DurationInput
                            totalSeconds={
                              block.type === "timer" ? block.seconds : 0
                            }
                            onChange={onSecondsChange}
                          />
                        </FormControl>
                      </FlexTabPanel>

                      <FlexTabPanel>
                        <FormControl isDisabled={block.disabled}>
                          <FormLabel>Name</FormLabel>
                          <Input
                            value={block.name}
                            placeholder="Name"
                            variant="filled"
                            onChange={onNameChange}
                          />
                        </FormControl>
                        <FormControl isDisabled={block.disabled}>
                          <FormLabel optionalIndicator={<OptionalIndicator />}>
                            Reps
                          </FormLabel>
                          <Input
                            value={
                              block.type === "pause" ? block.reps || "" : ""
                            }
                            type="number"
                            placeholder="Reps"
                            variant="filled"
                            onChange={onRepsChange}
                          />
                        </FormControl>
                      </FlexTabPanel>

                      <FlexTabPanel>
                        <FormControl>
                          <FormLabel>Name</FormLabel>
                          <Input
                            value={block.name}
                            placeholder="Name"
                            variant="filled"
                            onChange={onNameChange}
                          />
                        </FormControl>
                        <FormControl>
                          <FormLabel>Message</FormLabel>
                          <Textarea
                            value={
                              block.type === "message" ? block.message : ""
                            }
                            variant="filled"
                            placeholder="Message"
                            onChange={onMessageChange}
                          />
                        </FormControl>
                      </FlexTabPanel>
                      <Flex gap={4} justifyContent="space-between" mt={2}>
                        <IconButton
                          variant="outline"
                          aria-label="Delete block"
                          icon={<DeleteIcon />}
                          onClick={() =>
                            setThingToDelete({ type: "block", index })
                          }
                        />
                        <FormControl
                          display="flex"
                          alignItems="center"
                          flexBasis="fit-content"
                        >
                          <FormLabel htmlFor="email-alerts" mb="0">
                            Enabled
                          </FormLabel>
                          <Switch
                            defaultChecked={!block.disabled}
                            onChange={onDisabledChange}
                            id="email-alerts"
                          />
                        </FormControl>
                      </Flex>
                    </TabPanels>
                  </Tabs>
                </CardButton>
              )
            })}
            <Button
              variant="outline"
              onClick={() => {
                setCurrentBlock(program.blocks.length)
                send({ type: "ADD_BLOCK" })
              }}
            >
              Add block
            </Button>
          </DndContext>
        </Flex>
      </SwipeableChild>
    </>
  )
}

export default ConfigScreen
