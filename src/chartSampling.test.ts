import { describe, expect, it } from 'vitest'
import { adaptiveSampleRange } from './chartSampling'

describe('adaptiveSampleRange', () => {
  it('keeps simple linear ranges compact', () => {
    const points = adaptiveSampleRange(0, 1, (x) => x, { initialSegments: 16, tolerance: 0.001 })

    expect(points).toHaveLength(17)
    expect(points[0][0]).toBe(0)
    expect(points.at(-1)?.[0]).toBe(1)
  })

  it('adds points where curvature changes quickly', () => {
    const linearPoints = adaptiveSampleRange(0, 1, (x) => x, { initialSegments: 16, tolerance: 0.001 })
    const curvedPoints = adaptiveSampleRange(0, 1, (x) => Math.exp(-80 * (x - 0.45) ** 2), {
      initialSegments: 16,
      maxDepth: 6,
      tolerance: 0.001,
    })

    expect(curvedPoints.length).toBeGreaterThan(linearPoints.length)
    expect(curvedPoints.some(([x]) => x > 0.42 && x < 0.48)).toBe(true)
  })

  it('drops non-finite samples instead of leaking invalid points', () => {
    const points = adaptiveSampleRange(0, 1, (x) => (x === 0 ? Number.POSITIVE_INFINITY : 1 / x), {
      initialSegments: 8,
      maxDepth: 2,
    })

    expect(points.every(([, y]) => Number.isFinite(y))).toBe(true)
  })
})
