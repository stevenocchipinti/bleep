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

/*
 * The ring is two half arcs, each rotating into view from behind the edge of
 * its own half. Animating a stroke-dashoffset instead runs on the main thread,
 * so the ring froze and then jumped whenever a tick re-rendered the app;
 * transforms run on the compositor, which keeps moving regardless.
 */
const RING_HALVES = [
  {
    // Fills the right side, clockwise from the top
    clipPath: "inset(0 0 0 50%)",
    path: `M 50 ${50 + RING_RADIUS} A ${RING_RADIUS} ${RING_RADIUS} 0 0 1 50 ${50 - RING_RADIUS}`,
    startsAt: 0,
  },
  {
    // Then the left side, up from the bottom
    clipPath: "inset(0 50% 0 0)",
    path: `M 50 ${50 - RING_RADIUS} A ${RING_RADIUS} ${RING_RADIUS} 0 0 1 50 ${50 + RING_RADIUS}`,
    startsAt: 0.5,
  },
]

/** How far a half has turned into view once the ring is `filled` (0–1). */
const halfRotation = (filled: number, startsAt: number) =>
  `rotate(${Math.min(Math.max((filled - startsAt) * 360, 0), 180)}deg)`
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
  const halfRefs = useRef<(HTMLDivElement | null)[]>([])
  const animationsRef = useRef<Animation[]>([])
  const remainingRef = useRef(secondsRemaining)
  remainingRef.current = secondsRemaining

  const [trail, color] = useToken("colors", ["gray.700", PHASE_COLORS[kind]])

  useEffect(() => {
    const circle = circleRef.current
    if (!circle || typeof circle.animate !== "function") return

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
    const filled = 1 - remaining / totalSeconds
    // Each half only turns for half of the phase, so mark where that changes
    const stops = [filled, ...(filled < 0.5 ? [0.5] : []), 1]

    circle.style.transform = `scale(${start})`
    animationsRef.current.forEach(animation => animation.cancel())
    animationsRef.current = [
      circle.animate(
        [{ transform: `scale(${start})` }, { transform: `scale(${end})` }],
        { duration, easing: "ease-in-out", fill: "forwards" },
      ),
      ...(filled < 1 ? RING_HALVES : []).flatMap(({ startsAt }, index) => {
        const half = halfRefs.current[index]
        if (!half) return []
        return half.animate(
          stops.flatMap(stop =>
            // Hidden until it starts turning, as its ends would otherwise
            // peek out from behind the edge of its half
            (stop === startsAt ? [0, 1] : [stop > startsAt ? 1 : 0]).map(
              opacity => ({
                transform: halfRotation(stop, startsAt),
                opacity,
                offset: (stop - filled) / (1 - filled),
              }),
            ),
          ),
          { duration, easing: "linear", fill: "forwards" },
        )
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
      </Box>

      {RING_HALVES.map(({ clipPath, path }, index) => (
        <Box key={clipPath} position="absolute" inset={0} clipPath={clipPath}>
          <Box
            ref={(el: HTMLDivElement | null) => {
              halfRefs.current[index] = el
            }}
            position="absolute"
            inset={0}
            transform="rotate(0deg)"
            opacity={0}
            willChange="transform, opacity"
          >
            <svg viewBox="0 0 100 100">
              <path
                d={path}
                fill="none"
                stroke={color}
                strokeWidth="1"
                style={{ transition: `stroke ${COLOR_TRANSITION}` }}
              />
            </svg>
          </Box>
        </Box>
      ))}

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
