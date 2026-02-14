import { chakra } from "@chakra-ui/react"

interface CheckIconProps {
  filled?: boolean
  [key: string]: any
}

const CheckIcon = ({ filled = false, ...props }: CheckIconProps) => (
  <chakra.svg
    xmlns="http://www.w3.org/2000/svg"
    fill={filled ? "currentColor" : "none"}
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    {filled ? (
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
    ) : (
      <>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5 13l4 4L19 7"
        />
      </>
    )}
  </chakra.svg>
)

CheckIcon.displayName = "CheckIcon"

export default CheckIcon
