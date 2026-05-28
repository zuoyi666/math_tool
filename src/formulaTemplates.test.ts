import katex from 'katex'
import { describe, expect, it } from 'vitest'
import { FORMULA_EXAMPLES, FORMULA_TEMPLATE_GROUPS, FORMULA_TEMPLATES } from './formulaTemplates'

describe('formula templates', () => {
  it('covers the seven complex formula examples', () => {
    expect(FORMULA_EXAMPLES.map((item) => item.id)).toEqual([
      'example-partial-definition',
      'example-half-life',
      'example-separated-integral',
      'example-log-solution',
      'example-gradient-vector',
      'example-dot-product',
      'example-variance',
    ])
  })

  it('contains all required template groups', () => {
    expect(FORMULA_TEMPLATE_GROUPS.map((item) => item.id)).toEqual(['basic', 'calculus', 'linearAlgebra', 'statistics', 'symbols'])
  })

  it('renders every template and example with KaTeX', () => {
    for (const template of [...FORMULA_TEMPLATES, ...FORMULA_EXAMPLES]) {
      expect(() => katex.renderToString(template.latex, { displayMode: true, throwOnError: true })).not.toThrow()
    }
  })
})
