import { Text, TextProps, useTab } from "@chakra-ui/react"
import { PauseIcon, SpeechBubbleIcon, ExclamationIcon } from "./icons"
import React from "react"

interface ChipProps extends TextProps {
  children: React.ReactNode
  colorScheme: "blue" | "purple" | "green" | "gray" | "red"
  isSelected?: boolean
}
const Chip = React.forwardRef(
  (
    { children, colorScheme, isSelected, ...props }: ChipProps,
    ref: React.Ref<any>
  ) => {
    return (
      <Text
        border={isSelected ? "2px" : "1px"}
        borderColor={isSelected === false ? "gray.500" : `${colorScheme}.500`}
        borderRadius="lg"
        minW="3rem"
        fontWeight={isSelected === true ? "bold" : "normal"}
        textAlign="center"
        py={1}
        px={2}
        m={2}
        ml={0}
        fontSize="sm"
        bg={isSelected === false ? "gray.700" : `${colorScheme}.800`}
        ref={ref}
        {...props}
      >
        {children}
      </Text>
    )
  }
)
Chip.displayName = "Chip"

const ChipTab = React.forwardRef((props: ChipProps, ref: React.Ref<any>) => {
  const tabProps = useTab({ ...props, ref })
  const isSelected = !!tabProps["aria-selected"]

  return (
    <Chip colorScheme={props.colorScheme} isSelected={isSelected} {...tabProps}>
      {props.children}
    </Chip>
  )
})
ChipTab.displayName = "ChipTab"

const MessageChip = () => (
  <Chip colorScheme="green">
    <SpeechBubbleIcon h={5} mx="auto" />
  </Chip>
)

const TimerChip = (props: { seconds: number }) => {
  const minutes = Math.floor(props.seconds / 60)
  const seconds = props.seconds % 60
  return (
    <Chip colorScheme="blue">
      {[
        minutes > 0 ? `${minutes}m` : "",
        seconds > 0 ? `${seconds}s` : "",
      ].join("")}
    </Chip>
  )
}

const PauseChip = ({ reps }: { reps: number }) => (
  <Chip colorScheme="purple">
    {reps === 0 ? <PauseIcon h={5} mx="auto" /> : `${reps}⨯`}
  </Chip>
)

const ErrorChip = () => (
  <Chip colorScheme="red">
    <ExclamationIcon h={5} mx="auto" />
  </Chip>
)

export { ChipTab, MessageChip, TimerChip, PauseChip, ErrorChip }
export default Chip
