import { Program, ProgramSchema } from "./types"

const defaultData: Program[] = [
  ProgramSchema.parse({
    id: "water",
    name: "💧 Water Intake",
    description: "Track daily water intake",
    blocks: [],
  }),
  ProgramSchema.parse({
    id: "kaz",
    name: "🦵 Knee Ability Zero",
    description: "Knee Ability Zero is a knee rehab program by Ben Patrick",
    blocks: [
      { type: "pause", name: "Tibialis Raise", reps: 25 },
      { type: "pause", name: "FHL Calf Raise", reps: 25 },
      { type: "pause", name: "Tibialis Raise (again)", reps: 25 },
      { type: "pause", name: "KOT Calf Raise", reps: 25 },
      { type: "pause", name: "Patrick Step", reps: 25 },
      { type: "pause", name: "ATG Split Squat", reps: 25 },
      { type: "pause", name: "Elephant Walk", reps: 30 },
      { type: "timer", name: "L-Sit", seconds: 60 },
      { type: "timer", name: "Couch Stretch", seconds: 60 },
    ],
  }),
  ProgramSchema.parse({
    id: "athx",
    name: "🏋️ AthleanX anti-slouch",
    description: "A program to help with slouching by Jeff Cavaliere",
    blocks: [
      { type: "timer", name: "Supermans", seconds: 30 },
      { type: "timer", name: "Glute march", seconds: 30 },
      { type: "timer", name: "Supermans", seconds: 30 },
      { type: "timer", name: "Glute march", seconds: 30 },
      { type: "timer", name: "Bridge reach over", seconds: 30 },

      { type: "timer", name: "Chair lat stretch reps", seconds: 30 },
      { type: "timer", name: "Wall DL", seconds: 30 },
      { type: "timer", name: "Chair lat stretch reps", seconds: 30 },
      { type: "timer", name: "Wall DL", seconds: 30 },
      { type: "timer", name: "Bridge reach over", seconds: 30 },
    ],
  }),
]

export default defaultData
