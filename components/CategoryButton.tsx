import React, { useState, useMemo, useRef, useEffect } from "react"
import {
  Input,
  Box,
  VStack,
  Text,
  useOutsideClick,
  FormControl,
  FormLabel,
  Button,
  IconButton,
  Flex,
} from "@chakra-ui/react"
import { motion, AnimatePresence } from "framer-motion"
import { FolderIcon, ArchiveIcon } from "./icons"

interface CategoryButtonProps {
  value?: string
  onChange: (category: string) => void
  allCategories: string[]
  label?: string
}

const CategoryButton = ({
  value = "",
  onChange,
  allCategories,
  label = "Category (optional)",
}: CategoryButtonProps) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [inputValue, setInputValue] = useState(value)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [buttonWidth, setButtonWidth] = useState<number | undefined>(undefined)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Update input when value prop changes (from outside)
  useEffect(() => {
    setInputValue(value)
  }, [value])

  // Measure button width when not expanded
  useEffect(() => {
    if (!isExpanded && buttonRef.current) {
      setButtonWidth(buttonRef.current.offsetWidth)
    }
  }, [isExpanded, value])

  // Calculate matching categories with counts
  const suggestions = useMemo(() => {
    if (!inputValue.trim()) {
      return allCategories.map(cat => ({ name: cat, count: 1 }))
    }

    const lowerInput = inputValue.toLowerCase()
    const matching = allCategories.filter(cat =>
      cat.toLowerCase().includes(lowerInput),
    )

    // Count occurrences of each category
    return matching.map(cat => ({
      name: cat,
      count: allCategories.filter(c => c === cat).length,
    }))
  }, [inputValue, allCategories])

  // Close suggestions when clicking outside
  useOutsideClick({
    ref: containerRef,
    handler: () => {
      setShowSuggestions(false)
      if (isExpanded) {
        setIsExpanded(false)
        onChange(inputValue)
      }
    },
  })

  const handleButtonClick = () => {
    setIsExpanded(true)
    // Focus the input after state updates
    setTimeout(() => {
      inputRef.current?.focus()
    }, 0)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    setShowSuggestions(true)
  }

  const handleInputBlur = () => {
    // Close suggestions immediately
    setShowSuggestions(false)
    // Delay collapse slightly to allow smooth animation
    setTimeout(() => {
      setIsExpanded(false)
      onChange(inputValue)
    }, 100)
  }

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion)
    onChange(suggestion)
    setShowSuggestions(false)
    setIsExpanded(false)
  }

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true)
    }
  }

  const handleArchiveClick = () => {
    setInputValue("Archive")
    onChange("Archive")
  }

  const isArchived = value === "Archive"

  return (
    <FormControl>
      <FormLabel fontSize="sm">{label}</FormLabel>
      <Flex gap={2} align="center">
        <Box
          as={motion.div}
          initial={false}
          animate={{
            flex: isExpanded ? 1 : "0 1 auto",
            width: isExpanded ? undefined : buttonWidth,
          }}
          // @ts-ignore - framer-motion transition
          transition={{
            duration: 0.2,
            ease: "easeInOut",
          }}
          ref={containerRef}
          position="relative"
          minWidth={0}
        >
          <Box position="relative" height="40px" width="100%">
            <AnimatePresence initial={false}>
              {isExpanded ? (
                <Box
                  as={motion.div}
                  key="input"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  // @ts-ignore - framer-motion transition
                  transition={{ duration: 0.1 }}
                  position="absolute"
                  top={0}
                  left={0}
                  right={0}
                >
                  <Input
                    ref={inputRef}
                    type="text"
                    placeholder="Category (optional)"
                    value={inputValue}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    autoComplete="off"
                  />

                  {/* Autocomplete suggestions */}
                  {showSuggestions && suggestions.length > 0 && (
                    <Box
                      position="absolute"
                      top="100%"
                      left={0}
                      right={0}
                      zIndex={10}
                      bg="gray.800"
                      border="1px solid"
                      borderColor="gray.700"
                      borderRadius="md"
                      boxShadow="md"
                      mt={1}
                    >
                      <VStack
                        spacing={0}
                        align="stretch"
                        divider={
                          <Box
                            borderBottom="1px solid"
                            borderColor="gray.700"
                          />
                        }
                      >
                        {suggestions.map(suggestion => (
                          <Box
                            key={suggestion.name}
                            px={3}
                            py={2}
                            cursor="pointer"
                            _hover={{ bg: "gray.700" }}
                            onMouseDown={() =>
                              handleSuggestionClick(suggestion.name)
                            }
                            display="flex"
                            justifyContent="space-between"
                            alignItems="center"
                          >
                            <Text fontSize="sm" color="white">
                              {suggestion.name}
                            </Text>
                            <Text fontSize="xs" color="gray.400">
                              {suggestion.count}
                            </Text>
                          </Box>
                        ))}
                      </VStack>
                    </Box>
                  )}
                </Box>
              ) : (
                <Box
                  as={motion.div}
                  key="button"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  // @ts-ignore - framer-motion transition
                  transition={{ duration: 0.1 }}
                  position="absolute"
                  top={0}
                  left={0}
                  whiteSpace="nowrap"
                >
                  <Button
                    ref={buttonRef}
                    variant="outline"
                    onClick={handleButtonClick}
                    leftIcon={<FolderIcon boxSize={4} />}
                    justifyContent="flex-start"
                    size="md"
                    _hover={{
                      borderColor: "gray.500",
                    }}
                    sx={{
                      "@media(hover: none)": {
                        _hover: {
                          borderColor: "gray.600",
                        },
                        _active: {
                          borderColor: "gray.500",
                        },
                      },
                    }}
                  >
                    <Text color={value ? "whiteAlpha.900" : "gray.500"}>
                      {value || "No category"}
                    </Text>
                  </Button>
                </Box>
              )}
            </AnimatePresence>
          </Box>
        </Box>

        <IconButton
          aria-label="Archive"
          icon={<ArchiveIcon boxSize={5} />}
          variant="outline"
          onClick={handleArchiveClick}
          isDisabled={isArchived}
          opacity={isArchived ? 0.4 : 1}
          cursor={isArchived ? "not-allowed" : "pointer"}
          flexShrink={0}
          _hover={{
            borderColor: isArchived ? "gray.600" : "gray.500",
          }}
          sx={{
            "@media(hover: none)": {
              _hover: {
                borderColor: "gray.600",
              },
              _active: {
                borderColor: isArchived ? "gray.600" : "gray.500",
              },
            },
          }}
        />
      </Flex>
    </FormControl>
  )
}

export default CategoryButton
