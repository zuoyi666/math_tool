import { describe, expect, it } from 'vitest'
import { evaluateCalculatorExpression } from './calculatorEngine'

describe('calculator engine', () => {
  it('evaluates mathjs expressions', () => {
    const result = evaluateCalculatorExpression({
      expression: 'sqrt(2) + sin(pi / 6)',
      scope: {},
      angleMode: 'rad',
      ans: 0,
    })

    expect(result.ok).toBe(true)
    expect(result.numericValue).toBeCloseTo(Math.sqrt(2) + 0.5, 12)
  })

  it('supports degree and radian trigonometry modes', () => {
    const deg = evaluateCalculatorExpression({ expression: 'sin(30)', scope: {}, angleMode: 'deg', ans: 0 })
    const rad = evaluateCalculatorExpression({ expression: 'sin(30)', scope: {}, angleMode: 'rad', ans: 0 })

    expect(deg.numericValue).toBeCloseTo(0.5, 12)
    expect(rad.numericValue).not.toBeCloseTo(0.5, 6)
  })

  it('keeps preview assignment out of the committed scope', () => {
    const scope = {}
    const preview = evaluateCalculatorExpression({ expression: 'x = 12', scope, angleMode: 'rad', ans: 0 })

    expect(preview.ok).toBe(true)
    expect(scope).toEqual({})
    expect(preview.committedScope).toBeUndefined()
  })

  it('commits variables only when requested', () => {
    const committed = evaluateCalculatorExpression({ expression: 'x = 12', scope: {}, angleMode: 'rad', ans: 0, commit: true })
    const scope = committed.committedScope ?? {}
    const next = evaluateCalculatorExpression({ expression: 'x^2 + 3x + 2', scope, angleMode: 'rad', ans: 12 })

    expect(scope.x).toBe(12)
    expect(next.numericValue).toBe(182)
  })

  it('supports ans, constants, percentage, factorial and common log', () => {
    expect(evaluateCalculatorExpression({ expression: 'ans + 1', scope: {}, angleMode: 'rad', ans: 2 }).numericValue).toBe(3)
    expect(evaluateCalculatorExpression({ expression: 'tau / (2*pi)', scope: {}, angleMode: 'rad', ans: 0 }).numericValue).toBeCloseTo(1, 12)
    expect(evaluateCalculatorExpression({ expression: 'phi', scope: {}, angleMode: 'rad', ans: 0 }).numericValue).toBeCloseTo(1.61803398875, 10)
    expect(evaluateCalculatorExpression({ expression: '50%', scope: {}, angleMode: 'rad', ans: 0 }).numericValue).toBeCloseTo(0.5, 12)
    expect(evaluateCalculatorExpression({ expression: '5!', scope: {}, angleMode: 'rad', ans: 0 }).numericValue).toBe(120)
    expect(evaluateCalculatorExpression({ expression: 'log(100, 10)', scope: {}, angleMode: 'rad', ans: 0 }).numericValue).toBe(2)
  })

  it('accepts calculator-style symbols and common scientific aliases', () => {
    expect(evaluateCalculatorExpression({ expression: 'π × 2', scope: {}, angleMode: 'rad', ans: 0 }).numericValue).toBeCloseTo(Math.PI * 2, 12)
    expect(evaluateCalculatorExpression({ expression: '√(9) + 5²', scope: {}, angleMode: 'rad', ans: 0 }).numericValue).toBe(28)
    expect(evaluateCalculatorExpression({ expression: 'log10(100) + ln(e)', scope: {}, angleMode: 'rad', ans: 0 }).numericValue).toBeCloseTo(3, 12)
    expect(evaluateCalculatorExpression({ expression: 'sec(60) + cot(45)', scope: {}, angleMode: 'deg', ans: 0 }).numericValue).toBeCloseTo(3, 12)
  })

  it('returns errors without a committed scope', () => {
    const result = evaluateCalculatorExpression({ expression: 'sqrt(', scope: { x: 2 }, angleMode: 'rad', ans: 4, commit: true })

    expect(result.ok).toBe(false)
    expect(result.error).toBeTruthy()
    expect(result.committedScope).toBeUndefined()
  })
})
