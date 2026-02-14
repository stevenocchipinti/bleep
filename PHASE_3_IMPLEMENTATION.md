# Phase 3: Advanced Habit Features

This document outlines the implementation plan for Phase 3 of the habit tracking feature, focusing on advanced functionality that provides deeper insights and motivation.

## Overview

Phase 3 builds on the Phase 2 enhancements to add:
1. **Target Frequency** - Set and track goals like "3x per week"
2. **Streak Tracking** - Visual indicators for consistent habit completion
3. **Quantity Tracking** - Track numeric metrics (reps, glasses, pages, etc.)

## Implementation Tasks

### 1. Target Frequency

#### Goal
Allow users to set a target completion frequency (e.g., "3 times per week", "daily") and display progress toward that goal.

#### Schema Changes

**File: `lib/types.ts`**

Extend HabitSchema with frequency tracking:
```typescript
export const HabitFrequencySchema = z.enum([
  "daily",
  "2x-weekly",      // 2 times per week
  "3x-weekly",      // 3 times per week
  "weekly",         // 1 time per week
  "custom",         // Custom frequency
])

export const HabitSchema = z.object({
  id: z.string().default(() => generateId(6)),
  name: z.string().nonempty(),
  category: z.string().optional(),
  color: z.string().optional(),
  // NEW:
  frequency: HabitFrequencySchema.optional().default("daily"),
  customFrequency: z.object({
    count: z.number().positive().min(1),
    period: z.enum(["day", "week", "month"]),
  }).optional(),
})

export type Habit = z.infer<typeof HabitSchema>
export type HabitFrequency = z.infer<typeof HabitFrequencySchema>
```

#### UI Components

**File: `components/FrequencySelector.tsx` (NEW)**

```typescript
import { Select, Box, Text, HStack, NumberInput, NumberInputField } from "@chakra-ui/react"

interface FrequencySelectorProps {
  frequency?: string
  customFrequency?: { count: number; period: "day" | "week" | "month" }
  onChange: (frequency: string, customFrequency?: any) => void
}

const FrequencySelector = ({
  frequency = "daily",
  customFrequency,
  onChange,
}: FrequencySelectorProps) => {
  return (
    <Box>
      <Select
        value={frequency}
        onChange={e => onChange(e.target.value)}
      >
        <option value="daily">Daily</option>
        <option value="2x-weekly">2x Per Week</option>
        <option value="3x-weekly">3x Per Week</option>
        <option value="weekly">Weekly</option>
        <option value="custom">Custom</option>
      </Select>

      {frequency === "custom" && (
        <HStack mt={4} spacing={2}>
          <NumberInput
            defaultValue={customFrequency?.count || 1}
            min={1}
            width="60px"
          >
            <NumberInputField />
          </NumberInput>
          <Text>times per</Text>
          <Select
            value={customFrequency?.period || "week"}
            width="120px"
          >
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
          </Select>
        </HStack>
      )}
    </Box>
  )
}

export default FrequencySelector
```

#### Integration Points

**File: `screens/HabitConfigScreen.tsx`**

Add frequency selector to habit editor:
```typescript
import FrequencySelector from "@/components/FrequencySelector"

// In the menu section, add a frequency setting:
<FormControl>
  <FormLabel>Target Frequency</FormLabel>
  <FrequencySelector
    frequency={habit.frequency}
    customFrequency={habit.customFrequency}
    onChange={(freq, custom) => debouncedSend({
      type: "UPDATE_HABIT_FREQUENCY",
      frequency: freq,
      customFrequency: custom,
    })}
  />
</FormControl>
```

#### Progress Indicator

**File: `components/FrequencyProgress.tsx` (NEW)**

```typescript
import { Box, HStack, Progress, Text } from "@chakra-ui/react"

interface FrequencyProgressProps {
  habit: Habit
  completions: Completion[]
}

const FrequencyProgress = ({ habit, completions }: FrequencyProgressProps) => {
  const getProgressMetrics = () => {
    const now = new Date()
    const frequency = habit.frequency || "daily"
    
    let periodStart: Date
    let periodEnd: Date
    let targetCount: number

    switch (frequency) {
      case "daily":
        periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        periodEnd = new Date(periodStart.getTime() + 24 * 60 * 60 * 1000)
        targetCount = 1
        break
      case "weekly":
        const weekStart = now.getDate() - now.getDay()
        periodStart = new Date(now.getFullYear(), now.getMonth(), weekStart)
        periodEnd = new Date(periodStart.getTime() + 7 * 24 * 60 * 60 * 1000)
        targetCount = 1
        break
      case "2x-weekly":
        // Similar logic for week
        targetCount = 2
        break
      case "3x-weekly":
        targetCount = 3
        break
      // ... handle other frequencies
      default:
        return null
    }

    // Count completions in this period
    const completionCount = completions.filter(c => {
      const completedDate = new Date(c.completedAt)
      return (
        c.trackableId === habit.id &&
        c.trackableType === "habit" &&
        completedDate >= periodStart &&
        completedDate < periodEnd
      )
    }).length

    return {
      current: completionCount,
      target: targetCount,
      percentage: (completionCount / targetCount) * 100,
      periodLabel: frequency === "daily" ? "Today" : "This Week",
    }
  }

  const metrics = getProgressMetrics()
  if (!metrics) return null

  return (
    <Box p={3} bg="gray.50" borderRadius="md">
      <HStack justify="space-between" mb={2}>
        <Text fontSize="sm" fontWeight="bold">
          {metrics.periodLabel}
        </Text>
        <Text fontSize="sm">
          {metrics.current} / {metrics.target}
        </Text>
      </HStack>
      <Progress value={metrics.percentage} size="sm" />
    </Box>
  )
}

export default FrequencyProgress
```

**File: `components/CardButton.tsx`**

Display progress on habit cards:
```typescript
import FrequencyProgress from "@/components/FrequencyProgress"

// Add to CardButton props if needed, or integrate into heatmapContent
```

#### State Machine Changes

**File: `lib/timerMachine.ts`**

```typescript
type UpdateHabitFrequencyEvent = {
  type: "UPDATE_HABIT_FREQUENCY"
  frequency: string
  customFrequency?: { count: number; period: "day" | "week" | "month" }
}

updateHabitFrequency: immerAssign((context, event: UpdateHabitFrequencyEvent) => {
  const habit = currentHabitFrom(context)
  if (habit) {
    habit.frequency = event.frequency
    habit.customFrequency = event.customFrequency
  }
}),
```

#### Testing Checklist
- [ ] Can set daily, weekly, 2x/week, 3x/week frequencies
- [ ] Can set custom frequency
- [ ] Progress bar shows correctly for each period
- [ ] "Today" count is accurate for daily habits
- [ ] "This week" count is accurate for weekly habits
- [ ] Progress updates immediately when habit completed

---

### 2. Streak Tracking

#### Goal
Display consecutive day/week streaks to motivate users to maintain consistency.

#### Schema Changes

**File: `lib/types.ts`**

Add streak calculation to completion utilities:
```typescript
export type StreakInfo = {
  currentStreak: number
  longestStreak: number
  lastCompletionDate: string | null
}

// Helper function to calculate streaks
export const calculateStreaks = (
  completions: Completion[],
  habitId: string
): StreakInfo => {
  const habitCompletions = completions
    .filter(c => c.trackableId === habitId && c.trackableType === "habit")
    .map(c => new Date(c.completedAt).toISOString().split("T")[0])
    .sort()
    .reverse() // Most recent first

  if (habitCompletions.length === 0) {
    return { currentStreak: 0, longestStreak: 0, lastCompletionDate: null }
  }

  const uniqueDates = [...new Set(habitCompletions)]
  const today = new Date().toISOString().split("T")[0]
  
  let currentStreak = 0
  let longestStreak = 0
  let currentConsecutiveDate = today

  for (const date of uniqueDates) {
    const dateObj = new Date(date)
    const currentObj = new Date(currentConsecutiveDate)
    const diffDays = Math.floor(
      (currentObj.getTime() - dateObj.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (diffDays === 0 || diffDays === 1) {
      currentStreak++
      currentConsecutiveDate = date
    } else {
      break
    }
  }

  // Find longest streak
  let tempStreak = 1
  for (let i = 0; i < uniqueDates.length - 1; i++) {
    const current = new Date(uniqueDates[i])
    const next = new Date(uniqueDates[i + 1])
    const diffDays = Math.floor(
      (current.getTime() - next.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (diffDays === 1) {
      tempStreak++
      longestStreak = Math.max(longestStreak, tempStreak)
    } else {
      tempStreak = 1
    }
  }

  return {
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
    lastCompletionDate: uniqueDates[0],
  }
}
```

#### UI Component

**File: `components/StreakDisplay.tsx` (NEW)**

```typescript
import { HStack, Box, VStack, Text, Icon } from "@chakra-ui/react"
import { FireIcon } from "@/components/icons" // or use a fire emoji

interface StreakDisplayProps {
  currentStreak: number
  longestStreak: number
}

const StreakDisplay = ({ currentStreak, longestStreak }: StreakDisplayProps) => (
  <HStack spacing={6} p={3} bg="gradient-to-r" borderRadius="md">
    <VStack spacing={1}>
      <HStack>
        <Icon as={FireIcon} color="orange.400" />
        <Text fontSize="sm" color="gray.600">Current</Text>
      </HStack>
      <Text fontSize="2xl" fontWeight="bold">{currentStreak}</Text>
      <Text fontSize="xs" color="gray.500">days</Text>
    </VStack>

    <VStack spacing={1}>
      <Text fontSize="sm" color="gray.600">Best</Text>
      <Text fontSize="2xl" fontWeight="bold">{longestStreak}</Text>
      <Text fontSize="xs" color="gray.500">days</Text>
    </VStack>
  </HStack>
)

export default StreakDisplay
```

#### Integration Points

**File: `screens/HabitConfigScreen.tsx`**

Display streak above the content:
```typescript
import { calculateStreaks } from "@/lib/types"
import StreakDisplay from "@/components/StreakDisplay"

const HabitConfigScreen = ({ goBack }: HabitConfigScreenProps) => {
  const { state } = useTimerActor()
  const habit = currentHabitFrom(state.context)
  const { completions } = state.context

  const streaks = calculateStreaks(completions, habit.id)

  return (
    <SwipeableChild
      header={/* ... */}
    >
      <StreakDisplay
        currentStreak={streaks.currentStreak}
        longestStreak={streaks.longestStreak}
      />
      {/* ... rest of content */}
    </SwipeableChild>
  )
}
```

#### Testing Checklist
- [ ] Streak starts at 1 when habit first completed
- [ ] Streak increments correctly for consecutive days
- [ ] Streak resets when day is skipped
- [ ] Longest streak is tracked correctly
- [ ] Streak displays accurately in UI
- [ ] Streak persists across sessions

---

### 3. Quantity Tracking

#### Goal
Allow users to track numeric metrics (e.g., "drank 8 glasses of water", "did 20 pushups").

#### Schema Changes

**File: `lib/types.ts`**

Extend CompletionSchema for quantity:
```typescript
export const CompletionSchema = z.object({
  id: z.string().default(() => generateId(6)),
  trackableId: z.string(),
  trackableType: z.enum(["program", "habit"]),
  trackableName: z.string(),
  completedAt: z.string(),
  // NEW:
  quantity: z.number().optional(),
  unit: z.string().optional(), // e.g., "glasses", "reps", "pages"
})

// Add to HabitSchema:
export const HabitSchema = z.object({
  // ... existing fields
  // NEW:
  tracksQuantity: z.boolean().default(false),
  quantityUnit: z.string().optional(), // e.g., "pushups", "pages", "glasses"
  quantityTarget: z.number().optional(), // Daily target for quantity
})
```

#### UI Components

**File: `components/QuantityInput.tsx` (NEW)**

```typescript
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  NumberInput,
  NumberInputField,
  HStack,
  Text,
} from "@chakra-ui/react"
import { useState } from "react"

interface QuantityInputProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (quantity: number) => void
  unit?: string
  defaultValue?: number
}

const QuantityInput = ({
  isOpen,
  onClose,
  onSubmit,
  unit,
  defaultValue = 0,
}: QuantityInputProps) => {
  const [quantity, setQuantity] = useState(defaultValue)

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>How much?</ModalHeader>
        <ModalBody>
          <HStack>
            <NumberInput
              value={quantity}
              onChange={(valueString) => setQuantity(Number(valueString))}
              autoFocus
            >
              <NumberInputField />
            </NumberInput>
            {unit && <Text>{unit}</Text>}
          </HStack>
        </ModalBody>
        <ModalFooter>
          <Button
            colorScheme="teal"
            onClick={() => {
              onSubmit(quantity)
              onClose()
            }}
          >
            Save
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

export default QuantityInput
```

#### Modified Completion Toggle

**File: `lib/timerMachine.ts`**

Update `toggleHabitCompletion` to optionally accept quantity:
```typescript
type ToggleHabitCompletionEvent = {
  type: "TOGGLE_HABIT_COMPLETION"
  habitId: string
  quantity?: number
}

toggleHabitCompletion: immerAssign((context, event: ToggleHabitCompletionEvent) => {
  const habit = context.allHabits.find(h => h.id === event.habitId)
  if (!habit) return

  const today = new Date().toISOString().split("T")[0]
  const existingCompletionIndex = context.completions.findIndex(
    c => c.trackableId === event.habitId &&
         c.trackableType === "habit" &&
         c.completedAt.startsWith(today)
  )

  if (existingCompletionIndex >= 0) {
    // Update quantity or remove
    if (event.quantity !== undefined) {
      context.completions[existingCompletionIndex].quantity = event.quantity
    } else {
      context.completions.splice(existingCompletionIndex, 1)
    }
  } else {
    // Add new completion
    const completion = CompletionSchema.parse({
      trackableId: event.habitId,
      trackableType: "habit",
      trackableName: habit.name,
      completedAt: new Date().toISOString(),
      quantity: event.quantity,
      unit: habit.quantityUnit,
    })
    context.completions.push(completion)
  }
}),
```

#### UI Integration

**File: `screens/HabitConfigScreen.tsx`**

Add quantity tracking options:
```typescript
import QuantityInput from "@/components/QuantityInput"

// In menu or settings:
<FormControl display="flex" alignItems="center">
  <FormLabel>Track quantity</FormLabel>
  <Switch
    isChecked={habit.tracksQuantity}
    onChange={(e) => debouncedSend({
      type: "UPDATE_HABIT_QUANTITY_TRACKING",
      tracksQuantity: e.target.checked,
    })}
  />
</FormControl>

{habit.tracksQuantity && (
  <FormControl>
    <FormLabel>Unit (e.g., pushups, glasses)</FormLabel>
    <Input
      value={habit.quantityUnit || ""}
      onChange={(e) => debouncedSend({
        type: "UPDATE_HABIT_QUANTITY_UNIT",
        unit: e.target.value,
      })}
    />
  </FormControl>
)}
```

**File: `screens/HomeScreen.tsx`**

Show quantity input on habit completion:
```typescript
const [quantityModalOpen, setQuantityModalOpen] = useState(false)
const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null)

// When clicking tick:
innerButtonOnClick={(e) => {
  e.stopPropagation()
  const tracksQuantity = habit.tracksQuantity
  if (tracksQuantity) {
    setSelectedHabitId(habit.id)
    setQuantityModalOpen(true)
  } else {
    send({ type: "TOGGLE_HABIT_COMPLETION", habitId: habit.id })
  }
}}

// Modal handler:
<QuantityInput
  isOpen={quantityModalOpen}
  onClose={() => setQuantityModalOpen(false)}
  unit={allHabits.find(h => h.id === selectedHabitId)?.quantityUnit}
  onSubmit={(quantity) => {
    send({
      type: "TOGGLE_HABIT_COMPLETION",
      habitId: selectedHabitId!,
      quantity,
    })
  }}
/>
```

#### Progress with Quantity

**File: `components/FrequencyProgress.tsx`**

Enhance to show quantity progress:
```typescript
// If tracking quantity:
const totalQuantity = completions
  .filter(c => c.trackableId === habit.id && c.trackableType === "habit")
  .reduce((sum, c) => sum + (c.quantity || 0), 0)

const progress = habit.quantityTarget
  ? (totalQuantity / (habit.quantityTarget * targetCount)) * 100
  : (completionCount / targetCount) * 100

// Show progress bar with quantity info
```

#### Testing Checklist
- [ ] Can enable quantity tracking on habit
- [ ] Can set quantity unit
- [ ] Quantity input appears when toggling quantity-tracked habit
- [ ] Quantity is stored in completion
- [ ] Can edit quantity for existing completion
- [ ] Quantity progress displays in progress bar
- [ ] Quantity aggregates correctly across week/month

---

## Implementation Order

1. **Target Frequency** (2-3 hours)
   - Low complexity
   - High user value
   - Minimal dependencies

2. **Streak Tracking** (2-3 hours)
   - Depends on frequency/completions
   - Great motivational feature
   - Pure calculation + UI

3. **Quantity Tracking** (3-4 hours)
   - Most complex feature
   - Requires UI modifications
   - Good for granular tracking

## Acceptance Criteria

### Target Frequency
- Users can set frequency for habits
- Progress bar shows current vs target completions
- Progress updates immediately on completion
- Frequency persists in storage

### Streak Tracking
- Current streak displays on habit config screen
- Longest streak is tracked
- Streak increments correctly for consecutive days
- Streak resets on missed days
- Visual design motivates consistency

### Quantity Tracking
- Can be enabled/disabled per habit
- Quantity input appears on completion
- Quantities aggregate for daily/weekly totals
- Progress shows quantity progress toward target
- Quantities persist in storage

## Future Enhancements

- Weekly/monthly quantity goals
- Quantity history chart
- Reminders for uncompleted habits
- Social sharing of streaks
- Habit templates
- Analytics dashboard
- Time-based streaks (consecutive weeks/months)
