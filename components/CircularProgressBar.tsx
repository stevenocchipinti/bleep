import { useRef } from "react"
import { useTheme } from "@chakra-ui/react"

import { CircularProgressbar, buildStyles } from "react-circular-progressbar"
import "react-circular-progressbar/dist/styles.css"

import { useTimerActor } from "lib/useTimerMachine"
import { currentProgramFrom } from "lib/timerMachine"
import { useBlockAnimation, useProgress } from "./useProgress"

/*
 * The coloured arc is always drawn in full. Progress is shown by rotating two
 * trail-coloured covers over it, each clipped to its half of the ring.
 *
 * Animating the arc's stroke-dashoffset runs on the main thread, so it froze
 * and then jumped whenever a tick re-rendered the app. Transforms run on the
 * compositor, which keeps moving regardless.
 */

const CIRCLE_RATIO = 0.75
const ARC_DEGREES = CIRCLE_RATIO * 360
const START_DEGREES = 225 // Clockwise from the top, where the arc begins
const RADIUS = 46 // Centre line of the library's 8 wide stroke, of 100
// Half the width of the trail: a touch wider than the arc, so none of its
// colour bleeds out from under the covers' edges
const HALF_WIDTH = 4.3
const HALF_DEGREES = ARC_DEGREES / 2
// How far a cover turns to be completely out of its half
const HIDDEN_DEGREES = 150
// The second cover tucks its notch under the first, so no seam shows between
const TUCK_DEGREES = 8
const COVER_DEGREES = HIDDEN_DEGREES + TUCK_DEGREES

type Point = [number, number]

/** A point `degrees` along the arc, `radius` from the centre. */
const point = (radius: number, degrees: number): Point => {
  const angle = ((START_DEGREES + degrees) * Math.PI) / 180
  return [50 + radius * Math.sin(angle), 50 - radius * Math.cos(angle)]
}

/** Outline of the trail from `start`, a half arc long, with a round end. */
const clipPath = (start: number) => {
  const end = start + HALF_DEGREES
  const points: Point[] = []
  for (let a = start; a <= end; a += 1.5)
    points.push(point(RADIUS + HALF_WIDTH, a))
  const angle = ((START_DEGREES + end) * Math.PI) / 180
  const [cx, cy] = point(RADIUS, end)
  for (let t = 0; t <= 180; t += 10) {
    const out = HALF_WIDTH * Math.cos((t * Math.PI) / 180)
    const along = HALF_WIDTH * Math.sin((t * Math.PI) / 180)
    points.push([
      cx + out * Math.sin(angle) + along * Math.cos(angle),
      cy - out * Math.cos(angle) + along * Math.sin(angle),
    ])
  }
  for (let a = end; a >= start; a -= 1.5)
    points.push(point(RADIUS - HALF_WIDTH, a))
  return `polygon(${points
    .map(([x, y]) => `${x.toFixed(2)}% ${y.toFixed(2)}%`)
    .join(",")})`
}

/** A band starting at `start`, with a notch that rounds the arc's end. */
const coverPath = (start: number) => {
  const at = (radius: number, degrees: number) =>
    point(radius, degrees)
      .map(n => n.toFixed(3))
      .join(" ")
  const end = start + COVER_DEGREES
  const [outer, inner] = [RADIUS + 6, RADIUS - 6]
  return [
    `M ${at(outer, start)}`,
    `A ${outer} ${outer} 0 0 1 ${at(outer, end)}`,
    `L ${at(inner, end)}`,
    `A ${inner} ${inner} 0 0 0 ${at(inner, start)}`,
    `L ${at(RADIUS - HALF_WIDTH, start)}`,
    `A ${HALF_WIDTH} ${HALF_WIDTH} 0 0 0 ${at(RADIUS + HALF_WIDTH, start)}`,
    "Z",
  ].join(" ")
}

const HALVES = [
  { start: 0, restingDegrees: 0 },
  { start: HALF_DEGREES, restingDegrees: -TUCK_DEGREES },
].map(({ start, restingDegrees }) => ({
  start,
  restingDegrees,
  clipPath: clipPath(start),
  coverPath: coverPath(start),
  rotation: (percentageLeft: number) => {
    const degrees = percentageLeft * ARC_DEGREES - start
    return `rotate(${Math.min(Math.max(degrees, restingDegrees), HIDDEN_DEGREES)}deg)`
  },
}))

// Where each cover starts and stops turning
const BREAKPOINTS = HALVES.flatMap(({ start, restingDegrees }) => [
  (start + restingDegrees) / ARC_DEGREES,
  (start + HIDDEN_DEGREES) / ARC_DEGREES,
])

const TrailCover = ({ half }: { half: (typeof HALVES)[number] }) => {
  const { percentageLeft } = useProgress()
  const theme = useTheme()
  const ref = useRef<HTMLDivElement>(null)

  useBlockAnimation(
    () => ref.current,
    left => ({ transform: half.rotation(left) }),
    BREAKPOINTS,
  )

  return (
    <div style={{ position: "absolute", inset: 0, clipPath: half.clipPath }}>
      <div
        ref={ref}
        style={{
          position: "absolute",
          inset: 0,
          willChange: "transform",
          transform: half.rotation(percentageLeft),
        }}
      >
        <svg viewBox="0 0 100 100" style={{ overflow: "visible" }}>
          <path d={half.coverPath} fill={theme.colors.gray[700]} />
        </svg>
      </div>
    </div>
  )
}

const CircularProgressBar = () => {
  const { state } = useTimerActor()
  const { program } = currentProgramFrom(state.context)
  const { text } = useProgress()

  const theme = useTheme()

  if (!program) return null

  return (
    <div style={{ position: "relative" }}>
      <svg style={{ height: 0, position: "absolute" }}>
        <defs>
          <linearGradient id="circular-progress-bar-gradient">
            <stop offset="0%" stopColor={theme.colors.green[300]} />
            <stop offset="100%" stopColor={theme.colors.teal[300]} />
          </linearGradient>
        </defs>
      </svg>

      <CircularProgressbar
        value={100}
        text={text}
        circleRatio={CIRCLE_RATIO}
        styles={buildStyles({
          rotation: 1 / 2 + 1 / 8,
          trailColor: "transparent",
          pathTransition: "none",
          pathColor: "url(#circular-progress-bar-gradient)",
          textColor: "currentColor",
        })}
      />

      {HALVES.map(half => (
        <TrailCover key={half.start} half={half} />
      ))}
    </div>
  )
}

export default CircularProgressBar
