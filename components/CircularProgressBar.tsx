import { useRef } from "react"
import { useTheme } from "@chakra-ui/react"

import { CircularProgressbar, buildStyles } from "react-circular-progressbar"
import "react-circular-progressbar/dist/styles.css"

import { useTimerActor } from "lib/useTimerMachine"
import { currentProgramFrom } from "lib/timerMachine"
import { useBlockAnimation, useProgress } from "./useProgress"

const CIRCLE_RATIO = 0.75

// Matches react-circular-progressbar's own dash maths for a given value
const dashOffset = (percentageLeft: number, path: Element) =>
  `${(1 - percentageLeft * CIRCLE_RATIO) * (path as SVGPathElement).getTotalLength()}px`

const CircularProgressBar = () => {
  const { state } = useTimerActor()
  const { program } = currentProgramFrom(state.context)
  const { percentageLeft, text } = useProgress()
  const containerRef = useRef<HTMLDivElement>(null)

  useBlockAnimation(
    () => containerRef.current?.querySelector(".CircularProgressbar-path"),
    (left, path) => ({ strokeDashoffset: dashOffset(left, path) }),
  )

  const theme = useTheme()

  if (!program) return null

  return (
    <div ref={containerRef}>
      <svg style={{ height: 0 }}>
        <defs>
          <linearGradient id="circular-progress-bar-gradient">
            <stop offset="0%" stopColor={theme.colors.green[300]} />
            <stop offset="100%" stopColor={theme.colors.teal[300]} />
          </linearGradient>
        </defs>
      </svg>

      <CircularProgressbar
        value={percentageLeft * 100}
        text={text}
        circleRatio={CIRCLE_RATIO}
        styles={buildStyles({
          rotation: 1 / 2 + 1 / 8,
          trailColor: theme.colors.gray[700],
          pathTransition: "none",
          pathColor: "url(#circular-progress-bar-gradient)",
          textColor: "currentColor",
        })}
      />
    </div>
  )
}

export default CircularProgressBar
