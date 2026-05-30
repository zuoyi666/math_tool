import katex from 'katex'
import { describe, expect, it } from 'vitest'
import { FORMULA_CATALOG, searchFormulaCatalog } from './formulaCatalog'
import { FORMULA_EXAMPLES, FORMULA_TEMPLATE_GROUPS, FORMULA_TEMPLATES } from './formulaTemplates'

describe('formula templates', () => {
  it('covers the seven complex formula examples', () => {
    expect(FORMULA_EXAMPLES.map((item) => item.id)).toEqual([
      'calculus-partial-definition',
      'calculus-half-life',
      'calculus-separated-integral',
      'calculus-log-solution',
      'multi-gradient-vector',
      'linear-dot-expanded',
      'stat-screenshot-variance',
    ])
  })

  it('contains all required template groups', () => {
    expect(FORMULA_TEMPLATE_GROUPS.map((item) => item.id)).toEqual([
      'basic',
      'symbols',
      'elementary',
      'calculus',
      'multivariable',
      'linearAlgebra',
      'probability',
      'statistics',
      'discrete',
      'differentialEquations',
      'optimization',
      'numerical',
    ])
  })

  it('renders every template and example with KaTeX', () => {
    for (const template of [...FORMULA_TEMPLATES, ...FORMULA_EXAMPLES]) {
      expect(() => katex.renderToString(template.latex, { displayMode: true, throwOnError: true })).not.toThrow()
    }
  })

  it('has a broad shared catalog with unique ids and renderable formulas', () => {
    const ids = FORMULA_CATALOG.map((item) => item.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(FORMULA_CATALOG.length).toBeGreaterThanOrEqual(180)

    for (const item of FORMULA_CATALOG) {
      expect(() => katex.renderToString(item.latex, { displayMode: true, throwOnError: true })).not.toThrow()
    }
  })

  it('searches labels, aliases, keywords, and LaTeX fragments', () => {
    expect(searchFormulaCatalog(FORMULA_CATALOG, '偏导').some((item) => item.id === 'multi-partial')).toBe(true)
    expect(searchFormulaCatalog(FORMULA_CATALOG, 'matrix').some((item) => item.id === 'linear-matrix-2x2')).toBe(true)
    expect(searchFormulaCatalog(FORMULA_CATALOG, 'sigma').some((item) => item.id === 'symbol-greek-sigma')).toBe(true)
    expect(searchFormulaCatalog(FORMULA_CATALOG, '\\int').some((item) => item.id === 'calculus-integral')).toBe(true)
  })

  it('filters by group, topic, and library formula entries', () => {
    const calculusIntegrals = searchFormulaCatalog(FORMULA_CATALOG, '', { group: 'calculus', topic: '积分' })
    expect(calculusIntegrals.length).toBeGreaterThan(0)
    expect(calculusIntegrals.every((item) => item.group === 'calculus' && item.topic === '积分')).toBe(true)

    const libraryFormulas = searchFormulaCatalog(FORMULA_CATALOG, '', { types: ['formula'], libraryOnly: true })
    expect(libraryFormulas.length).toBeGreaterThan(20)
    expect(libraryFormulas.every((item) => item.type === 'formula' && item.library !== false)).toBe(true)
  })
})
