import React from "react"
import { Box, Grid } from "@chakra-ui/react"

interface SegmentedControlProps {
  value: string
  options: Array<{ value: string; label: string }>
  onChange: (value: string) => void
}

const SegmentedControl = ({
  value,
  options,
  onChange,
}: SegmentedControlProps) => {
  return (
    <Grid
      templateColumns={`repeat(${options.length}, 1fr)`}
      bg="whiteAlpha.50"
      border="2px solid"
      borderColor="transparent"
      borderRadius="md"
      p={0.5}
      gap={1}
      height="40px"
      alignItems="center"
    >
      {options.map(option => (
        <Box
          key={option.value}
          as="button"
          type="button"
          onClick={() => onChange(option.value)}
          bg={value === option.value ? "whiteAlpha.200" : "transparent"}
          borderRadius={value === option.value ? "0.2rem" : "sm"}
          height="full"
          display="flex"
          alignItems="center"
          justifyContent="center"
          fontSize="sm"
          fontWeight={value === option.value ? "semibold" : "normal"}
          color={value === option.value ? "white" : "gray.400"}
          cursor="pointer"
          transition="all 0.2s"
          _hover={{
            fontWeight: "bold",
          }}
        >
          {option.label}
        </Box>
      ))}
    </Grid>
  )
}

SegmentedControl.displayName = "SegmentedControl"

export default SegmentedControl
