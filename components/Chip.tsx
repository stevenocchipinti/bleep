import { Text, TextProps, useTab } from "@chakra-ui/react"
import React from "react"

interface ChipProps extends TextProps {
  children: React.ReactNode
  colorScheme: "blue" | "purple" | "green" | "gray"
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

export { ChipTab }
export default Chip
