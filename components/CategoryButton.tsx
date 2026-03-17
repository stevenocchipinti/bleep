import React, { useState, useMemo, useRef, useEffect } from "react"
import {
  Input,
  Box,
  VStack,
  Text,
  useOutsideClick,
  FormControl,
  Button,
  IconButton,
  Flex,
  InputGroup,
  InputRightElement,
} from "@chakra-ui/react"
import { FolderIcon, ArchiveIcon } from "./icons"

interface CategoryButtonProps {
  value?: string
  onChange: (category: string) => void
  allCategories: string[]
}

const CategoryButton = ({
  value = "",
  onChange,
  allCategories,
}: CategoryButtonProps) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [inputValue, setInputValue] = useState(value)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [buttonWidth, setButtonWidth] = useState<number | undefined>(undefined)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const isSelectingSuggestion = useRef(false)

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
        if (!isSelectingSuggestion.current) {
          onChange(inputValue)
        }
        isSelectingSuggestion.current = false
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
    setIsFocused(false)
    setShowSuggestions(false)
    setTimeout(() => {
      setIsExpanded(false)
      onChange(inputValue)
    }, 100)
  }

  const handleInputFocus = () => {
    setIsFocused(true)
    if (suggestions.length > 0) {
      setShowSuggestions(true)
    }
  }

  const handleClear = () => {
    setInputValue("")
    onChange("")
  }

  const handleSuggestionClick = (suggestion: string) => {
    isSelectingSuggestion.current = true
    setInputValue(suggestion)
    onChange(suggestion)
    setShowSuggestions(false)
    setIsExpanded(false)
  }

  const handleArchiveClick = () => {
    setInputValue("Archive")
    onChange("Archive")
  }

  const isArchived = value === "Archive"

  return (
    <FormControl>
      <Flex gap={2} align="center">
        <Box
          transition="all 0.2s ease-in-out"
          flex={isExpanded ? 1 : "0 1 auto"}
          width={isExpanded ? undefined : buttonWidth}
          ref={containerRef}
          position="relative"
          minWidth={0}
        >
          <Box position="relative" height="40px" width="100%">
            {isExpanded ? (
              <Box
                transition="opacity 0.15s ease-in-out"
                opacity={1}
                position="absolute"
                top={0}
                left={0}
                right={0}
              >
                  <InputGroup>
                    <Input
                      ref={inputRef}
                      type="text"
                      placeholder="Category (optional)"
                      value={inputValue}
                      onChange={handleInputChange}
                      onFocus={handleInputFocus}
                      onBlur={handleInputBlur}
                      autoComplete="off"
                      aria-label="Category"
                    />
                    {isFocused && inputValue && (
                      <InputRightElement h="40px">
                        <IconButton
                          aria-label="Clear category"
                          icon={<Text fontSize="lg">×</Text>}
                          size="sm"
                          variant="ghost"
                          onMouseDown={handleClear}
                          opacity={0.6}
                          _hover={{ opacity: 1 }}
                          transition="opacity 0.15s ease-in-out"
                        />
                      </InputRightElement>
                    )}
                  </InputGroup>

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
                  transition="opacity 0.15s ease-in-out"
                  opacity={1}
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
                    aria-label="Edit category"
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
