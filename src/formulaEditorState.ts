import { DEFAULT_FORMULA_LATEX } from './formulaTemplates'
import type { FormulaEditorHistoryEntry } from './types'

export const FORMULA_EDITOR_HISTORY_KEY = 'math-tool:formula-editor-history'
export const FORMULA_EDITOR_HISTORY_LIMIT = 20

export function latexFromFormulaEditorHash(hash: string) {
  const query = hash.split('?')[1] ?? ''
  const latex = new URLSearchParams(query).get('latex')?.trim()
  return latex || DEFAULT_FORMULA_LATEX
}

export function compactFormulaLabel(latex: string) {
  return latex.replace(/\s+/g, ' ').trim()
}

export function upsertFormulaHistory(history: FormulaEditorHistoryEntry[], latex: string, createdAt: string): FormulaEditorHistoryEntry[] {
  const label = compactFormulaLabel(latex)
  if (!label) return history.slice(0, FORMULA_EDITOR_HISTORY_LIMIT)

  const entry: FormulaEditorHistoryEntry = {
    id: `${Date.now()}-${label}`,
    createdAt,
    state: { latex },
    label,
    value: label,
  }

  return [entry, ...history.filter((item) => compactFormulaLabel(item.state.latex) !== label)].slice(0, FORMULA_EDITOR_HISTORY_LIMIT)
}

export function readFormulaHistory(storage: Pick<Storage, 'getItem'>): FormulaEditorHistoryEntry[] {
  try {
    return (JSON.parse(storage.getItem(FORMULA_EDITOR_HISTORY_KEY) ?? '[]') as FormulaEditorHistoryEntry[]).slice(0, FORMULA_EDITOR_HISTORY_LIMIT)
  } catch {
    return []
  }
}

export function writeFormulaHistory(storage: Pick<Storage, 'setItem'>, history: FormulaEditorHistoryEntry[]) {
  storage.setItem(FORMULA_EDITOR_HISTORY_KEY, JSON.stringify(history.slice(0, FORMULA_EDITOR_HISTORY_LIMIT)))
}
