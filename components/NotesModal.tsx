import React, { useState, useEffect } from "react"
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Button,
  Textarea,
} from "@chakra-ui/react"

interface NotesModalProps {
  isOpen: boolean
  onClose: () => void
  notes: string | undefined
  onSave: (notes: string) => void
  blockName?: string
}

const NotesModal = ({
  isOpen,
  onClose,
  notes,
  onSave,
  blockName,
}: NotesModalProps) => {
  const [localNotes, setLocalNotes] = useState(notes || "")

  // Update local state when notes prop changes
  useEffect(() => {
    setLocalNotes(notes || "")
  }, [notes])

  const handleSave = () => {
    onSave(localNotes)
    onClose()
  }

  const handleClose = () => {
    // Reset to original notes on cancel
    setLocalNotes(notes || "")
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <ModalOverlay />
      <ModalContent mx={4}>
        <ModalHeader>
          Edit Block Notes
          {blockName && ` - ${blockName}`}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Textarea
            value={localNotes}
            onChange={e => setLocalNotes(e.target.value)}
            placeholder="Add notes about this block..."
            rows={8}
            resize="vertical"
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={handleClose}>
            Cancel
          </Button>
          <Button colorScheme="blue" onClick={handleSave}>
            Save
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

export default NotesModal
