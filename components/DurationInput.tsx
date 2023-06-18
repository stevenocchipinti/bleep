import React, { useState } from "react"
import { Flex, Text, NumberInput, NumberInputField } from "@chakra-ui/react"

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
    <Flex alignItems="center" bg="whiteAlpha.50" borderRadius="md">
      <NumberInput
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
        <NumberInputField py={2} pl={4} pr={0} textAlign="right" />
      </NumberInput>
      <Text as="span">:</Text>
      <NumberInput
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
        <NumberInputField py={2} pl={0} pr={4} />
      </NumberInput>
    </Flex>
  )
}
