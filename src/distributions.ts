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

function joinSummary(...parts: string[]) {
  return parts.filter(Boolean).join('; ')
}

function paramsOrDefault(paramsText: string) {
  return paramsText || '标准参数'
}

function probabilityInterpretation(definition: DistributionDefinition, label: string, probability: number, mode: QueryMode) {
  const percent = formatNumber(probability * 100, 2)
  const context =
    mode === 'left'
      ? '左尾表示不超过该取值的累计概率，常用于查累计分布表。'
      : mode === 'right'
        ? '右尾表示达到或超过该取值的概率，常用于显著性检验的拒绝域。'
        : mode === 'between'
          ? '区间概率表示落在两个端点之间的面积或柱形总和。'
          : mode === 'twoTail'
            ? '双尾概率常用于双侧检验，表示两端同等极端区域的总概率。'
            : '点概率表示离散变量恰好等于该值的概率。'
  return `${definition.title} 下，${label} 的概率约为 ${percent}%。${context}`
}

function criticalInterpretation(definition: DistributionDefinition, label: string, critical: number, probability: number, mode: QueryMode) {
  const direction = mode === 'criticalRight' ? '右尾面积' : '左尾累计概率'
  return `${definition.title} 下，当${direction}为 ${formatCompact(probability)} 时，临界值约为 ${formatCompact(critical)}。考试或检验中可把它作为拒绝域边界：观测值越过该边界时进入对应尾部区域。${label}`
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

export function applyDistributionQuickValue(definition: DistributionDefinition, state: DistributionState, value: number): DistributionState {
  if (state.mode === 'between') {
    return {
      ...state,
      a: definition.kind === 'discrete' ? Math.max(0, Math.round(value - 1)) : -Math.abs(value),
      b: definition.kind === 'discrete' ? Math.round(value) : Math.abs(value),
    }
  }
  return { ...state, x: value }
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
      formula = 'F(k)'
      barRange = [0, x]
    } else if (mode === 'right') {
      probability = 1 - safeCdf(definition, x - 1, params)
      label = `P(${variable} ≥ ${x})`
      formula = '1-F(k-1)'
      barRange = [x, upper]
    } else if (mode === 'between') {
      probability = safeCdf(definition, b, params) - safeCdf(definition, a - 1, params)
      label = `P(${a} ≤ ${variable} ≤ ${b})`
      formula = 'F(b)-F(a-1)'
      markers = [a, b]
      barRange = [a, b]
    } else {
      probability = pmf(x, params)
      label = `P(${variable} = ${x})`
      formula = 'P(X=k)'
      barRange = [x, x]
    }

    return {
      queryType: 'probability',
      probability,
      percent: probability * 100,
      label,
      primaryLabel: '概率',
      primaryValue: formatNumber(probability, 6),
      parameterSummary: joinSummary(paramsText, mode === 'between' ? `a = ${a}, b = ${b}` : `k = ${x}`),
      interpretation: probabilityInterpretation(definition, label, probability, mode),
      formula,
      detailRows: [
        { label: '概率', value: formatNumber(probability, 6) },
        { label: '百分比', value: `${formatNumber(probability * 100, 2)}%` },
        { label: 'CDF(k)', value: formatNumber(safeCdf(definition, x, params), 6) },
        { label: 'PMF(k)', value: formatNumber(pmf(x, params), 6) },
        { label: '参数', value: paramsOrDefault(paramsText) },
      ],
      markers,
      shadeRanges: [],
      chartAnnotations: {
        barLabel: `${label}, P=${formatNumber(probability, 4)}`,
      },
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
  let formula = 'F(x)'
  let queryType: ProbabilityResult['queryType'] = 'probability'
  let primaryLabel = '概率'
  let primaryValue = formatNumber(probability, 6)
  let markers = [x]
  let shadeRanges: Array<[number, number]> = [[domainMin, x]]
  let xSummary = `x = ${formatCompact(x)}`
  let detailRows: ProbabilityResult['detailRows'] | undefined
  let interpretation = probabilityInterpretation(definition, label, probability, mode)

  if (mode === 'right') {
    probability = 1 - cdfX
    label = `P(${variable} ≥ ${formatCompact(x)})`
    formula = '1-F(x)'
    shadeRanges = [[x, domainMax]]
    interpretation = probabilityInterpretation(definition, label, probability, mode)
  } else if (mode === 'between') {
    probability = safeCdf(definition, b, params) - safeCdf(definition, a, params)
    label = `P(${formatCompact(a)} ≤ ${variable} ≤ ${formatCompact(b)})`
    formula = 'F(b)-F(a)'
    markers = [a, b]
    shadeRanges = [[a, b]]
    xSummary = `a = ${formatCompact(a)}, b = ${formatCompact(b)}`
    interpretation = probabilityInterpretation(definition, label, probability, mode)
  } else if (mode === 'twoTail') {
    const absX = Math.abs(x)
    probability = 2 * (1 - safeCdf(definition, absX, params))
    label = `P(|${variable}| ≥ ${formatCompact(absX)})`
    formula = '2\\left(1-F(|x|)\\right)'
    markers = [-absX, absX]
    shadeRanges = [
      [domainMin, -absX],
      [absX, domainMax],
    ]
    xSummary = `|x| = ${formatCompact(absX)}`
    interpretation = probabilityInterpretation(definition, label, probability, mode)
  } else if (mode === 'criticalLeft' && definition.quantile) {
    const critical = definition.quantile(normalized.p, params)
    probability = normalized.p
    label = `CDF⁻¹(${formatCompact(normalized.p)}) = ${formatCompact(critical)}`
    formula = 'F^{-1}(p)'
    queryType = 'critical'
    primaryLabel = '临界值'
    primaryValue = formatCompact(critical)
    markers = [critical]
    shadeRanges = [[domainMin, critical]]
    xSummary = `左尾 p = ${formatCompact(normalized.p)}, 临界值 = ${formatCompact(critical)}`
    interpretation = criticalInterpretation(definition, label, critical, probability, mode)
    detailRows = [
      { label: '临界值', value: formatCompact(critical) },
      { label: '输入概率', value: formatCompact(normalized.p) },
      { label: '尾部方向', value: '左尾累计' },
      { label: 'CDF(临界值)', value: formatNumber(safeCdf(definition, critical, params), 6) },
      { label: 'PDF(临界值)', value: formatNumber(definition.pdf?.(critical, params) ?? 0, 6) },
      { label: '参数', value: paramsOrDefault(paramsText) },
    ]
  } else if (mode === 'criticalRight' && definition.quantile) {
    const critical = definition.quantile(1 - normalized.p, params)
    probability = normalized.p
    label = `P(${variable} ≥ ${formatCompact(critical)}) = ${formatCompact(normalized.p)}`
    formula = 'F^{-1}(1-p)'
    queryType = 'critical'
    primaryLabel = '临界值'
    primaryValue = formatCompact(critical)
    markers = [critical]
    shadeRanges = [[critical, domainMax]]
    xSummary = `右尾 p = ${formatCompact(normalized.p)}, 临界值 = ${formatCompact(critical)}`
    interpretation = criticalInterpretation(definition, label, critical, probability, mode)
    detailRows = [
      { label: '临界值', value: formatCompact(critical) },
      { label: '输入概率', value: formatCompact(normalized.p) },
      { label: '尾部方向', value: '右尾面积' },
      { label: 'CDF(临界值)', value: formatNumber(safeCdf(definition, critical, params), 6) },
      { label: 'PDF(临界值)', value: formatNumber(definition.pdf?.(critical, params) ?? 0, 6) },
      { label: '参数', value: paramsOrDefault(paramsText) },
    ]
  }

  probability = clamp(probability, 0, 1)
  if (queryType === 'probability') {
    primaryValue = formatNumber(probability, 6)
    detailRows = [
      { label: '概率', value: formatNumber(probability, 6) },
      { label: '百分比', value: `${formatNumber(probability * 100, 2)}%` },
      { label: 'CDF(x)', value: formatNumber(cdfX, 6) },
      { label: 'PDF(x)', value: formatNumber(density, 6) },
      { label: '参数', value: paramsOrDefault(paramsText) },
    ]
  }
  const finalDetailRows = detailRows ?? [
    { label: primaryLabel, value: primaryValue },
    { label: '参数', value: paramsOrDefault(paramsText) },
  ]

  return {
    queryType,
    probability,
    percent: probability * 100,
    label,
    primaryLabel,
    primaryValue,
    parameterSummary: joinSummary(paramsText, xSummary),
    interpretation,
    formula,
    detailRows: finalDetailRows,
    markers,
    shadeRanges,
    chartAnnotations: {
      shadeLabel: `阴影面积 = ${formatNumber(probability, 4)}`,
      markerLabels: markers.map((marker) => (queryType === 'critical' ? `临界值 ${formatCompact(marker)}` : `${variable} = ${formatCompact(marker)}`)),
    },
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
    formulas: ['Z \\sim N(0,1)', '\\phi(z)=\\frac{1}{\\sqrt{2\\pi}}e^{-z^2/2}', '\\Phi(z)=P(Z\\le z)'],
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
    formulas: ['T \\sim t_{\\nu}', '\\nu \\in \\mathbb{N}^{+}', 'P(|T|\\ge t)=2\\left(1-F_t(|t|)\\right)'],
    quickValues: CONTINUOUS_QUICK,
    parameterPresets: [
      { label: 'ν=1', params: { df: 1 } },
      { label: 'ν=5', params: { df: 5 } },
      { label: 'ν=10', params: { df: 10 } },
      { label: 'ν=30', params: { df: 30 } },
    ],
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
    formulas: ['X \\sim \\chi^2_k', 'k \\in \\mathbb{N}^{+}', 'P(a\\le X\\le b)=F_{\\chi^2}(b)-F_{\\chi^2}(a)'],
    quickValues: POSITIVE_QUICK,
    parameterPresets: [
      { label: 'k=1', params: { df: 1 } },
      { label: 'k=5', params: { df: 5 } },
      { label: 'k=10', params: { df: 10 } },
      { label: 'k=30', params: { df: 30 } },
    ],
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
    formulas: ['X \\sim F_{d_1,d_2}', 'd_1,d_2 \\in \\mathbb{N}^{+}', 'P(X\\ge x)=1-F_F(x)'],
    quickValues: [0.1, 0.5, 1, 1.5, 2, 3, 4, 5],
    parameterPresets: [
      { label: '5 / 10', params: { df1: 5, df2: 10 } },
      { label: '10 / 10', params: { df1: 10, df2: 10 } },
      { label: '5 / 20', params: { df1: 5, df2: 20 } },
      { label: '20 / 20', params: { df1: 20, df2: 20 } },
    ],
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
    formulas: ['X \\sim \\operatorname{Bin}(n,p)', 'P(X=k)=\\binom{n}{k}p^k(1-p)^{n-k}', 'E(X)=np'],
    quickValues: DISCRETE_QUICK,
    parameterPresets: [
      { label: 'n=10, p=.5', params: { n: 10, p: 0.5 } },
      { label: 'n=20, p=.5', params: { n: 20, p: 0.5 } },
      { label: 'n=20, p=.2', params: { n: 20, p: 0.2 } },
      { label: 'n=50, p=.1', params: { n: 50, p: 0.1 } },
    ],
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
    formulas: ['X \\sim \\operatorname{Pois}(\\lambda)', 'P(X=k)=\\frac{e^{-\\lambda}\\lambda^k}{k!}', 'E(X)=\\operatorname{Var}(X)=\\lambda'],
    quickValues: DISCRETE_QUICK,
    parameterPresets: [
      { label: 'λ=1', params: { lambda: 1 } },
      { label: 'λ=3', params: { lambda: 3 } },
      { label: 'λ=5', params: { lambda: 5 } },
      { label: 'λ=10', params: { lambda: 10 } },
    ],
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
