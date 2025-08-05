// Re-export all setting types
export type { EditorSettings } from './editor'
export type { AppearanceSettings } from './appearance'
export type { AISettings } from './ai'
export type { KeyboardSettings, KeyboardShortcut } from './keyboard'
export type { IntegrationSettings } from './integrations'
export type { AdvancedSettings } from './advanced'

// Combined settings interface
export interface AllSettings {
  editor: EditorSettings
  appearance: AppearanceSettings
  ai: AISettings
  keyboard: KeyboardSettings
  integrations: IntegrationSettings
  advanced: AdvancedSettings
}

// Base setting types
export interface BaseSettingItem {
  id: string
  label: string
  description?: string
  type: 'switch' | 'slider' | 'select' | 'input' | 'color' | 'custom'
  group?: string
  disabled?: boolean
  hidden?: boolean
}

export interface SwitchSetting extends BaseSettingItem {
  type: 'switch'
  value: boolean
  defaultValue: boolean
}

export interface SliderSetting extends BaseSettingItem {
  type: 'slider'
  value: number[]
  defaultValue: number[]
  min: number
  max: number
  step?: number
  unit?: string
}

export interface SelectSetting extends BaseSettingItem {
  type: 'select'
  value: string
  defaultValue: string
  options: Array<{ value: string; label: string; description?: string }>
}

export interface InputSetting extends BaseSettingItem {
  type: 'input'
  value: string
  defaultValue: string
  placeholder?: string
  inputType?: 'text' | 'password' | 'email' | 'url'
}

export interface ColorSetting extends BaseSettingItem {
  type: 'color'
  value: string
  defaultValue: string
}

export interface CustomSetting extends BaseSettingItem {
  type: 'custom'
  value: any
  defaultValue: any
  component: string
}

export type SettingItem = 
  | SwitchSetting 
  | SliderSetting 
  | SelectSetting 
  | InputSetting 
  | ColorSetting 
  | CustomSetting

export interface SettingGroup {
  id: string
  label: string
  description?: string
  icon?: string
  settings: SettingItem[]
}

export interface SettingCategory {
  id: string
  label: string
  description?: string
  icon?: string
  groups: SettingGroup[]
}
