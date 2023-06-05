import { DeleteIcon } from "@chakra-ui/icons"
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  VStack,
  Divider,
  FormControl,
  HStack,
  FormLabel,
  Switch,
  Select,
  Flex,
  Textarea,
  Button,
  ModalFooter,
  ModalProps,
  FormErrorMessage,
} from "@chakra-ui/react"
import { useVoices } from "lib/audio"
import { useTimerActor } from "lib/useTimerMachine"
import { useEffect, useState } from "react"

type SettingsModalProps = Omit<ModalProps, "children">
const SettingsModal = ({ isOpen, onClose, ...props }: SettingsModalProps) => {
  const voices = useVoices()

  const { state, send } = useTimerActor()
  const [data, setData] = useState("")
  const { settings } = state.context

  let isValidJson = true
  try {
    JSON.parse(data)
  } catch (e) {
    isValidJson = false
  }

  // TODO: Fix hover styles for the buttons

  useEffect(() => {
    setData(JSON.stringify(state.context.allPrograms))
  }, [state.context.allPrograms, isOpen])

  return (
    <Modal isOpen={isOpen} onClose={onClose} {...props}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Settings</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack spacing={8}>
            <FormControl as={HStack} justifyContent="space-between">
              <FormLabel htmlFor="sound">Sound</FormLabel>
              <Switch
                size="lg"
                id="sound"
                isChecked={settings.soundEnabled}
                onChange={e =>
                  send({
                    type: "SET_SOUND_ENABLED",
                    soundEnabled: e.target.checked,
                  })
                }
              />
            </FormControl>

            <FormControl>
              <FormLabel>Voice</FormLabel>
              <Select
                placeholder="Select voice"
                value={settings.voiceURI || undefined}
                onChange={e =>
                  send({ type: "SET_VOICE", voiceURI: e.target.value })
                }
              >
                {voices.map((voice: SpeechSynthesisVoice) => (
                  <option key={voice.voiceURI} value={voice.voiceURI}>
                    {voice.name} - {voice.lang} {voice.localService || "*"}
                  </option>
                ))}
              </Select>
            </FormControl>

            <Flex direction="column" gap={4} w="full">
              <FormControl isInvalid={!isValidJson}>
                <FormLabel>Data</FormLabel>
                <Textarea
                  value={data}
                  onChange={e => setData(e.target.value)}
                  fontFamily="monospace"
                  fontSize="sm"
                />
                <FormErrorMessage>Invalid JSON</FormErrorMessage>
              </FormControl>
              <Flex gap={4}>
                <Button
                  colorScheme="red"
                  leftIcon={<DeleteIcon />}
                  onClick={() => {
                    console.log("Not implemented yet")
                    // TODO: Confirmation dialog
                    // send({ type: "SET_ALL_PROGRAMS", allPrograms: [] })
                  }}
                >
                  Clear data
                </Button>
                <Button
                  isDisabled={!isValidJson}
                  flex={1}
                  onClick={() => {
                    console.log("Not implemented yet")
                    // send({ type: "SET_ALL_PROGRAMS", allPrograms: ... })
                  }}
                >
                  Import new data
                </Button>
              </Flex>
            </Flex>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button onClick={onClose}>Close</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

export default SettingsModal
