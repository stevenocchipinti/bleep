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
    <Flex gap={2} alignItems="center">
      <NumberInput
        min={0}
        placeholder="Minutes"
        variant="filled"
        textAlign="right"
        onChange={valueString => {
          const m = parseInt(valueString) || 0
          setMinutes(m)
          onChangeSeconds({ m })
        }}
        value={minutesFrom(totalSeconds)}
      >
        <NumberInputField />
      </NumberInput>
      <Text fontSize="2xl" as="span">
        :
      </Text>
      <NumberInput
        max={59}
        min={0}
        placeholder="Seconds"
        variant="filled"
        onChange={valueString => {
          const s = parseInt(valueString) || 0
          setSeconds(s)
          onChangeSeconds({ s })
        }}
        value={secondsFrom(totalSeconds)}
      >
        <NumberInputField />
      </NumberInput>
    </Flex>
  )
}
