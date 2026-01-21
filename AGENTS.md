# Agent Guide for Bleep

This guide is for AI coding agents working in the Bleep codebase - an exercise timer PWA built with Next.js, TypeScript, Chakra UI, and XState.

## Build, Lint & Test Commands

### Development
```bash
yarn dev              # Start dev server at http://localhost:3000
yarn build            # Production build
yarn start            # Start production server
```

### Testing
```bash
yarn test             # Run tests in watch mode
yarn test:ci          # Run tests once (CI mode)

# Run single test file
yarn test __tests__/index.test.tsx

# Run tests matching pattern
yarn test --testNamePattern="renders a heading"

# Update snapshots
yarn test -u

# Coverage report
yarn test:ci --coverage
```

### Linting
```bash
npx eslint .          # Lint all files
npx prettier --check . # Check formatting
npx prettier --write . # Format all files
```

## Project Structure

```
bleep/
├── components/       # Reusable React components
│   ├── icons/        # SVG icon components (barrel exports)
│   └── *.tsx         # UI components (CardButton, Chip, etc.)
├── lib/              # Core logic and utilities
│   ├── timerMachine.ts    # Main XState state machine
│   ├── types.ts           # Zod schemas + TypeScript types
│   ├── useTimerMachine.tsx # React provider + hooks
│   └── audio.ts           # Audio/speech utilities
├── screens/          # Full-screen page views
│   ├── HomeScreen.tsx     # Program list view
│   ├── ConfigScreen.tsx   # Program editor
│   └── TimerScreen.tsx    # Timer display
├── pages/            # Next.js pages
│   ├── _app.tsx      # App wrapper + Chakra theme
│   └── index.tsx     # Main app page
└── __tests__/        # Jest tests
```

## Code Style Guidelines

### Formatting & Linting
- **Prettier**: `semi: false`, `arrowParens: avoid`
- **ESLint**: Extends `next/core-web-vitals`
- **No semicolons** at end of statements
- **No parens** for single-parameter arrow functions (e.g., `x => x * 2`)

### TypeScript
- **Strict mode enabled** - all types must be explicit
- **Use Zod schemas** for runtime validation and type inference
- **Naming conventions**:
  - Schemas: `{EntityName}Schema` (e.g., `ProgramSchema`)
  - Types: `type {EntityName} = z.infer<typeof {EntityName}Schema>`
  - Props: `interface {ComponentName}Props`

**Example:**
```typescript
export const TimerBlockSchema = z.object({
  type: z.literal("timer"),
  seconds: z.number().positive().min(1),
})

export type TimerBlock = z.infer<typeof TimerBlockSchema>
```

### Imports
- **Use path aliases** for cross-module imports:
  ```typescript
  import { useTimerActor } from "@/lib/useTimerMachine"
  import { ErrorChip } from "@/components/Chip"
  ```
- **Use relative imports** within same directory:
  ```typescript
  import { useProgress } from "./useProgress"
  import { PlayIcon } from "./icons"
  ```
- **Import order** (implicit convention):
  1. External libraries (React, Next.js, etc.)
  2. Chakra UI components
  3. Path alias imports (`@/...`)
  4. Relative imports (`./...`)

### Components
- **Functional components only** (no class components)
- **Default exports** for components
- **Set displayName** for debugging (e.g., `CardButton.displayName = "CardButton"`)
- **Props interface** defined above component with `{ComponentName}Props` pattern
- **Use Chakra UI** for styling (no CSS modules or inline styles)
- **ForwardRef** for interactive components that need DOM refs

**Example:**
```typescript
interface CardButtonProps {
  id: string
  text: string
  disabled?: boolean
  onClick?: React.MouseEventHandler<unknown>
}

const CardButton = ({ id, text, disabled, onClick }: CardButtonProps) => {
  return (
    <Card onClick={onClick}>
      <CardBody>{text}</CardBody>
    </Card>
  )
}

CardButton.displayName = "CardButton"
export default CardButton
```

### Hooks
- **Custom hooks** in separate files (e.g., `useTimerMachine.tsx`, `useProgress.tsx`)
- **Named exports** for hooks
- **Prefix with `use`** (e.g., `useWakeLock`, `useProgress`)

### State Management (XState)
- **Single state machine** at app root (`timerMachine.ts`)
- **Provider pattern** wrapping app in `_app.tsx` (`TimerProvider`)
- **Use discriminated unions** for events and states
- **Access via hooks**: `useTimerActor()` from `@/lib/useTimerMachine`

### Type Patterns
- **Discriminated unions** for variant types:
  ```typescript
  export const BlockSchema = z.discriminatedUnion("type", [
    TimerBlockSchema,   // type: "timer"
    PauseBlockSchema,   // type: "pause"
    MessageBlockSchema, // type: "message"
  ])
  ```
- **Omit patterns** for extending component props:
  ```typescript
  type SettingsModalProps = Omit<ModalProps, "children">
  ```

### Naming Conventions
- **Components**: PascalCase (e.g., `CardButton.tsx`, `SettingsModal.tsx`)
- **Utilities/Hooks**: camelCase (e.g., `useTimerMachine.tsx`, `audio.ts`)
- **Test files**: `[name].test.tsx` or `[name].spec.tsx`
- **Type files**: `types.ts` or `types.d.ts`

### Error Handling
- **Validate with Zod** schemas before processing data
- **Handle optional values** with TypeScript optional chaining (`?.`)
- **Nullable vs undefined**: Use nullable for explicit "no value" (`z.nullable()`)

### Testing
- **Use Testing Library** with semantic queries:
  - Prefer `getByRole`, `getByLabelText`, `getByPlaceholderText`
  - Avoid `getByTestId` unless necessary
- **Test user behavior**, not implementation details
- **Pattern**:
  ```typescript
  import { render, screen } from '@testing-library/react'
  
  it('renders a heading', () => {
    render(<Component />)
    const heading = screen.getByRole('heading', { name: /text/i })
    expect(heading).toBeInTheDocument()
  })
  ```

## Key Technologies
- **Next.js** (latest) - React framework
- **TypeScript 4.9.5** - Type safety
- **Chakra UI v2.5.5** - Component library
- **XState v4.37.2** - State machines
- **Zod v3.21.4** - Runtime validation
- **Jest + Testing Library** - Testing
- **@dnd-kit** - Drag and drop
- **next-pwa** - Progressive Web App

## Best Practices
1. **Always validate data** with Zod schemas when importing/parsing
2. **Use Chakra UI theme** for consistent styling (defined in `_app.tsx`)
3. **Keep components focused** - one responsibility per component
4. **Colocate related code** - group by feature, not by type
5. **Export barrel files** for icon collections (see `components/icons/index.ts`)
6. **Use XState machine** for complex state - don't add more state libraries
7. **Leverage browser APIs**: Web Audio, Speech Synthesis, Wake Lock
8. **PWA-first**: Assume offline-first, local storage via LocalForage

## Common Patterns

### Accessing State Machine
```typescript
import { useTimerActor } from "@/lib/useTimerMachine"

const [state, send] = useTimerActor()
const currentProgram = state.context.currentProgram
send({ type: "START" })
```

### Creating New Components
1. Create in `components/` for reusable, `screens/` for full-page
2. Define props interface with `{Name}Props` pattern
3. Use Chakra UI components for layout and styling
4. Set displayName for debugging
5. Export as default

### Adding New Block Types
1. Define schema in `lib/types.ts` with discriminated union
2. Update `BlockSchema` union
3. Add UI components in `components/`
4. Update state machine in `lib/timerMachine.ts`
