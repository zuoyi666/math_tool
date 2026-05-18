import Papa from 'papaparse'
import type { DatasetSummary, DistributionSuggestion, NumericColumnSummary } from './types'

function quantile(sorted: number[], q: number) {
  if (sorted.length === 0) return Number.NaN
  const pos = (sorted.length - 1) * q
  const base = Math.floor(pos)
  const rest = pos - base
  return sorted[base + 1] === undefined ? sorted[base] : sorted[base] + rest * (sorted[base + 1] - sorted[base])
}

function summarizeColumn(name: string, values: Array<number | null>): NumericColumnSummary | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  if (numeric.length === 0) return null
  const sorted = [...numeric].sort((a, b) => a - b)
  const mean = numeric.reduce((sum, value) => sum + value, 0) / numeric.length
  const variance = numeric.length > 1 ? numeric.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (numeric.length - 1) : 0
  return {
    name,
    count: numeric.length,
    missing: values.length - numeric.length,
    mean,
    median: quantile(sorted, 0.5),
    variance,
    stdDev: Math.sqrt(variance),
    min: sorted[0],
    q1: quantile(sorted, 0.25),
    q3: quantile(sorted, 0.75),
    max: sorted[sorted.length - 1],
  }
}

function correlation(left: number[], right: number[]) {
  const pairs = left.map((value, index) => [value, right[index]]).filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b))
  if (pairs.length < 2) return Number.NaN
  const leftMean = pairs.reduce((sum, [value]) => sum + value, 0) / pairs.length
  const rightMean = pairs.reduce((sum, [, value]) => sum + value, 0) / pairs.length
  const numerator = pairs.reduce((sum, [a, b]) => sum + (a - leftMean) * (b - rightMean), 0)
  const leftDen = Math.sqrt(pairs.reduce((sum, [a]) => sum + (a - leftMean) ** 2, 0))
  const rightDen = Math.sqrt(pairs.reduce((sum, [, b]) => sum + (b - rightMean) ** 2, 0))
  return numerator / (leftDen * rightDen)
}

function queryNumber(value: number) {
  return Number(value.toFixed(4)).toString()
}

function clampProbability(value: number) {
  return Math.min(0.999, Math.max(0.001, value))
}

function isNonNegativeIntegerColumn(values: number[]) {
  return values.length > 0 && values.every((value) => Number.isInteger(value) && value >= 0)
}

function isBinaryColumn(values: number[]) {
  return values.length > 0 && values.every((value) => value === 0 || value === 1)
}

function buildDistributionSuggestions(summaries: NumericColumnSummary[], valuesByColumn: Map<string, number[]>): DistributionSuggestion[] {
  const suggestions: DistributionSuggestion[] = []

  for (const summary of summaries) {
    const values = valuesByColumn.get(summary.name) ?? []
    if (!values.length) continue

    if (isBinaryColumn(values)) {
      const probability = clampProbability(summary.mean)
      suggestions.push({
        column: summary.name,
        distributionId: 'binomial',
        label: '二项 / 伯努利建模',
        params: { n: 1, p: probability },
        reason: `${summary.name} 只包含 0/1，可把 1 看作成功，样本成功率约为 ${queryNumber(summary.mean)}。`,
        href: `#/binomial?n=1&p=${queryNumber(probability)}&mode=exact&x=1`,
      })
      continue
    }

    if (isNonNegativeIntegerColumn(values) && summary.mean <= 50) {
      const lambda = Math.max(0.1, summary.mean)
      suggestions.push({
        column: summary.name,
        distributionId: 'poisson',
        label: '泊松分布建模',
        params: { lambda },
        reason: `${summary.name} 是非负整数计数，可先用样本均值 λ=${queryNumber(summary.mean)} 作为泊松强度。`,
        href: `#/poisson?lambda=${queryNumber(lambda)}&mode=left&x=${Math.max(0, Math.round(summary.mean))}`,
      })
    }

    if (summary.count >= 2 && summary.stdDev > 0) {
      suggestions.push({
        column: summary.name,
        distributionId: 'normalGeneral',
        label: '正态分布建模',
        params: { mu: summary.mean, sigma: summary.stdDev },
        reason: `${summary.name} 是数值列，可先用样本均值 μ=${queryNumber(summary.mean)}、样本标准差 σ=${queryNumber(summary.stdDev)} 观察正态近似。`,
        href: `#/normalGeneral?mu=${queryNumber(summary.mean)}&sigma=${queryNumber(summary.stdDev)}&mode=left&x=${queryNumber(summary.mean)}`,
      })
    }
  }

  return suggestions
}

export function analyzeCsv(csvText: string): DatasetSummary {
  const parsed = Papa.parse<Record<string, string>>(csvText, { header: true, skipEmptyLines: true })
  const rows = parsed.data.filter((row) => Object.values(row).some((value) => String(value ?? '').trim() !== ''))
  const fields = parsed.meta.fields ?? []
  const numericByColumn = new Map<string, number[]>()
  const finiteValuesByColumn = new Map<string, number[]>()
  const summaries: NumericColumnSummary[] = []

  for (const field of fields) {
    const values = rows.map((row) => {
      const raw = String(row[field] ?? '').trim()
      if (!raw) return null
      const parsedValue = Number(raw)
      return Number.isFinite(parsedValue) ? parsedValue : null
    })
    const summary = summarizeColumn(field, values)
    if (summary) {
      summaries.push(summary)
      finiteValuesByColumn.set(
        field,
        values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value)),
      )
      numericByColumn.set(
        field,
        values.map((value) => (typeof value === 'number' ? value : Number.NaN)),
      )
    }
  }

  const correlations: DatasetSummary['correlations'] = []
  for (let i = 0; i < summaries.length; i += 1) {
    for (let j = i + 1; j < summaries.length; j += 1) {
      const left = summaries[i].name
      const right = summaries[j].name
      correlations.push({ left, right, value: correlation(numericByColumn.get(left) ?? [], numericByColumn.get(right) ?? []) })
    }
  }

  return {
    rowCount: rows.length,
    columnCount: fields.length,
    numericColumns: summaries,
    correlations,
    distributionSuggestions: buildDistributionSuggestions(summaries, finiteValuesByColumn),
  }
}

export function histogramBins(summary: NumericColumnSummary, count = 8) {
  const span = summary.max - summary.min || 1
  return Array.from({ length: count }, (_, index) => {
    const from = summary.min + (span * index) / count
    const to = summary.min + (span * (index + 1)) / count
    return { label: `${from.toFixed(1)}-${to.toFixed(1)}`, value: 0 }
  })
}
