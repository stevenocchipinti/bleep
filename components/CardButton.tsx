import { DragHandleIcon, ChevronRightIcon } from "@chakra-ui/icons"
import {
  Card,
  CardBody,
  CardHeader,
  Collapse,
  Flex,
  forwardRef,
  IconButton,
  Text,
  Spacer,
  useDisclosure,
} from "@chakra-ui/react"
import { PauseIcon } from "components/icons"

import Chip from "@/components/Chip"
import SpeechBubbleIcon from "./icons/SpeechBubbleIcon"

interface CardButtonProps {
  text: string
  seconds?: number
  reps?: number
  message?: boolean
  onClick?: React.MouseEventHandler<unknown>
  innerButtonOnClick?: React.MouseEventHandler<unknown>
  selected?: boolean
  children?: React.ReactNode
  isDragging: boolean
  emoji?: string
  style: any
  handleProps: any
  togglesBody?: boolean
}

const CardButton = forwardRef<CardButtonProps, "div">(
  (
    {
      text,
      seconds,
      reps,
      message,
      children,
      isDragging,
      selected,
      emoji,
      handleProps,
      togglesBody = false,
      innerButtonOnClick,
      ...props
    },
    ref
  ) => {
    const transforms = {
      right: "rotate(0deg)",
      up: "rotate(-90deg)",
      down: "rotate(90deg)",
    }

    const { isOpen, onToggle } = useDisclosure()

    return (
      <Card
        transition="0.2s"
        transform={selected ? "scale(1.05)" : undefined}
        variant={selected ? "filled" : undefined}
        ref={ref}
        bg={selected ? "gray.600" : undefined}
        {...props}
      >
        <CardHeader display="flex" alignItems="center" p={0}>
          <Flex
            justifyContent="center"
            alignItems="center"
            h="full"
            px={2}
            {...handleProps}
          >
            <DragHandleIcon color={selected ? "gray.500" : "gray.600"} />
          </Flex>

          {message === true && (
            <Chip colorScheme="green">
              <SpeechBubbleIcon h={5} mx="auto" />
            </Chip>
          )}

          {typeof seconds === "number" && (
            <Chip colorScheme="blue">{seconds}s</Chip>
          )}

          {typeof reps === "number" && (
            <Chip colorScheme="purple">
              {reps === 0 ? <PauseIcon h={5} mx="auto" /> : `${reps}⨯`}
            </Chip>
          )}

          <Text my={3} fontSize="lg" fontWeight={selected ? "bold" : "normal"}>
            {emoji && `${emoji} `}
            {text}
          </Text>

          <Spacer />

          <IconButton
            display="flex"
            variant="ghost"
            aria-label="Toggle body"
            m={1}
            onClick={togglesBody ? onToggle : innerButtonOnClick}
            icon={
              <ChevronRightIcon
                transition="0.2s"
                transform={
                  togglesBody ? transforms[isOpen ? "up" : "down"] : undefined
                }
                boxSize={5}
              />
            }
          />
        </CardHeader>

        <Collapse in={isOpen} animateOpacity>
          <CardBody p={4} pt={0}>
            {children}
          </CardBody>
        </Collapse>
      </Card>
    )
  }
)

CardButton.displayName = "CardButton"

export default CardButton
