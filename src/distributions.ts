import { jStat } from 'jstat'
import type { DistributionDefinition, DistributionId, DistributionState, ParameterDefinition, ProbabilityResult, QueryMode } from './types'

export const QUERY_MODE_LABELS: Record<QueryMode, string> = {
  left: '左尾',
  right: '右尾',
  between: '区间',
  twoTail: '双尾',
  criticalLeft: '左侧临界值',
  criticalRight: '右侧临界值',
  exact: '点概率',
}

const CONTINUOUS_QUICK = [-2.58, -1.96, -1.645, -1.28, -0.84, 0, 0.84, 1.28, 1.645, 1.96, 2.58]
const POSITIVE_QUICK = [0.5, 1, 2, 3, 5, 8, 10, 12, 15]
const DISCRETE_QUICK = [0, 1, 2, 3, 4, 5, 8, 10, 12]

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

function param(defs: ParameterDefinition[], params: Record<string, number>, key: string) {
  const definition = defs.find((item) => item.key === key)
  const fallback = definition?.defaultValue ?? 0
  const raw = params[key] ?? fallback
  const bounded = definition ? clamp(raw, definition.min, definition.max) : raw
  return definition?.integer ? Math.round(bounded) : bounded
}

function formatNumber(value: number, digits = 6) {
  if (!Number.isFinite(value)) return '无效'
  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

function formatCompact(value: number) {
  if (!Number.isFinite(value)) return '无效'
  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: Math.abs(value) < 10 ? 2 : 0,
    maximumFractionDigits: Math.abs(value) < 10 ? 3 : 0,
  })
}

function parameterSummary(definition: DistributionDefinition, params: Record<string, number>) {
  return definition.parameterDefinitions.map((item) => `${item.label} = ${formatCompact(param(definition.parameterDefinitions, params, item.key))}`).join(', ')
}

function safeCdf(definition: DistributionDefinition, x: number, params: Record<string, number>) {
  const [min, max] = definition.domain(params)
  if (x < min) return 0
  if (x > max && definition.kind === 'discrete') return 1
  return clamp(definition.cdf(x, params), 0, 1)
}

function discreteUpper(definition: DistributionDefinition, params: Record<string, number>) {
  const [, max] = definition.domain(params)
  return Math.floor(max)
}

export function normalizeDistributionState(definition: DistributionDefinition, state: DistributionState): DistributionState {
  const normalizedParams = Object.fromEntries(
    definition.parameterDefinitions.map((item) => [item.key, param(definition.parameterDefinitions, state.params, item.key)]),
  )
  const [min, max] = definition.domain(normalizedParams)
  const domainMin = definition.kind === 'discrete' ? Math.ceil(min) : min
  const domainMax = definition.kind === 'discrete' ? Math.floor(max) : max
  const mode = definition.modes.includes(state.mode) ? state.mode : definition.defaultState.mode

  return {
    mode,
    params: normalizedParams,
    x: definition.kind === 'discrete' ? Math.round(clamp(state.x, domainMin, domainMax)) : clamp(state.x, domainMin, domainMax),
    a: definition.kind === 'discrete' ? Math.round(clamp(state.a, domainMin, domainMax)) : clamp(state.a, domainMin, domainMax),
    b: definition.kind === 'discrete' ? Math.round(clamp(state.b, domainMin, domainMax)) : clamp(state.b, domainMin, domainMax),
    p: clamp(state.p, 0.001, 0.999),
  }
}

export function calculateDistribution(definition: DistributionDefinition, state: DistributionState): ProbabilityResult {
  const normalized = normalizeDistributionState(definition, state)
  const { mode, params } = normalized
  const [domainMin, domainMax] = definition.domain(params)
  const variable = definition.variable
  const paramsText = parameterSummary(definition, params)

  if (definition.kind === 'discrete') {
    const x = Math.round(normalized.x)
    const a = Math.min(Math.round(normalized.a), Math.round(normalized.b))
    const b = Math.max(Math.round(normalized.a), Math.round(normalized.b))
    const upper = discreteUpper(definition, params)
    const pmf = definition.pmf ?? (() => 0)
    let probability: number
    let label: string
    let formula: string
    let markers = [x]
    let barRange: [number, number] | undefined

    if (mode === 'left') {
      probability = safeCdf(definition, x, params)
      label = `P(${variable} ≤ ${x})`
      formula = 'CDF(k)'
      barRange = [0, x]
    } else if (mode === 'right') {
      probability = 1 - safeCdf(definition, x - 1, params)
      label = `P(${variable} ≥ ${x})`
      formula = '1 - CDF(k - 1)'
      barRange = [x, upper]
    } else if (mode === 'between') {
      probability = safeCdf(definition, b, params) - safeCdf(definition, a - 1, params)
      label = `P(${a} ≤ ${variable} ≤ ${b})`
      formula = 'CDF(b) - CDF(a - 1)'
      markers = [a, b]
      barRange = [a, b]
    } else {
      probability = pmf(x, params)
      label = `P(${variable} = ${x})`
      formula = 'PMF(k)'
      barRange = [x, x]
    }

    return {
      probability,
      percent: probability * 100,
      label,
      primaryValue: formatNumber(probability, 6),
      parameterSummary: mode === 'between' ? `${paramsText}; a = ${a}, b = ${b}` : `${paramsText}; k = ${x}`,
      interpretation: `${definition.title} 下，${label} 的概率约为 ${formatNumber(probability * 100, 2)}%。`,
      formula,
      detailRows: [
        { label: '概率', value: formatNumber(probability, 6) },
        { label: '百分比', value: `${formatNumber(probability * 100, 2)}%` },
        { label: 'CDF(k)', value: formatNumber(safeCdf(definition, x, params), 6) },
        { label: 'PMF(k)', value: formatNumber(pmf(x, params), 6) },
        { label: '参数', value: paramsText },
      ],
      markers,
      shadeRanges: [],
      barRange,
    }
  }

  const x = normalized.x
  const a = Math.min(normalized.a, normalized.b)
  const b = Math.max(normalized.a, normalized.b)
  const cdfX = safeCdf(definition, x, params)
  const density = definition.pdf?.(x, params) ?? 0
  let probability = cdfX
  let label = `P(${variable} ≤ ${formatCompact(x)})`
  let formula = 'CDF(x)'
  let markers = [x]
  let shadeRanges: Array<[number, number]> = [[domainMin, x]]
  let xSummary = `x = ${formatCompact(x)}`

  if (mode === 'right') {
    probability = 1 - cdfX
    label = `P(${variable} ≥ ${formatCompact(x)})`
    formula = '1 - CDF(x)'
    shadeRanges = [[x, domainMax]]
  } else if (mode === 'between') {
    probability = safeCdf(definition, b, params) - safeCdf(definition, a, params)
    label = `P(${formatCompact(a)} ≤ ${variable} ≤ ${formatCompact(b)})`
    formula = 'CDF(b) - CDF(a)'
    markers = [a, b]
    shadeRanges = [[a, b]]
    xSummary = `a = ${formatCompact(a)}, b = ${formatCompact(b)}`
  } else if (mode === 'twoTail') {
    const absX = Math.abs(x)
    probability = 2 * (1 - safeCdf(definition, absX, params))
    label = `P(|${variable}| ≥ ${formatCompact(absX)})`
    formula = '2 × (1 - CDF(|x|))'
    markers = [-absX, absX]
    shadeRanges = [
      [domainMin, -absX],
      [absX, domainMax],
    ]
    xSummary = `|x| = ${formatCompact(absX)}`
  } else if (mode === 'criticalLeft' && definition.quantile) {
    const critical = definition.quantile(normalized.p, params)
    probability = normalized.p
    label = `CDF⁻¹(${formatCompact(normalized.p)}) = ${formatCompact(critical)}`
    formula = 'Quantile(p)'
    markers = [critical]
    shadeRanges = [[domainMin, critical]]
    xSummary = `p = ${formatCompact(normalized.p)}`
  } else if (mode === 'criticalRight' && definition.quantile) {
    const critical = definition.quantile(1 - normalized.p, params)
    probability = normalized.p
    label = `P(${variable} ≥ ${formatCompact(critical)}) = ${formatCompact(normalized.p)}`
    formula = 'Quantile(1 - p)'
    markers = [critical]
    shadeRanges = [[critical, domainMax]]
    xSummary = `右尾 p = ${formatCompact(normalized.p)}`
  }

  probability = clamp(probability, 0, 1)

  return {
    probability,
    percent: probability * 100,
    label,
    primaryValue: formatNumber(probability, 6),
    parameterSummary: `${paramsText}; ${xSummary}`,
    interpretation: `${definition.title} 下，${label} 的概率约为 ${formatNumber(probability * 100, 2)}%。`,
    formula,
    detailRows: [
      { label: '概率', value: formatNumber(probability, 6) },
      { label: '百分比', value: `${formatNumber(probability * 100, 2)}%` },
      { label: 'CDF(x)', value: formatNumber(cdfX, 6) },
      { label: 'PDF(x)', value: formatNumber(density, 6) },
      { label: '参数', value: paramsText },
    ],
    markers,
    shadeRanges,
  }
}

export const DISTRIBUTIONS: Record<DistributionId, DistributionDefinition> = {
  normal: {
    id: 'normal',
    kind: 'continuous',
    title: '标准正态分布',
    subtitle: '计算 Z ~ N(0,1) 的概率、密度与临界值',
    variable: 'Z',
    parameterDefinitions: [],
    modes: ['left', 'right', 'between', 'twoTail', 'criticalLeft', 'criticalRight'],
    defaultState: { mode: 'left', params: {}, x: 0, a: -1, b: 1, p: 0.95 },
    domain: () => [-4, 4],
    formulas: ['Z ~ N(0,1)', 'φ(z) = 1 / √(2π) × e^(-z²/2)', 'Φ(z) = P(Z ≤ z)'],
    quickValues: CONTINUOUS_QUICK,
    pdf: (x) => jStat.normal.pdf(x, 0, 1),
    cdf: (x) => jStat.normal.cdf(x, 0, 1),
    quantile: (p) => jStat.normal.inv(p, 0, 1),
  },
  studentT: {
    id: 'studentT',
    kind: 'continuous',
    title: 't 分布',
    subtitle: '根据自由度计算 Student t 分布概率和临界值',
    variable: 'T',
    parameterDefinitions: [{ key: 'df', label: '自由度 ν', min: 1, max: 200, step: 1, defaultValue: 10, description: 't 分布自由度', integer: true }],
    modes: ['left', 'right', 'between', 'twoTail', 'criticalLeft', 'criticalRight'],
    defaultState: { mode: 'twoTail', params: { df: 10 }, x: 1.96, a: -1, b: 1, p: 0.95 },
    domain: () => [-6, 6],
    formulas: ['T ~ t(ν)', 'ν 为自由度', '双尾常用于 t 检验临界值'],
    quickValues: CONTINUOUS_QUICK,
    pdf: (x, p) => jStat.studentt.pdf(x, p.df),
    cdf: (x, p) => jStat.studentt.cdf(x, p.df),
    quantile: (pValue, p) => jStat.studentt.inv(pValue, p.df),
  },
  chiSquare: {
    id: 'chiSquare',
    kind: 'continuous',
    title: '卡方分布',
    subtitle: '计算 χ² 分布概率、区间面积和临界值',
    variable: 'χ²',
    parameterDefinitions: [{ key: 'df', label: '自由度 k', min: 1, max: 200, step: 1, defaultValue: 5, description: '卡方分布自由度', integer: true }],
    modes: ['left', 'right', 'between', 'criticalLeft', 'criticalRight'],
    defaultState: { mode: 'left', params: { df: 5 }, x: 5, a: 2, b: 8, p: 0.95 },
    domain: (p) => [0, Math.max(12, p.df + 5 * Math.sqrt(2 * p.df))],
    formulas: ['X ~ χ²(k)', 'k 为自由度', '常用于方差和拟合优度检验'],
    quickValues: POSITIVE_QUICK,
    pdf: (x, p) => jStat.chisquare.pdf(x, p.df),
    cdf: (x, p) => jStat.chisquare.cdf(x, p.df),
    quantile: (pValue, p) => jStat.chisquare.inv(pValue, p.df),
  },
  f: {
    id: 'f',
    kind: 'continuous',
    title: 'F 分布',
    subtitle: '计算 F(d1,d2) 分布概率、区间面积和临界值',
    variable: 'F',
    parameterDefinitions: [
      { key: 'df1', label: '分子自由度 d1', min: 1, max: 200, step: 1, defaultValue: 5, description: '分子自由度', integer: true },
      { key: 'df2', label: '分母自由度 d2', min: 1, max: 200, step: 1, defaultValue: 10, description: '分母自由度', integer: true },
    ],
    modes: ['left', 'right', 'between', 'criticalLeft', 'criticalRight'],
    defaultState: { mode: 'right', params: { df1: 5, df2: 10 }, x: 2, a: 0.5, b: 2, p: 0.05 },
    domain: () => [0, 6],
    formulas: ['F ~ F(d1,d2)', '常用于方差比和 ANOVA', '右尾概率是 F 检验的常见形式'],
    quickValues: [0.1, 0.5, 1, 1.5, 2, 3, 4, 5],
    pdf: (x, p) => jStat.centralF.pdf(x, p.df1, p.df2),
    cdf: (x, p) => jStat.centralF.cdf(x, p.df1, p.df2),
    quantile: (pValue, p) => jStat.centralF.inv(pValue, p.df1, p.df2),
  },
  binomial: {
    id: 'binomial',
    kind: 'discrete',
    title: '二项分布',
    subtitle: '计算 X ~ Bin(n,p) 的点概率、尾概率和区间概率',
    variable: 'X',
    parameterDefinitions: [
      { key: 'n', label: '试验次数 n', min: 1, max: 100, step: 1, defaultValue: 10, description: '独立伯努利试验次数', integer: true },
      { key: 'p', label: '成功概率 p', min: 0.001, max: 0.999, step: 0.01, defaultValue: 0.5, description: '单次试验成功概率' },
    ],
    modes: ['exact', 'left', 'right', 'between'],
    defaultState: { mode: 'exact', params: { n: 10, p: 0.5 }, x: 5, a: 3, b: 7, p: 0.95 },
    domain: (p) => [0, p.n],
    formulas: ['X ~ Bin(n,p)', 'P(X=k)=C(n,k)p^k(1-p)^(n-k)', 'E(X)=np'],
    quickValues: DISCRETE_QUICK,
    pmf: (k, p) => jStat.binomial.pdf(Math.round(k), p.n, p.p),
    cdf: (k, p) => jStat.binomial.cdf(Math.floor(k), p.n, p.p),
  },
  poisson: {
    id: 'poisson',
    kind: 'discrete',
    title: '泊松分布',
    subtitle: '计算 X ~ Pois(λ) 的点概率、尾概率和区间概率',
    variable: 'X',
    parameterDefinitions: [{ key: 'lambda', label: '强度 λ', min: 0.1, max: 50, step: 0.1, defaultValue: 3, description: '单位区间平均发生次数' }],
    modes: ['exact', 'left', 'right', 'between'],
    defaultState: { mode: 'left', params: { lambda: 3 }, x: 3, a: 1, b: 5, p: 0.95 },
    domain: (p) => [0, Math.ceil(Math.max(12, p.lambda + 5 * Math.sqrt(p.lambda)))],
    formulas: ['X ~ Pois(λ)', 'P(X=k)=e^(-λ)λ^k/k!', 'E(X)=Var(X)=λ'],
    quickValues: DISCRETE_QUICK,
    pmf: (k, p) => jStat.poisson.pdf(Math.round(k), p.lambda),
    cdf: (k, p) => jStat.poisson.cdf(Math.floor(k), p.lambda),
  },
}

export function distributionById(id: DistributionId) {
  return DISTRIBUTIONS[id]
}

export function formatProbability(value: number) {
  return formatNumber(value, 6)
}
