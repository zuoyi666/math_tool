import { describe, expect, it } from 'vitest'
import { DEFAULT_FORMULA_LATEX } from './formulaTemplates'
import { FORMULA_EDITOR_HISTORY_KEY, latexFromFormulaEditorHash, readFormulaHistory, upsertFormulaHistory, writeFormulaHistory } from './formulaEditorState'
import type { FormulaEditorHistoryEntry } from './types'

describe('formula editor state', () => {
  it('reads encoded latex from formula editor hash', () => {
    const latex = '\\frac{a}{b}+\\sqrt{x}'
    expect(latexFromFormulaEditorHash(`#/formulaEditor?latex=${encodeURIComponent(latex)}`)).toBe(latex)
  })

  it('falls back to the default formula when hash has no latex', () => {
    expect(latexFromFormulaEditorHash('#/formulaEditor')).toBe(DEFAULT_FORMULA_LATEX)
  })

  it('keeps formula history unique and limited to 20 entries', () => {
    const history: FormulaEditorHistoryEntry[] = Array.from({ length: 22 }, (_, index) => ({
      id: `old-${index}`,
      createdAt: `time-${index}`,
      state: { latex: `x_${index}` },
      label: `x_${index}`,
      value: `x_${index}`,
    }))

    const next = upsertFormulaHistory(history, 'x_3', 'now')
    expect(next).toHaveLength(20)
    expect(next[0]?.state.latex).toBe('x_3')
    expect(next.filter((item) => item.state.latex === 'x_3')).toHaveLength(1)
  })

  it('reads and writes local storage safely', () => {
    let stored = ''
    const storage = {
      getItem: (key: string) => (key === FORMULA_EDITOR_HISTORY_KEY ? stored : null),
      setItem: (key: string, value: string) => {
        if (key === FORMULA_EDITOR_HISTORY_KEY) stored = value
      },
    }
    writeFormulaHistory(storage, upsertFormulaHistory([], 'x^2', 'now'))
    expect(readFormulaHistory(storage)[0]?.state.latex).toBe('x^2')

    stored = '{bad json'
    expect(readFormulaHistory(storage)).toEqual([])
  })
})
