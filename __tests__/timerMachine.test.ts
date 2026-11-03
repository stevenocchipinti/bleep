import { interpret } from "xstate"
import timerMachine from "lib/timerMachine"
import { ProgramSchema } from "lib/types"

jest.mock("lib/audio", () => ({
  playTone: jest.fn(),
  speak: jest.fn(() => Promise.resolve()),
}))

const { speak } = require("lib/audio")

describe("timerMachine each-side pause flow", () => {
  it("announces left, then right, then advances to next block", async () => {
    const program = ProgramSchema.parse({
      name: "Each side program",
      blocks: [
        {
          type: "pause",
          name: "Single-leg RDL",
          reps: 10,
          sequence: "each side",
        },
        {
          type: "message",
          name: "Rest",
          message: "Take a breather",
        },
      ],
    })

    // Override loadData to return our program so machine doesn't hit localforage
    const testMachine = timerMachine.withConfig({
      services: {
        loadData: () => Promise.resolve([program]),
      },
    })

    const service = interpret(testMachine).start()

    // Wait a short tick for loadData to resolve and machine to settle
    await new Promise(r => setTimeout(r, 0))

    // Select the program
    service.send({ type: "SELECT_PROGRAM", id: program.id })

    // Start the program - first block is a pause with each-side
    service.send({ type: "START" })

    // Wait until speak is called for the left side announcement
    await waitForMockCall(() => speak, 1)
    expect(speak.mock.calls[0][0]).toContain("Single-leg RDL")
    expect(speak.mock.calls[0][0]).toContain("10 reps")
    expect(speak.mock.calls[0][0]).toContain("left")

    // Press continue -> should announce right side
    service.send({ type: "CONTINUE" })
    await waitForMockCall(() => speak, 2)
    expect(speak.mock.calls[1][0]).toContain("Single-leg RDL")
    expect(speak.mock.calls[1][0]).toContain("10 reps")
    expect(speak.mock.calls[1][0]).toContain("right")

    // Press continue again -> should advance to next block and announce message
    service.send({ type: "CONTINUE" })
    await waitForMockCall(() => speak, 3)
    expect(speak.mock.calls[2][0]).toContain("Take a breather")

    service.stop()
  })
})

// Helper to wait until a mocked function has been called N times
function waitForMockCall(getMock: () => any, calls = 1, timeout = 2000) {
  return new Promise<void>((resolve, reject) => {
    const start = Date.now()
    ;(function check() {
      try {
        const mock = getMock()
        if (mock && mock.mock && mock.mock.calls.length >= calls) return resolve()
      } catch (e) {}
      if (Date.now() - start > timeout) return reject(new Error("timed out waiting for mock call"))
      setTimeout(check, 5)
    })()
  })
}

describe("timerMachine UPDATE_COMPLETION", () => {
  const completion = {
    id: "abc123",
    programId: "breathe:box",
    programName: "Box Breathing",
    completedAt: "2026-11-02T10:00:00.000Z",
  }

  const startService = async () => {
    const service = interpret(
      timerMachine.withConfig({
        services: {
          loadData: () => Promise.resolve([]),
          loadCompletions: () => Promise.resolve([completion]),
          saveCompletions: () => Promise.resolve(),
        },
      }),
    ).start()
    await new Promise(r => setTimeout(r, 0))
    return service
  }

  it("still updates just the time when only that is given", async () => {
    const service = await startService()
    service.send({
      type: "UPDATE_COMPLETION",
      completionId: "abc123",
      completedAt: "2026-11-02T11:00:00.000Z",
    })
    expect(service.state.context.completions[0]).toEqual({
      ...completion,
      completedAt: "2026-11-02T11:00:00.000Z",
    })
    service.stop()
  })

  it("updates the program and duration, and can clear the duration", async () => {
    const service = await startService()
    service.send({
      type: "UPDATE_COMPLETION",
      completionId: "abc123",
      completedAt: completion.completedAt,
      programId: "breathe:4-7-8",
      programName: "4-7-8 Breathing",
      durationSeconds: 300,
    })
    // Let the save finish; the machine ignores edits while saving
    await new Promise(r => setTimeout(r, 0))
    expect(service.state.context.completions[0]).toMatchObject({
      programId: "breathe:4-7-8",
      programName: "4-7-8 Breathing",
      durationSeconds: 300,
    })

    service.send({
      type: "UPDATE_COMPLETION",
      completionId: "abc123",
      completedAt: completion.completedAt,
      durationSeconds: null,
    })
    expect(service.state.context.completions[0]).not.toHaveProperty(
      "durationSeconds",
    )
    service.stop()
  })
})
