import { ChakraProps, chakra, shouldForwardProp } from "@chakra-ui/react"
import { motion, isValidMotionProp } from "framer-motion"
import React from "react"

const LoadingPath = chakra(motion.path, {
  shouldForwardProp: prop => isValidMotionProp(prop) || shouldForwardProp(prop),
})

interface LogoProps extends ChakraProps {
  loading?: boolean
}
const Logo = ({ loading, ...props }: LogoProps) => (
  <chakra.svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 325 325"
    {...props}
  >
    <circle
      cx="162"
      cy="162"
      r="158.5"
      stroke="currentColor"
      strokeWidth="7"
    ></circle>
    <LoadingPath
      animate={loading ? { rotate: [0, 360] } : undefined}
      // @ts-ignore As suggested by chakra's Framer Motion docs
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "linear",
      }}
      style={{ originX: "center" }}
      stroke={loading ? "blue.200" : "currentcolor"}
      strokeLinecap="round"
      strokeWidth="14"
      d="M65 258.874a137.087 137.087 0 0057.135 34.227 137.153 137.153 0 0066.533 3.267 137.11 137.11 0 0060.217-28.466 137.01 137.01 0 0039.681-53.474 136.945 136.945 0 00-12.667-128.541 137.052 137.052 0 00-49.357-44.71A137.13 137.13 0 00161.926 25"
    ></LoadingPath>
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="23"
      d="M156.121 78.181L77.454 156.85M162.357 246.882l78.667-78.667"
    ></path>
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="18"
      d="M117.965 82.976l-37.624 37.623M202.829 241.77l37.624-37.624"
    ></path>
    <path
      stroke="currentColor"
      strokeLinecap="square"
      strokeWidth="12"
      d="M100.843 102.072l119.711 119.711"
    ></path>
  </chakra.svg>
)

export default Logo
