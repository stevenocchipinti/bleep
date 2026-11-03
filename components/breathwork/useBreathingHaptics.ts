import { useEffect, useRef } from "react"

import { BreathPhase } from "lib/breathingPatterns"

// The Vibration API is on/off only (no strength control), so direction comes
// from the order of a short and a long pulse: [on, off, on] ms.
const PATTERNS: Record<BreathPhase["kind"], number[]> = {
  inhale: [25, 90, 140], // short then long: going up
  hold: [70], // one even pulse
  exhale: [140, 90, 25], // long then short: going down
}

export const canVibrate = () =>
  typeof navigator !== "undefined" && typeof navigator.vibrate === "function"

const vibrate = (pattern: number | number[]) => {
  if (canVibrate()) navigator.vibrate(pattern)
}

/**
 * Buzzes once at the start of each breathing phase. Pausing and resuming
 * doesn't count as a new phase, so it stays quiet then.
 */
const useBreathingHaptics = ({
  enabled,
  status,
  phaseKey,
  kind,
}: {
  enabled: boolean
  status: "idle" | "running" | "paused"
  /** Changes whenever a new phase begins. */
  phaseKey: string
  kind: BreathPhase["kind"]
}) => {
  const lastPhaseKey = useRef<string | null>(null)

  useEffect(() => {
    if (status !== "running") {
      vibrate(0)
      // A fresh start should buzz for the first inhale again
      if (status === "idle") lastPhaseKey.current = null
      return
    }
    if (phaseKey === lastPhaseKey.current) return
    lastPhaseKey.current = phaseKey
    if (enabled) vibrate(PATTERNS[kind])
  }, [enabled, status, phaseKey, kind])

  useEffect(() => {
    if (!enabled) vibrate(0)
  }, [enabled])

  useEffect(() => () => vibrate(0), [])
}

export default useBreathingHaptics
