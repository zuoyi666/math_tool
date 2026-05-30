import { DEFAULT_FORMULA_LATEX, FORMULA_CATALOG, FORMULA_EXAMPLE_IDS, FORMULA_GROUPS } from './formulaCatalog'
import type { FormulaTemplate } from './types'

export { DEFAULT_FORMULA_LATEX }

export const FORMULA_TEMPLATE_GROUPS = FORMULA_GROUPS.map(({ id, label }) => ({ id, label }))

export const FORMULA_TEMPLATES: FormulaTemplate[] = FORMULA_CATALOG.map((entry) => ({
  id: entry.id,
  group: entry.group,
  label: entry.label,
  latex: entry.latex,
  description: entry.description,
}))

export const FORMULA_EXAMPLES: FormulaTemplate[] = FORMULA_EXAMPLE_IDS.map((id) => {
  const entry = FORMULA_CATALOG.find((item) => item.id === id)
  if (!entry) throw new Error(`Missing formula example: ${id}`)
  return {
    id: entry.id,
    group: entry.group,
    label: entry.label,
    latex: entry.latex,
    description: entry.description,
  }
})
