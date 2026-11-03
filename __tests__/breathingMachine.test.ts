import { interpret } from "xstate"

import breathingMachine from "lib/breathingMachine"
import { patternById, phaseEndLevel } from "lib/breathingPatterns"

const startedService = () =>
  interpret(
    breathingMachine.withConfig({
      services: { ticker: () => () => {} },
    }),
  ).start()

const tick = (
  service: ReturnType<typeof startedService>,
  times: number = 1,
) => {
  for (let i = 0; i < times; i++) service.send({ type: "TICK" })
}

describe("breathingMachine", () => {
  it("advances through phases and counts completed cycles", () => {
    const service = startedService()
    service.send({ type: "SET_PATTERN", patternId: "box" })
    service.send({ type: "START" })

    expect(service.state.context.phaseIndex).toBe(0)
    expect(service.state.context.phaseSecondsRemaining).toBe(4)

    // Finishing the inhale moves on to the first hold
    tick(service, 4)
    expect(service.state.context.phaseIndex).toBe(1)
    expect(service.state.context.phaseSecondsRemaining).toBe(4)

    // Completing the remaining phases wraps back to the start
    tick(service, 12)
    expect(service.state.context.phaseIndex).toBe(0)
    expect(service.state.context.cycles).toBe(1)

    service.stop()
  })

  it("completes once the target is reached", () => {
    const service = startedService()
    service.send({ type: "SET_PATTERN", patternId: "box" })
    service.send({ type: "SET_TARGET", targetSeconds: 2 })
    service.send({ type: "START" })

    tick(service, 1)
    expect(service.state.value).toBe("running")

    tick(service, 1)
    expect(service.state.value).toBe("complete")
    expect(service.state.context.elapsedSeconds).toBe(2)

    service.stop()
  })

  it("pauses and resumes", () => {
    const service = startedService()
    service.send({ type: "SET_PATTERN", patternId: "box" })
    service.send({ type: "START" })

    service.send({ type: "PAUSE" })
    expect(service.state.value).toBe("paused")

    service.send({ type: "RESUME" })
    expect(service.state.value).toBe("running")

    service.stop()
  })
})

describe("breathingMachine stop", () => {
  it("resets progress so the next session starts fresh", () => {
    const service = startedService()
    service.send({ type: "SET_PATTERN", patternId: "box" })
    service.send({ type: "START" })
    tick(service, 6)
    service.send({ type: "STOP" })

    expect(service.state.value).toBe("idle")
    expect(service.state.context).toMatchObject({
      phaseIndex: 0,
      phaseSecondsRemaining: 4,
      elapsedSeconds: 0,
      cycles: 0,
    })

    service.stop()
  })
})

describe("phaseEndLevel", () => {
  it("fills on inhale, empties on exhale and keeps the level on holds", () => {
    const box = patternById("box")
    expect(box.phases.map((_, i) => phaseEndLevel(box, i))).toEqual([
      1,
      null,
      0,
      null,
    ])
  })

  it("shares consecutive inhales across a single fill", () => {
    const sigh = patternById("physiological-sigh")
    expect(phaseEndLevel(sigh, 0)).toBeCloseTo(2 / 3)
    expect(phaseEndLevel(sigh, 1)).toBe(1)
    expect(phaseEndLevel(sigh, 2)).toBe(0)
  })
})

describe("sessionEnded", () => {
  it("fires with the finished session before progress resets", () => {
    const ended: number[] = []
    const service = interpret(
      breathingMachine.withConfig({
        services: { ticker: () => () => {} },
        actions: {
          sessionEnded: context => ended.push(context.elapsedSeconds),
        },
      }),
    ).start()

    service.send({ type: "START" })
    tick(service, 7)
    service.send({ type: "PAUSE" })
    service.send({ type: "STOP" })
    expect(ended).toEqual([7])

    service.send({ type: "SET_TARGET", targetSeconds: 3 })
    service.send({ type: "START" })
    tick(service, 3)
    expect(service.state.value).toBe("complete")
    expect(ended).toEqual([7, 3])

    service.stop()
  })
})
