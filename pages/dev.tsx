import { styled } from "@nextui-org/react";
import React, { useState } from "react";
import SwipeableViews from "react-swipeable-views";

const Slide = styled("div", {
  minHeight: "100px",
  padding: "1rem",
});

const Layout = styled("div", {
  display: "flex",
  flexDirection: "column",
  height: "100%",
});

const Header = styled("header", {
  fontSize: "1.5rem",
  padding: "1rem",
});

const SwipableBody = styled(SwipeableViews, {
  flexGrow: 1,
  overflow: "hidden",
  "& > *": {
    height: "100%",
  },
  "& > * > * > *": {
    height: "100%",
  },
});

const Nav = styled("nav", {
  display: "flex",
  justifyContent: "space-evenly",
  padding: "1rem 0",
  fontSize: "1.5rem",
  "& > button": {
    width: 50,
  },
});

const Button = styled("button", {
  backgroundColor: "transparent",
  border: "none",
  variants: {
    active: {
      true: {
        borderBottom: "2px solid",
      },
    },
  },
});

function Dev() {
  const [index, setIndex] = useState(0);

  return (
    <Layout>
      <Header>Bleep</Header>

      <SwipableBody
        index={index}
        onChangeIndex={(i) => setIndex(i)}
        enableMouseEvents
      >
        <Slide>slide n°1</Slide>
        <Slide>slide n°2</Slide>
        <Slide>slide n°3</Slide>
      </SwipableBody>

      <Nav>
        <Button onClick={() => setIndex(0)} active={index === 0}>
          0
        </Button>
        <Button onClick={() => setIndex(1)} active={index === 1}>
          1
        </Button>
        <Button onClick={() => setIndex(2)} active={index === 2}>
          2
        </Button>
      </Nav>
    </Layout>
  );
}

export default Dev;
