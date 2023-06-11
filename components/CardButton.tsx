import { DragHandleIcon, ChevronRightIcon } from "@chakra-ui/icons"
import {
  Card,
  CardBody,
  CardHeader,
  Collapse,
  Flex,
  IconButton,
  Text,
  Spacer,
} from "@chakra-ui/react"
import { CSS } from "@dnd-kit/utilities"
import { useSortable } from "@dnd-kit/sortable"

import { ErrorChip, MessageChip, PauseChip, TimerChip } from "@/components/Chip"

interface CardButtonProps {
  id: string
  text: string
  seconds?: number
  reps?: number
  message?: boolean
  disabled?: boolean
  error?: boolean
  onClick?: React.MouseEventHandler<unknown>
  innerButtonOnClick?: React.MouseEventHandler<unknown>
  selected?: boolean
  children?: React.ReactNode
  style?: any
  isExpanded?: boolean
}

const CardButton = ({
  id,
  text,
  seconds,
  reps,
  message,
  error,
  disabled,
  children,
  selected,
  isExpanded,
  onClick,
  innerButtonOnClick,
  ...props
}: CardButtonProps) => {
  const transforms = {
    right: "rotate(0deg)",
    up: "rotate(-90deg)",
    down: "rotate(90deg)",
  }

  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <Card
      transition="0.2s"
      transform={selected ? "scale(1.05)" : undefined}
      opacity={disabled ? 0.7 : 1}
      variant={selected ? "filled" : undefined}
      bg={selected ? "gray.600" : undefined}
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...props}
    >
      <CardHeader onClick={onClick} display="flex" alignItems="center" p={0}>
        <Flex
          justifyContent="center"
          alignItems="center"
          h="full"
          px={2}
          {...listeners}
        >
          <DragHandleIcon color={selected ? "gray.500" : "gray.600"} />
        </Flex>

        {error === true ? (
          <ErrorChip />
        ) : (
          <>
            {message === true && <MessageChip disabled={disabled} />}
            {typeof seconds === "number" && (
              <TimerChip disabled={disabled} seconds={seconds} />
            )}
            {typeof reps === "number" && (
              <PauseChip disabled={disabled} reps={reps} />
            )}
          </>
        )}

        <Text my={3} fontSize="lg" fontWeight={selected ? "bold" : "normal"}>
          {text}
        </Text>

        <Spacer />

        <IconButton
          display="flex"
          variant="ghost"
          aria-label="Toggle body"
          m={1}
          onClick={
            typeof isExpanded === "boolean" ? undefined : innerButtonOnClick
          }
          icon={
            <ChevronRightIcon
              transition="0.2s"
              transform={
                typeof isExpanded === "boolean"
                  ? transforms[isExpanded ? "up" : "down"]
                  : undefined
              }
              boxSize={5}
            />
          }
        />
      </CardHeader>

      <Collapse in={isExpanded} animateOpacity>
        <CardBody p={4} pt={0}>
          {children}
        </CardBody>
      </Collapse>
    </Card>
  )
}

CardButton.displayName = "CardButton"

export default CardButton
