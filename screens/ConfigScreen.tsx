import React, { useEffect, useState } from "react"
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
  EditableTextarea,
  FormErrorMessage,
} from "@chakra-ui/react"
import {
  BlockSchema,
  TimerBlock,
  PauseBlock,
  MessageBlock,
  TimerBlockSchema,
  PauseBlockSchema,
  MessageBlockSchema,
  ProgramSchema,
} from "lib/types"
import { DragEndEvent } from "@dnd-kit/core"
import lzString from "lz-string"
import QRCode from "react-qr-code"

import DndContext from "@/components/DndContext"

import CardButton from "@/components/CardButton"
import { ChipTab } from "@/components/Chip"
import { DurationInput } from "@/components/DurationInput"
import { SwipeableChild, FooterButton } from "@/components/SwipeableView"
import { useTimerActor } from "lib/useTimerMachine"
import { currentProgramFrom } from "lib/timerMachine"
import { ShareIcon } from "@/components/icons"

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
  const deleteCancelRef = React.useRef<any>()

  // Program
  const { state, send } = useTimerActor()
  const { program, blocks } = currentProgramFrom(state.context)
  const isValid = ProgramSchema.safeParse(program).success

  // Sharing
  interface ShareData {
    title: string
    text: string
    url: string
  }
  const [shareData, setShareData] = useState<ShareData | null>(null)
  const [shareModalIsOpen, setShareModalIsOpen] = useState(false)
  const [canUseShareAPI, setCanUseShareAPI] = useState(false)
  const shareCancelRef = React.useRef<any>()
  useEffect(() => {
    setCanUseShareAPI(!!window.navigator?.share)

    if (isValid)
      setShareData({
        title: program?.name || "",
        text: program?.description || "",
        url: [
          window.location.origin,
          "/import?data=",
          lzString.compressToEncodedURIComponent(JSON.stringify(program)),
        ].join(""),
      })
  }, [isValid, program])

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
        isOpen={shareModalIsOpen}
        leastDestructiveRef={shareCancelRef}
        onClose={() => setShareModalIsOpen(false)}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent mx={4}>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Share {shareData?.title}
            </AlertDialogHeader>

            <AlertDialogBody>
              {shareData?.url && (
                <Flex direction="column" gap={4}>
                  <Text>{shareData?.text}</Text>
                  <QRCode
                    style={{ width: "100%", height: "100%" }}
                    bgColor="transparent"
                    fgColor="currentColor"
                    value={shareData.url}
                  />
                  <Input readOnly value={shareData.url} />
                </Flex>
              )}
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button
                ref={shareCancelRef}
                onClick={() => setShareModalIsOpen(false)}
              >
                Close
              </Button>
              <Button
                colorScheme="teal"
                display={canUseShareAPI ? "flex" : "none"}
                onClick={() => {
                  if (shareData && canUseShareAPI) {
                    navigator.share(shareData).catch(console.error)
                  }
                }}
                ml={3}
                leftIcon={<ShareIcon width={5} height={5} />}
              >
                Share
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
      <AlertDialog
        isOpen={!!thingToDelete}
        leastDestructiveRef={deleteCancelRef}
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
              <Button
                ref={deleteCancelRef}
                onClick={() => setThingToDelete(null)}
              >
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
                bg={program.name ? undefined : "rgba(254, 178, 178, 0.16)"}
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
                    isDisabled={!isValid}
                    onClick={() => setShareModalIsOpen(true)}
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
        <Editable value={program.description} display="flex" flex={1}>
          <EditablePreview
            display="flex"
            alignItems="center"
            justifyContent="center"
            flexGrow={1}
            textAlign="center"
            fontSize="xl"
            p={4}
            pb={8}
          />
          <EditableTextarea
            display="flex"
            alignItems="center"
            justifyContent="center"
            flexGrow={1}
            textAlign="center"
            fontSize="xl"
            m={4}
            p={4}
            pb={8}
            required
            onChange={e =>
              send({
                type: "UPDATE_PROGRAM_DESCRIPTION",
                description: e.target.value,
              })
            }
          />
        </Editable>

        <Flex direction="column" gap={4} p={4} pb={0}>
          <DndContext
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            items={program.blocks.map(b => b.id)}
          >
            {program.blocks.map((block, index) => {
              const blockTypes = ["timer", "pause", "message"] as const
              const blockParseResults = BlockSchema.safeParse(block)
              const errors = blockParseResults.success
                ? {}
                : blockParseResults.error.formErrors.fieldErrors

              const onTypeChange = (typeIndex: number) => {
                const newBlocks: {
                  timer: TimerBlock
                  pause: PauseBlock
                  message: MessageBlock
                } = {
                  timer: TimerBlockSchema.parse({
                    type: "timer",
                    name: block.name || "New timer block",
                    seconds: 30,
                  }),
                  pause: PauseBlockSchema.parse({
                    type: "pause",
                    name: block.name || "New pause block",
                  }),
                  message: MessageBlockSchema.parse({
                    type: "message",
                    name: block.name || "New message block",
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
                  error={Object.keys(errors).length > 0}
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
                        <FormControl
                          isDisabled={block.disabled}
                          isInvalid={!!errors?.name}
                        >
                          <FormLabel>Name</FormLabel>
                          <Input
                            value={block.name}
                            placeholder="Name"
                            variant="filled"
                            onChange={onNameChange}
                          />
                          <FormErrorMessage>
                            {errors?.name?.join(" and ")}
                          </FormErrorMessage>
                        </FormControl>
                        <FormControl
                          isDisabled={block.disabled}
                          isInvalid={!!errors?.seconds}
                        >
                          <FormLabel>Duration</FormLabel>
                          <DurationInput
                            totalSeconds={
                              block.type === "timer" ? block.seconds : 0
                            }
                            onChange={onSecondsChange}
                          />
                          <FormErrorMessage>
                            {errors?.seconds?.join(" and ")}
                          </FormErrorMessage>
                        </FormControl>
                      </FlexTabPanel>

                      <FlexTabPanel>
                        <FormControl
                          isDisabled={block.disabled}
                          isInvalid={!!errors?.name}
                        >
                          <FormLabel>Name</FormLabel>
                          <Input
                            value={block.name}
                            placeholder="Name"
                            variant="filled"
                            onChange={onNameChange}
                          />
                          <FormErrorMessage>
                            {errors?.name?.join(" and ")}
                          </FormErrorMessage>
                        </FormControl>
                        <FormControl
                          isDisabled={block.disabled}
                          isInvalid={!!errors?.reps}
                        >
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
                          <FormErrorMessage>
                            {errors?.reps?.join(" and ")}
                          </FormErrorMessage>
                        </FormControl>
                      </FlexTabPanel>

                      <FlexTabPanel>
                        <FormControl
                          isDisabled={block.disabled}
                          isInvalid={!!errors?.name}
                        >
                          <FormLabel>Name</FormLabel>
                          <Input
                            value={block.name}
                            placeholder="Name"
                            variant="filled"
                            onChange={onNameChange}
                          />
                          <FormErrorMessage>
                            {errors?.name?.join(" and ")}
                          </FormErrorMessage>
                        </FormControl>
                        <FormControl
                          isDisabled={block.disabled}
                          isInvalid={!!errors?.message}
                        >
                          <FormLabel>Message</FormLabel>
                          <Textarea
                            value={
                              block.type === "message" ? block.message : ""
                            }
                            variant="filled"
                            placeholder="Message"
                            onChange={onMessageChange}
                          />
                          <FormErrorMessage>
                            {errors?.message?.join(" and ")}
                          </FormErrorMessage>
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
