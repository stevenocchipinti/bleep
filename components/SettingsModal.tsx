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
} from "@chakra-ui/react"
import { useVoices } from "lib/audio"

type SettingsModalProps = Omit<ModalProps, "children">
const SettingsModal = ({ isOpen, onClose, ...props }: SettingsModalProps) => {
  const voices = useVoices()

  return (
    <Modal isOpen={isOpen} onClose={onClose} {...props}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Settings</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack spacing={8} divider={<Divider />}>
            <FormControl as={HStack} justifyContent="space-between">
              <FormLabel htmlFor="sound">Sound</FormLabel>
              <Switch size="lg" id="sound" defaultChecked />
            </FormControl>

            <VStack spacing={4} w="full">
              <FormControl as={HStack} justifyContent="space-between">
                <FormLabel htmlFor="voice-recognition">
                  Voice recognition
                </FormLabel>
                <Switch size="lg" id="voice-recognition" defaultChecked />
              </FormControl>

              <FormControl>
                <FormLabel hidden>Voice</FormLabel>
                <Select placeholder="Select voice">
                  {voices.map((voice: SpeechSynthesisVoice) => (
                    <option key={voice.voiceURI} value={voice.voiceURI}>
                      {voice.name} - {voice.lang} {voice.localService || "*"}
                    </option>
                  ))}
                </Select>
              </FormControl>
            </VStack>

            <Flex direction="column" gap={4} w="full">
              <FormLabel>Data</FormLabel>
              <Textarea placeholder="The app data goes here" />
              <Flex gap={4}>
                <Button colorScheme="red" leftIcon={<DeleteIcon />}>
                  Clear data
                </Button>
                <Button isDisabled flex={1}>
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
