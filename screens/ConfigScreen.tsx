import { useState } from "react"
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
} from "@chakra-ui/react"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"

import CardButton from "@/components/CardButton"
import { ChipTab } from "@/components/Chip"
import { SwipeableChild, FooterButton } from "@/components/SwipeableView"
import { useTimerActor } from "lib/useTimerMachine"
import React from "react"

const OptionalIndicator = () => (
  <Text color="gray.400" fontSize="xs" ml={2} as="span">
    (optional)
  </Text>
)

const FlexTabPanel = ({ children }: { children: React.ReactNode }) => (
  <TabPanel>
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

  const { state, send } = useTimerActor()
  const { program } = state.context

  if (program === null) return null

  const onBlockDragEnd = () => {
    setIsDragging(false)
  }

  const onDragStart = () => {
    setIsDragging(true)
  }

  return (
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
              {program.blocks.map((block, index) => (
                <Draggable
                  key={`${block.name}-${index}`}
                  draggableId={`${block.name}-${index}--TODO-needs-to-be-static`}
                  index={index}
                >
                  {(provided, snapshot) => (
                    <CardButton
                      seconds={
                        block.type === "timer" ? block.seconds : undefined
                      }
                      reps={
                        block.type === "pause" ? block?.reps || 0 : undefined
                      }
                      message={block.type === "message"}
                      error={false}
                      text={block.name}
                      togglesBody
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      handleProps={provided.dragHandleProps}
                      isDragging={snapshot.isDragging}
                      style={provided.draggableProps.style}
                    >
                      <Tabs
                        index={["timer", "pause", "message"].indexOf(
                          block.type
                        )}
                        onChange={console.log}
                        variant="unstyled"
                      >
                        <TabList
                          display="grid"
                          gridTemplateColumns="1fr 1fr 1fr"
                        >
                          <ChipTab colorScheme="blue">Timer</ChipTab>
                          <ChipTab colorScheme="purple">Pause</ChipTab>
                          <ChipTab colorScheme="green">Message</ChipTab>
                        </TabList>
                        <TabPanels>
                          <FlexTabPanel>
                            <FormControl>
                              <FormLabel>Name</FormLabel>
                              <Input
                                value={block.name}
                                placeholder="Name"
                                variant="filled"
                              />
                            </FormControl>
                            <FormControl>
                              <FormLabel>Duration</FormLabel>
                              <Flex gap={2} alignItems="center">
                                <Input
                                  value={
                                    block.type === "timer"
                                      ? Math.floor(block.seconds / 60)
                                      : ""
                                  }
                                  placeholder="Minutes"
                                  variant="filled"
                                />
                                <Text fontSize="2xl" as="span">
                                  :
                                </Text>
                                <Input
                                  value={
                                    block.type === "timer"
                                      ? block.seconds % 60
                                      : ""
                                  }
                                  placeholder="Seconds"
                                  variant="filled"
                                />
                              </Flex>
                            </FormControl>
                          </FlexTabPanel>
                          <FlexTabPanel>
                            <FormControl>
                              <FormLabel>Name</FormLabel>
                              <Input
                                value={block.name}
                                placeholder="Name"
                                variant="filled"
                              />
                            </FormControl>
                            <FormControl>
                              <FormLabel
                                optionalIndicator={<OptionalIndicator />}
                              >
                                Reps
                              </FormLabel>
                              <Input
                                value={block.type === "pause" ? block.reps : ""}
                                type="number"
                                placeholder="Reps"
                                variant="filled"
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
                              />
                            </FormControl>
                            <FormControl>
                              <FormLabel
                                optionalIndicator={<OptionalIndicator />}
                              >
                                Message
                              </FormLabel>
                              <Textarea
                                value={
                                  block.type === "message" ? block.message : ""
                                }
                                variant="filled"
                                placeholder="Message"
                              />
                            </FormControl>
                          </FlexTabPanel>
                        </TabPanels>
                      </Tabs>
                    </CardButton>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
              <Button variant="outline">Add Step</Button>
            </Flex>
          )}
        </Droppable>
      </DragDropContext>
    </SwipeableChild>
  )
}

export default ConfigScreen