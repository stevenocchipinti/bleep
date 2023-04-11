import Head from "next/head"
import { useState, useEffect } from "react"

import { styled, Button, Text } from "@nextui-org/react"

import useWakeLock from "../lib/useWakeLock"
import useTimer from "lib/useTimer"

const Layout = styled("div", {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  gap: "$8",
  padding: "$8",
  justifyContent: "space-between",
  backgroundColor: "$background",
})

const Display = styled("div", {
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  textAlign: "center",
  flex: 1,
})

const Actions = styled("div", {
  display: "flex",
  gap: "$8",
  "& > :last-child": {
    flex: 1,
  },
})

const Textarea = styled("textarea", {
  padding: "$sm $md",
  borderRadius: "$md",
  border: "none",
  flex: 1,
  resize: "none",
})

const Home = () => {
  const {
    timerRunning,
    startTimer,
    stopTimer,
    currentBlockText,
    timerString,
    setBlocksFromText,
    blocksText,
    blocks,
  } = useTimer()

  const {
    wakeLockEnabled,
    wakeLockSupported,
    toggleWakeLock,
    enableWakeLock,
    disableWakeLock,
  } = useWakeLock()

  useEffect(() => {
    timerRunning ? enableWakeLock() : disableWakeLock()
    return disableWakeLock
  }, [timerRunning])

  return (
    <Layout>
      <Display>
        <Text h1>{timerString}</Text>
        <Text h2>{currentBlockText}</Text>
      </Display>

      <Textarea
        placeholder={"10: Rest\n30: Exercise"}
        value={blocksText}
        onChange={e => setBlocksFromText(e.target.value)}
      />

      <Actions>
        <Button
          color={wakeLockSupported && wakeLockEnabled ? "error" : "success"}
          size="xl"
          bordered
          auto
          disabled={!wakeLockSupported}
          onClick={toggleWakeLock}
          css={{ fontSize: "$2xl" }}
          title={
            wakeLockSupported
              ? `Screen WakeLock ${wakeLockEnabled ? "enabled" : "disabled"}`
              : "WakeLock not supported"
          }
        >
          {wakeLockSupported && wakeLockEnabled ? "🔒" : "🔓"}
        </Button>

        <Button
          color="gradient"
          size="xl"
          auto
          disabled={blocks.length === 0}
          onClick={timerRunning ? stopTimer : startTimer}
        >
          {timerRunning ? "Stop" : "Start"}
        </Button>
      </Actions>
    </Layout>
  )
}

export default Home
