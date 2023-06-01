import React, { useCallback, useEffect, useState } from "react"
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
  useDisclosure,
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
} from "@chakra-ui/react"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"

import CardButton from "@/components/CardButton"
import { ChipTab } from "@/components/Chip"
import { DurationInput } from "@/components/DurationInput"
import { SwipeableChild, FooterButton } from "@/components/SwipeableView"
import { useTimerActor } from "lib/useTimerMachine"
import {
  BlockSchema,
  ProgramSchema,
  TimerBlock,
  PauseBlock,
  MessageBlock,
} from "lib/types"
import { currentProgramFrom } from "lib/timerMachine"

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
  const [_isDragging, setIsDragging] = useState(false)
  const [currentBlock, setCurrentBlock] = useState<number | null>(null)

  // Delete modal
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null)
  const cancelRef = React.useRef<any>()

  const { state, send } = useTimerActor()
  const { program, blocks } = currentProgramFrom(state.context)

  if (program === null) return null
  const programValid = ProgramSchema.safeParse(program).success

  const onBlockDragEnd = () => {
    setIsDragging(false)
  }

  const onDragStart = () => {
    setIsDragging(true)
  }

  return (
    <>
      <AlertDialog
        isOpen={typeof deleteIndex === "number"}
        leastDestructiveRef={cancelRef}
        onClose={() => setDeleteIndex(null)}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent mx={4}>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete block
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete{" "}
              <Text as="strong">
                {typeof deleteIndex === "number"
                  ? blocks[deleteIndex].name
                  : "..."}
              </Text>
              ?
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={() => setDeleteIndex(null)}>
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={() => {
                  if (typeof deleteIndex === "number")
                    send({ type: "DELETE_BLOCK", index: deleteIndex })
                  setDeleteIndex(null)
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
            <Heading fontWeight="thin" textAlign="center" as="h1">
              {program.name}
            </Heading>
            <Menu>
              <MenuButton
                as={IconButton}
                aria-label="Options"
                icon={<HamburgerIcon />}
                variant="outline"
              />
              <MenuList>
                <MenuGroup>
                  <MenuItem icon={<DeleteIcon />}>Delete</MenuItem>
                  <MenuItem icon={<LinkIcon />}>Share</MenuItem>
                  <MenuItem icon={<CopyIcon />}>Duplicate</MenuItem>
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
            isDisabled={!programValid}
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

        <DragDropContext onDragStart={onDragStart} onDragEnd={onBlockDragEnd}>
          <Droppable droppableId="block-cards" type="block">
            {provided => (
              <Flex
                direction="column"
                gap={4}
                p={4}
                pb={0}
                {...provided.droppableProps}
                ref={provided.innerRef}
              >
                {program.blocks.map((block, index) => {
                  const blockTypes = ["timer", "pause", "message"] as const

                  const onTypeChange = (typeIndex: number) => {
                    const newBlocks: {
                      timer: TimerBlock
                      pause: PauseBlock
                      message: MessageBlock
                    } = {
                      timer: {
                        type: "timer",
                        name: block.name,
                        seconds: 30,
                      },
                      pause: { type: "pause", name: block.name },
                      message: {
                        type: "message",
                        name: block.name,
                        message: "A message goes here",
                      },
                    }
                    send({
                      type: "UPDATE_BLOCK",
                      index,
                      block: newBlocks[blockTypes[typeIndex]],
                    })
                  }

                  const onNameChange = (
                    e: React.ChangeEvent<HTMLInputElement>
                  ) => {
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

                  const onRepsChange = (
                    e: React.ChangeEvent<HTMLInputElement>
                  ) => {
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
                    <Draggable
                      key={`block-${index}`}
                      draggableId={`${block.name}-${index}--TODO-needs-to-be-static`}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <CardButton
                          seconds={
                            block.type === "timer" ? block.seconds : undefined
                          }
                          reps={
                            block.type === "pause"
                              ? block?.reps || 0
                              : undefined
                          }
                          message={block.type === "message"}
                          error={!BlockSchema.safeParse(block).success}
                          disabled={block.disabled}
                          text={block.name}
                          isExpanded={currentBlock === index}
                          onClick={() =>
                            setCurrentBlock(
                              currentBlock === index ? null : index
                            )
                          }
                          ref={provided.innerRef}
                          handleProps={provided.dragHandleProps}
                          isDragging={snapshot.isDragging}
                          style={provided.draggableProps.style}
                          {...provided.draggableProps}
                        >
                          <Tabs
                            index={blockTypes.indexOf(block.type)}
                            onChange={onTypeChange}
                            variant="unstyled"
                          >
                            <TabList
                              display="grid"
                              gridTemplateColumns="1fr 1fr 1fr"
                            >
                              <ChipTab
                                isDisabled={block.disabled}
                                colorScheme="blue"
                              >
                                Timer
                              </ChipTab>
                              <ChipTab
                                isDisabled={block.disabled}
                                colorScheme="purple"
                              >
                                Pause
                              </ChipTab>
                              <ChipTab
                                isDisabled={block.disabled}
                                colorScheme="green"
                              >
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
                                  <FormLabel
                                    optionalIndicator={<OptionalIndicator />}
                                  >
                                    Reps
                                  </FormLabel>
                                  <Input
                                    value={
                                      block.type === "pause"
                                        ? block.reps || ""
                                        : ""
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
                                      block.type === "message"
                                        ? block.message
                                        : ""
                                    }
                                    variant="filled"
                                    placeholder="Message"
                                    onChange={onMessageChange}
                                  />
                                </FormControl>
                              </FlexTabPanel>
                              <Flex
                                gap={4}
                                justifyContent="space-between"
                                mt={2}
                              >
                                <IconButton
                                  variant="outline"
                                  aria-label="Delete block"
                                  icon={<DeleteIcon />}
                                  onClick={() => setDeleteIndex(index)}
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
                      )}
                    </Draggable>
                  )
                })}
                {provided.placeholder}
                <Button
                  variant="outline"
                  onClick={() => {
                    setCurrentBlock(program.blocks.length)
                    send({ type: "ADD_BLOCK" })
                  }}
                >
                  Add block
                </Button>
              </Flex>
            )}
          </Droppable>
        </DragDropContext>
      </SwipeableChild>
    </>
  )
}

export default ConfigScreen
