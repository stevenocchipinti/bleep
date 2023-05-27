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

import { ErrorChip, MessageChip, PauseChip, TimerChip } from "@/components/Chip"

interface CardButtonProps {
  text: string
  seconds?: number
  reps?: number
  message?: boolean
  error?: boolean
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
      error,
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
        <CardHeader
          display="flex"
          alignItems="center"
          p={0}
          opacity={error ? 0.7 : 1}
        >
          <Flex
            justifyContent="center"
            alignItems="center"
            h="full"
            px={2}
            {...handleProps}
          >
            <DragHandleIcon color={selected ? "gray.500" : "gray.600"} />
          </Flex>

          {error === true ? (
            <ErrorChip />
          ) : (
            <>
              {message === true && <MessageChip />}
              {typeof seconds === "number" && <TimerChip seconds={seconds} />}
              {typeof reps === "number" && <PauseChip reps={reps} />}
            </>
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
