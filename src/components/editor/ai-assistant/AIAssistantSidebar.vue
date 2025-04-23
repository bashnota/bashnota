// Monitor prompt safety and token usage
const MAX_TOKENS = 8000 // Default max tokens, will be updated from settings
const MAX_TOKENS_WARNING = 0.8 // Show warning at 80% of max tokens
const MAX_INPUT_CHARACTERS = 20000 // Limit input to prevent overwhelming the AI

// Token tracking
const tokenUsage = computed(() => {
  const provider = selectedProvider.value
  // Calculate approximate token count based on provider
  let tokenRatio = 4 // Default ratio (chars per token)
  
  if (provider) {
    if (provider.id === 'openai') tokenRatio = 4
    else if (provider.id === 'anthropic') tokenRatio = 4.5
    else if (provider.id === 'gemini') tokenRatio = 3.75
    else if (provider.id === 'ollama') tokenRatio = 3.5
  }
  
  return {
    promptTokens: Math.round(promptInput.value.length / tokenRatio),
    responseTokens: activeAIBlock.value?.node.attrs.result 
      ? Math.round(activeAIBlock.value.node.attrs.result.length / tokenRatio) 
      : 0,
    followUpTokens: Math.round(followUpPrompt.value.length / tokenRatio)
  }
})

// Set max tokens from settings
watch(() => aiSettings.settings.maxTokens, (newValue) => {
  if (newValue) MAX_TOKENS = newValue
}, { immediate: true })

// Token usage indicators
const tokenWarning = computed(() => {
  const { promptTokens, responseTokens, followUpTokens } = tokenUsage.value
  const currentTokens = isContinuing.value 
    ? followUpTokens + responseTokens
    : promptTokens
  
  if (currentTokens > MAX_TOKENS * MAX_TOKENS_WARNING) {
    return {
      show: true,
      message: `Approaching token limit (${Math.round(currentTokens / MAX_TOKENS * 100)}%)`
    }
  }
  
  return { show: false, message: '' }
})

// Safety monitoring - filter for unsafe content
const containsUnsafeContent = (text: string): boolean => {
  // Basic safety check for harmful patterns
  const unsafePatterns = [
    /hack\s+(into|the|a)\s+/i,
    /exploit\s+(the|a|vulnerability)/i,
    /bypass\s+(security|authentication)/i,
    /(create|write)\s+(a|an)\s+(virus|malware)/i,
    /password\s+crack/i
  ]
  
  return unsafePatterns.some(pattern => pattern.test(text))
}

// Validate prompt before sending
const validatePrompt = (text: string): { valid: boolean, message?: string } => {
  // Check for empty prompt
  if (!text.trim()) {
    return { valid: false, message: 'Please enter a prompt' }
  }
  
  // Check maximum length to prevent abuse
  if (text.length > MAX_INPUT_CHARACTERS) {
    return { 
      valid: false, 
      message: `Prompt is too long (${text.length}/${MAX_INPUT_CHARACTERS} characters)` 
    }
  }
  
  // Check token count
  const { promptTokens } = tokenUsage.value
  if (promptTokens > MAX_TOKENS) {
    return { 
      valid: false, 
      message: `Prompt exceeds maximum token limit (${promptTokens}/${MAX_TOKENS})` 
    }
  }
  
  // Check for unsafe content if safety is enabled
  if (aiSettings.settings.safetyEnabled && containsUnsafeContent(text)) {
    return { 
      valid: false, 
      message: 'Prompt contains potentially unsafe content' 
    }
  }
  
  return { valid: true }
}

// Enhanced generate text with validation
const generateText = async () => {
  if (!activeAIBlock.value || !promptInput.value.trim()) return
  
  // Validate prompt before sending
  const validation = validatePrompt(promptInput.value)
  if (!validation.valid) {
    toast({
      title: 'Error',
      description: validation.message,
      variant: 'destructive'
    })
    return
  }
  
  try {
    // Check if there are any mentioned notas
    if (promptInput.value.includes('#[')) {
      // Process with mentions
      const enhancedPrompt = await loadMentionedNotaContents(promptInput.value)
      
      // Generate with enhanced prompt
      const newHistory = await generateTextAction(
        activeAIBlock.value, 
        enhancedPrompt, 
        conversationHistory.value,
        formatTimestamp
      )
      if (newHistory) conversationHistory.value = newHistory as typeof conversationHistory.value
    } else {
      // Generate normally
      const newHistory = await generateTextAction(
        activeAIBlock.value, 
        promptInput.value, 
        conversationHistory.value,
        formatTimestamp
      )
      if (newHistory) conversationHistory.value = newHistory as typeof conversationHistory.value
    }
    
    // Clear mentions after generation
    clearMentions()
  } catch (error) {
    logger.error('Error in generateText:', error)
    toast({
      title: 'Error',
      description: 'Failed to generate text',
      variant: 'destructive'
    })
  }
}

// Enhanced continue conversation with validation
const continueConversation = async () => {
  if (!activeAIBlock.value || !followUpPrompt.value.trim() || isLoading.value) return
  
  // Validate prompt before sending
  const validation = validatePrompt(followUpPrompt.value)
  if (!validation.valid) {
    toast({
      title: 'Error',
      description: validation.message,
      variant: 'destructive'
    })
    return
  }
  
  try {
    // Check if there are any mentioned notas
    if (followUpPrompt.value.includes('#[')) {
      const enhancedPrompt = await loadMentionedNotaContents(followUpPrompt.value)
      
      // Continue with enhanced prompt
      const newHistory = await continueAction(
        activeAIBlock.value, 
        enhancedPrompt, 
        conversationHistory.value,
        formatTimestamp
      )
      if (newHistory) conversationHistory.value = newHistory as typeof conversationHistory.value
    } else {
      // Continue normally
        const newHistory = await continueAction(
          activeAIBlock.value, 
          followUpPrompt.value, 
          conversationHistory.value,
          formatTimestamp
        )
        if (newHistory) conversationHistory.value = newHistory as typeof conversationHistory.value
    }
    
    // Clear the prompt and exit continue mode
    followUpPrompt.value = ''
    isContinuing.value = false
    
    // Clear mentions after generation
    clearMentions()
  } catch (error) {
    logger.error('Error in continueConversation:', error)
    toast({
      title: 'Error',
      description: 'Failed to continue conversation',
      variant: 'destructive'
    })
  }
}