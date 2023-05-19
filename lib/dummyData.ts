export interface TimerBlock {
  type: "timer"
  name: string
  seconds: number
}

export interface RepsBlock {
  type: "reps"
  name: string
  reps: number
}

/* export type Block = TimerBlock | RepsBlock */
export type Block = TimerBlock

export interface Program {
  id: string
  name: string
  description: string
  emoji: string
  blocks: Block[]
}

const dummyData: Program[] = [
  /* {
    id: "kaz",
    name: "Knee Ability Zero",
    description: "Knee Ability Zero is a knee rehab program by Ben Patrick",
    emoji: "🦵",
    blocks: [
      { type: "reps", name: "Tibialis Raise", reps: 25 },
      { type: "reps", name: "FHL Calf Raise", reps: 25 },
      { type: "reps", name: "Tibialis Raise (again)", reps: 25 },
      { type: "reps", name: "KOT Calf Raise", reps: 25 },
      { type: "reps", name: "Patrick Step", reps: 25 },
      { type: "reps", name: "ATG Split Squat", reps: 25 },
      { type: "reps", name: "Elephant Walk", reps: 30 },
      { type: "timer", name: "L-Sit", seconds: 60 },
      { type: "timer", name: "Couch Stretch", seconds: 60 },
    ],
  }, */
  {
    id: "yoga",
    name: "Yoga",
    description: "A yoga program that I just made up for the dummy data",
    emoji: "🧘",
    blocks: [
      {
        type: "timer",
        name: "Downward Dog",
        seconds: 5,
      },
      { type: "timer", name: "Upward Dog", seconds: 5 },
      { type: "timer", name: "Cobra", seconds: 5 },
      { type: "timer", name: "Child's Pose", seconds: 5 },
    ],
  },
  {
    id: "athx",
    name: "AthleanX anti-slouch",
    description: "A program to help with slouching by Jeff Cavaliere",
    emoji: "🏋️",
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
  },
]

export default dummyData
