import { useTheme } from "@chakra-ui/react"
import { useState, useEffect } from "react"
import { CircularProgressbar, buildStyles } from "react-circular-progressbar"
import "react-circular-progressbar/dist/styles.css"

interface Props {
  from: number
  to: number
  text: string
}
const CircularProgressBar = ({ from, to, text }: Props) => {
  const [animate, setAnimate] = useState(false)
  const [targetValue, setTargetValue] = useState(from)
  const theme = useTheme()

  useEffect(() => {
    setAnimate(false)
    setTargetValue(from)
    setTimeout(() => {
      setAnimate(true)
      setTargetValue(to)
    }, 10)
  }, [from, to])

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
        value={targetValue}
        text={text}
        circleRatio={0.75}
        styles={buildStyles({
          rotation: 1 / 2 + 1 / 8,
          trailColor: theme.colors.gray[700],
          pathTransition: animate ? "1s linear" : "none",
          pathColor: "url(#circular-progress-bar-gradient)",
          textColor: "currentColor",
        })}
      />
    </div>
  )
}

export default CircularProgressBar
