import { describe, expect, it } from 'vitest'
import {
  FORMULA_RECENT_LIMIT,
  readFormulaFavorites,
  readFormulaRecents,
  recordRecentFormula,
  toggleFormulaFavorite,
  writeFormulaFavorites,
  writeFormulaRecents,
} from './formulaCatalogState'

function createStorage(initial = '') {
  let stored = initial
  return {
    getItem: () => stored,
    setItem: (_key: string, value: string) => {
      stored = value
    },
    read: () => stored,
  }
}

describe('formula catalog local state', () => {
  it('toggles favorite entries without duplicates', () => {
    const added = toggleFormulaFavorite([], 'calculus-limit', 't1')
    expect(added).toEqual([{ id: 'calculus-limit', savedAt: 't1' }])
    expect(toggleFormulaFavorite(added, 'calculus-limit')).toEqual([])
  })

  it('records recent entries with dedupe and limit', () => {
    let recents = Array.from({ length: FORMULA_RECENT_LIMIT }, (_, index) => ({ id: `id-${index}`, usedAt: `t-${index}` }))
    recents = recordRecentFormula(recents, 'id-5', 'new')
    expect(recents[0]).toEqual({ id: 'id-5', usedAt: 'new' })
    expect(recents).toHaveLength(FORMULA_RECENT_LIMIT)
    expect(recents.filter((item) => item.id === 'id-5')).toHaveLength(1)
  })

  it('reads and writes local storage safely', () => {
    const favoriteStorage = createStorage()
    writeFormulaFavorites(favoriteStorage, [{ id: 'a', savedAt: 'now' }])
    expect(readFormulaFavorites(favoriteStorage)).toEqual([{ id: 'a', savedAt: 'now' }])

    const recentStorage = createStorage()
    writeFormulaRecents(recentStorage, [{ id: 'b', usedAt: 'now' }])
    expect(readFormulaRecents(recentStorage)).toEqual([{ id: 'b', usedAt: 'now' }])

    expect(readFormulaFavorites(createStorage('{bad json'))).toEqual([])
    expect(readFormulaRecents(undefined)).toEqual([])
  })
})
