import { useTheme } from "@chakra-ui/react"

type IndicatorState = "empty" | "active" | "completed"

interface SemiCircleProgressProps {
  side: "left" | "right"
  state: IndicatorState
  /** Outer radius of the arc in px */
  size: number
  /** Stroke width of the arc in px */
  strokeWidth: number
  /** Gap angle in degrees between the two semi-circles (at top and bottom) */
  gapAngle?: number
}

/**
 * Renders a semi-circular arc (left or right half) as an SVG path.
 * Designed to be overlaid concentrically around a central element.
 */
const SemiCircleProgress = ({
  side,
  state,
  size,
  strokeWidth,
  gapAngle = 12,
}: SemiCircleProgressProps) => {
  const theme = useTheme()

  const gradientId = `semi-progress-gradient-${side}`
  const activeGradientId = `semi-progress-active-gradient-${side}`

  const radius = (size - strokeWidth) / 2
  const cx = size / 2
  const cy = size / 2

  // Each semi-circle spans (180 - gapAngle) degrees
  const halfGap = gapAngle / 2
  const arcSpan = 180 - gapAngle

  const toRad = (deg: number) => (deg * Math.PI) / 180

  let startAngle: number
  let endAngle: number

  if (side === "left") {
    startAngle = 90 + halfGap
    endAngle = 90 + halfGap + arcSpan
  } else {
    startAngle = 270 + halfGap
    endAngle = 270 + halfGap + arcSpan
  }

  const x1 = cx + radius * Math.cos(toRad(startAngle))
  const y1 = cy + radius * Math.sin(toRad(startAngle))
  const x2 = cx + radius * Math.cos(toRad(endAngle))
  const y2 = cy + radius * Math.sin(toRad(endAngle))

  const largeArc = arcSpan > 180 ? 1 : 0

  const arcPath = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`

  const trailColor = theme.colors.gray[700]

  const getStrokeColor = () => {
    switch (state) {
      case "empty":
        return trailColor
      case "active":
        return `url(#${activeGradientId})`
      case "completed":
        return `url(#${gradientId})`
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ position: "absolute", top: 0, left: 0 }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={theme.colors.green[300]} />
          <stop offset="100%" stopColor={theme.colors.teal[300]} />
        </linearGradient>
        <linearGradient
          id={activeGradientId}
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor={theme.colors.yellow[300]} />
          <stop offset="100%" stopColor={theme.colors.orange[300]} />
        </linearGradient>
      </defs>

      {/* Trail (background arc) */}
      <path
        d={arcPath}
        fill="none"
        stroke={trailColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />

      {/* Progress arc */}
      {state !== "empty" && (
        <path
          d={arcPath}
          fill="none"
          stroke={getStrokeColor()}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          style={{
            transition: "stroke 0.5s ease",
          }}
        />
      )}
    </svg>
  )
}

SemiCircleProgress.displayName = "SemiCircleProgress"
export default SemiCircleProgress
