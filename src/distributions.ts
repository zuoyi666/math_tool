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

function continuousArgument(definition: DistributionDefinition) {
  if (definition.id === 'normal') return 'z'
  if (definition.id === 'studentT') return 't'
  return 'x'
}

function cdfLatex(definition: DistributionDefinition, argument: string) {
  if (definition.id === 'normal') return `\\Phi(${argument})`
  if (definition.id === 'studentT') return `F_t(${argument})`
  if (definition.id === 'chiSquare') return `F_{\\chi^2}(${argument})`
  if (definition.id === 'f') return `F_F(${argument})`
  return `F(${argument})`
}

function inverseCdfLatex(definition: DistributionDefinition, argument: string) {
  if (definition.id === 'normal') return `\\Phi^{-1}(${argument})`
  if (definition.id === 'studentT') return `F_t^{-1}(${argument})`
  if (definition.id === 'chiSquare') return `F_{\\chi^2}^{-1}(${argument})`
  if (definition.id === 'f') return `F_F^{-1}(${argument})`
  return `F^{-1}(${argument})`
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
  const symbolicX = continuousArgument(definition)
  const cdfX = safeCdf(definition, x, params)
  const density = definition.pdf?.(x, params) ?? 0
  let probability = cdfX
  let label = `P(${variable} ≤ ${formatCompact(x)})`
  let formula = cdfLatex(definition, symbolicX)
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
    formula = `1-${cdfLatex(definition, symbolicX)}`
    shadeRanges = [[x, domainMax]]
    interpretation = probabilityInterpretation(definition, label, probability, mode)
  } else if (mode === 'between') {
    probability = safeCdf(definition, b, params) - safeCdf(definition, a, params)
    label = `P(${formatCompact(a)} ≤ ${variable} ≤ ${formatCompact(b)})`
    formula = `${cdfLatex(definition, 'b')}-${cdfLatex(definition, 'a')}`
    markers = [a, b]
    shadeRanges = [[a, b]]
    xSummary = `a = ${formatCompact(a)}, b = ${formatCompact(b)}`
    interpretation = probabilityInterpretation(definition, label, probability, mode)
  } else if (mode === 'twoTail') {
    const absX = Math.abs(x)
    probability = 2 * (1 - safeCdf(definition, absX, params))
    label = `P(|${variable}| ≥ ${formatCompact(absX)})`
    formula = `2\\left(1-${cdfLatex(definition, `|${symbolicX}|`)}\\right)`
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
    formula = inverseCdfLatex(definition, 'p')
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
    formula = inverseCdfLatex(definition, '1-p')
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
    formulas: [
      {
        latex: 'Z \\sim N(0,1)',
        description: '标准正态变量的记号，表示均值为 0、标准差为 1 的正态分布。',
        terms: [
          { symbol: 'Z', meaning: '标准化后的随机变量，也就是 z 分数。' },
          { symbol: 'N(0,1)', meaning: '均值为 0、方差为 1 的正态分布。' },
        ],
        example: {
          question: '某考试成绩标准化后 z=1，表示它在标准正态表中的哪个位置？',
          solution: '把 Z 看作标准化分数，z=1 表示该成绩比平均值高 1 个标准差。',
        },
      },
      {
        latex: '\\phi(z)=\\frac{1}{\\sqrt{2\\pi}}e^{-z^2/2}',
        description: '标准正态密度函数，用来画钟形曲线；某一点的高度不是概率，曲线下的面积才是概率。',
        terms: [
          { symbol: '\\phi(z)', meaning: 'z 点处的概率密度。' },
          { symbol: 'z', meaning: '横轴上的标准化取值。' },
          { symbol: 'e', meaning: '自然常数，约为 2.718。' },
        ],
        example: {
          question: '想比较 z=0 和 z=2 哪个位置曲线更高。',
          solution: '代入密度函数可知 φ(0) 最大，φ(2) 更低；这说明靠近均值的位置更常见。',
        },
      },
      {
        latex: '\\Phi(z)=P(Z\\le z)',
        description: '标准正态累计分布函数，表示 Z 不超过 z 的左侧面积。',
        terms: [
          { symbol: '\\Phi(z)', meaning: '从负无穷到 z 的累计概率。' },
          { symbol: 'P(Z\\le z)', meaning: '事件 Z 小于或等于 z 的概率。' },
        ],
        example: {
          question: '求标准正态变量不超过 1.96 的概率。',
          solution: '选择左尾并输入 z=1.96，可得到约 0.975 的累计概率。',
        },
      },
    ],
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
    formulas: [
      {
        latex: 'T \\sim t_{\\nu}',
        description: 't 分布通常用于样本量较小、总体标准差未知时的均值检验。',
        terms: [
          { symbol: 'T', meaning: '服从 t 分布的统计量。' },
          { symbol: '\\nu', meaning: '自由度，常见场景中等于样本量减 1。' },
        ],
        example: {
          question: '样本量 n=11 做单样本 t 检验，自由度是多少？',
          solution: '单样本 t 检验常用 ν=n-1，所以自由度为 10。',
        },
      },
      {
        latex: '\\nu \\in \\mathbb{N}^{+}',
        description: '自由度必须是正整数；自由度越大，t 分布越接近标准正态分布。',
        terms: [
          { symbol: '\\mathbb{N}^{+}', meaning: '正整数集合，如 1、2、3。' },
        ],
        example: {
          question: 'ν=30 与 ν=3 的 t 分布哪个更接近标准正态？',
          solution: 'ν=30 更接近标准正态；自由度越大，t 分布尾部越不厚。',
        },
      },
      {
        latex: 'P(|T|\\ge t)=2\\left(1-F_t(|t|)\\right)',
        description: '双尾概率表示两端同样极端区域的总面积，常用于双侧 t 检验。',
        terms: [
          { symbol: '|T|', meaning: 'T 的绝对值，用来同时考虑左右两端。' },
          { symbol: 'F_t', meaning: 't 分布的累计分布函数。' },
        ],
        example: {
          question: '双侧 t 检验中统计量 t=2.1，想求双尾 p 值。',
          solution: '选择 t 分布“双尾”，输入 x=2.1 和自由度，工具会计算两端总面积。',
        },
      },
    ],
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
    formulas: [
      {
        latex: 'X \\sim \\chi^2_k',
        description: '卡方分布常用于方差检验、拟合优度检验和列联表检验。',
        terms: [
          { symbol: 'X', meaning: '服从卡方分布的随机变量，只能取非负值。' },
          { symbol: 'k', meaning: '自由度，决定曲线形状。' },
        ],
        example: {
          question: '拟合优度检验有 5 个类别并估计 1 个参数，自由度大约是多少？',
          solution: '常见做法是类别数减 1 再减估计参数数，即 k=5-1-1=3。',
        },
      },
      {
        latex: 'k \\in \\mathbb{N}^{+}',
        description: '自由度 k 必须是正整数；k 越大，分布峰值通常向右移动。',
        terms: [
          { symbol: '\\mathbb{N}^{+}', meaning: '正整数集合。' },
        ],
        example: {
          question: '卡方分布能否输入 x=-1？',
          solution: '不能。卡方变量是平方和形式，取值范围从 0 开始。',
        },
      },
      {
        latex: 'P(a\\le X\\le b)=F_{\\chi^2}(b)-F_{\\chi^2}(a)',
        description: '区间概率等于右端点累计概率减去左端点累计概率。',
        terms: [
          { symbol: 'a,b', meaning: '区间左右端点，计算时会自动按小到大处理。' },
          { symbol: 'F_{\\chi^2}', meaning: '卡方分布的累计分布函数。' },
        ],
        example: {
          question: '求 χ² 变量落在 2 到 8 之间的概率。',
          solution: '选择“区间”，输入 a=2、b=8，工具会用右端累计概率减左端累计概率。',
        },
      },
    ],
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
    formulas: [
      {
        latex: 'X \\sim F_{d_1,d_2}',
        description: 'F 分布常用于方差比检验和 ANOVA，取值范围为非负数。',
        terms: [
          { symbol: 'd_1', meaning: '分子自由度。' },
          { symbol: 'd_2', meaning: '分母自由度。' },
        ],
        example: {
          question: '比较两组方差时，分子样本自由度为 5，分母样本自由度为 10。',
          solution: '在 F 分布中设置 d1=5、d2=10，再查询对应概率或临界值。',
        },
      },
      {
        latex: 'd_1,d_2 \\in \\mathbb{N}^{+}',
        description: '两个自由度都必须是正整数，且都会影响曲线形状和临界值。',
        terms: [
          { symbol: '\\mathbb{N}^{+}', meaning: '正整数集合。' },
        ],
        example: {
          question: 'F 分布参数写作 F(5,10)，哪个是分子自由度？',
          solution: '第一个数 5 是 d1，也就是分子自由度；第二个数 10 是 d2。',
        },
      },
      {
        latex: 'P(X\\ge x)=1-F_F(x)',
        description: '右尾概率是 F 检验最常用的查表方向，表示达到或超过 x 的概率。',
        terms: [
          { symbol: 'F_F(x)', meaning: 'F 分布在 x 处的累计概率。' },
          { symbol: 'x', meaning: '横轴上的 F 统计量取值。' },
        ],
        example: {
          question: 'F 检验统计量为 2，想知道右尾概率。',
          solution: '选择“右尾”，输入 x=2，并设置 d1、d2，结果就是 P(X≥2)。',
        },
      },
    ],
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
    formulas: [
      {
        latex: 'X \\sim \\operatorname{Bin}(n,p)',
        description: '二项分布描述 n 次独立重复试验中成功次数 X 的分布。',
        terms: [
          { symbol: 'n', meaning: '试验总次数。' },
          { symbol: 'p', meaning: '每次试验成功的概率。' },
          { symbol: 'X', meaning: '成功次数。' },
        ],
        example: {
          question: '投 10 次硬币，正面次数 X 应服从什么分布？',
          solution: '若硬币公平，则 X~Bin(10,0.5)。',
        },
      },
      {
        latex: 'P(X=k)=\\binom{n}{k}p^k(1-p)^{n-k}',
        description: '点概率公式，表示 n 次试验中恰好成功 k 次的概率。',
        terms: [
          { symbol: 'k', meaning: '目标成功次数，必须是 0 到 n 之间的整数。' },
          { symbol: '\\binom{n}{k}', meaning: '组合数，表示从 n 次试验中选出 k 次成功的方式数。' },
          { symbol: '1-p', meaning: '单次试验失败的概率。' },
        ],
        example: {
          question: '投 10 次公平硬币，恰好 5 次正面的概率是多少？',
          solution: '选择二项分布点概率，设置 n=10、p=0.5、k=5。',
        },
      },
      {
        latex: 'E(X)=np',
        description: '期望值表示长期平均成功次数。',
        terms: [
          { symbol: 'E(X)', meaning: '随机变量 X 的期望或平均水平。' },
        ],
        example: {
          question: 'n=20、p=0.3 时，平均成功次数是多少？',
          solution: 'E(X)=np=20×0.3=6。',
          latex: 'E(X)=20\\times 0.3=6',
        },
      },
    ],
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
    formulas: [
      {
        latex: 'X \\sim \\operatorname{Pois}(\\lambda)',
        description: '泊松分布描述固定时间或空间区间内事件发生次数。',
        terms: [
          { symbol: 'X', meaning: '事件发生次数。' },
          { symbol: '\\lambda', meaning: '单位区间内的平均发生次数，也叫强度。' },
        ],
        example: {
          question: '某路口平均每分钟 3 辆车通过，1 分钟内车辆数可用什么分布？',
          solution: '可用 X~Pois(3) 作为首个近似模型。',
        },
      },
      {
        latex: 'P(X=k)=\\frac{e^{-\\lambda}\\lambda^k}{k!}',
        description: '点概率公式，表示事件恰好发生 k 次的概率。',
        terms: [
          { symbol: 'k', meaning: '目标发生次数，必须是非负整数。' },
          { symbol: 'e', meaning: '自然常数，约为 2.718。' },
          { symbol: 'k!', meaning: 'k 的阶乘。' },
        ],
        example: {
          question: '平均每分钟 3 次事件，想求恰好发生 2 次的概率。',
          solution: '选择泊松分布点概率，设置 λ=3、k=2。',
        },
      },
      {
        latex: 'E(X)=\\operatorname{Var}(X)=\\lambda',
        description: '泊松分布的均值和方差都等于 λ，这是它的重要特征。',
        terms: [
          { symbol: 'E(X)', meaning: '平均发生次数。' },
          { symbol: '\\operatorname{Var}(X)', meaning: '发生次数的方差。' },
        ],
        example: {
          question: 'λ=4 的泊松分布，均值和方差分别是多少？',
          solution: '均值和方差都等于 λ，所以都是 4。',
        },
      },
    ],
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
