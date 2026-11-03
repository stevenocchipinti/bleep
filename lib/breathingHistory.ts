import { Completion } from "./types"

const PREFIX = "breathe:"
const DAY_MS = 24 * 60 * 60 * 1000

export const breathingProgramId = (patternId: string) => `${PREFIX}${patternId}`

export const isBreathingCompletion = (completion: Completion) =>
  completion.programId.startsWith(PREFIX)

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate())

/** The most recent session of a pattern, if there's been one. */
export const lastSessionFor = (
  completions: Completion[],
  patternId: string,
): Completion | undefined =>
  completions
    .filter(c => c.programId === breathingProgramId(patternId))
    .reduce<Completion | undefined>(
      (latest, c) =>
        !latest || c.completedAt > latest.completedAt ? c : latest,
      undefined,
    )

/** Breathing sessions and total seconds over the last 7 days, including today. */
export const weekSummary = (completions: Completion[], now = new Date()) => {
  const since = startOfDay(now).getTime() - 6 * DAY_MS
  const recent = completions.filter(
    c => isBreathingCompletion(c) && new Date(c.completedAt).getTime() >= since,
  )
  const seconds = recent.reduce((sum, c) => sum + (c.durationSeconds ?? 0), 0)
  return { sessions: recent.length, seconds }
}

/** "today", "yesterday", "3 days ago", or a short date beyond a week. */
export const formatRelativeDay = (iso: string, now = new Date()) => {
  const date = new Date(iso)
  const days = Math.round(
    (startOfDay(now).getTime() - startOfDay(date).getTime()) / DAY_MS,
  )
  if (days <= 0) return "today"
  if (days === 1) return "yesterday"
  if (days < 7) return `${days} days ago`
  return date.toLocaleDateString("en-AU", { day: "numeric", month: "short" })
}

/** "45s" under a minute, otherwise rounded to whole minutes. */
export const formatSessionLength = (seconds: number) =>
  seconds < 60 ? `${seconds}s` : `${Math.round(seconds / 60)} min`

const dayKey = (date: Date) => startOfDay(date).getTime()

/**
 * Consecutive days with at least one breathing session, ending today. A
 * streak from yesterday still counts until today is over.
 */
export const currentStreak = (completions: Completion[], now = new Date()) => {
  const days = new Set(
    completions
      .filter(isBreathingCompletion)
      .map(c => dayKey(new Date(c.completedAt))),
  )
  const today = startOfDay(now)
  const cursor = days.has(today.getTime())
    ? today
    : new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)

  let streak = 0
  while (days.has(cursor.getTime())) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

/** e.g. "42 min this week · 5-day streak", each stat naming its own period. */
export const historyCaption = (completions: Completion[], now = new Date()) => {
  if (!completions.some(isBreathingCompletion)) return "No sessions yet"

  const { seconds } = weekSummary(completions, now)
  const streak = currentStreak(completions, now)
  return [
    `${seconds === 0 ? "0 min" : formatSessionLength(seconds)} this week`,
    streak > 1 && `${streak}-day streak`,
  ]
    .filter(Boolean)
    .join(" · ")
}
