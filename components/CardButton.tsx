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

import { CheckIcon } from "@/components/icons"
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
  heatmapContent?: React.ReactNode
  trackableType?: "program" | "habit"
  isCompletedToday?: boolean
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
  heatmapContent,
  trackableType = "program",
  isCompletedToday = false,
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
    <div style={style} {...attributes}>
      <Card
        transition="0.2s"
        opacity={disabled ? 0.7 : 1}
        variant={selected ? "filled" : undefined}
        borderWidth={"2px"}
        borderColor={selected ? "gray.400" : "gray.700"}
        ref={setNodeRef}
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
            aria-label={trackableType === "habit" ? "Toggle completion" : "Toggle body"}
            m={1}
            onClick={
              typeof isExpanded === "boolean" ? undefined : innerButtonOnClick
            }
            icon={
              trackableType === "habit" ? (
                <CheckIcon
                  filled={isCompletedToday}
                  boxSize={5}
                  color={isCompletedToday ? "green.400" : undefined}
                />
              ) : (
                <ChevronRightIcon
                  transition="0.2s"
                  transform={
                    typeof isExpanded === "boolean"
                      ? transforms[isExpanded ? "up" : "down"]
                      : undefined
                  }
                  boxSize={5}
                />
              )
            }
          />
        </CardHeader>

        {heatmapContent && (
          <CardBody p={2} pt={0} onClick={onClick} cursor="pointer">
            {heatmapContent}
          </CardBody>
        )}

        <Collapse in={isExpanded} animateOpacity>
          <CardBody p={4} pt={0}>
            {children}
          </CardBody>
        </Collapse>
      </Card>
    </div>
  )
}

CardButton.displayName = "CardButton"

export default CardButton
