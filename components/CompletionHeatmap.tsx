import { Box, useTheme } from "@chakra-ui/react"
import { ProgramCompletion } from "lib/types"
import { useEffect, useRef, useState } from "react"

interface CompletionHeatmapProps {
  completions: ProgramCompletion[]
  programId: string
}

const CompletionHeatmap = ({
  completions,
  programId,
}: CompletionHeatmapProps) => {
  const theme = useTheme()
  const containerRef = useRef<HTMLDivElement>(null)
  const [numColumns, setNumColumns] = useState(52)

  // Filter completions for this program
  const programCompletions = completions.filter(c => c.programId === programId)

  // Get Monday of the current week
  const getMondayOfWeek = (date: Date): Date => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = day === 0 ? -6 : 1 - day // Adjust when day is Sunday (0)
    d.setDate(d.getDate() + diff)
    d.setHours(0, 0, 0, 0)
    return d
  }

  // Generate dates starting from Monday, going back in weeks
  const generateDates = (weeks: number): Date[] => {
    const dates: Date[] = []
    const today = new Date()
    const mondayOfCurrentWeek = getMondayOfWeek(today)
    
    // Generate dates for each week, 7 days per week (Monday to Sunday)
    for (let week = weeks - 1; week >= 0; week--) {
      for (let day = 0; day < 7; day++) {
        const date = new Date(mondayOfCurrentWeek)
        date.setDate(mondayOfCurrentWeek.getDate() - (week * 7) + day)
        dates.push(date)
      }
    }
    
    return dates
  }

  // Calculate number of columns needed to fill container width
  useEffect(() => {
    const calculateColumns = () => {
      if (!containerRef.current) return
      
      const containerWidth = containerRef.current.offsetWidth
      const cellSize = 8 // 0.5rem = 8px
      const gapSize = 2 // 2px
      const columnWidth = cellSize + gapSize
      
      // Calculate columns needed to fill width, minimum 52 weeks
      const calculatedColumns = Math.max(52, Math.ceil(containerWidth / columnWidth))
      setNumColumns(calculatedColumns)
    }

    calculateColumns()
    window.addEventListener("resize", calculateColumns)
    return () => window.removeEventListener("resize", calculateColumns)
  }, [])

  // Scroll to the right on mount
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollLeft = containerRef.current.scrollWidth
    }
  }, [numColumns])

  // Count completions per date
  const countCompletionsByDate = (date: Date): number => {
    const dateStr = date.toISOString().split("T")[0] // YYYY-MM-DD
    return programCompletions.filter(c => c.completedAt.startsWith(dateStr))
      .length
  }

  // Get color based on completion count
  const getHeatColor = (count: number): string => {
    if (count === 0) return theme.colors.gray[600]
    if (count === 1) return theme.colors.blue[300]
    if (count === 2) return theme.colors.blue[400]
    if (count === 3) return theme.colors.blue[500]
    if (count === 4) return theme.colors.blue[600]
    return theme.colors.blue[700] // 5+
  }

  // Check if date is today
  const isToday = (date: Date): boolean => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  // Check if date is in the future
  const isFuture = (date: Date): boolean => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const checkDate = new Date(date)
    checkDate.setHours(0, 0, 0, 0)
    return checkDate > today
  }

  const dates = generateDates(numColumns)

  return (
    <Box
      ref={containerRef}
      w="full"
      overflowX="auto"
      overflowY="hidden"
      onTouchStart={e => {
        // Prevent parent swipe gesture when touching heatmap
        e.stopPropagation()
      }}
      onTouchMove={e => {
        // Prevent parent swipe gesture when scrolling heatmap
        e.stopPropagation()
      }}
      sx={{
        // Hide scrollbar with modern CSS
        scrollbarWidth: "none", // Firefox
        "&::-webkit-scrollbar": {
          display: "none", // Chrome, Safari, Edge
        },
      }}
    >
      <Box
        display="grid"
        gridTemplateRows="repeat(7, 0.5rem)"
        gridTemplateColumns={`repeat(${numColumns}, 0.5rem)`}
        gap="2px"
        gridAutoFlow="column"
        w="fit-content"
      >
        {dates.map((date, index) => {
          const count = countCompletionsByDate(date)
          const color = getHeatColor(count)
          const today = isToday(date)
          const future = isFuture(date)

          return (
            <Box
              key={index}
              w="0.5rem"
              h="0.5rem"
              bg={future ? theme.colors.gray[700] : color}
              borderRadius="2px"
              boxShadow={today ? `inset 0 0 0 1px ${theme.colors.gray[400]}` : undefined}
              opacity={future ? 0.3 : 1}
            />
          )
        })}
      </Box>
    </Box>
  )
}

CompletionHeatmap.displayName = "CompletionHeatmap"
export default CompletionHeatmap
