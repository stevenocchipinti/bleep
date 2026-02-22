# Habit → Program Refactor Plan

**Created:** 2026-02-22

## Goal

Remove the separate `Habit` type entirely. A program with `blocks: []` is treated
as a "habit". All `Habit`-specific code is deleted, and the UI adapts based on
`blocks.length`. This eliminates a large amount of duplicated logic.

---

## Breaking Changes

| Key | Impact | Handled by |
|-----|--------|-----------|
| `"habits"` LocalForage key | Abandoned, data lost | No migration (habits become programs with `blocks: []`) |
| `"completions"` LocalForage key | Field renames make old data incompatible | One-time `migrateCompletions()` function on load |

---

## Decisions

- **No "New habit" button** — removed. `NEW_PROGRAM` defaults to `blocks: []`.
- **ConfigScreen footer** — when `blocks.length === 0`, replace "Go" with a
  "Mark complete" / "Completed today" toggle in the same slot (`variant="brand"`).
  Tapping again un-marks. When `blocks.length > 0`, show "Go" as normal.
- **Home screen toggle** — `TOGGLE_PROGRAM_COMPLETION` accepts a `{ programId }`
  payload directly (no need to select the program first).
- **Completion records** — empty-block programs write an identical completion
  record shape to timed programs, just with no block data.
- **Completions migration** — use a named `migrateCompletions()` function (see
  below) for easy removal later. Falls back to `[]` if validation still fails
  after migration.
- **`trackableType` removed** — not kept even as `z.literal("program")`.

---

## Schema Changes (`lib/types.ts`)

### Delete entirely
- `HabitSchema`
- `AllHabitsSchema`
- `Habit` type
- `AllHabits` type

### `CompletionSchema` field renames
- `trackableId` → `programId`
- `trackableName` → `programName`
- `trackableType` — **removed entirely**

---

## Implementation Steps

### 1. `lib/types.ts`
- Delete `HabitSchema`, `AllHabitsSchema`, `Habit`, `AllHabits`
- Rename `trackableId` → `programId`, `trackableName` → `programName` in `CompletionSchema`
- Remove `trackableType` from `CompletionSchema`

### 2. `lib/timerMachine.ts`
- Remove from context: `allHabits`, `selectedHabitId`
- Remove all habit events: `ADD_HABIT`, `DELETE_HABIT`, `UPDATE_HABIT`,
  `SET_SELECTED_HABIT_ID`, `SET_ALL_HABITS`, `TOGGLE_HABIT_COMPLETION`
- Remove habits parallel state region (~70 lines)
- Remove `loadHabits` and `saveHabits` services
- Remove `currentHabitFrom()` helper export
- Delete old migration line: `localforage.removeItem("programCompletions")`
- In `loadCompletions`: switch to `safeParse`, call `migrateCompletions()` first
- Add standalone `migrateCompletions()` function (see template below)
- Update `NEW_PROGRAM` action default to `blocks: []`
- Update `FINISH_PROGRAM` completion-recording action to use `programId`/`programName`
- Add `TOGGLE_PROGRAM_COMPLETION` event accepting `{ programId: string }`:
  - Looks up program by id from `allPrograms`
  - If a completion exists for today → removes it
  - Otherwise → adds one

#### `migrateCompletions` template

```ts
/**
 * TEMPORARY MIGRATION — added 2026-02-22
 *
 * Renames old completion fields to new names introduced in the habit→program
 * refactor. Safe to remove once this has been in the wild for a while and
 * users are unlikely to still have the old data format in LocalForage.
 *
 * Old shape: { trackableId, trackableName, trackableType, ... }
 * New shape: { programId, programName, ... }
 */
function migrateCompletions(data: unknown[]): unknown[] {
  return data.map(c => {
    if (c && typeof c === "object" && "trackableId" in c) {
      const { trackableId, trackableName, trackableType, ...rest } = c as any
      return { ...rest, programId: trackableId, programName: trackableName }
    }
    return c
  })
}
```

### 3. `components/CardButton.tsx`
- Replace `trackableType?: "program" | "habit"` prop with `showCompletionToggle?: boolean`
- Render inner toggle button when `showCompletionToggle === true`

### 4. `components/CompletionHeatmap.tsx`
- Rename `trackableId` → `programId` in filter logic and any prop references

### 5. `components/CompletionHistoryModal.tsx`
- Rename `trackableId` → `programId`, `trackableName` → `programName` throughout
- Remove any `trackableType` filtering/references

### 6. `screens/HomeScreen.tsx`
- Delete `Trackable` discriminated union; use `Program[]` everywhere
- Collapse two drag-and-drop branches into one using `SET_ALL_PROGRAMS`
- Pass `showCompletionToggle={program.blocks.length === 0}` to `CardButton`
- On inner button press: send `TOGGLE_PROGRAM_COMPLETION` with `{ programId: program.id }`
- Remove `allHabits` selector usage
- Update completion filter to use `programId` instead of `trackableId`

### 7. `screens/ConfigScreen.tsx`
- Footer: when `selectedProgram.blocks.length === 0`, render "Mark complete" /
  "Completed today" toggle (`variant="brand"`); otherwise render "Go"
- Toggle reads from `completions` whether today already has a record for this program
- Tapping toggle sends `TOGGLE_PROGRAM_COMPLETION` with current program's id
- Remove `allHabits` selector (was only used for category deduplication)
- Remove any helper text shown for empty-block programs

### 8. `pages/index.tsx`
- Remove habit-related state/selectors (`allHabits`, `currentHabit`, habit guards)
- Remove `HabitConfigScreen` import and rendering branch
- Slide 1 always renders `ConfigScreen`

### 9. Delete `screens/HabitConfigScreen.tsx`

---

## Files Modified

| File | Action |
|------|--------|
| `lib/types.ts` | Modify |
| `lib/timerMachine.ts` | Modify |
| `components/CardButton.tsx` | Modify |
| `components/CompletionHeatmap.tsx` | Modify |
| `components/CompletionHistoryModal.tsx` | Modify |
| `screens/HomeScreen.tsx` | Modify |
| `screens/ConfigScreen.tsx` | Modify |
| `pages/index.tsx` | Modify |
| `screens/HabitConfigScreen.tsx` | **Delete** |
