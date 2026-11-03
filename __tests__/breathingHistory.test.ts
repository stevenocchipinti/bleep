import { isRecordableSession } from "lib/breathingMachine"
import {
  currentStreak,
  historyCaption,
  formatRelativeDay,
  formatSessionLength,
  lastSessionFor,
  weekSummary,
} from "lib/breathingHistory"
import { Completion } from "lib/types"

const now = new Date(2026, 10, 3, 21, 0)

const session = (
  patternId: string,
  daysAgo: number,
  durationSeconds?: number,
): Completion => ({
  id: `${patternId}-${daysAgo}`,
  programId: `breathe:${patternId}`,
  programName: patternId,
  completedAt: new Date(2026, 10, 3 - daysAgo, 20, 0).toISOString(),
  durationSeconds,
})

describe("isRecordableSession", () => {
  it("needs a full cycle and more than a mis-tap", () => {
    expect(isRecordableSession({ cycles: 0, elapsedSeconds: 30 })).toBe(false)
    expect(isRecordableSession({ cycles: 2, elapsedSeconds: 4 })).toBe(false)
    expect(isRecordableSession({ cycles: 1, elapsedSeconds: 9 })).toBe(true)
  })
})

describe("weekSummary", () => {
  it("counts breathing sessions in the last 7 days only", () => {
    const completions = [
      session("4-7-8", 0, 300),
      session("box", 6, 180),
      session("box", 7, 600),
      session("power", 1),
      { ...session("x", 0, 999), programId: "workout" },
    ]
    expect(weekSummary(completions, now)).toEqual({ sessions: 3, seconds: 480 })
  })
})

describe("lastSessionFor", () => {
  it("finds the most recent session of a pattern", () => {
    const completions = [
      session("box", 3),
      session("box", 1),
      session("4-7-8", 0),
    ]
    expect(lastSessionFor(completions, "box")?.id).toBe("box-1")
    expect(lastSessionFor(completions, "power")).toBeUndefined()
  })
})

describe("formatting", () => {
  it("describes days relative to now", () => {
    expect(formatRelativeDay(session("box", 0).completedAt, now)).toBe("today")
    expect(formatRelativeDay(session("box", 1).completedAt, now)).toBe(
      "yesterday",
    )
    expect(formatRelativeDay(session("box", 4).completedAt, now)).toBe(
      "4 days ago",
    )
  })

  it("shows seconds under a minute, then minutes", () => {
    expect(formatSessionLength(45)).toBe("45s")
    expect(formatSessionLength(330)).toBe("6 min")
  })
})

describe("currentStreak", () => {
  it("counts consecutive days ending today", () => {
    const completions = [
      session("box", 0),
      session("box", 1),
      session("box", 2),
    ]
    expect(currentStreak(completions, now)).toBe(3)
  })

  it("keeps yesterday's streak alive until today is over", () => {
    const completions = [session("box", 1), session("box", 2)]
    expect(currentStreak(completions, now)).toBe(2)
  })

  it("breaks on a missed day", () => {
    const completions = [session("box", 0), session("box", 2)]
    expect(currentStreak(completions, now)).toBe(1)
    expect(currentStreak([session("box", 2)], now)).toBe(0)
  })
})

describe("historyCaption", () => {
  it("names each stat's period", () => {
    const completions = [
      session("4-7-8", 0, 300),
      session("box", 1, 120),
      session("box", 2, 120),
    ]
    expect(historyCaption(completions, now)).toBe(
      "9 min this week · 3-day streak",
    )
  })

  it("leaves out a streak of one day", () => {
    expect(historyCaption([session("box", 0, 45)], now)).toBe("45s this week")
  })

  it("shows a quiet week as 0 min", () => {
    expect(historyCaption([session("box", 9, 300)], now)).toBe(
      "0 min this week",
    )
  })

  it("says when there's nothing yet", () => {
    expect(historyCaption([], now)).toBe("No sessions yet")
  })
})
