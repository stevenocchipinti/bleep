import { Box, Button } from "@chakra-ui/react"
import { useTimerActor } from "lib/useTimerMachine"
import SemiCircleProgress from "./SemiCircleProgress"

interface ContinueButtonProps {
  /**
   * Whether to show the side indicators (left/right progress rings).
   * When true, currentSide prop should also be provided.
   */
  showSideIndicators?: boolean
  /** Current side being performed (left or right). Only needed when showSideIndicators is true. */
  currentSide?: "left" | "right" | null
  /** Size of the button/ring in pixels. Defaults to 300px. */
  size?: number
}

const ContinueButton = ({
  showSideIndicators = false,
  currentSide = null,
  size = 300,
}: ContinueButtonProps) => {
  const { state, send, is } = useTimerActor()

  // The sequence has been initiated if currentSide is not null
  const sequenceStarted = currentSide !== null

  // Whether we're waiting for user input (after announcement)
  const awaitingInput = is("Awaiting continue")

  // Determine the state for each side indicator
  const getIndicatorState = (
    side: "left" | "right",
  ): "empty" | "active" | "completed" => {
    // If sequence hasn't started, both are empty
    if (!sequenceStarted) {
      return "empty"
    }

    // Left side logic
    if (side === "left") {
      // Left is completed when we've switched to the right side
      if (currentSide === "right") {
        return "completed"
      }
      // Left is active only after announcement completes and we're on left side
      if (currentSide === "left" && awaitingInput) {
        return "active"
      }
    }

    // Right side logic
    if (side === "right") {
      // Right becomes active only after announcement completes and we're on right side
      if (currentSide === "right" && awaitingInput) {
        return "active"
      }
      // Otherwise right stays empty until it becomes active
      // (Don't show completed during announcement)
    }

    // Default: empty
    return "empty"
  }

  const ringSize = size
  const strokeWidth = 10
  const buttonSize = ringSize - strokeWidth * 2 - 20 // gap between arc and button edge
  const gapAngle = 14

  const button = (
    <Button
      onClick={() => send("CONTINUE")}
      isDisabled={!state.can({ type: "CONTINUE" })}
      variant="unstyled"
      borderRadius="50%"
      h={showSideIndicators ? `${buttonSize}px` : "300px"}
      w={showSideIndicators ? `${buttonSize}px` : "300px"}
      fontSize="3xl"
      borderWidth={4}
      borderColor="teal.200"
      bgColor="teal.900"
      _active={{
        bgColor: "teal.600",
      }}
      {...(showSideIndicators
        ? {
            position: "absolute" as const,
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }
        : {
            mx: "auto",
          })}
    >
      Continue
    </Button>
  )

  if (!showSideIndicators) {
    return button
  }

  return (
    <Box
      position="relative"
      mx="auto"
      width={`${ringSize}px`}
      height={`${ringSize}px`}
    >
      {/* Left semi-circle arc */}
      <SemiCircleProgress
        side="left"
        state={getIndicatorState("left")}
        size={ringSize}
        strokeWidth={strokeWidth}
        gapAngle={gapAngle}
      />

      {/* Right semi-circle arc */}
      <SemiCircleProgress
        side="right"
        state={getIndicatorState("right")}
        size={ringSize}
        strokeWidth={strokeWidth}
        gapAngle={gapAngle}
      />

      {/* Continue button centered inside the ring */}
      {button}
    </Box>
  )
}

ContinueButton.displayName = "ContinueButton"
export default ContinueButton
