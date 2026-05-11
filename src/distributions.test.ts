import { describe, expect, it } from 'vitest'
import { calculateDistribution, DISTRIBUTIONS } from './distributions'

describe('distribution engine', () => {
  it('calculates Student t left tail', () => {
    const result = calculateDistribution(DISTRIBUTIONS.studentT, {
      mode: 'left',
      params: { df: 10 },
      x: 1.96,
      a: -1,
      b: 1,
      p: 0.95,
    })
    expect(result.probability).toBeCloseTo(0.96078, 4)
  })

  it('calculates chi-square CDF', () => {
    const result = calculateDistribution(DISTRIBUTIONS.chiSquare, {
      mode: 'left',
      params: { df: 1 },
      x: 3.84,
      a: 1,
      b: 4,
      p: 0.95,
    })
    expect(result.probability).toBeCloseTo(0.94996, 4)
  })

  it('calculates F right tail', () => {
    const result = calculateDistribution(DISTRIBUTIONS.f, {
      mode: 'right',
      params: { df1: 5, df2: 10 },
      x: 2,
      a: 0.5,
      b: 2,
      p: 0.05,
    })
    expect(result.probability).toBeCloseTo(0.16419, 4)
  })

  it('calculates binomial exact probability', () => {
    const result = calculateDistribution(DISTRIBUTIONS.binomial, {
      mode: 'exact',
      params: { n: 10, p: 0.5 },
      x: 3,
      a: 2,
      b: 5,
      p: 0.95,
    })
    expect(result.probability).toBeCloseTo(0.1171875, 6)
  })

  it('calculates Poisson left tail', () => {
    const result = calculateDistribution(DISTRIBUTIONS.poisson, {
      mode: 'left',
      params: { lambda: 3 },
      x: 2,
      a: 0,
      b: 4,
      p: 0.95,
    })
    expect(result.probability).toBeCloseTo(0.42319, 4)
  })

  it('normalizes reversed interval bounds', () => {
    const result = calculateDistribution(DISTRIBUTIONS.normal, {
      mode: 'between',
      params: {},
      x: 0,
      a: 1,
      b: -1,
      p: 0.95,
    })
    expect(result.probability).toBeCloseTo(0.68269, 4)
    expect(result.parameterSummary).toContain('a = -1.00, b = 1.00')
  })
})
