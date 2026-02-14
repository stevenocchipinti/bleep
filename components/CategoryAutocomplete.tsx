import React, { useState, useMemo, useRef, useEffect } from "react"
import {
  Input,
  Box,
  VStack,
  Text,
  useOutsideClick,
  FormControl,
  FormLabel,
} from "@chakra-ui/react"

interface CategoryAutocompleteProps {
  value?: string
  onChange: (category: string) => void
  allCategories: string[]
  label?: string
}

const CategoryAutocomplete = ({
  value = "",
  onChange,
  allCategories,
  label = "Category (optional)",
}: CategoryAutocompleteProps) => {
  const [inputValue, setInputValue] = useState(value)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Update input when value prop changes (from outside)
  useEffect(() => {
    setInputValue(value)
  }, [value])

  // Calculate matching categories with counts
  const suggestions = useMemo(() => {
    if (!inputValue.trim()) {
      return allCategories.map(cat => ({ name: cat, count: 1 }))
    }

    const lowerInput = inputValue.toLowerCase()
    const matching = allCategories.filter(cat =>
      cat.toLowerCase().includes(lowerInput)
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
    handler: () => setShowSuggestions(false),
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    setShowSuggestions(true)
    // Debounced save happens in parent component
  }

  const handleInputBlur = () => {
    // Save on blur
    onChange(inputValue)
    setShowSuggestions(false)
  }

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion)
    onChange(suggestion)
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true)
    }
  }

  return (
    <FormControl ref={containerRef} position="relative">
      <FormLabel fontSize="sm">{label}</FormLabel>
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
          bg="white"
          border="1px solid"
          borderColor="gray.200"
          borderRadius="md"
          boxShadow="md"
          mt={1}
        >
          <VStack
            spacing={0}
            align="stretch"
            divider={
              <Box borderBottom="1px solid" borderColor="gray.100" />
            }
          >
            {suggestions.map(suggestion => (
              <Box
                key={suggestion.name}
                px={3}
                py={2}
                cursor="pointer"
                _hover={{ bg: "gray.100" }}
                onClick={() => handleSuggestionClick(suggestion.name)}
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Text fontSize="sm">{suggestion.name}</Text>
                <Text fontSize="xs" color="gray.500">
                  {suggestion.count}
                </Text>
              </Box>
            ))}
          </VStack>
        </Box>
      )}
    </FormControl>
  )
}

export default CategoryAutocomplete
