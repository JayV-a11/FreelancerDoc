import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Utility for merging Tailwind CSS class names.
 * Combines clsx (conditional classes) with tailwind-merge (de-duplication).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
