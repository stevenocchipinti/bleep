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
  name: z.string().min(1),
  disabled: z.boolean().default(false).optional(),
}

export const TimerBlockSchema = z.object({
  ...commonBlockProperties,
  type: z.literal("timer"),
  seconds: z.number().positive().min(1),
})

export const PauseBlockSchema = z.object({
  ...commonBlockProperties,
  type: z.literal("pause"),
  reps: z.number().positive().optional(),
})

export const MessageBlockSchema = z.object({
  ...commonBlockProperties,
  type: z.literal("message"),
  message: z.string().min(1),
})

export const BlockSchema = z.discriminatedUnion("type", [
  TimerBlockSchema,
  PauseBlockSchema,
  MessageBlockSchema,
])

export const ProgramSchema = z.object({
  id: z.string().default(() => generateId(6)),
  name: z.string(),
  description: z.string().default(""),
  emoji: z.string().default("🆕"),
  blocks: z
    .array(BlockSchema)
    .default([])
    .refine(arr => (arr.length === 0 ? true : arr.some(e => !e.disabled))),
})

export type TimerBlock = z.infer<typeof TimerBlockSchema>
export type PauseBlock = z.infer<typeof PauseBlockSchema>
export type MessageBlock = z.infer<typeof MessageBlockSchema>
export type Block = z.infer<typeof BlockSchema>
export type Program = z.infer<typeof ProgramSchema>
