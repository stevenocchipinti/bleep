import { chakra } from "@chakra-ui/react"

// "vibrate" and "vibrate-off" from Lucide (https://lucide.dev), ISC licence
const VibrateIcon = ({ off, ...props }: { off?: boolean } & any) => (
  <chakra.svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth="1.5"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    <path d="m2 8 2 2-2 2 2 2-2 2" />
    <path d="m22 8-2 2 2 2-2 2 2 2" />
    {off ? (
      <>
        <path d="M8 8v10c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2" />
        <path d="M16 10.34V6c0-.55-.45-1-1-1h-4.34" />
        <line x1="2" x2="22" y1="2" y2="22" />
      </>
    ) : (
      <rect width="8" height="14" x="8" y="5" rx="1" />
    )}
  </chakra.svg>
)

export default VibrateIcon
