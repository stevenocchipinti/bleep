# Phase 2: Enhanced Habit UX

This document outlines the implementation plan for Phase 2 of the habit tracking feature, focusing on improved user experience through grouping, quick-access, and visual customization.

## Overview

Phase 2 builds on the MVP habit tracking system to add:
1. **Category Grouping** - Organize programs and habits by category on HomeScreen
2. **Quick-Check Widget** - Fast completion logging for daily habits
3. **Color Management** - Visual distinction for programs and habits

## Implementation Tasks

### 1. Category Grouping on HomeScreen

#### Goal
Group programs and habits by category with collapsible headers on the HomeScreen, allowing users to organize their trackables logically.

#### Changes Required

**File: `screens/HomeScreen.tsx`**

1. Add category grouping logic:
   ```typescript
   type TrackableGroup = {
     category: string | null
     trackables: Trackable[]
   }
   
   const groupedTrackables: TrackableGroup[] = useMemo(() => {
     // Group combined trackables by category
     const groups = new Map<string | null, Trackable[]>()
     
     trackables.forEach(t => {
       const category = t.data.category || "Uncategorized"
       if (!groups.has(category)) groups.set(category, [])
       groups.get(category)!.push(t)
     })
     
     // Convert to array with display order
     return Array.from(groups.entries()).map(([category, items]) => ({
       category,
       trackables: items,
     }))
   }, [trackables])
   ```

2. Add collapsible state for each group:
   ```typescript
   const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
     new Set(["Uncategorized"]) // Expand uncategorized by default
   )
   
   const toggleGroup = (category: string | null) => {
     const updated = new Set(expandedGroups)
     const key = category || "Uncategorized"
     if (updated.has(key)) {
       updated.delete(key)
     } else {
       updated.add(key)
     }
     setExpandedGroups(updated)
   }
   ```

3. Update rendering to show groups:
   ```typescript
   {groupedTrackables.map(group => {
     const isExpanded = expandedGroups.has(group.category || "Uncategorized")
     return (
       <Box key={group.category}>
         {/* Group header */}
         <Button
           variant="ghost"
           width="100%"
           justifyContent="flex-start"
           leftIcon={isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
           onClick={() => toggleGroup(group.category)}
         >
           {group.category || "Uncategorized"}
         </Button>
         
         {/* Collapse animation */}
         <Collapse in={isExpanded} animateOpacity>
           <DndContext onDragEnd={onDragEnd} items={group.trackables.map(t => t.id)}>
             {group.trackables.map(trackable => {
               // Render trackable card (existing logic)
             })}
           </DndContext>
         </Collapse>
       </Box>
     )
   })}
   ```

#### Testing Checklist
- [ ] Programs appear under their category
- [ ] Habits appear under their category
- [ ] "Uncategorized" section shows items with no category
- [ ] Groups expand/collapse smoothly
- [ ] Drag-and-drop works within expanded groups
- [ ] Group state persists on page reload (optional: use localStorage)

---

### 2. Quick-Check Widget

#### Goal
Provide a floating or sidebar widget for quickly completing daily habits without navigating to individual habit cards.

#### Changes Required

**File: `components/QuickCheckWidget.tsx` (NEW)**

Create a new component:
```typescript
import { VStack, Checkbox, Box, Heading } from "@chakra-ui/react"

interface QuickCheckWidgetProps {
  habits: Habit[]
  completions: Completion[]
  onToggle: (habitId: string) => void
}

const QuickCheckWidget = ({ habits, completions, onToggle }: QuickCheckWidgetProps) => {
  const isCompletedToday = (habitId: string): boolean => {
    const today = new Date().toISOString().split("T")[0]
    return completions.some(
      c => c.trackableId === habitId && 
           c.trackableType === "habit" &&
           c.completedAt.startsWith(today)
    )
  }

  return (
    <Box
      position="fixed"
      bottom={4}
      right={4}
      bg="white"
      border="1px solid"
      borderColor="gray.200"
      borderRadius="lg"
      p={4}
      shadow="lg"
      zIndex={10}
      maxW="250px"
    >
      <Heading size="sm" mb={3}>Today's Habits</Heading>
      <VStack spacing={2} align="flex-start">
        {habits.map(habit => (
          <Checkbox
            key={habit.id}
            isChecked={isCompletedToday(habit.id)}
            onChange={() => onToggle(habit.id)}
          >
            {habit.name}
          </Checkbox>
        ))}
      </VStack>
    </Box>
  )
}

export default QuickCheckWidget
```

**File: `screens/HomeScreen.tsx`**

Integrate the widget:
```typescript
import QuickCheckWidget from "@/components/QuickCheckWidget"

// In HomeScreen render:
<QuickCheckWidget
  habits={allHabits}
  completions={completions}
  onToggle={(habitId) => send({ type: "TOGGLE_HABIT_COMPLETION", habitId })}
/>
```

#### Considerations
- Position: Fixed bottom-right (avoid blocking main content)
- Show only habits, not programs (habits are simpler)
- Filter by category if user is viewing a specific category
- Add minimize/expand toggle
- Auto-hide on small screens (mobile)

#### Testing Checklist
- [ ] Widget appears in bottom-right
- [ ] Checking a habit toggles its completion
- [ ] Unchecking removes the completion
- [ ] Shows accurate state (reflects current completions)
- [ ] Widget doesn't block important UI on mobile

---

### 3. Color Management

#### Goal
Allow users to assign colors to programs and habits for visual organization and differentiation.

#### Schema Changes

**File: `lib/types.ts`**

Add optional `color` field to both schemas:
```typescript
export const ProgramSchema = z.object({
  id: z.string().default(() => generateId(6)),
  name: z.string().nonempty(),
  description: z.string().default(""),
  blocks: z.array(BlockSchema).default([]).refine(...),
  category: z.string().optional(),
  color: z.string().optional(), // NEW: hex color code
})

export const HabitSchema = z.object({
  id: z.string().default(() => generateId(6)),
  name: z.string().nonempty(),
  category: z.string().optional(),
  color: z.string().optional(), // NEW: hex color code
})
```

#### UI Components

**File: `components/ColorPicker.tsx` (NEW)**

Create a simple color picker:
```typescript
import { Box, Flex, Button } from "@chakra-ui/react"

const PRESET_COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A",
  "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E2",
  "#F8B195", "#C06C84", "#6C567B", "#355C7D",
]

interface ColorPickerProps {
  value?: string
  onChange: (color: string) => void
}

const ColorPicker = ({ value, onChange }: ColorPickerProps) => (
  <Flex wrap="wrap" gap={2}>
    {PRESET_COLORS.map(color => (
      <Button
        key={color}
        width="32px"
        height="32px"
        borderRadius="full"
        bg={color}
        border={value === color ? "3px solid" : "1px solid"}
        borderColor="gray.300"
        onClick={() => onChange(color)}
      />
    ))}
  </Flex>
)

export default ColorPicker
```

#### Integration Points

**File: `screens/ConfigScreen.tsx`** (for programs)

Add color picker to the program editor:
```typescript
import ColorPicker from "@/components/ColorPicker"

// In the Editable section for program description, add:
<FormControl>
  <FormLabel>Color</FormLabel>
  <ColorPicker
    value={program.color}
    onChange={newColor => debouncedSend({
      type: "UPDATE_PROGRAM_COLOR",
      color: newColor,
    })}
  />
</FormControl>
```

**File: `screens/HabitConfigScreen.tsx`** (for habits)

Add color picker to the habit editor:
```typescript
import ColorPicker from "@/components/ColorPicker"

// After the name section, add:
<FormControl>
  <FormLabel>Color</FormLabel>
  <ColorPicker
    value={habit.color}
    onChange={newColor => debouncedSend({
      type: "UPDATE_HABIT_COLOR",
      color: newColor,
    })}
  />
</FormControl>
```

#### State Machine Changes

**File: `lib/timerMachine.ts`**

Add events and actions:
```typescript
// Event types
type UpdateProgramColorEvent = { type: "UPDATE_PROGRAM_COLOR"; color: string }
type UpdateHabitColorEvent = { type: "UPDATE_HABIT_COLOR"; color: string }

// Actions
updateProgramColor: immerAssign((context, event: UpdateProgramColorEvent) => {
  const program = currentProgramFrom(context)
  if (program) program.color = event.color
}),

updateHabitColor: immerAssign((context, event: UpdateHabitColorEvent) => {
  const habit = currentHabitFrom(context)
  if (habit) habit.color = event.color
}),
```

#### Visual Application

**File: `components/CardButton.tsx`**

Use color in card styling:
```typescript
interface CardButtonProps {
  // ... existing props
  color?: string
}

const CardButton = ({ color, ...props }: CardButtonProps) => (
  <Card
    borderLeftWidth="4px"
    borderLeftColor={color || "gray.300"}
    // ... rest of card styling
  >
    {/* ... */}
  </Card>
)
```

**File: `screens/HomeScreen.tsx`**

Pass color to CardButton:
```typescript
<CardButton
  // ... existing props
  color={trackable.data.color}
/>
```

#### Testing Checklist
- [ ] Can set color on programs
- [ ] Can set color on habits
- [ ] Color persists after page reload
- [ ] Card border shows the selected color
- [ ] Preset colors are visually distinct
- [ ] Default (no color) shows neutral border

---

## Implementation Order

1. **Category Grouping** (1-2 hours)
   - Lowest risk, most impact
   - Leverages existing data
   - Pure UI refactoring

2. **Color Management** (1-2 hours)
   - Schema changes are minimal
   - UI is straightforward
   - Visual feedback is immediate

3. **Quick-Check Widget** (1-2 hours)
   - Optional/polish feature
   - Can be added incrementally
   - Complements other features

## Acceptance Criteria

### Category Grouping
- Programs and habits group by category
- Groups expand/collapse smoothly
- Uncategorized items in default section
- Drag-and-drop works within groups
- Visual hierarchy is clear

### Color Management
- Colors can be set for programs and habits
- Colors persist in storage
- Visual feedback on cards
- Color changes save without page reload

### Quick-Check Widget
- Shows only habits for today
- Clicking habit toggles completion
- Widget is non-intrusive
- Responsive on mobile (hides or adapts)

## Future Enhancements

- Custom color picker (color input field)
- Category management UI (create/edit/delete categories)
- Drag habits between categories
- Widget position customization
- Widget size/opacity settings
