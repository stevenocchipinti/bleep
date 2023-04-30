import { Box, Flex, FlexProps } from "@chakra-ui/react"

interface Block {
  width: number
  percentDone: number
}

interface Props extends FlexProps {
  blocks: Block[]
  animate: boolean
}
const SegmentedProgressBar = ({ blocks, animate, ...props }: Props) => (
  <Flex
    justifyContent="space-between"
    bg="gray.700"
    borderRadius="3xl"
    gap={2}
    p={3}
    {...props}
  >
    {blocks.map((block, index) => (
      <Box
        key={index}
        bg="gray.600"
        position="relative"
        flex={block.width}
        overflow="hidden"
        h={3}
        _first={{
          borderTopLeftRadius: "lg",
          borderBottomLeftRadius: "lg",
        }}
        _last={{
          borderTopRightRadius: "lg",
          borderBottomRightRadius: "lg",
        }}
        _before={{
          content: '""',
          display: "block",
          bg: "teal.300",
          width: "full",
          transition: animate ? "1s linear" : undefined,
          transform: `scaleX(${block.percentDone})`,
          transformOrigin: "left",
          height: 4,
          position: "absolute",
        }}
      />
    ))}
  </Flex>
)

export default SegmentedProgressBar
