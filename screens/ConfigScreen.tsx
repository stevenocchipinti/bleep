import CardButton from "@/components/CardButton"
import { SwipeableChild, FooterButton } from "@/components/SwipeableView"
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
  chakra,
  Button,
} from "@chakra-ui/react"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import { Program } from "lib/dummyData"
import { useState } from "react"

interface ConfigScreenProps {
  openSettingsModal: () => void
  program: Program
  goBack: () => void
  goForward: () => void
}
const ConfigScreen = ({
  program,
  openSettingsModal,
  goBack,
  goForward,
}: ConfigScreenProps) => {
  const [_isDragging, setIsDragging] = useState(false)

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
          span={2}
          onClick={goForward}
          rightIcon={<ArrowForwardIcon />}
        >
          Go
        </FooterButton>
      }
    >
      <Text textAlign="center" fontSize="xl" p={4} pb={8}>
        {program.description}
      </Text>

      <DragDropContext onDragStart={onDragStart} onDragEnd={onBlockDragEnd}>
        <Droppable droppableId="block-cards" type="block">
          {provided => (
            <Flex
              direction="column"
              gap={4}
              p={4}
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
                      text={`${block.name} for ${block.seconds} seconds`}
                      togglesBody
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      handleProps={provided.dragHandleProps}
                      isDragging={snapshot.isDragging}
                      style={provided.draggableProps.style}
                      onClick={console.log}
                    >
                      <chakra.ul ml={10}>
                        <li>Wait until done</li>
                        <li>Lead time</li>
                        <li>Announcement</li>
                        <li>Beeps</li>
                      </chakra.ul>
                    </CardButton>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
              <Button colorScheme="blue" variant="outline">
                Add Step
              </Button>
            </Flex>
          )}
        </Droppable>
      </DragDropContext>
    </SwipeableChild>
  )
}

export default ConfigScreen
