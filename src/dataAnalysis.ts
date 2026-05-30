import Papa from 'papaparse'
import type { ColumnProfile, DatasetSummary, DistributionSuggestion, HistogramBin, NumericColumnSummary } from './types'

function quantile(sorted: number[], q: number) {
  if (sorted.length === 0) return Number.NaN
  const pos = (sorted.length - 1) * q
  const base = Math.floor(pos)
  const rest = pos - base
  return sorted[base + 1] === undefined ? sorted[base] : sorted[base] + rest * (sorted[base + 1] - sorted[base])
}

function buildHistogram(values: number[], binCount = 8): HistogramBin[] {
  if (!values.length) return []
  const sorted = [...values].sort((a, b) => a - b)
  const min = sorted[0]
  const max = sorted[sorted.length - 1]
  const span = max - min

  if (span === 0) {
    return [{ from: min, to: max, count: values.length }]
  }

  const bins = Array.from({ length: binCount }, (_, index) => {
    const from = min + (span * index) / binCount
    const to = min + (span * (index + 1)) / binCount
    return { from, to, count: 0 }
  })

  for (const value of values) {
    const rawIndex = Math.floor(((value - min) / span) * binCount)
    const index = Math.min(binCount - 1, Math.max(0, rawIndex))
    bins[index].count += 1
  }

  return bins
}

function summarizeColumn(name: string, values: Array<number | null>): NumericColumnSummary | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  if (numeric.length === 0) return null
  const sorted = [...numeric].sort((a, b) => a - b)
  const mean = numeric.reduce((sum, value) => sum + value, 0) / numeric.length
  const variance = numeric.length > 1 ? numeric.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (numeric.length - 1) : 0
  const q1 = quantile(sorted, 0.25)
  const q3 = quantile(sorted, 0.75)
  const iqr = q3 - q1
  const lowerFence = q1 - 1.5 * iqr
  const upperFence = q3 + 1.5 * iqr
  return {
    name,
    count: numeric.length,
    missing: values.length - numeric.length,
    uniqueCount: new Set(numeric).size,
    mean,
    median: quantile(sorted, 0.5),
    variance,
    stdDev: Math.sqrt(variance),
    min: sorted[0],
    q1,
    q3,
    iqr,
    max: sorted[sorted.length - 1],
    outlierCount: iqr === 0 ? 0 : numeric.filter((value) => value < lowerFence || value > upperFence).length,
    histogram: buildHistogram(numeric),
  }
}

function buildColumnProfile(name: string, rawValues: string[]): ColumnProfile {
  const normalized = rawValues.map((value) => String(value ?? '').trim())
  const nonEmptyValues = normalized.filter(Boolean)
  const numericCount = nonEmptyValues.filter((value) => Number.isFinite(Number(value))).length
  const frequency = new Map<string, number>()

  for (const value of nonEmptyValues) {
    frequency.set(value, (frequency.get(value) ?? 0) + 1)
  }

  const type: ColumnProfile['type'] =
    nonEmptyValues.length === 0 ? 'empty' : numericCount === nonEmptyValues.length ? 'numeric' : numericCount > 0 ? 'mixed' : 'text'

  return {
    name,
    type,
    nonEmpty: nonEmptyValues.length,
    missing: rawValues.length - nonEmptyValues.length,
    uniqueCount: frequency.size,
    topValues: [...frequency.entries()]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, 5)
      .map(([value, count]) => ({ value, count })),
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
  const columnProfiles: ColumnProfile[] = []
  const summaries: NumericColumnSummary[] = []

  for (const field of fields) {
    const rawValues = rows.map((row) => String(row[field] ?? ''))
    columnProfiles.push(buildColumnProfile(field, rawValues))
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
    columnProfiles,
    numericColumns: summaries,
    correlations,
    distributionSuggestions: buildDistributionSuggestions(summaries, finiteValuesByColumn),
    sampleRows: rows.slice(0, 5).map((row) => Object.fromEntries(fields.map((field) => [field, String(row[field] ?? '')]))),
  }
}

export function histogramBins(summary: NumericColumnSummary) {
  return summary.histogram.map((bin) => ({ label: `${bin.from.toFixed(1)}-${bin.to.toFixed(1)}`, value: bin.count }))
}
