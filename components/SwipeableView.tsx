import {
  Button,
  ButtonProps,
  chakra,
  Collapse,
  Flex,
  Grid,
  GridItem,
} from "@chakra-ui/react"
import { ReactNode } from "react"
import SwipeableViews from "react-swipeable-views"
import SegmentedProgressBar from "./SegmentedProgressBar"
import { MicrophoneIcon } from "./icons"
import { motion } from "framer-motion"
import { useTimerActor } from "lib/useTimerMachine"

const MotionFlex = motion(Flex)

const SwipableParent = chakra(SwipeableViews, {
  baseStyle: {
    flexGrow: 1,
    overflow: "hidden",
    "& > *": {
      height: "100%",
    },
    "& > * > * > *": {
      height: "100%",
    },
  },
})

interface HeaderProps {
  children: ReactNode
  transparent?: boolean
  listening?: boolean
}
const Header = ({ children, transparent = false }: HeaderProps) => {
  const { state, send } = useTimerActor()
  const isListening = state.matches({ "voice recognition": "listening" })

  return (
    <div>
      <Flex
        justifyContent="space-between"
        position="sticky"
        top={0}
        left={0}
        right={0}
        p={3}
        gap={6}
        bg={transparent ? "transparent" : "blackAlpha.300"}
        shadow={transparent ? "transparent" : "0 4px 30px rgba(0, 0, 0, 0.1)"}
        backdropFilter="blur(5px)"
        borderBottom={
          transparent ? "transparent" : "1px solid rgba(255, 255, 255, 0.1)"
        }
        zIndex={1}
        sx={{ WebkitTapHighlightColor: "transparent" }}
      >
        {children}
      </Flex>
      <Collapse in={isListening} animateOpacity>
        <Flex
          alignItems="center"
          justifyContent="center"
          p={2}
          color="black"
          bg="yellow.500"
          onClick={() =>
            isListening ? send("STOP_LISTENING") : send("START_LISTENING")
          }
        >
          <MicrophoneIcon height="1rem" />️ Listening for continue or next
        </Flex>
      </Collapse>
    </div>
  )
}

const Footer = ({
  children,
  showProgress,
}: {
  children: ReactNode
  showProgress?: boolean
}) => {
  return (
    <Flex direction="column" position="sticky" bottom={0} left={0} right={0}>
      {showProgress && <SegmentedProgressBar />}
      <Grid
        templateColumns="1fr 1fr 1fr 1fr"
        justifyContent="center"
        p={5}
        gap={4}
        bg="blackAlpha.300"
        backdropFilter="blur(5px)"
        shadow="0 4px 30px rgba(0, 0, 0, 0.1)"
        borderTop={showProgress ? "none" : "1px solid rgba(255, 255, 255, 0.1)"}
        sx={{ WebkitTapHighlightColor: "transparent" }}
      >
        {children}
      </Grid>
    </Flex>
  )
}

interface FooterButtonProps extends ButtonProps {
  span?: number
}
const FooterButton = ({ children, span, ...props }: FooterButtonProps) => (
  <GridItem colSpan={span || 1}>
    <Button
      width="full"
      colorScheme="teal"
      size="lg"
      borderRadius="xl"
      px={6}
      {...props}
    >
      {children}
    </Button>
  </GridItem>
)

interface SwipeableChildProps {
  children: ReactNode
  transparentHeader?: ReactNode
  header?: ReactNode
  footer?: ReactNode
  showProgress?: boolean
}
const SwipeableChild = ({
  children,
  transparentHeader,
  header,
  footer,
  showProgress,
}: SwipeableChildProps) => (
  <Flex
    direction="column"
    justifyContent="space-between"
    gap={4}
    position="relative"
  >
    {header && <Header>{header}</Header>}
    {transparentHeader && <Header transparent>{transparentHeader}</Header>}
    {children}
    {footer && <Footer showProgress={showProgress}>{footer}</Footer>}
  </Flex>
)

export { SwipableParent, SwipeableChild, FooterButton }
