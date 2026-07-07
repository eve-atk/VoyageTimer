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

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/$/, '')
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}`)
  }

  return (await response.json()) as T
}

export async function loadLatestAppData(): Promise<AppData | null> {
  const baseUrl = import.meta.env.VITE_DATA_RAW_BASE_URL as string | undefined
  if (!baseUrl) {
    return null
  }

  const normalizedBaseUrl = normalizeBaseUrl(baseUrl)

  try {
    const [parts, rankBonus, routes, ships, voyages] = await Promise.all([
      fetchJson<AppData['parts']>(`${normalizedBaseUrl}/part-master.json`),
      fetchJson<AppData['rankBonus']>(`${normalizedBaseUrl}/rank-bonus.json`),
      fetchJson<AppData['routes']>(`${normalizedBaseUrl}/route-master.json`),
      fetchJson<AppData['ships']>(`${normalizedBaseUrl}/ship-data.json`),
      fetchJson<AppData['voyages']>(`${normalizedBaseUrl}/voyage-data.json`),
    ])

    return {
      parts,
      rankBonus,
      routes,
      ships,
      voyages,
    }
  } catch {
    return null
  }
}