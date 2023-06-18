import React, { useState } from "react"
import {
  Flex,
  Text,
  NumberInput,
  NumberInputField,
  Grid,
  Box,
} from "@chakra-ui/react"

// BUG: This component has an input delay and cannot be typed into quickly!
// The input is not currently debounced but probably needs to be.
// This is a controlled component and the state updates are delayed by the
// validation, writing to local storage and/or transitioning the state machine.
// See commit f7728ee for how this was fixed for the other components, this one
// was just a bit trickier.

export interface DurationInputProps {
  totalSeconds: number
  onChange?: (totalSeconds: number) => void
}
export const DurationInput = ({
  totalSeconds,
  onChange,
}: DurationInputProps) => {
  const secondsFrom = (totalSeconds: number) => totalSeconds % 60 || 0
  const minutesFrom = (totalSeconds: number) =>
    Math.floor(totalSeconds / 60) || 0

  const [seconds, setSeconds] = useState(secondsFrom(totalSeconds))
  const [minutes, setMinutes] = useState(minutesFrom(totalSeconds))

  const validSeconds = (s?: number) =>
    typeof s === "number" && s >= 0 && s <= 59
  const validMinutes = (m?: number) => typeof m === "number" && m >= 0

  const onChangeSeconds = (newValues: { m?: number; s?: number }) => {
    const m = validMinutes(newValues?.m) ? newValues?.m || 0 : minutes
    const s = validMinutes(newValues?.s) ? newValues?.s || 0 : seconds
    if (validMinutes(m) && validSeconds(s)) onChange?.(m * 60 + s)
  }

  return (
    <Grid
      templateColumns="1fr 1fr"
      alignItems="center"
      bg="whiteAlpha.50"
      border="2px solid"
      borderColor="transparent"
      borderRadius="md"
      transition="var(--chakra-transition-duration-normal)"
      _focusWithin={{
        bg: "transparent",
        border: "2px solid",
        borderColor: "blue.300",
      }}
    >
      <NumberInput
        as="label"
        display="flex"
        alignItems="center"
        justifyContent="space-around"
        gap={1}
        min={0}
        placeholder="Minutes"
        variant="unstyled"
        onChange={valueString => {
          const m = parseInt(valueString) || 0
          setMinutes(m)
          onChangeSeconds({ m })
        }}
        value={minutesFrom(totalSeconds)}
      >
        <NumberInputField
          height="40px"
          px={0}
          textAlign="right"
          bg="transparent"
          flex={1}
        />
        <Box aria-label="minutes" color="gray.400" flex={1} minWidth="1rem">
          m
        </Box>
      </NumberInput>
      <NumberInput
        as="label"
        display="flex"
        alignItems="center"
        justifyContent="space-around"
        gap={1}
        max={59}
        min={0}
        placeholder="Seconds"
        variant="unstyled"
        onChange={valueString => {
          const s = parseInt(valueString) || 0
          setSeconds(s)
          onChangeSeconds({ s })
        }}
        value={secondsFrom(totalSeconds)}
      >
        <NumberInputField
          height="40px"
          px={0}
          textAlign="right"
          bg="transparent"
          flex={1}
        />
        <Box aria-label="seconds" color="gray.400" flex={1} minWidth="1rem">
          s
        </Box>
      </NumberInput>
    </Grid>
  )
}
