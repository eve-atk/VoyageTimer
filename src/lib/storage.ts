import { initialData } from '../data'
import type { AppData } from '../types'

const STORAGE_KEY = 'ff14-submarine-manager'

export function loadAppData(): AppData {
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return initialData
  }

  try {
    const parsed = JSON.parse(raw) as AppData
    return parsed
  } catch {
    return initialData
  }
}

export function saveAppData(data: AppData): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}