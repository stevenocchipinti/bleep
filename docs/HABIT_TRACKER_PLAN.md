# Habit Tracker Feature - Implementation Plan

## Overview

Add habit tracking functionality to Bleep timer app to record when programs are completed, allowing users to view completion history, edit entries, and visualize their progress over time.

## Feature Requirements

### Core Functionality
- **Automatic Recording**: When a program completes, automatically record a completion entry with programId, programName (snapshot), and UTC timestamp
- **Manual Entry**: Allow users to manually add completion entries for past dates
- **Edit Entries**: Allow users to edit the datetime of existing completions
- **Delete Entries**: Allow users to delete completion entries with confirmation
- **Cascade Deletion**: When a program is deleted, automatically delete all its completion entries
- **Import/Export**: Allow users to export and import completion data (separate from program data)
- **History View**: Calendar-based UI to view and manage completion history per program

### UI/UX Decisions

#### CompletionHistoryModal
- **Type**: Modal (AlertDialog pattern) - consistent with existing ConfigScreen modals
- **Access**: Via "History" menu item in ConfigScreen header menu
- **Scope**: Shows completions for current program only
- **Calendar**: Single month view with prev/next navigation
- **Day Highlighting**: Days with completions show circular background color on day number
- **Day Selection**: Click any day to view completions for that day (or add new entry)
- **Empty States**: 
  - No completions for program: Calendar displays, no days highlighted, user can click any day to add
  - Selected day has no completions: Show "Add completion" button only
  - Selected day has completions: Show list of completions + "Add completion" button at end

#### Data Management
- **Settings Modal**: Extend "Data" tab with two sections: "Program Data" and "Completion History Data"
- **Format**: JSON import/export with Zod validation

#### Date/Time Handling
- **Storage**: ISO 8601 UTC string (e.g., `"2026-01-21T14:30:00.000Z"`)
- **Display**: Australian format: `YYYY/MM/DD HH:mm` (e.g., `2026/01/21 14:30`)
- **Timezone**: Store UTC, convert to local for display/editing (browser handles DST automatically)

#### Completion List
- **Ordering**: Most recent first (descending time)
- **Display**: Program name (as recorded at completion time) + datetime
- **Actions**: Click datetime to edit, delete button with confirmation

## Data Schema

### New Types (`lib/types.ts`)

```typescript
export const ProgramCompletionSchema = z.object({
  id: z.string().default(() => generateId(6)),
  programId: z.string(),
  programName: z.string(), // Snapshot at completion time
  completedAt: z.string(), // ISO 8601 UTC timestamp
})

export type ProgramCompletion = z.infer<typeof ProgramCompletionSchema>

export const AllProgramCompletionsSchema = z.array(ProgramCompletionSchema)

export type AllProgramCompletions = z.infer<typeof AllProgramCompletionsSchema>
```

### Storage
- **Key**: `"programCompletions"`
- **Location**: LocalForage (IndexedDB)
- **Default**: Empty array `[]` if no data exists

## State Machine Updates

### Context Addition (`lib/timerMachine.ts`)

```typescript
type Context = {
  allPrograms: Program[]
  programCompletions: ProgramCompletion[] // NEW
  settings: Settings
  selectedProgramId: string | null
  currentBlockIndex: number
  secondsRemaining: number
  leadSecondsRemaining: number
}
```

### New Services

```typescript
// Load completions from LocalForage
loadCompletions: () =>
  localforage.getItem("programCompletions").then(data => {
    if (data) return AllProgramCompletionsSchema.parse(data)
    return [] // Default to empty array
  })

// Save completions to LocalForage
saveCompletions: ({ programCompletions }) =>
  localforage.setItem("programCompletions", programCompletions)
```

### New Actions

```typescript
// Automatic recording when timer finishes
recordCompletion: assign({
  programCompletions: ({ programCompletions, selectedProgramId, allPrograms }) => {
    const program = allPrograms.find(p => p.id === selectedProgramId)
    if (!program) return programCompletions
    
    return [
      ...programCompletions,
      ProgramCompletionSchema.parse({
        programId: selectedProgramId,
        programName: program.name,
        completedAt: new Date().toISOString(),
      })
    ]
  }
})

// Manual addition from UI
addCompletion: assign({
  programCompletions: ({ programCompletions }, event) => [
    ...programCompletions,
    event.completion
  ]
})

// Edit existing completion
updateCompletion: assign({
  programCompletions: ({ programCompletions }, event) =>
    programCompletions.map(c =>
      c.id === event.completionId 
        ? { ...c, completedAt: event.completedAt }
        : c
    )
})

// Delete single completion
deleteCompletion: assign({
  programCompletions: ({ programCompletions }, event) =>
    programCompletions.filter(c => c.id !== event.completionId)
})

// Delete all completions for a program (cascade)
deleteCompletionsForProgram: assign({
  programCompletions: ({ programCompletions, selectedProgramId }) =>
    programCompletions.filter(c => c.programId !== selectedProgramId)
})

// Bulk import
setAllCompletions: assign({
  programCompletions: (_, event) => event.completions
})
```

### New Events

```typescript
type Event =
  | { type: "ADD_COMPLETION"; completion: ProgramCompletion }
  | { type: "UPDATE_COMPLETION"; completionId: string; completedAt: string }
  | { type: "DELETE_COMPLETION"; completionId: string }
  | { type: "SET_ALL_COMPLETIONS"; completions: AllProgramCompletions }
  // ... existing events
```

### State Machine Structure Updates

#### Add Parallel "completions" State

Similar to existing "settings" state, add a parallel state for managing completion data:

```typescript
app: {
  type: "parallel",
  states: {
    timer: { /* existing */ },
    settings: { /* existing */ },
    voiceRecognition: { /* existing */ },
    completions: { // NEW
      initial: "loading",
      states: {
        loading: {
          invoke: {
            src: "loadCompletions",
            onDone: {
              target: "loaded",
              actions: assign({
                programCompletions: (_, event) => event.data
              })
            },
            onError: {
              target: "loaded", // Default to empty array
              actions: assign({
                programCompletions: () => []
              })
            }
          }
        },
        loaded: {
          on: {
            ADD_COMPLETION: {
              target: "saving",
              actions: "addCompletion"
            },
            UPDATE_COMPLETION: {
              target: "saving",
              actions: "updateCompletion"
            },
            DELETE_COMPLETION: {
              target: "saving",
              actions: "deleteCompletion"
            },
            SET_ALL_COMPLETIONS: {
              target: "saving",
              actions: "setAllCompletions"
            }
          }
        },
        saving: {
          invoke: {
            src: "saveCompletions",
            onDone: "loaded",
            onError: "loaded" // TODO: Handle save errors
          }
        }
      }
    }
  }
}
```

#### Hook Automatic Recording

In the timer state, when program completes:

```typescript
running: {
  // ... existing running states
  
  always: {
    target: "stopped",
    cond: "timerFinished",
    actions: [
      "celebration",
      "recordCompletion" // NEW - automatically record completion
    ]
  }
}
```

After `recordCompletion` modifies context, the parallel "completions" state will automatically transition to "saving" via its own event handler.

**Alternative approach**: Fire `ADD_COMPLETION` event explicitly:
```typescript
actions: [
  "celebration",
  sendTo(/* parent */, (context) => ({
    type: "ADD_COMPLETION",
    completion: { /* ... */ }
  }))
]
```

#### Update Program Deletion

```typescript
DELETE_PROGRAM: {
  target: "saving",
  actions: [
    "deleteProgram",
    "deleteCompletionsForProgram" // NEW - cascade delete
  ]
}
```

## Implementation Phases

### Phase 1: Core Data Layer

**Files to modify:**
- `lib/types.ts`
- `lib/timerMachine.ts`

**Steps:**

1. **Add schemas to `lib/types.ts`**
   - Add `ProgramCompletionSchema`
   - Add `AllProgramCompletionsSchema`
   - Export types

2. **Update state machine context in `lib/timerMachine.ts`**
   - Add `programCompletions: ProgramCompletion[]` to Context type
   - Add to initial context: `programCompletions: []`

3. **Add services**
   - `loadCompletions`
   - `saveCompletions`

4. **Add actions**
   - `recordCompletion`
   - `addCompletion`
   - `updateCompletion`
   - `deleteCompletion`
   - `deleteCompletionsForProgram`
   - `setAllCompletions`

5. **Add events to Event union type**
   - `ADD_COMPLETION`
   - `UPDATE_COMPLETION`
   - `DELETE_COMPLETION`
   - `SET_ALL_COMPLETIONS`

6. **Add parallel "completions" state**
   - loading → loaded → saving cycle
   - Event handlers for completion CRUD operations

7. **Hook automatic recording**
   - Add `recordCompletion` action to timer completion transition
   - Ensure it triggers "saving" state

8. **Update program deletion**
   - Add `deleteCompletionsForProgram` to DELETE_PROGRAM event

**Testing after Phase 1:**
```bash
# Run development server
yarn dev

# Test in browser console:
# 1. Complete a program
# 2. Check LocalForage: await localforage.getItem("programCompletions")
# 3. Verify completion was recorded
# 4. Delete program, verify completions are removed
```

---

### Phase 2: Settings Modal - Import/Export

**Files to modify:**
- `components/SettingsModal.tsx`

**Steps:**

1. **Update "Data" TabPanel**
   - Wrap existing program data section with heading "Program Data"
   - Add `<Divider />` separator
   - Add new section with heading "Completion History Data"

2. **Add completion data state**
   ```typescript
   const [completionData, setCompletionData] = useState("[]")
   ```

3. **Add validation logic**
   ```typescript
   let allCompletions: AllProgramCompletions = []
   let isCompletionDataValid = false
   
   try {
     const parsed = AllProgramCompletionsSchema.safeParse(JSON.parse(completionData))
     if (parsed.success) {
       allCompletions = parsed.data
       isCompletionDataValid = true
     }
   } catch (e) {
     // invalid
   }
   ```

4. **Add useEffect to sync completion data**
   ```typescript
   useEffect(() => {
     setCompletionData(JSON.stringify(state.context.programCompletions))
   }, [state.context.programCompletions, isOpen])
   ```

5. **Add UI elements**
   ```typescript
   <VStack spacing={4}>
     <Text fontWeight="bold">Completion History Data</Text>
     <FormControl isInvalid={!isCompletionDataValid}>
       <FormLabel>Completion Data</FormLabel>
       <Textarea
         value={completionData}
         onChange={e => setCompletionData(e.target.value)}
         fontFamily="monospace"
         fontSize="sm"
         rows={8}
       />
       <FormErrorMessage>Invalid completion data</FormErrorMessage>
       <Button
         mt={4}
         w="full"
         isDisabled={!isCompletionDataValid}
         onClick={() => {
           send({ type: "SET_ALL_COMPLETIONS", completions: allCompletions })
         }}
       >
         Import completion history
       </Button>
     </FormControl>
   </VStack>
   ```

**Testing after Phase 2:**
```bash
# In browser:
# 1. Open Settings → Data tab
# 2. See existing completions in textarea
# 3. Copy data, modify it, paste back
# 4. Click "Import completion history"
# 5. Verify changes applied
# 6. Test with invalid JSON → verify error message
```

---

### Phase 3: CompletionHistoryModal - Core Structure

**Files to create:**
- `components/CompletionHistoryModal.tsx`

**Steps:**

1. **Create component file structure**
   ```typescript
   import React, { useState, useRef } from "react"
   import {
     Modal,
     ModalOverlay,
     ModalContent,
     ModalHeader,
     ModalCloseButton,
     ModalBody,
     ModalFooter,
     Button,
     VStack,
     HStack,
     Text,
     IconButton,
     Divider,
     AlertDialog,
     AlertDialogBody,
     AlertDialogContent,
     AlertDialogFooter,
     AlertDialogHeader,
     AlertDialogOverlay,
   } from "@chakra-ui/react"
   import { ChevronLeftIcon, ChevronRightIcon, DeleteIcon } from "@chakra-ui/icons"
   import { useTimerActor } from "@/lib/useTimerMachine"
   import { ProgramCompletion, ProgramCompletionSchema } from "@/lib/types"

   interface CompletionHistoryModalProps {
     isOpen: boolean
     onClose: () => void
     programId: string
     programName: string
   }

   const CompletionHistoryModal = ({
     isOpen,
     onClose,
     programId,
     programName,
   }: CompletionHistoryModalProps) => {
     const { state, send } = useTimerActor()
     
     // Filter completions for current program
     const completions = state.context.programCompletions
       .filter(c => c.programId === programId)
       .sort((a, b) => 
         new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
       )
     
     // Calendar state
     const [selectedMonth, setSelectedMonth] = useState(new Date())
     const [selectedDate, setSelectedDate] = useState<Date | null>(null)
     
     // Delete confirmation state
     const [completionToDelete, setCompletionToDelete] = useState<string | null>(null)
     const deleteCancelRef = useRef<any>()
     
     // Get completions for selected date
     const selectedDateStr = selectedDate?.toISOString().split('T')[0] // YYYY-MM-DD
     const completionsForSelectedDate = selectedDate
       ? completions.filter(c => 
           c.completedAt.startsWith(selectedDateStr)
         )
       : []
     
     // Format date for display (Australian format: YYYY/MM/DD HH:mm)
     const formatDateTime = (isoString: string) => {
       const date = new Date(isoString)
       const year = date.getFullYear()
       const month = String(date.getMonth() + 1).padStart(2, '0')
       const day = String(date.getDate()).padStart(2, '0')
       const hours = String(date.getHours()).padStart(2, '0')
       const minutes = String(date.getMinutes()).padStart(2, '0')
       return `${year}/${month}/${day} ${hours}:${minutes}`
     }
     
     // Navigate months
     const goToPreviousMonth = () => {
       setSelectedMonth(prev => {
         const newDate = new Date(prev)
         newDate.setMonth(newDate.getMonth() - 1)
         return newDate
       })
     }
     
     const goToNextMonth = () => {
       setSelectedMonth(prev => {
         const newDate = new Date(prev)
         newDate.setMonth(newDate.getMonth() + 1)
         return newDate
       })
     }
     
     return (
       <>
         {/* Delete confirmation dialog */}
         <AlertDialog
           isOpen={!!completionToDelete}
           leastDestructiveRef={deleteCancelRef}
           onClose={() => setCompletionToDelete(null)}
           isCentered
         >
           <AlertDialogOverlay>
             <AlertDialogContent mx={4}>
               <AlertDialogHeader fontSize="lg" fontWeight="bold">
                 Delete completion
               </AlertDialogHeader>

               <AlertDialogBody>
                 Are you sure you want to delete this completion entry?
               </AlertDialogBody>

               <AlertDialogFooter>
                 <Button
                   ref={deleteCancelRef}
                   onClick={() => setCompletionToDelete(null)}
                 >
                   Cancel
                 </Button>
                 <Button
                   colorScheme="red"
                   onClick={() => {
                     if (completionToDelete) {
                       send({ 
                         type: "DELETE_COMPLETION", 
                         completionId: completionToDelete 
                       })
                     }
                     setCompletionToDelete(null)
                   }}
                   ml={3}
                 >
                   Delete
                 </Button>
               </AlertDialogFooter>
             </AlertDialogContent>
           </AlertDialogOverlay>
         </AlertDialog>

         {/* Main modal */}
         <Modal isOpen={isOpen} onClose={onClose} size="xl" isCentered>
           <ModalOverlay />
           <ModalContent mx={4}>
             <ModalHeader>History: {programName}</ModalHeader>
             <ModalCloseButton />
             <ModalBody>
               <VStack spacing={4} align="stretch">
                 {/* Month navigation */}
                 <HStack justify="space-between">
                   <IconButton
                     aria-label="Previous month"
                     icon={<ChevronLeftIcon />}
                     onClick={goToPreviousMonth}
                     variant="ghost"
                   />
                   <Text fontSize="lg" fontWeight="bold">
                     {selectedMonth.toLocaleString('en-AU', { 
                       month: 'long', 
                       year: 'numeric' 
                     })}
                   </Text>
                   <IconButton
                     aria-label="Next month"
                     icon={<ChevronRightIcon />}
                     onClick={goToNextMonth}
                     variant="ghost"
                   />
                 </HStack>

                 {/* Calendar component - TODO: Implement in Phase 4 */}
                 <Text color="gray.500" textAlign="center" py={8}>
                   Calendar component coming in Phase 4
                 </Text>

                 <Divider />

                 {/* Selected date completions */}
                 {selectedDate ? (
                   <VStack spacing={3} align="stretch">
                     <Text fontWeight="bold">
                       {selectedDate.toLocaleDateString('en-AU')}
                     </Text>
                     
                     {completionsForSelectedDate.length === 0 ? (
                       <Text color="gray.500">No completions for this day</Text>
                     ) : (
                       completionsForSelectedDate.map(completion => (
                         <HStack 
                           key={completion.id} 
                           justify="space-between"
                           p={2}
                           borderWidth={1}
                           borderRadius="md"
                         >
                           <Text>{formatDateTime(completion.completedAt)}</Text>
                           <HStack>
                             {/* Edit button - TODO: Implement in Phase 5 */}
                             <Button size="sm" variant="ghost">
                               Edit
                             </Button>
                             <IconButton
                               aria-label="Delete"
                               icon={<DeleteIcon />}
                               size="sm"
                               variant="ghost"
                               onClick={() => setCompletionToDelete(completion.id)}
                             />
                           </HStack>
                         </HStack>
                       ))
                     )}
                     
                     {/* Add button - TODO: Implement in Phase 5 */}
                     <Button variant="outline" size="sm">
                       Add completion
                     </Button>
                   </VStack>
                 ) : (
                   <Text color="gray.500" textAlign="center">
                     Select a day to view or add completions
                   </Text>
                 )}
               </VStack>
             </ModalBody>

             <ModalFooter>
               <Button onClick={onClose}>Close</Button>
             </ModalFooter>
           </ModalContent>
         </Modal>
       </>
     )
   }

   CompletionHistoryModal.displayName = "CompletionHistoryModal"
   export default CompletionHistoryModal
   ```

**Testing after Phase 3:**
```bash
# In browser:
# 1. Open ConfigScreen
# 2. Click "History" in menu (will add in next phase)
# 3. See modal with month navigation
# 4. See placeholder for calendar
# 5. Test delete confirmation dialog
```

---

### Phase 4: Calendar Component

**Files to modify:**
- `components/CompletionHistoryModal.tsx`

**Steps:**

1. **Add calendar helper functions**
   ```typescript
   // Get days in month as array of Date objects
   const getDaysInMonth = (date: Date): Date[] => {
     const year = date.getFullYear()
     const month = date.getMonth()
     const firstDay = new Date(year, month, 1)
     const lastDay = new Date(year, month + 1, 0)
     
     const days: Date[] = []
     
     // Add empty days for padding (start of week)
     const startDayOfWeek = firstDay.getDay() // 0 = Sunday
     for (let i = 0; i < startDayOfWeek; i++) {
       days.push(null as any) // Placeholder for empty cells
     }
     
     // Add all days in month
     for (let day = 1; day <= lastDay.getDate(); day++) {
       days.push(new Date(year, month, day))
     }
     
     return days
   }
   
   // Check if date has completions
   const hasCompletions = (date: Date | null): boolean => {
     if (!date) return false
     const dateStr = date.toISOString().split('T')[0]
     return completions.some(c => c.completedAt.startsWith(dateStr))
   }
   
   // Check if two dates are same day
   const isSameDay = (date1: Date | null, date2: Date | null): boolean => {
     if (!date1 || !date2) return false
     return date1.toISOString().split('T')[0] === date2.toISOString().split('T')[0]
   }
   ```

2. **Create MonthCalendar component (inline or separate file)**
   ```typescript
   const MonthCalendar = ({
     month,
     selectedDate,
     onSelectDate,
     hasCompletions,
   }: {
     month: Date
     selectedDate: Date | null
     onSelectDate: (date: Date) => void
     hasCompletions: (date: Date) => boolean
   }) => {
     const days = getDaysInMonth(month)
     const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
     
     return (
       <VStack spacing={2}>
         {/* Week day headers */}
         <Grid templateColumns="repeat(7, 1fr)" gap={1} w="full">
           {weekDays.map(day => (
             <Box key={day} textAlign="center" fontSize="sm" color="gray.500">
               {day}
             </Box>
           ))}
         </Grid>
         
         {/* Calendar days */}
         <Grid templateColumns="repeat(7, 1fr)" gap={1} w="full">
           {days.map((date, index) => {
             const isSelected = isSameDay(date, selectedDate)
             const hasData = date && hasCompletions(date)
             const isToday = date && isSameDay(date, new Date())
             
             return (
               <Button
                 key={index}
                 size="sm"
                 variant={isSelected ? "solid" : "ghost"}
                 colorScheme={isSelected ? "teal" : undefined}
                 onClick={() => date && onSelectDate(date)}
                 isDisabled={!date}
                 position="relative"
                 h="40px"
               >
                 {date ? (
                   <>
                     <Text
                       position="relative"
                       zIndex={1}
                       fontWeight={isToday ? "bold" : "normal"}
                     >
                       {date.getDate()}
                     </Text>
                     {hasData && !isSelected && (
                       <Box
                         position="absolute"
                         top="50%"
                         left="50%"
                         transform="translate(-50%, -50%)"
                         w="32px"
                         h="32px"
                         borderRadius="full"
                         bg="teal.100"
                         zIndex={0}
                       />
                     )}
                   </>
                 ) : null}
               </Button>
             )
           })}
         </Grid>
       </VStack>
     )
   }
   ```

3. **Replace placeholder with MonthCalendar**
   ```typescript
   <MonthCalendar
     month={selectedMonth}
     selectedDate={selectedDate}
     onSelectDate={setSelectedDate}
     hasCompletions={hasCompletions}
   />
   ```

4. **Add Grid import from Chakra UI**
   ```typescript
   import { Grid, Box, /* ... */ } from "@chakra-ui/react"
   ```

**Testing after Phase 4:**
```bash
# In browser:
# 1. Open History modal
# 2. See calendar grid with day names
# 3. Days with completions show circular background
# 4. Click day → see completions list below
# 5. Navigate months → calendar updates
# 6. Today's date is bold
# 7. Selected date is highlighted
```

---

### Phase 5: Add/Edit Completion UI

**Files to modify:**
- `components/CompletionHistoryModal.tsx`

**Steps:**

1. **Add edit state**
   ```typescript
   const [editingCompletion, setEditingCompletion] = useState<ProgramCompletion | null>(null)
   const [editDateTime, setEditDateTime] = useState("")
   const editCancelRef = useRef<any>()
   ```

2. **Add helper for datetime input format**
   ```typescript
   // Convert ISO string to datetime-local input format (YYYY-MM-DDTHH:mm)
   const toDateTimeLocalString = (isoString: string) => {
     const date = new Date(isoString)
     const year = date.getFullYear()
     const month = String(date.getMonth() + 1).padStart(2, '0')
     const day = String(date.getDate()).padStart(2, '0')
     const hours = String(date.getHours()).padStart(2, '0')
     const minutes = String(date.getMinutes()).padStart(2, '0')
     return `${year}-${month}-${day}T${hours}:${minutes}`
   }
   
   // Convert datetime-local input to ISO string
   const fromDateTimeLocalString = (localString: string) => {
     return new Date(localString).toISOString()
   }
   ```

3. **Add edit dialog**
   ```typescript
   <AlertDialog
     isOpen={!!editingCompletion}
     leastDestructiveRef={editCancelRef}
     onClose={() => {
       setEditingCompletion(null)
       setEditDateTime("")
     }}
     isCentered
   >
     <AlertDialogOverlay>
       <AlertDialogContent mx={4}>
         <AlertDialogHeader fontSize="lg" fontWeight="bold">
           Edit completion
         </AlertDialogHeader>

         <AlertDialogBody>
           <FormControl>
             <FormLabel>Date and Time</FormLabel>
             <Input
               type="datetime-local"
               value={editDateTime}
               onChange={e => setEditDateTime(e.target.value)}
             />
           </FormControl>
         </AlertDialogBody>

         <AlertDialogFooter>
           <Button
             ref={editCancelRef}
             onClick={() => {
               setEditingCompletion(null)
               setEditDateTime("")
             }}
           >
             Cancel
           </Button>
           <Button
             colorScheme="teal"
             onClick={() => {
               if (editingCompletion && editDateTime) {
                 send({
                   type: "UPDATE_COMPLETION",
                   completionId: editingCompletion.id,
                   completedAt: fromDateTimeLocalString(editDateTime),
                 })
               }
               setEditingCompletion(null)
               setEditDateTime("")
             }}
             ml={3}
             isDisabled={!editDateTime}
           >
             Save
           </Button>
         </AlertDialogFooter>
       </AlertDialogContent>
     </AlertDialogOverlay>
   </AlertDialog>
   ```

4. **Wire up edit button**
   ```typescript
   <Button 
     size="sm" 
     variant="ghost"
     onClick={() => {
       setEditingCompletion(completion)
       setEditDateTime(toDateTimeLocalString(completion.completedAt))
     }}
   >
     Edit
   </Button>
   ```

5. **Add "Add completion" dialog state**
   ```typescript
   const [isAddingCompletion, setIsAddingCompletion] = useState(false)
   const [addDateTime, setAddDateTime] = useState("")
   const addCancelRef = useRef<any>()
   ```

6. **Add "Add completion" dialog** (similar to edit dialog)
   ```typescript
   <AlertDialog
     isOpen={isAddingCompletion}
     leastDestructiveRef={addCancelRef}
     onClose={() => {
       setIsAddingCompletion(false)
       setAddDateTime("")
     }}
     isCentered
   >
     <AlertDialogOverlay>
       <AlertDialogContent mx={4}>
         <AlertDialogHeader fontSize="lg" fontWeight="bold">
           Add completion
         </AlertDialogHeader>

         <AlertDialogBody>
           <FormControl>
             <FormLabel>Date and Time</FormLabel>
             <Input
               type="datetime-local"
               value={addDateTime}
               onChange={e => setAddDateTime(e.target.value)}
             />
           </FormControl>
         </AlertDialogBody>

         <AlertDialogFooter>
           <Button
             ref={addCancelRef}
             onClick={() => {
               setIsAddingCompletion(false)
               setAddDateTime("")
             }}
           >
             Cancel
           </Button>
           <Button
             colorScheme="teal"
             onClick={() => {
               if (addDateTime) {
                 send({
                   type: "ADD_COMPLETION",
                   completion: ProgramCompletionSchema.parse({
                     programId,
                     programName,
                     completedAt: fromDateTimeLocalString(addDateTime),
                   })
                 })
               }
               setIsAddingCompletion(false)
               setAddDateTime("")
             }}
             ml={3}
             isDisabled={!addDateTime}
           >
             Add
           </Button>
         </AlertDialogFooter>
       </AlertDialogContent>
     </AlertDialogOverlay>
   </AlertDialog>
   ```

7. **Wire up "Add completion" button**
   ```typescript
   <Button 
     variant="outline" 
     size="sm"
     onClick={() => {
       // Default to selected date at current time
       const defaultDate = selectedDate || new Date()
       defaultDate.setHours(new Date().getHours())
       defaultDate.setMinutes(new Date().getMinutes())
       setAddDateTime(toDateTimeLocalString(defaultDate.toISOString()))
       setIsAddingCompletion(true)
     }}
   >
     Add completion
   </Button>
   ```

8. **Add FormControl import**
   ```typescript
   import { FormControl, FormLabel, Input, /* ... */ } from "@chakra-ui/react"
   ```

**Testing after Phase 5:**
```bash
# In browser:
# 1. Click "Edit" on a completion → see datetime picker
# 2. Change date/time → Save → verify updated
# 3. Click "Add completion" → see datetime picker with default
# 4. Enter date/time → Add → verify new completion appears
# 5. Test with different dates/times
# 6. Verify timezone conversion (UTC storage, local display)
```

---

### Phase 6: ConfigScreen Integration

**Files to modify:**
- `screens/ConfigScreen.tsx`

**Steps:**

1. **Import new components**
   ```typescript
   import { CalendarIcon } from "@chakra-ui/icons"
   import CompletionHistoryModal from "@/components/CompletionHistoryModal"
   ```

2. **Add state for history modal**
   ```typescript
   const [historyModalIsOpen, setHistoryModalIsOpen] = useState(false)
   ```

3. **Add "History" menu item** (after "Share", before "Duplicate")
   ```typescript
   <MenuList>
     <MenuGroup>
       <MenuItem
         icon={<LinkIcon />}
         isDisabled={!isValid}
         onClick={() => setShareModalIsOpen(true)}
       >
         Share
       </MenuItem>
       <MenuItem
         icon={<CalendarIcon />}
         onClick={() => setHistoryModalIsOpen(true)}
       >
         History
       </MenuItem>
       <MenuItem
         icon={<CopyIcon />}
         onClick={() => send({ type: "DUPLICATE_PROGRAM" })}
       >
         Duplicate
       </MenuItem>
       <MenuItem
         icon={<DeleteIcon />}
         onClick={() => setThingToDelete({ type: "program" })}
       >
         Delete
       </MenuItem>
     </MenuGroup>
     {/* ... rest */}
   </MenuList>
   ```

4. **Render CompletionHistoryModal** (after other modals)
   ```typescript
   <CompletionHistoryModal
     isOpen={historyModalIsOpen}
     onClose={() => setHistoryModalIsOpen(false)}
     programId={program.id}
     programName={program.name}
   />
   ```

**Testing after Phase 6:**
```bash
# End-to-end test:
# 1. Select a program → go to ConfigScreen
# 2. Click hamburger menu → see "History" option
# 3. Click "History" → modal opens
# 4. See calendar, navigate months
# 5. Click day → see completions (if any)
# 6. Add/edit/delete completions
# 7. Close modal → verify persisted
# 8. Complete the program → verify auto-recorded
# 9. Open history again → verify new completion appears
```

---

## Testing Checklist

### Automatic Recording
- [ ] Complete a program → verify completion recorded
- [ ] Check timestamp is correct (UTC)
- [ ] Check program name is captured
- [ ] Verify saved to LocalForage
- [ ] Complete same program multiple times → verify all recorded

### Manual Add
- [ ] Open history modal → select day → add completion
- [ ] Verify datetime picker works
- [ ] Add completion for today → verify appears
- [ ] Add completion for past date → verify appears
- [ ] Add completion for future date → verify allowed
- [ ] Add multiple completions same day → verify all display

### Edit Completion
- [ ] Edit completion datetime → verify saved
- [ ] Change date only → verify time preserved
- [ ] Change time only → verify date preserved
- [ ] Verify timezone conversion (check UTC in LocalForage vs display)
- [ ] Edit completion to different month → verify calendar updates

### Delete Completion
- [ ] Delete with confirmation → verify removed
- [ ] Cancel deletion → verify kept
- [ ] Delete from selected day → verify list updates
- [ ] Delete all completions for a day → verify day no longer highlighted

### Calendar View
- [ ] Days with completions show circular background
- [ ] Multiple completions on same day → still shows one indicator
- [ ] Today's date is bold
- [ ] Selected date is highlighted
- [ ] Navigate months → calendar updates correctly
- [ ] Week starts on Sunday
- [ ] Days of previous/next month not shown (empty cells)

### Program Deletion Cascade
- [ ] Delete program → verify all its completions removed
- [ ] Check LocalForage → completions gone
- [ ] Verify other program completions unaffected

### Import/Export
- [ ] Export completion data → verify JSON format
- [ ] Import valid data → verify applied
- [ ] Import invalid JSON → verify error message
- [ ] Import empty array → verify clears data
- [ ] Import data with unknown programIds → verify allowed (historical data)

### Program Renaming
- [ ] Rename program → complete it → verify new name in completion
- [ ] View old completions → verify show old name
- [ ] History shows name evolution over time

### Edge Cases
- [ ] No completions for program → calendar shows, no days highlighted
- [ ] Select day with no completions → show "Add" button only
- [ ] Midnight completions (00:00) → verify display correctly
- [ ] Month/year transitions → verify calendar navigation
- [ ] Leap year dates (Feb 29) → verify handled
- [ ] DST transitions → verify timezone handling
- [ ] Very old dates (years ago) → verify display
- [ ] Multiple programs same time → verify scoped correctly

### Browser Compatibility
- [ ] Test datetime-local input (fallback for unsupported browsers?)
- [ ] Test LocalForage across browsers
- [ ] Test timezone handling across timezones (if possible)

### Performance
- [ ] Large number of completions (100+) → verify performant
- [ ] Calendar with many highlighted days → verify renders quickly
- [ ] State machine transitions smooth → no lag

---

## File Summary

### New Files (Phases 1-6)
- `components/CompletionHistoryModal.tsx` - Main history modal with calendar and completion list

### Modified Files (Phases 1-6)
- `lib/types.ts` - Add completion schemas
- `lib/timerMachine.ts` - Add context, services, actions, events, states
- `components/SettingsModal.tsx` - Add completion data import/export
- `screens/ConfigScreen.tsx` - Add "History" menu item and modal integration

### Additional Files (Phase 7 - Visualization)
- `components/CompletionHeatmap.tsx` - NEW - GitHub-style heatmap component
- `components/CardButton.tsx` - MODIFY - Add heatmap row, update selection styling
- `screens/HomeScreen.tsx` - MODIFY - Remove heading, add heatmap to cards

### No Changes Needed
- `screens/TimerScreen.tsx` - No changes needed
- `pages/index.tsx` - No changes needed
- `pages/_app.tsx` - No changes needed

---

## Phase 7: HomeScreen Visualization

### Overview
Add GitHub-style heatmap to each program card on the HomeScreen to visualize completion history at a glance.

### Design Specifications

#### Layout Changes
1. **Remove heading "Choose your program"** to maximize space for program list
2. **Keep heading for empty state**: "Create your first program below" still shows when no programs exist
3. **CardButton restructure**: Add second row for heatmap visualization

#### CardButton Component Updates (`components/CardButton.tsx`)

**Current structure:**
```
┌─────────────────────────────────────────┐
│ 🎯 [Timer] Program Name           >    │
└─────────────────────────────────────────┘
```

**New structure:**
```
┌─────────────────────────────────────────┐
│ 🎯 [Timer] Program Name           >    │  ← Row 1 (unchanged)
│ ████████████████████████████████        │  ← Row 2 (NEW: heatmap)
└─────────────────────────────────────────┘
```

#### Row 1 (Existing, Unchanged)
- **Drag handle**: Left side, for reordering
- **Chips**: Timer/Pause/Message indicator (if applicable)
- **Program name**: Center-left
- **">" button**: Right side, jumps directly to TimerScreen (skips ConfigScreen)
- **Click elsewhere**: Opens ConfigScreen

#### Row 2 (NEW: Heatmap)
- **Height**: Taller than current single-row card (approximately 1.5-2x height total)
- **Width**: Full width of card, respecting left/right padding
- **Position**: Below Row 1, inside CardBody (always visible, not collapsible)
- **Content**: Year-long heatmap visualization (52 weeks × 7 days)
- **Compact**: Should be visually dense to avoid making cards too tall
- **Non-interactive**: Heatmap is display-only (clicking still navigates as per Row 1)

#### Selection State Update
**Current behavior:**
- Selected program scales up: `transform: scale(1.05)`
- Background changes: `variant="filled"` and `bg="gray.600"`

**New behavior:**
- **Remove scale transform**: All cards stay same size
- **Visual selection indicators**:
  - **Outline**: Add border (e.g., `borderWidth="2px"` and `borderColor="teal.500"`)
  - **Background color**: Keep `bg="gray.600"` or adjust to a distinct color
  - **Optional**: Add glow effect with `boxShadow`

### Heatmap Visualization Specifications

#### Data Source
- **Completions**: Filter `state.context.programCompletions` by `programId`
- **Time range**: Last 365 days (rolling window from today)
- **Grouping**: Group completions by date (ignore time)

#### Visual Design (GitHub-inspired)

**Grid Layout:**
```
   Jan  Feb  Mar  Apr  May  Jun  Jul  Aug  Sep  Oct  Nov  Dec
M  ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢
T  ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢
W  ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢
T  ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢
F  ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢
S  ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢
S  ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢
```

**Dimensions:**
- **Columns**: 52-53 weeks (depends on year start/end alignment)
- **Rows**: 7 (days of week, starting Monday or Sunday)
- **Cell size**: Small squares (e.g., 8-12px) with 1-2px gap
- **Total width**: Should fit comfortably in card width (~400-500px)
- **Total height**: Compact (~60-80px including month labels)

**Color Scheme:**
- **Level 0 (no completions)**: `gray.700` (dark background, nearly invisible)
- **Level 1 (1 completion)**: `teal.900` (faint color)
- **Level 2 (2 completions)**: `teal.700` (medium color)
- **Level 3 (3 completions)**: `teal.500` (bright color)
- **Level 4 (4+ completions)**: `teal.300` (brightest color)

**Alternative approach**: Use a gradient instead of discrete levels
```typescript
const getHeatColor = (count: number, theme) => {
  if (count === 0) return theme.colors.gray[700]
  if (count === 1) return theme.colors.teal[900]
  if (count === 2) return theme.colors.teal[700]
  if (count === 3) return theme.colors.teal[500]
  return theme.colors.teal[300] // 4+
}
```

**Month Labels:**
- Display month abbreviations (Jan, Feb, Mar, etc.) above first week of each month
- Small font size (10-11px)
- Positioned above the grid
- Color: `gray.500`

**Day Labels (Optional):**
- Show M/W/F on left side (not all 7 days to save space)
- Very small font (9-10px)
- Color: `gray.600`

#### Empty State
- If no completions exist for program, show all cells as Level 0 (dark gray)
- No special empty message needed (the visualization itself shows "no data")

#### Tooltip (Optional Enhancement)
- Hover over cell → show tooltip with date and count
- Example: "Jan 21, 2026: 2 completions"
- Use Chakra UI's `Tooltip` component
- Consider performance impact (365 tooltips per program)

### Implementation Details

#### New Component: `CompletionHeatmap.tsx` (`components/`)

```typescript
import { Box, Grid, Text, HStack, VStack, useTheme } from "@chakra-ui/react"
import { ProgramCompletion } from "@/lib/types"

interface CompletionHeatmapProps {
  completions: ProgramCompletion[]
  programId: string
}

const CompletionHeatmap = ({ completions, programId }: CompletionHeatmapProps) => {
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
    const dateStr = date.toISOString().split('T')[0] // YYYY-MM-DD
    return programCompletions.filter(c => 
      c.completedAt.startsWith(dateStr)
    ).length
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
  
  // Get month labels (show at start of each month)
  const getMonthLabel = (weekIndex: number): string | null => {
    const firstDay = weeks[weekIndex]?.[0]
    if (!firstDay) return null
    
    // Show month label if this is the first week of a month
    // or if the month changed from previous week
    if (weekIndex === 0) {
      return firstDay.toLocaleString('en-AU', { month: 'short' })
    }
    
    const prevWeekFirstDay = weeks[weekIndex - 1]?.[0]
    if (prevWeekFirstDay && firstDay.getMonth() !== prevWeekFirstDay.getMonth()) {
      return firstDay.toLocaleString('en-AU', { month: 'short' })
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
              {label || ''}
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
```

#### CardButton Component Updates

**Add heatmap prop:**
```typescript
interface CardButtonProps {
  id: string
  text: string
  seconds?: number
  reps?: number
  message?: boolean
  disabled?: boolean
  error?: boolean
  onClick?: React.MouseEventHandler<unknown>
  innerButtonOnClick?: React.MouseEventHandler<unknown>
  selected?: boolean
  children?: React.ReactNode
  style?: any
  isExpanded?: boolean
  heatmapContent?: React.ReactNode // NEW: heatmap visualization
}
```

**Update selection styling:**
```typescript
<Card
  transition="0.2s"
  // REMOVE: transform={selected ? "scale(1.05)" : undefined}
  opacity={disabled ? 0.7 : 1}
  variant={selected ? "filled" : undefined}
  bg={selected ? "gray.600" : undefined}
  borderWidth={selected ? "2px" : "1px"} // NEW
  borderColor={selected ? "teal.500" : "transparent"} // NEW
  ref={setNodeRef}
  {...props}
>
```

**Add heatmap section in CardBody:**
```typescript
{/* Row 1: Existing header */}
<CardHeader onClick={onClick} display="flex" alignItems="center" p={0}>
  {/* ... existing content ... */}
</CardHeader>

{/* Row 2: Heatmap (NEW) */}
{heatmapContent && (
  <CardBody px={4} py={2}>
    {heatmapContent}
  </CardBody>
)}

{/* Existing collapsible children (used in ConfigScreen) */}
<Collapse in={isExpanded} animateOpacity>
  <CardBody p={4} pt={0}>
    {children}
  </CardBody>
</Collapse>
```

#### HomeScreen Updates

**Remove "Choose your program" heading:**
```typescript
{/* REMOVE THIS:
<Heading as="h2" textAlign="center" px={8} size="xl">
  {allPrograms.length > 0
    ? "Choose your program"
    : "Create your first program below"}
</Heading>
*/}

{/* REPLACE WITH THIS: */}
{allPrograms.length === 0 && (
  <Heading as="h2" textAlign="center" px={8} size="xl">
    Create your first program below
  </Heading>
)}
```

**Add heatmap to CardButton:**
```typescript
import CompletionHeatmap from "@/components/CompletionHeatmap"

// Inside render:
const { state, send } = useTimerActor()
const { allPrograms, selectedProgramId, programCompletions } = state.context

// ...

<CardButton
  key={id}
  id={id}
  text={program.name}
  selected={selectedProgramId === program.id}
  onClick={() => selectProgramById(program.id)}
  error={!isValid}
  innerButtonOnClick={e => {
    e.stopPropagation()
    selectProgramById(program.id, isValid)
  }}
  heatmapContent={
    <CompletionHeatmap 
      completions={programCompletions}
      programId={id}
    />
  }
/>
```

### Testing Checklist

#### Visual Layout
- [ ] Cards are taller than before (accommodate heatmap row)
- [ ] Heatmap displays full width of card (respecting padding)
- [ ] Drag handle, name, chips, ">" button remain unchanged
- [ ] No scaling on selection (all cards same size)
- [ ] Selected card has visible border/outline
- [ ] Heatmap is compact (doesn't dominate the card)

#### Heatmap Functionality
- [ ] Shows last 365 days of data
- [ ] Days with 0 completions are dark gray
- [ ] Days with completions show color gradient (1-4+)
- [ ] Month labels display correctly above grid
- [ ] Day labels (M/W/F) display on left
- [ ] Grid aligns properly (7 rows × ~52 columns)

#### Data Accuracy
- [ ] Completions filtered correctly by programId
- [ ] Multiple completions same day show higher intensity
- [ ] Date grouping works (ignores time, groups by day)
- [ ] Rolling 365-day window updates daily

#### Performance
- [ ] Multiple programs (5-10) render smoothly
- [ ] No lag when scrolling program list
- [ ] Heatmap calculations don't block UI

#### Edge Cases
- [ ] Program with no completions → all cells dark gray
- [ ] Program with 1 completion → one cell colored
- [ ] Program completed today → today's cell is colored
- [ ] Very active program (daily completions) → gradient visible
- [ ] Leap year dates render correctly
- [ ] Year boundary transitions (Dec 31 → Jan 1) work

#### Responsive Design
- [ ] Heatmap scales on different screen widths
- [ ] Cell size remains readable on mobile
- [ ] Month labels don't overlap
- [ ] Works on narrow screens (320px+)

#### Integration
- [ ] ConfigScreen CardButtons unaffected (no heatmap shown there)
- [ ] Only HomeScreen shows heatmap
- [ ] Drag-and-drop still works with taller cards
- [ ] Selection state change updates properly

### Future Enhancements (Phase 7+)

These features are deferred but documented for future consideration:

#### Heatmap Interactivity
- Click cell → open CompletionHistoryModal with that day selected
- Hover tooltip showing date and count
- Pinch-to-zoom on mobile for larger view

#### Additional Stats on Card
- Streak counter (e.g., "🔥 7 day streak")
- Total count (e.g., "42 completions")
- Last completed date (e.g., "Last: 2 hours ago")

### Phase 8: Statistics & Analytics
- Dedicated stats screen
- Current streak calculation
- Longest streak
- Average completions per week/month
- Completion rate over time (charts)
- Comparison between programs

### Phase 9: Advanced Features
- Export to CSV
- Completion notes/comments
- Completion duration tracking
- Skip/partial completion tracking
- Reminders based on completion history
- Goals (e.g., "Complete 3x per week")

---

## Notes & Considerations

### Timezone Handling
- **Storage**: Always UTC (ISO 8601)
- **Display**: Convert to local timezone using browser's `Date` object
- **Editing**: Accept local time, convert to UTC for storage
- **DST**: Browser automatically handles DST transitions when converting between UTC and local
- **Caveat**: If user travels across timezones, completions will display in current timezone (this is expected behavior)

### Data Migration
- No migration needed (new feature, new storage key)
- Existing users start with empty completion history
- Can manually backfill via "Add completion" feature

### Error Handling
- Invalid JSON import → show error message
- LocalForage save failure → TODO: handle gracefully (Phase 1)
- Invalid date input → disabled save button
- Deleted program completions → handled via cascade delete

### Performance Considerations
- Filter completions per-program (not globally) → O(n) where n = total completions
- Sort completions on render → consider memoization if list is large
- Calendar re-renders when month changes → acceptable
- State machine save on every edit → acceptable (LocalForage is async/fast)

### Accessibility
- Calendar keyboard navigation → TODO: consider adding arrow key support
- Screen reader labels → ensure all buttons have aria-labels
- Color contrast → ensure circular background meets WCAG standards
- Focus management → return focus to trigger after closing modal

### Mobile Considerations
- Calendar grid responsive → 7 columns may be tight on small screens
- datetime-local input → native picker on mobile (good UX)
- Modal sizing → use `mx={4}` for margins on mobile
- Touch targets → buttons minimum 40px height

---

## Questions & Decisions Log

| Question | Decision | Rationale |
|----------|----------|-----------|
| Modal vs Screen? | Modal | Consistent with existing ConfigScreen pattern |
| Where to show history? | ConfigScreen menu | Contextual to program being viewed |
| Calendar style? | Month view with navigation | Simple, familiar, mobile-friendly |
| Day highlighting? | Circular background color | Clear visual indicator, GitHub-inspired |
| Show completion count on day? | No | Simplified UI, click day to see list |
| Date format? | YYYY/MM/DD HH:mm | Australian standard, sortable |
| Timezone storage? | UTC | Standard practice, avoid DST issues |
| Edit capability? | Datetime only | Simplified, low error risk |
| Delete confirmation? | Yes | Prevent accidental deletion |
| Cascade delete? | Yes | Orphaned data is confusing |
| Import/Export location? | Settings → Data tab | Existing pattern |
| Separate tabs for data? | No, two sections in one tab | Less navigation |
| Empty state behavior? | Always show calendar + add button | Discoverable, encourages use |
| Completion list order? | Recent first | Most relevant completions first |
| Calendar icon? | Chakra's CalendarIcon | Consistent with existing icons |

---

## Implementation Strategy

### Recommended Approach
1. **Sequential phases**: Implement Phase 1 → test → Phase 2 → test, etc.
2. **Incremental**: Each phase builds on previous, with testing at each step
3. **Validation**: Test core data layer thoroughly before building UI
4. **Iteration**: UI phases can be refined based on user testing

### Alternative Approaches
- **Big bang**: Implement all phases at once (riskier, harder to debug)
- **Sub-agents**: Use specialized agents for each phase (good for parallelization)
- **UI-first**: Build UI with mock data, then connect data layer (can miss integration issues)

### Time Estimates (Rough)
- Phase 1: 30-60 minutes (critical, needs testing)
- Phase 2: 15-30 minutes (straightforward)
- Phase 3: 30-45 minutes (boilerplate)
- Phase 4: 45-60 minutes (calendar logic)
- Phase 5: 30-45 minutes (datetime handling)
- Phase 6: 10-15 minutes (integration)
- **Total**: 2.5-4 hours

---

## Success Criteria

The feature is complete when:
- ✅ Programs auto-record completion with UTC timestamp and name snapshot
- ✅ Users can view completion history in calendar format
- ✅ Users can manually add completions for any date/time
- ✅ Users can edit completion datetime
- ✅ Users can delete completions with confirmation
- ✅ Completions are deleted when program is deleted
- ✅ Users can import/export completion data
- ✅ All tests in checklist pass
- ✅ No console errors or warnings
- ✅ Data persists across browser sessions
- ✅ Timezone conversion works correctly

---

## Getting Help

If you encounter issues during implementation:

1. **State machine not working?**
   - Check XState visualizer: https://stately.ai/viz
   - Use console logging in actions/services
   - Verify event types match exactly

2. **LocalForage not saving?**
   - Check browser DevTools → Application → IndexedDB
   - Verify schema validation (Zod errors in console)
   - Check async/await in services

3. **Calendar rendering issues?**
   - Test `getDaysInMonth()` function independently
   - Console log date arrays
   - Check Grid layout in DevTools

4. **Timezone confusion?**
   - Always log both UTC and local versions
   - Test with different timezones (browser DevTools)
   - Verify ISO string format

5. **UI not updating?**
   - Check state machine transitions (console log)
   - Verify useTimerActor() hook usage
   - Check React key props on lists
