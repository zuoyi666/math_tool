export type SamplePoint = readonly [number, number]

export interface AdaptiveSampleOptions {
  initialSegments?: number
  maxDepth?: number
  tolerance?: number
  scale?: number
}

function toFiniteValue(value: number) {
  return Number.isFinite(value) ? value : 0
}

function clampInteger(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)))
}

export function adaptiveSampleRange(
  min: number,
  max: number,
  evaluate: (x: number) => number,
  options: AdaptiveSampleOptions = {},
): SamplePoint[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
    return []
  }

  const initialSegments = clampInteger(options.initialSegments ?? 72, 8, 240)
  const maxDepth = clampInteger(options.maxDepth ?? 5, 0, 10)
  const tolerance = Math.max(0.0001, options.tolerance ?? 0.003)
  const basePoints = Array.from({ length: initialSegments + 1 }, (_, index) => {
    const x = min + ((max - min) * index) / initialSegments
    return [x, Math.max(0, toFiniteValue(evaluate(x)))] as const
  })
  const scale = Math.max(
    1e-9,
    options.scale ?? basePoints.reduce((current, [, y]) => Math.max(current, Math.abs(y)), 0) ?? 1,
  )
  const points: SamplePoint[] = [basePoints[0]]
  const minInterval = (max - min) / 5000

  const refine = (x0: number, y0: number, x1: number, y1: number, depth: number) => {
    const xm = (x0 + x1) / 2
    const ym = Math.max(0, toFiniteValue(evaluate(xm)))
    const interpolatedY = (y0 + y1) / 2
    const curvature = Math.abs(ym - interpolatedY) / scale

    if (depth < maxDepth && curvature > tolerance && x1 - x0 > minInterval) {
      refine(x0, y0, xm, ym, depth + 1)
      refine(xm, ym, x1, y1, depth + 1)
      return
    }

    points.push([x1, y1])
  }

  for (let index = 0; index < basePoints.length - 1; index += 1) {
    const [x0, y0] = basePoints[index]
    const [x1, y1] = basePoints[index + 1]
    refine(x0, y0, x1, y1, 0)
  }

  return points
}
