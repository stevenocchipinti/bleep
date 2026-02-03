import { DeleteIcon } from "@chakra-ui/icons"
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  VStack,
  FormControl,
  HStack,
  FormLabel,
  Switch,
  Select,
  Textarea,
  Text,
  Button,
  ModalFooter,
  ModalProps,
  FormErrorMessage,
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Alert,
  AlertIcon,
  AlertTitle,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Divider,
} from "@chakra-ui/react"
import { useVoices } from "lib/audio"
import { AllPrograms, AllProgramsSchema, AllCompletions, AllCompletionsSchema } from "lib/types"
import { useTimerActor } from "lib/useTimerMachine"
import { useEffect, useRef, useState } from "react"

type SettingsModalProps = Omit<ModalProps, "children">
const SettingsModal = ({ isOpen, onClose, ...props }: SettingsModalProps) => {
  const voices = useVoices()
  const [data, setData] = useState("[]")
  const [completionData, setCompletionData] = useState("[]")
  const [confirmDelete, setConfirmDelete] = useState(false)
  const cancelRef = useRef<any>()

  const { state, send } = useTimerActor()
  const { settings } = state.context

  let allPrograms: AllPrograms = []
  let isValid = false

  try {
    const parsed = AllProgramsSchema.safeParse(JSON.parse(data))
    if (parsed.success) {
      allPrograms = parsed.data
      isValid = true
    }
  } catch (e) {
    // invalid
  }

   let allCompletions: AllCompletions = []
   let isCompletionDataValid = false

   try {
     const parsed = AllCompletionsSchema.safeParse(JSON.parse(completionData))
     if (parsed.success) {
       allCompletions = parsed.data
       isCompletionDataValid = true
     }
   } catch (e) {
     // invalid
   }

   useEffect(() => {
     setData(JSON.stringify(state.context.allPrograms))
   }, [state.context.allPrograms, isOpen])

   useEffect(() => {
     setCompletionData(JSON.stringify(state.context.completions))
   }, [state.context.completions, isOpen])

  return (
    <Modal isOpen={isOpen} onClose={onClose} {...props}>
      <AlertDialog
        isOpen={confirmDelete}
        leastDestructiveRef={cancelRef}
        onClose={() => setConfirmDelete(false)}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent mx={4}>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Restore default data
            </AlertDialogHeader>

            <AlertDialogBody>
              <Alert status="error">
                <AlertIcon />
                <AlertTitle>All current data will be lost!</AlertTitle>
              </Alert>
              <Text mt={4}>
                Are you sure you want to replace the current data with the
                default data?
              </Text>
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={() => {
                  send({ type: "RESET_ALL_PROGRAMS" })
                  setConfirmDelete(false)
                  onClose()
                }}
                ml={3}
              >
                Restore default data
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Settings</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <Tabs isFitted>
            <TabList>
              <Tab>Sound</Tab>
              <Tab>Recognition</Tab>
              <Tab>Data</Tab>
            </TabList>

            <TabPanels>
              <TabPanel>
                <VStack mt={4} spacing={8}>
                  <FormControl as={HStack} justifyContent="space-between">
                    <FormLabel htmlFor="sound">Sound</FormLabel>
                    <Switch
                      size="lg"
                      id="sound"
                      isChecked={settings.soundEnabled}
                      onChange={e =>
                        send({
                          type: "SET_SOUND_ENABLED",
                          enabled: e.target.checked,
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
                          {voice.name} - {voice.lang}{" "}
                          {voice.localService || "*"}
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                </VStack>
              </TabPanel>
              <TabPanel>
                <VStack mt={4} spacing={8}>
                  <FormControl as={HStack} justifyContent="space-between">
                    <FormLabel htmlFor="sound">Voice recognition</FormLabel>
                    <Switch
                      size="lg"
                      id="sound"
                      isChecked={!!settings.voiceRecognitionEnabled}
                      onChange={e =>
                        send({
                          type: "SET_VOICE_RECOGNITION_ENABLED",
                          enabled: e.target.checked,
                        })
                      }
                    />
                  </FormControl>
                </VStack>
              </TabPanel>
               <TabPanel>
                 <VStack mt={4} spacing={8}>
                   {/* Program Data Section */}
                   <VStack spacing={4} w="full" align="start">
                     <Text fontWeight="bold">Program Data</Text>
                     <FormControl isInvalid={!isValid} w="full">
                       <FormLabel>Programs</FormLabel>
                       <Textarea
                         value={data}
                         onChange={e => setData(e.target.value)}
                         fontFamily="monospace"
                         fontSize="sm"
                         rows={6}
                       />
                       <FormErrorMessage>Invalid program data</FormErrorMessage>
                       <Button
                         mt={4}
                         w="full"
                         isDisabled={!isValid}
                         onClick={() => {
                           send({ type: "SET_ALL_PROGRAMS", allPrograms })
                         }}
                       >
                         Import programs
                       </Button>
                     </FormControl>

                     <Button
                       colorScheme="red"
                       leftIcon={<DeleteIcon />}
                       w="full"
                       onClick={() => setConfirmDelete(true)}
                     >
                       Restore default data
                     </Button>
                   </VStack>

                   {/* Divider */}
                   <Divider />

                   {/* Completion History Data Section */}
                   <VStack spacing={4} w="full" align="start">
                     <Text fontWeight="bold">Completion History Data</Text>
                     <FormControl isInvalid={!isCompletionDataValid} w="full">
                       <FormLabel>Completion Data</FormLabel>
                       <Textarea
                         value={completionData}
                         onChange={e => setCompletionData(e.target.value)}
                         fontFamily="monospace"
                         fontSize="sm"
                         rows={6}
                       />
                       <FormErrorMessage>Invalid completion data</FormErrorMessage>
                       <Button
                         mt={4}
                         w="full"
                         isDisabled={!isCompletionDataValid}
                         onClick={() => {
                           send({ type: "SET_ALL_COMPLETIONS", completions: allCompletions })
                         }}
                       >
                         Import completion history
                       </Button>
                     </FormControl>
                   </VStack>
                 </VStack>
               </TabPanel>
            </TabPanels>
          </Tabs>
        </ModalBody>

        <ModalFooter>
          <Button onClick={onClose}>Close</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

export default SettingsModal
