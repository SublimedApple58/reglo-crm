import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { PROVINCE_NAMES } from "@/lib/constants"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatProvince(code: string): string {
  const name = PROVINCE_NAMES[code.toUpperCase()]
  return name ? `${name} (${code.toUpperCase()})` : code
}
