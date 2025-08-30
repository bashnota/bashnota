// Application Configuration
export const APP_CONFIG = {
  name: 'BashNota',
  description: 'AI-Powered Workspace',
  version: '1.0.0',
  author: 'BashNota Team'
} as const

// UI Constants
export const UI_CONSTANTS = {
  pagination: {
    defaultPageSize: 9,
    maxPageSize: 50,
    defaultOverscan: 5
  },
  virtualScrolling: {
    itemHeight: {
      compact: 50,
      list: 80,
      grid: 200
    }
  },
  debounce: {
    search: 300,
    resize: 150,
    scroll: 100
  },
  animation: {
    duration: {
      fast: 150,
      normal: 300,
      slow: 500
    }
  }
} as const

// Storage Keys
export const STORAGE_KEYS = {
  preferences: {
    viewType: 'home-view-type',
    layoutPreferences: 'home-layout-preferences',
    lastSearch: 'home-last-search',
    lastTag: 'home-last-tag',
    showFavorites: 'home-show-favorites',
    activeView: 'home-active-view'
  },
  auth: {
    token: 'auth-token',
    user: 'auth-user'
  },
  settings: {
    theme: 'app-theme',
    language: 'app-language'
  }
} as const

// View Types
export const VIEW_TYPES = {
  grid: 'grid',
  list: 'list',
  compact: 'compact'
} as const

export const ACTIVE_VIEWS = {
  notas: 'notas',
  insights: 'insights',
  templates: 'templates',
  workspace: 'workspace'
} as const

// Time of Day
export const TIME_OF_DAY = {
  morning: 'morning',
  afternoon: 'afternoon',
  evening: 'evening',
  night: 'night'
} as const

// Motivational Quotes
export const MOTIVATIONAL_QUOTES = [
  "Every nota is a step towards clarity.",
  "Your ideas deserve a beautiful home.",
  "Code your thoughts, think your code.",
  "Great notes lead to greater discoveries.",
  "Innovation starts with organization.",
  "Your second brain is growing stronger.",
  "Document today, thank yourself tomorrow.",
  "Ideas without action are just dreams.",
  "Knowledge shared is knowledge multiplied.",
  "Your notes are your future self's gift.",
  "Organize today, inspire tomorrow.",
  "Every thought captured is a step forward."
] as const

// File Extensions
export const FILE_EXTENSIONS = {
  nota: '.nota',
  json: '.json',
  markdown: '.md',
  text: '.txt'
} as const

// API Endpoints (if needed)
export const API_ENDPOINTS = {
  auth: {
    login: '/auth/login',
    logout: '/auth/logout',
    register: '/auth/register',
    refresh: '/auth/refresh'
  },
  notas: {
    list: '/notas',
    create: '/notas',
    update: '/notas/:id',
    delete: '/notas/:id',
    publish: '/notas/:id/publish'
  }
} as const

// Error Messages
export const ERROR_MESSAGES = {
  general: {
    unknown: 'An unknown error occurred',
    network: 'Network error. Please check your connection.',
    timeout: 'Request timed out. Please try again.'
  },
  auth: {
    invalidCredentials: 'Invalid username or password',
    sessionExpired: 'Your session has expired. Please log in again.',
    unauthorized: 'You are not authorized to perform this action.'
  },
  notas: {
    createFailed: 'Failed to create nota',
    updateFailed: 'Failed to update nota',
    deleteFailed: 'Failed to delete nota',
    loadFailed: 'Failed to load notas',
    importFailed: 'Failed to import notas',
    exportFailed: 'Failed to export notas'
  },
  blocks: {
    createFailed: 'Failed to create block',
    updateFailed: 'Failed to update block',
    deleteFailed: 'Failed to delete block',
    reorderFailed: 'Failed to reorder blocks',
    loadFailed: 'Failed to load blocks'
  }
} as const

// Success Messages
export const SUCCESS_MESSAGES = {
  notas: {
    created: 'Nota created successfully',
    updated: 'Nota updated successfully',
    deleted: 'Nota deleted successfully',
    imported: 'Notas imported successfully',
    exported: 'Notas exported successfully',
    favoriteToggled: 'Favorite status updated'
  },
  blocks: {
    created: 'Block created successfully',
    updated: 'Block updated successfully',
    deleted: 'Block deleted successfully',
    reordered: 'Blocks reordered successfully'
  },
  auth: {
    loginSuccess: 'Login successful',
    logoutSuccess: 'Logout successful',
    registerSuccess: 'Account created successfully'
  }
} as const

// Validation Rules
export const VALIDATION_RULES = {
  nota: {
    title: {
      minLength: 1,
      maxLength: 200
    },
    content: {
      maxLength: 100000
    },
    tags: {
      maxCount: 20,
      maxLength: 50
    }
  },
  auth: {
    email: {
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    password: {
      minLength: 8,
      maxLength: 128
    }
  }
} as const 








