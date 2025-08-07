import { 
  Edit as EditIcon,
  CheckCircle as CheckCircleIcon,
  Sparkles as SparklesIcon,
  Wand as WandIcon,
  PlusCircle as PlusCircleIcon,
  Languages as LanguagesIcon,
  FileText as FileTextIcon,
  PenTool as PenToolIcon,
  BookOpen as BookOpenIcon,
  Lightbulb as LightbulbIcon,
  Target as TargetIcon,
  Zap as ZapIcon
} from 'lucide-vue-next'

export const ICON_MAP = {
  EditIcon,
  CheckCircleIcon,
  SparklesIcon,
  WandIcon,
  PlusCircleIcon,
  LanguagesIcon,
  FileTextIcon,
  PenToolIcon,
  BookOpenIcon,
  LightbulbIcon,
  TargetIcon,
  ZapIcon
}

export function getIconComponent(iconName: string) {
  if (!iconName || typeof iconName !== 'string') {
    return EditIcon
  }
  
  const icon = ICON_MAP[iconName as keyof typeof ICON_MAP]
  return icon || EditIcon
}

export const COLOR_CLASSES = {
  blue: {
    text: 'text-blue-600',
    hover: 'hover:bg-blue-50 hover:text-blue-700',
    bg: 'bg-blue-600'
  },
  green: {
    text: 'text-green-600',
    hover: 'hover:bg-green-50 hover:text-green-700',
    bg: 'bg-green-600'
  },
  purple: {
    text: 'text-purple-600',
    hover: 'hover:bg-purple-50 hover:text-purple-700',
    bg: 'bg-purple-600'
  },
  orange: {
    text: 'text-orange-600',
    hover: 'hover:bg-orange-50 hover:text-orange-700',
    bg: 'bg-orange-600'
  },
  indigo: {
    text: 'text-indigo-600',
    hover: 'hover:bg-indigo-50 hover:text-indigo-700',
    bg: 'bg-indigo-600'
  },
  teal: {
    text: 'text-teal-600',
    hover: 'hover:bg-teal-50 hover:text-teal-700',
    bg: 'bg-teal-600'
  },
  cyan: {
    text: 'text-cyan-600',
    hover: 'hover:bg-cyan-50 hover:text-cyan-700',
    bg: 'bg-cyan-600'
  },
  pink: {
    text: 'text-pink-600',
    hover: 'hover:bg-pink-50 hover:text-pink-700',
    bg: 'bg-pink-600'
  },
  red: {
    text: 'text-red-600',
    hover: 'hover:bg-red-50 hover:text-red-700',
    bg: 'bg-red-600'
  },
  yellow: {
    text: 'text-yellow-600',
    hover: 'hover:bg-yellow-50 hover:text-yellow-700',
    bg: 'bg-yellow-600'
  }
}

export function getColorClasses(color: string) {
  if (!color || typeof color !== 'string') {
    return COLOR_CLASSES.blue
  }
  
  const colorClass = COLOR_CLASSES[color as keyof typeof COLOR_CLASSES]
  return colorClass || COLOR_CLASSES.blue
} 