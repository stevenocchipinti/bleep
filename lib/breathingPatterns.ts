import { z } from "zod"

export const BreathPhaseSchema = z.object({
  label: z.string().nonempty(),
  kind: z.enum(["inhale", "hold", "exhale"]),
  seconds: z.number().positive(),
})

export const BreathPatternSchema = z.object({
  id: z.string().nonempty(),
  name: z.string().nonempty(),
  summary: z.string().nonempty(),
  description: z.string().nonempty(),
  phases: z.array(BreathPhaseSchema).nonempty(),
})

export type BreathPhase = z.infer<typeof BreathPhaseSchema>
export type BreathPattern = z.infer<typeof BreathPatternSchema>

const phase = (
  label: string,
  kind: BreathPhase["kind"],
  seconds: number,
): BreathPhase => ({ label, kind, seconds })

/**
 * A deliberately small set, one per job, so it's obvious which to pick:
 * sleep, everyday focus, acute stress, longer-term calm, and energy.
 * The first pattern is the default.
 */
export const breathingPatterns: BreathPattern[] =
  BreathPatternSchema.array().parse([
    {
      id: "4-7-8",
      name: "4-7-8 Breathing",
      summary: "4 · 7 · 8",
      description:
        "For sleep. The long hold and slow exhale make this the most sedating pattern here, so use it in bed or when your mind is racing at night. Avoid it when you need to stay sharp.",
      phases: [
        phase("Inhale", "inhale", 4),
        phase("Hold", "hold", 7),
        phase("Exhale", "exhale", 8),
      ],
    },
    {
      id: "box",
      name: "Box Breathing",
      summary: "4 · 4 · 4 · 4",
      description:
        "For everyday focus. Equal sides calm you down without making you drowsy, so it suits clearing your head between tasks or steadying yourself before something important.",
      phases: [
        phase("Inhale", "inhale", 4),
        phase("Hold", "hold", 4),
        phase("Exhale", "exhale", 4),
        phase("Hold", "hold", 4),
      ],
    },
    {
      id: "physiological-sigh",
      name: "Physiological Sigh",
      summary: "2 · 1 · 6",
      description:
        "For sudden stress. A double inhale and a long sigh out takes the edge off quicker than anything else here. One to three breaths is enough when you're tense, anxious or angry.",
      phases: [
        phase("Inhale", "inhale", 2),
        phase("Sip", "inhale", 1),
        phase("Exhale", "exhale", 6),
      ],
    },
    {
      id: "coherence",
      name: "Coherence Breathing",
      summary: "5 · 5",
      description:
        "For calm that lasts. Slow, even breaths at six a minute settle your nervous system over time. Practise it for 5 to 10 minutes a day, or use it to recover after exercise.",
      phases: [phase("Inhale", "inhale", 5), phase("Exhale", "exhale", 5)],
    },
    {
      id: "power",
      name: "Power Breathing",
      summary: "1 · 1",
      description:
        "For energy. Fast, punchy breaths wake you up, so use it in the morning or to beat an afternoon slump. Do it sitting down and stop if you feel light-headed.",
      phases: [phase("Inhale", "inhale", 1), phase("Exhale", "exhale", 1)],
    },
  ])

export const defaultPatternId = breathingPatterns[0].id

export const patternById = (id: string): BreathPattern =>
  breathingPatterns.find(pattern => pattern.id === id) ?? breathingPatterns[0]

export const TARGET_OPTIONS: { label: string; value: number | null }[] = [
  { label: "Open", value: null },
  { label: "1 min", value: 60 },
  { label: "3 min", value: 180 },
  { label: "5 min", value: 300 },
  { label: "10 min", value: 600 },
]

/** String keys for target options, for controls that only take strings. */
export const targetKey = (value: number | null) =>
  value === null ? "open" : `${value}`

export const targetFromKey = (key: string) =>
  TARGET_OPTIONS.find(option => targetKey(option.value) === key)?.value ?? null

/**
 * How full the lungs should be (0 = empty, 1 = full) by the end of the phase
 * at `index`, or null for holds, which keep whatever level came before.
 *
 * Consecutive phases of the same kind share the journey, so a double inhale
 * (e.g. the physiological sigh) fills partway and then tops up to full.
 */
export const phaseEndLevel = (
  pattern: BreathPattern,
  index: number,
): number | null => {
  const { phases } = pattern
  const kind = phases[index].kind
  if (kind === "hold") return null

  const count = phases.length
  const at = (i: number) => phases[(i + count) % count]

  let start = index
  while (start - index > -count + 1 && at(start - 1).kind === kind) start--
  let end = index
  while (end - start < count - 1 && at(end + 1).kind === kind) end++

  let total = 0
  let upTo = 0
  for (let i = start; i <= end; i++) {
    total += at(i).seconds
    if (i <= index) upTo += at(i).seconds
  }

  const fraction = upTo / total
  return kind === "inhale" ? fraction : 1 - fraction
}
