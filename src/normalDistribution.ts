import type { CalculationResult, NormalParams, ProbabilityMode } from './types'

export const Z_MIN = -4
export const Z_MAX = 4
export const DEFAULT_PARAMS: NormalParams = {
  mode: 'left',
  z: 0,
  a: -1,
  b: 1,
}

export const MODE_LABELS: Record<ProbabilityMode, string> = {
  left: '左尾',
  right: '右尾',
  between: '区间',
  twoTail: '双尾',
}

export const MODE_DESCRIPTIONS: Record<ProbabilityMode, string> = {
  left: '计算曲线左侧（含 z 点）的面积',
  right: '计算曲线右侧（含 z 点）的面积',
  between: '计算两个端点之间的面积',
  twoTail: '计算两侧尾部合计面积',
}

export const QUICK_Z_VALUES = [-2.58, -1.96, -1.645, -1.28, -0.84, 0, 0.84, 1.28, 1.645, 1.96, 2.58]

export function clampZ(value: number) {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.min(Z_MAX, Math.max(Z_MIN, value))
}

export function roundZ(value: number) {
  return Math.round(clampZ(value) * 1000) / 1000
}

export function standardNormalPdf(z: number) {
  return Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI)
}

function erf(value: number) {
  const sign = value < 0 ? -1 : 1
  const x = Math.abs(value)
  const t = 1 / (1 + 0.3275911 * x)
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-x * x))

  return sign * y
}

export function standardNormalCdf(z: number) {
  return 0.5 * (1 + erf(z / Math.SQRT2))
}

export function formatNumber(value: number, digits = 4) {
  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

export function formatZ(value: number) {
  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  })
}

export function calculateNormal(params: NormalParams): CalculationResult {
  const z = roundZ(params.z)
  const a = roundZ(params.a)
  const b = roundZ(params.b)
  const lower = Math.min(a, b)
  const upper = Math.max(a, b)

  if (params.mode === 'right') {
    const cdf = standardNormalCdf(z)
    const probability = 1 - cdf

    return {
      probability,
      percent: probability * 100,
      density: standardNormalPdf(z),
      cdf,
      label: `P(Z ≥ ${formatZ(z)})`,
      formula: '1 - Φ(z)',
      parameterSummary: `z = ${formatZ(z)}`,
      cdfSummary: `Φ(${formatZ(z)}) = ${formatNumber(cdf, 6)}`,
      densitySummary: `φ(${formatZ(z)}) = ${formatNumber(standardNormalPdf(z), 6)}`,
      interpretation: `在标准正态分布下，随机变量 Z 落在 ${formatZ(z)} 右侧的概率约为 ${formatNumber(probability * 100, 2)}%。`,
      activeMarkers: [z],
      shadeRanges: [[z, Z_MAX]],
    }
  }

  if (params.mode === 'between') {
    const cdfLower = standardNormalCdf(lower)
    const cdfUpper = standardNormalCdf(upper)
    const probability = cdfUpper - cdfLower

    return {
      probability,
      percent: probability * 100,
      density: standardNormalPdf((lower + upper) / 2),
      cdf: cdfUpper,
      label: `P(${formatZ(lower)} ≤ Z ≤ ${formatZ(upper)})`,
      formula: 'Φ(b) - Φ(a)',
      parameterSummary: `a = ${formatZ(lower)}, b = ${formatZ(upper)}`,
      cdfSummary: `Φ(b) - Φ(a) = ${formatNumber(cdfUpper, 6)} - ${formatNumber(cdfLower, 6)}`,
      densitySummary: `φ(a) = ${formatNumber(standardNormalPdf(lower), 6)}, φ(b) = ${formatNumber(standardNormalPdf(upper), 6)}`,
      interpretation: `在标准正态分布下，Z 落在 ${formatZ(lower)} 到 ${formatZ(upper)} 之间的概率约为 ${formatNumber(probability * 100, 2)}%。`,
      activeMarkers: [lower, upper],
      shadeRanges: [[lower, upper]],
    }
  }

  if (params.mode === 'twoTail') {
    const absZ = Math.abs(z)
    const cdf = standardNormalCdf(absZ)
    const probability = 2 * (1 - cdf)

    return {
      probability,
      percent: probability * 100,
      density: standardNormalPdf(absZ),
      cdf,
      label: `P(|Z| ≥ ${formatZ(absZ)})`,
      formula: '2 × (1 - Φ(|z|))',
      parameterSummary: `|z| = ${formatZ(absZ)}`,
      cdfSummary: `Φ(${formatZ(absZ)}) = ${formatNumber(cdf, 6)}`,
      densitySummary: `φ(${formatZ(absZ)}) = ${formatNumber(standardNormalPdf(absZ), 6)}`,
      interpretation: `在标准正态分布下，Z 落在 ±${formatZ(absZ)} 之外两侧尾部的概率约为 ${formatNumber(probability * 100, 2)}%。`,
      activeMarkers: [-absZ, absZ],
      shadeRanges: [
        [Z_MIN, -absZ],
        [absZ, Z_MAX],
      ],
    }
  }

  const cdf = standardNormalCdf(z)

  return {
    probability: cdf,
    percent: cdf * 100,
    density: standardNormalPdf(z),
    cdf,
    label: `P(Z ≤ ${formatZ(z)})`,
    formula: 'Φ(z)',
    parameterSummary: `z = ${formatZ(z)}`,
    cdfSummary: `Φ(${formatZ(z)}) = ${formatNumber(cdf, 6)}`,
    densitySummary: `φ(${formatZ(z)}) = ${formatNumber(standardNormalPdf(z), 6)}`,
    interpretation: `在标准正态分布下，Z 落在负无穷到 ${formatZ(z)} 之间的概率约为 ${formatNumber(cdf * 100, 2)}%。`,
    activeMarkers: [z],
    shadeRanges: [[Z_MIN, z]],
  }
}
