import {
  Button,
  ButtonProps,
  chakra,
  Flex,
  Grid,
  GridItem,
} from "@chakra-ui/react"
import { ReactNode } from "react"
import SwipeableViews from "react-swipeable-views"

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
}
const Header = ({ children, transparent = false }: HeaderProps) => {
  return (
    <Flex
      justifyContent="space-between"
      position="sticky"
      top={0}
      left={0}
      right={0}
      p={3}
      gap={6}
      bg={transparent ? "transparent" : "hsl(220deg 26% 8% / 40%)"}
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
  )
}

const Footer = ({ children }: { children: ReactNode }) => {
  return (
    <Grid
      templateColumns="1fr 1fr 1fr 1fr"
      position="sticky"
      bottom={0}
      left={0}
      right={0}
      justifyContent="center"
      p={5}
      gap={4}
      bg="hsl(220deg 26% 8% / 40%)"
      shadow="0 4px 30px rgba(0, 0, 0, 0.1)"
      backdropFilter="blur(5px)"
      borderTop="1px solid rgba(255, 255, 255, 0.1)"
      borderTopRadius="xl"
      sx={{ WebkitTapHighlightColor: "transparent" }}
    >
      {children}
    </Grid>
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
      px={2}
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
}
const SwipeableChild = ({
  children,
  transparentHeader,
  header,
  footer,
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
    {footer && <Footer>{footer}</Footer>}
  </Flex>
)

export { SwipableParent, SwipeableChild, FooterButton }
