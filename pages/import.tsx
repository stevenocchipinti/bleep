import { useEffect, useState } from "react"
import { Flex, Heading, Text } from "@chakra-ui/react"
import lzString from "lz-string"
import localforage from "localforage"
import { produce } from "immer"
import { ProgramSchema, AllProgramsSchema } from "lib/types"
import Logo from "@/components/Logo"

const Import = () => {
  const [error, setError] = useState(false)

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const data = urlParams.get("data")
    if (data) {
      try {
        const decompressed = lzString.decompressFromEncodedURIComponent(data)
        const decoded = JSON.parse(decompressed)
        delete decoded.id
        const newProgram = ProgramSchema.parse(decoded)

        localforage.getItem("allPrograms").then(programs => {
          const newPrograms = produce(
            AllProgramsSchema.parse(programs),
            draft => {
              if (Object.values(draft).find(p => p.name === newProgram.name)) {
                draft.push({
                  ...newProgram,
                  name: `Copy of ${newProgram.name}`,
                })
              } else {
                draft.push(newProgram)
              }
            }
          )

          localforage.setItem("allPrograms", newPrograms).then(() => {
            window.location.replace(`/?new=${newProgram.id}`)
          })
        })
      } catch {
        setError(true)
        console.error("Invalid data")
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Flex direction="column" h="full" justifyContent="center" gap={16}>
      <Flex px={8} gap={5} justifyContent="center" alignItems="center">
        <Logo h={20} loading={!error} />
        <Heading as="h1" fontSize="7xl" fontFamily="dancing script">
          Bleep!
        </Heading>
      </Flex>

      <Flex direction="column">
        <Heading textAlign="center" mt="4">
          Importing program...
        </Heading>

        {error && (
          <Text mt={8} fontSize="xl" textAlign="center" color="red.400">
            Could not import program!
          </Text>
        )}
      </Flex>
    </Flex>
  )
}

export default Import
