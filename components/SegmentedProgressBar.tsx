import { Box, Flex, FlexProps } from "@chakra-ui/react"

interface Block {
  width: number
  percentDone: number
}

interface Props extends FlexProps {
  currentBlock?: number
  blocks: Block[]
}
const SegmentedProgressBar = ({ blocks, ...props }: Props) => {
  const currentBlock = blocks.reduce(
    (result: number, block: Block, i: number) =>
      block.percentDone > 0 ? i : result,
    0
  )
  return (
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
          bg={block.percentDone === 1 ? "teal.300" : "gray.600"}
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
          _before={
            currentBlock === index
              ? {
                  content: '""',
                  display: "block",
                  bg: "teal.300",
                  width: block.percentDone * 100 + "%",
                  height: 4,
                  position: "absolute",
                }
              : undefined
          }
        />
      ))}
    </Flex>
  )
}

export default SegmentedProgressBar
