import { describe, expect, it } from 'vitest'
import { calculateNormal, standardNormalCdf } from './normalDistribution'

describe('standard normal distribution calculations', () => {
  it('calculates Phi(0)', () => {
    expect(standardNormalCdf(0)).toBeCloseTo(0.5, 6)
  })

  it('calculates left tail at z = 1.96', () => {
    const result = calculateNormal({ mode: 'left', z: 1.96, a: -1, b: 1 })
    expect(result.probability).toBeCloseTo(0.975, 3)
  })

  it('calculates right tail at z = 1.96', () => {
    const result = calculateNormal({ mode: 'right', z: 1.96, a: -1, b: 1 })
    expect(result.probability).toBeCloseTo(0.025, 3)
  })

  it('calculates interval probability between -1 and 1', () => {
    const result = calculateNormal({ mode: 'between', z: 0, a: -1, b: 1 })
    expect(result.probability).toBeCloseTo(0.6827, 3)
  })

  it('normalizes reversed interval bounds', () => {
    const result = calculateNormal({ mode: 'between', z: 0, a: 1, b: -1 })
    expect(result.parameterSummary).toBe('a = -1.00, b = 1.00')
    expect(result.probability).toBeCloseTo(0.6827, 3)
  })

  it('calculates two-tail probability at absolute z = 1.96', () => {
    const result = calculateNormal({ mode: 'twoTail', z: 1.96, a: -1, b: 1 })
    expect(result.probability).toBeCloseTo(0.05, 3)
  })
})
