import { useEffect, useRef } from "react"
import { Box, Text, useToken } from "@chakra-ui/react"

import { BreathPhase } from "lib/breathingPatterns"

interface BreathingCircleProps {
  /** Changes whenever a new phase begins, so the animation restarts. */
  phaseKey: string
  kind: BreathPhase["kind"]
  /** Target lung level (0–1) for the end of this phase, or null to hold. */
  endLevel: number | null
  secondsRemaining: number
  totalSeconds: number
  status: "idle" | "running" | "paused"
  onToggle: () => void
}

const MIN_SCALE = 0.4
const MAX_SCALE = 1
const RING_RADIUS = 49
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS
const COLOR_TRANSITION = "0.8s ease-in-out"

const PHASE_COLORS: Record<BreathPhase["kind"], string> = {
  inhale: "teal.200",
  hold: "yellow.200",
  exhale: "purple.300",
}

const scaleFor = (level: number) => MIN_SCALE + (MAX_SCALE - MIN_SCALE) * level

const currentScale = (el: HTMLElement) => {
  const matrix = getComputedStyle(el).transform
  if (!matrix || matrix === "none") return MIN_SCALE
  return parseFloat(matrix.slice(matrix.indexOf("(") + 1))
}

/**
 * The circle and ring each animate over the whole phase in one go (rather than
 * per tick), so they land on their targets exactly as the countdown hits zero.
 */
const BreathingCircle = ({
  phaseKey,
  kind,
  endLevel,
  secondsRemaining,
  totalSeconds,
  status,
  onToggle,
}: BreathingCircleProps) => {
  const running = status === "running"
  const circleRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<SVGCircleElement>(null)
  const animationsRef = useRef<Animation[]>([])
  const remainingRef = useRef(secondsRemaining)
  remainingRef.current = secondsRemaining

  const [trail, color] = useToken("colors", ["gray.700", PHASE_COLORS[kind]])

  useEffect(() => {
    const circle = circleRef.current
    const ring = ringRef.current
    if (!circle || !ring || typeof circle.animate !== "function") return

    if (status === "idle") {
      // Back to empty lungs, ready for a fresh start
      animationsRef.current.forEach(animation => animation.cancel())
      animationsRef.current = []
      circle.style.transform = `scale(${MIN_SCALE})`
      return
    }

    if (status === "paused") {
      animationsRef.current.forEach(animation => animation.pause())
      return
    }

    const remaining = remainingRef.current
    const duration = remaining * 1000

    const start = currentScale(circle)
    const end = endLevel === null ? start : scaleFor(endLevel)
    const ringFrom = RING_CIRCUMFERENCE * (remaining / totalSeconds)

    circle.style.transform = `scale(${start})`
    animationsRef.current.forEach(animation => animation.cancel())
    animationsRef.current = [
      circle.animate(
        [{ transform: `scale(${start})` }, { transform: `scale(${end})` }],
        { duration, easing: "ease-in-out", fill: "forwards" },
      ),
      ring.animate([{ strokeDashoffset: ringFrom }, { strokeDashoffset: 0 }], {
        duration,
        easing: "linear",
        fill: "forwards",
      }),
    ]
  }, [phaseKey, endLevel, totalSeconds, status])

  useEffect(
    () => () => animationsRef.current.forEach(animation => animation.cancel()),
    [],
  )

  return (
    <Box
      as="button"
      type="button"
      aria-label={running ? "Pause" : status === "paused" ? "Resume" : "Start"}
      onClick={onToggle}
      position="relative"
      boxSize="min(18rem, 72vw)"
      display="grid"
      placeItems="center"
      flexShrink={0}
      borderRadius="full"
      sx={{ WebkitTapHighlightColor: "transparent" }}
    >
      <Box
        as="svg"
        position="absolute"
        inset={0}
        w="100%"
        h="100%"
        viewBox="0 0 100 100"
      >
        <circle
          cx="50"
          cy="50"
          r={RING_RADIUS}
          fill="none"
          stroke={trail}
          strokeWidth="1"
        />
        <circle
          ref={ringRef}
          cx="50"
          cy="50"
          r={RING_RADIUS}
          fill="none"
          stroke={color}
          strokeWidth="1"
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={RING_CIRCUMFERENCE}
          transform="rotate(-90 50 50)"
          style={{ transition: `stroke ${COLOR_TRANSITION}` }}
        />
      </Box>

      <Box
        ref={circleRef}
        position="absolute"
        boxSize="90%"
        borderRadius="full"
        transform={`scale(${MIN_SCALE})`}
        willChange="transform"
        bg={`${color}26`}
        boxShadow={`inset 0 0 0 2px ${color}`}
        transition={`background-color ${COLOR_TRANSITION}, box-shadow ${COLOR_TRANSITION}`}
      />

      <Text
        position="relative"
        fontSize="5xl"
        fontWeight="thin"
        lineHeight={1}
        opacity={running ? 1 : 0.4}
        transition="opacity 0.3s"
      >
        {secondsRemaining}
      </Text>
    </Box>
  )
}

export default BreathingCircle
