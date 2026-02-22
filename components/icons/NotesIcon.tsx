import { chakra, Box } from "@chakra-ui/react"

interface NotesIconProps {
  hasNotes?: boolean
  [key: string]: any
}

const NotesIcon = ({ hasNotes, ...props }: NotesIconProps) => (
  <Box position="relative" display="inline-flex">
    <chakra.svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 48 48"
      {...props}
    >
      {/* Icon from IconPark Outline by ByteDance - https://github.com/bytedance/IconPark/blob/master/LICENSE */}
      <g
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="4"
      >
        <path d="M8 6a2 2 0 0 1 2-2h20l10 10v28a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2z" />
        <path strokeLinecap="round" d="M16 20h16m-16 8h16" />
      </g>
    </chakra.svg>
    {hasNotes && (
      <Box
        position="absolute"
        top="-2px"
        right="-2px"
        width="8px"
        height="8px"
        borderRadius="full"
        backgroundColor="blue.500"
      />
    )}
  </Box>
)

export default NotesIcon
