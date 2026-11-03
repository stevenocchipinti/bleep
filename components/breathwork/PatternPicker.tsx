import { useState } from "react"
import { ArrowBackIcon, ChevronRightIcon } from "@chakra-ui/icons"
import { Card, Flex, Heading, IconButton, Text, VStack } from "@chakra-ui/react"

import {
  TARGET_OPTIONS,
  breathingPatterns,
  targetFromKey,
  targetKey,
} from "lib/breathingPatterns"
import {
  breathingProgramId,
  formatRelativeDay,
  formatSessionLength,
  historyCaption,
  isBreathingCompletion,
  lastSessionFor,
} from "lib/breathingHistory"
import { useTimerActor } from "lib/useTimerMachine"
import CompletionHeatmap from "components/CompletionHeatmap"
import CompletionHistoryModal from "components/CompletionHistoryModal"
import SegmentedControl from "components/SegmentedControl"
import { SwipeableChild } from "components/SwipeableView"

interface PatternPickerProps {
  targetSeconds: number | null
  onTargetChange: (targetSeconds: number | null) => void
  onSelect: (patternId: string) => void
  onClose: () => void
}

const PatternPicker = ({
  targetSeconds,
  onTargetChange,
  onSelect,
  onClose,
}: PatternPickerProps) => {
  const [historyOpen, setHistoryOpen] = useState(false)
  const { state } = useTimerActor()
  const { completions } = state.context

  return (
    <SwipeableChild
      header={
        <>
          <IconButton
            aria-label="Close"
            variant="ghost"
            icon={<ArrowBackIcon />}
            fontSize="xl"
            onClick={onClose}
          />
          <Heading
            fontWeight="thin"
            textAlign="center"
            as="h1"
            cursor="default"
          >
            Breathe
          </Heading>
          <Flex boxSize={10} flexShrink={0} />
        </>
      }
    >
      <VStack spacing={6} align="stretch" p={6}>
        <Card
          as="button"
          type="button"
          aria-label="Breathing history"
          onClick={() => setHistoryOpen(true)}
          borderWidth="2px"
          borderColor="gray.700"
          textAlign="left"
          transition="0.2s"
          _hover={{ borderColor: "gray.600" }}
        >
          <Flex p={2} w="full">
            <CompletionHeatmap
              completions={completions}
              programId="breathe"
              matches={isBreathingCompletion}
            />
          </Flex>
          <Text
            fontSize="xs"
            color="gray.400"
            px={3}
            pb={2}
            sx={{ fontVariantNumeric: "tabular-nums" }}
          >
            {historyCaption(completions)}
          </Text>
        </Card>

        <SegmentedControl
          value={targetKey(targetSeconds)}
          options={TARGET_OPTIONS.map(option => ({
            value: targetKey(option.value),
            label: option.label,
          }))}
          onChange={key => onTargetChange(targetFromKey(key))}
        />

        <VStack spacing={3} align="stretch">
          {breathingPatterns.map(pattern => {
            const last = lastSessionFor(completions, pattern.id)
            return (
              <Card
                key={pattern.id}
                as="button"
                type="button"
                onClick={() => onSelect(pattern.id)}
                borderWidth="2px"
                borderColor="gray.700"
                textAlign="left"
                transition="0.2s"
                _hover={{ borderColor: "gray.600" }}
              >
                <Flex align="center" gap={3} pl={4} pr={1} py={3} w="full">
                  <VStack align="stretch" spacing={0.5} flex={1} minW={0}>
                    <Flex align="baseline" justify="space-between" gap={3}>
                      <Text fontSize="lg">{pattern.name}</Text>
                      <Text
                        fontSize="sm"
                        color="gray.400"
                        flexShrink={0}
                        sx={{ fontVariantNumeric: "tabular-nums" }}
                      >
                        {pattern.summary}
                      </Text>
                    </Flex>
                    <Text fontSize="sm" color="gray.500">
                      {pattern.description}
                    </Text>
                    {last && (
                      <Text fontSize="xs" color="teal.200" pt={1}>
                        Last: {formatRelativeDay(last.completedAt)}
                        {last.durationSeconds !== undefined &&
                          ` · ${formatSessionLength(last.durationSeconds)}`}
                      </Text>
                    )}
                  </VStack>
                  <Flex
                    boxSize={10}
                    align="center"
                    justify="center"
                    flexShrink={0}
                  >
                    <ChevronRightIcon boxSize={5} />
                  </Flex>
                </Flex>
              </Card>
            )
          })}
        </VStack>
      </VStack>

      <CompletionHistoryModal
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        programId="breathe"
        programName="Breathing"
        matches={isBreathingCompletion}
        programOptions={breathingPatterns.map(pattern => ({
          id: breathingProgramId(pattern.id),
          name: pattern.name,
        }))}
      />
    </SwipeableChild>
  )
}

export default PatternPicker
