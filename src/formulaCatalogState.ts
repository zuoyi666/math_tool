import type { FormulaFavoriteEntry, FormulaRecentEntry } from './types'

export const FORMULA_FAVORITES_KEY = 'math-tool:formula-editor-favorites'
export const FORMULA_RECENTS_KEY = 'math-tool:formula-editor-recents'
export const FORMULA_RECENT_LIMIT = 18

interface FormulaStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

function safeRead<T>(storage: FormulaStorage | undefined, key: string): T[] {
  if (!storage) return []
  try {
    const parsed = JSON.parse(storage.getItem(key) ?? '[]')
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

function safeWrite<T>(storage: FormulaStorage | undefined, key: string, values: T[]) {
  if (!storage) return
  try {
    storage.setItem(key, JSON.stringify(values))
  } catch {
    // Local storage can be disabled or full; editor still works without persistence.
  }
}

export function readFormulaFavorites(storage?: FormulaStorage) {
  return safeRead<FormulaFavoriteEntry>(storage, FORMULA_FAVORITES_KEY).filter((item) => typeof item.id === 'string')
}

export function writeFormulaFavorites(storage: FormulaStorage | undefined, favorites: FormulaFavoriteEntry[]) {
  safeWrite(storage, FORMULA_FAVORITES_KEY, favorites)
}

export function toggleFormulaFavorite(favorites: FormulaFavoriteEntry[], id: string, savedAt = new Date().toISOString()) {
  if (favorites.some((item) => item.id === id)) {
    return favorites.filter((item) => item.id !== id)
  }

  return [{ id, savedAt }, ...favorites]
}

export function readFormulaRecents(storage?: FormulaStorage) {
  return safeRead<FormulaRecentEntry>(storage, FORMULA_RECENTS_KEY)
    .filter((item) => typeof item.id === 'string')
    .slice(0, FORMULA_RECENT_LIMIT)
}

export function writeFormulaRecents(storage: FormulaStorage | undefined, recents: FormulaRecentEntry[]) {
  safeWrite(storage, FORMULA_RECENTS_KEY, recents.slice(0, FORMULA_RECENT_LIMIT))
}

export function recordRecentFormula(recents: FormulaRecentEntry[], id: string, usedAt = new Date().toISOString()) {
  return [{ id, usedAt }, ...recents.filter((item) => item.id !== id)].slice(0, FORMULA_RECENT_LIMIT)
}
