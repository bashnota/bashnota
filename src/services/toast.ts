import { toast as sonnerToast, Toaster } from 'vue-sonner'
import 'vue-sonner/style.css'

interface LegacyToastMessage {
  title: string
  description?: string
  variant?: string
  [key: string]: unknown
}

type ToastArguments = Parameters<typeof sonnerToast>

function showToast(message: ToastArguments[0] | LegacyToastMessage, data?: ToastArguments[1]) {
  if (message && typeof message === 'object' && 'title' in message) {
    const { title, description, variant, ...options } = message
    const normalized = {
      ...options,
      description,
      class: variant === 'destructive' ? 'toast-destructive' : options.class,
    } as ToastArguments[1]
    return sonnerToast(title, normalized)
  }
  return sonnerToast(message as ToastArguments[0], data)
}

/** Supports the current Sonner signature and normalizes the legacy object form. */
export const toast = Object.assign(showToast, sonnerToast)
export { Toaster }
