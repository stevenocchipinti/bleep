import { Box, HStack, VStack, useTheme } from "@chakra-ui/react"
import { ProgramCompletion } from "lib/types"

interface CompletionHeatmapProps {
  completions: ProgramCompletion[]
  programId: string
}

const CompletionHeatmap = ({
  completions,
  programId,
}: CompletionHeatmapProps) => {
  const theme = useTheme()

  // Filter completions for this program
  const programCompletions = completions.filter(c => c.programId === programId)

  // Generate last 365 days
  const generateLast365Days = (): Date[] => {
    const days: Date[] = []
    const today = new Date()
    for (let i = 364; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      days.push(date)
    }
    return days
  }

  // Count completions per date
  const countCompletionsByDate = (date: Date): number => {
    const dateStr = date.toISOString().split("T")[0] // YYYY-MM-DD
    return programCompletions.filter(c => c.completedAt.startsWith(dateStr))
      .length
  }

  // Get color based on completion count
  const getHeatColor = (count: number): string => {
    if (count === 0) return theme.colors.gray[700]
    if (count === 1) return theme.colors.teal[900]
    if (count === 2) return theme.colors.teal[700]
    if (count === 3) return theme.colors.teal[500]
    return theme.colors.teal[300] // 4+
  }

  // Group days by week (7-day chunks)
  const days = generateLast365Days()
  const weeks: Date[][] = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }

  // Get month label (show at start of each month)
  const getMonthLabel = (weekIndex: number): string | null => {
    const firstDay = weeks[weekIndex]?.[0]
    if (!firstDay) return null

    // Show month label if this is the first week of a month
    // or if the month changed from previous week
    if (weekIndex === 0) {
      return firstDay.toLocaleString("en-AU", { month: "short" })
    }

    const prevWeekFirstDay = weeks[weekIndex - 1]?.[0]
    if (
      prevWeekFirstDay &&
      firstDay.getMonth() !== prevWeekFirstDay.getMonth()
    ) {
      return firstDay.toLocaleString("en-AU", { month: "short" })
    }

    return null
  }

  return (
    <VStack spacing={1} align="stretch" w="full">
      {/* Month labels */}
      <HStack spacing="2px" h="14px">
        {weeks.map((week, weekIndex) => {
          const label = getMonthLabel(weekIndex)
          return (
            <Box key={weekIndex} w="10px" fontSize="9px" color="gray.500">
              {label || ""}
            </Box>
          )
        })}
      </HStack>

      {/* Heatmap grid */}
      <HStack spacing="2px" align="flex-start">
        {/* Day labels (M/W/F) */}
        <VStack spacing="2px" fontSize="8px" color="gray.600" w="10px">
          <Box h="10px">M</Box>
          <Box h="10px"></Box>
          <Box h="10px">W</Box>
          <Box h="10px"></Box>
          <Box h="10px">F</Box>
          <Box h="10px"></Box>
          <Box h="10px"></Box>
        </VStack>

        {/* Week columns */}
        {weeks.map((week, weekIndex) => (
          <VStack key={weekIndex} spacing="2px">
            {week.map((day, dayIndex) => {
              const count = countCompletionsByDate(day)
              const color = getHeatColor(count)

              return (
                <Box
                  key={dayIndex}
                  w="10px"
                  h="10px"
                  bg={color}
                  borderRadius="2px"
                />
              )
            })}
          </VStack>
        ))}
      </HStack>
    </VStack>
  )
}

CompletionHeatmap.displayName = "CompletionHeatmap"
export default CompletionHeatmap
