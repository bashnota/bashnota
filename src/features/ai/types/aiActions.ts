export interface AIAction {
  id: string
  name: string
  prompt: string
  icon: string
  color: string
  description?: string
  enabled: boolean
  isCustom?: boolean
}

export interface AIActionGroup {
  id: string
  name: string
  actions: AIAction[]
  enabled: boolean
}

export const DEFAULT_AI_ACTIONS: AIAction[] = [
  {
    id: 'rewrite',
    name: 'Rewrite with AI',
    prompt: 'Please rewrite the following text to improve its clarity, flow, and readability while maintaining the original meaning and intent:',
    icon: 'EditIcon',
    color: 'blue',
    description: 'Improve text clarity and readability',
    enabled: true,
    isCustom: false
  },
  {
    id: 'grammar',
    name: 'Fix Grammar',
    prompt: 'Please correct any grammar, spelling, and punctuation errors in the following text while preserving the original meaning and style:',
    icon: 'CheckCircleIcon',
    color: 'green',
    description: 'Correct grammar and spelling errors',
    enabled: true,
    isCustom: false
  },
  {
    id: 'improve',
    name: 'Improve Writing',
    prompt: 'Please improve the following text by enhancing its vocabulary, sentence structure, and overall writing quality while maintaining the original meaning:',
    icon: 'SparklesIcon',
    color: 'purple',
    description: 'Enhance vocabulary and writing quality',
    enabled: true,
    isCustom: false
  },
  {
    id: 'concise',
    name: 'Make Concise',
    prompt: 'Please make the following text more concise and to-the-point while preserving all important information and meaning:',
    icon: 'WandIcon',
    color: 'orange',
    description: 'Reduce text length while keeping meaning',
    enabled: true,
    isCustom: false
  },
  {
    id: 'expand',
    name: 'Expand Text',
    prompt: 'Please expand the following text with more details, examples, and explanations while maintaining the original meaning and tone:',
    icon: 'PlusCircleIcon',
    color: 'indigo',
    description: 'Add more detail and explanation',
    enabled: false,
    isCustom: false
  },
  {
    id: 'translate',
    name: 'Translate',
    prompt: 'Please translate the following text to English (or if already in English, translate to Spanish):',
    icon: 'LanguagesIcon',
    color: 'teal',
    description: 'Translate text between languages',
    enabled: false,
    isCustom: false
  },
  {
    id: 'summarize',
    name: 'Summarize',
    prompt: 'Please provide a concise summary of the following text, highlighting the key points:',
    icon: 'FileTextIcon',
    color: 'cyan',
    description: 'Create a summary of the text',
    enabled: false,
    isCustom: false
  }
]

export const AVAILABLE_ICONS = [
  'EditIcon',
  'CheckCircleIcon',
  'SparklesIcon',
  'WandIcon',
  'PlusCircleIcon',
  'LanguagesIcon',
  'FileTextIcon',
  'PenToolIcon',
  'BookOpenIcon',
  'LightbulbIcon',
  'TargetIcon',
  'ZapIcon'
]

export const AVAILABLE_COLORS = [
  'blue',
  'green',
  'purple',
  'orange',
  'indigo',
  'teal',
  'cyan',
  'pink',
  'red',
  'yellow'
] 