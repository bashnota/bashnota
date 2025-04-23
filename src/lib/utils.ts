import { useToast } from '@/components/ui/toast'
import { type ClassValue, clsx } from 'clsx'
import { formatDistanceToNow } from 'date-fns'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatDate = (date: Date | string) => {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

/**
 * Format a date into a human-readable relative time (e.g., "2 hours ago")
 * @param date The date to format
 * @returns A string representation of the relative time
 */
export const formatRelativeTime = (date: Date | string) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return formatDistanceToNow(dateObj, { addSuffix: true })
}

export const toast = (
  message: string,
  title: string = '',
  variant: 'default' | 'destructive' = 'default',
) => {
  const { toast } = useToast()

  toast({
    title,
    description: message,
    variant,
    duration: 2000,
    class: cn('top-0 right-0 flex fixed md:max-w-[420px] md:top-4 md:right-4'),
  })
}

export const getURLWithoutProtocol = (url: string) => {
  return url.replace(/(^\w+:|^)\/\//, '')
}
