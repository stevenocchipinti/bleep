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
  chakra,
  TextProps,
} from "@chakra-ui/react"

const PauseIcon = ({ size }: { size: string }) => (
  <chakra.svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-label="Pause"
    mx="auto"
    height={size}
    width={size}
  >
    <path
      fillRule="evenodd"
      d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z"
      clipRule="evenodd"
    />
  </chakra.svg>
)

interface ChipProps extends TextProps {
  children: React.ReactNode
  colorScheme: "blue" | "purple"
}
const Chip = ({ children, colorScheme, ...props }: ChipProps) => {
  return (
    <Text
      border="1px"
      borderColor={`${colorScheme}.500`}
      borderRadius="lg"
      minW="3rem"
      textAlign="center"
      py={1}
      px={2}
      m={2}
      ml={0}
      fontSize="sm"
      bg={`${colorScheme}.800`}
      {...props}
    >
      {children}
    </Text>
  )
}

interface CardButtonProps {
  text: string
  seconds?: number
  reps?: number
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

          {typeof seconds === "number" && (
            <Chip colorScheme="blue">{seconds}s</Chip>
          )}

          {typeof reps === "number" && (
            <Chip colorScheme="purple">
              {reps === 0 ? <PauseIcon size="1.25rem" /> : `${reps}⨯`}
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
