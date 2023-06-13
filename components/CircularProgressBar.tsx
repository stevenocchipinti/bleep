import { useTheme } from "@chakra-ui/react"

import { CircularProgressbar, buildStyles } from "react-circular-progressbar"
import "react-circular-progressbar/dist/styles.css"

import { useTimerActor } from "lib/useTimerMachine"
import { currentProgramFrom } from "lib/timerMachine"
import { useProgress } from "./useProgress"

const CircularProgressBar = () => {
  const { state } = useTimerActor()
  const { program } = currentProgramFrom(state.context)
  const { isAnimating, targetPercentage, text } = useProgress()

  const theme = useTheme()

  if (!program) return null

  return (
    <div>
      <svg style={{ height: 0 }}>
        <defs>
          <linearGradient id="circular-progress-bar-gradient">
            <stop offset="0%" stopColor={theme.colors.green[300]} />
            <stop offset="100%" stopColor={theme.colors.teal[300]} />
          </linearGradient>
        </defs>
      </svg>

      <CircularProgressbar
        value={targetPercentage}
        text={text}
        circleRatio={0.75}
        styles={buildStyles({
          rotation: 1 / 2 + 1 / 8,
          trailColor: theme.colors.gray[700],
          pathTransition: isAnimating ? "1s linear" : "none",
          pathColor: "url(#circular-progress-bar-gradient)",
          textColor: "currentColor",
        })}
      />
    </div>
  )
}

export default CircularProgressBar
