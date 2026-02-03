import { z } from "zod"

const generateId = (length: number) => {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  return Array.from({ length })
    .map(() => characters.charAt(Math.floor(Math.random() * characters.length)))
    .join("")
}

const commonBlockProperties = {
  id: z.string().default(() => generateId(6)),
  name: z.string().nonempty(),
  pronunciation: z.string().optional(),
  disabled: z.boolean().default(false).optional(),
}

export const TimerBlockSchema = z.object({
  ...commonBlockProperties,
  type: z.literal("timer"),
  seconds: z.number().positive().min(1),
  leadSeconds: z.number().nonnegative().default(3),
})

export const PauseBlockSchema = z.object({
  ...commonBlockProperties,
  type: z.literal("pause"),
  reps: z.number().positive().optional(),
})

export const MessageBlockSchema = z.object({
  ...commonBlockProperties,
  type: z.literal("message"),
  message: z.string().nonempty(),
})

export const BlockSchema = z.discriminatedUnion("type", [
  TimerBlockSchema,
  PauseBlockSchema,
  MessageBlockSchema,
])

export const ProgramSchema = z.object({
  id: z.string().default(() => generateId(6)),
  name: z.string().nonempty(),
  description: z.string().default(""),
  category: z.string().optional(),
  blocks: z
    .array(BlockSchema)
    .default([])
    .refine(arr => (arr.length === 0 ? true : arr.some(e => !e.disabled))),
})

export const AllProgramsSchema = z.array(ProgramSchema)

export const HabitSchema = z.object({
  id: z.string().default(() => generateId(6)),
  name: z.string().nonempty(),
  category: z.string().optional(),
})

export const AllHabitsSchema = z.array(HabitSchema)

export const SettingsSchema = z.object({
  voiceURI: z.string().nullable().default(null),
  soundEnabled: z.boolean().default(true),
  voiceRecognitionEnabled: z.boolean().nullable().default(null),
})

export const CompletionSchema = z.object({
  id: z.string().default(() => generateId(6)),
  trackableId: z.string(),
  trackableType: z.enum(["program", "habit"]),
  trackableName: z.string(),
  completedAt: z.string(),
})

export const AllCompletionsSchema = z.array(CompletionSchema)

export type TimerBlock = z.infer<typeof TimerBlockSchema>
export type PauseBlock = z.infer<typeof PauseBlockSchema>
export type MessageBlock = z.infer<typeof MessageBlockSchema>
export type Block = z.infer<typeof BlockSchema>
export type Program = z.infer<typeof ProgramSchema>
export type AllPrograms = z.infer<typeof AllProgramsSchema>
export type Settings = z.infer<typeof SettingsSchema>
export type Habit = z.infer<typeof HabitSchema>
export type AllHabits = z.infer<typeof AllHabitsSchema>
export type Completion = z.infer<typeof CompletionSchema>
export type AllCompletions = z.infer<typeof AllCompletionsSchema>
