import Papa from 'papaparse'
import type { DatasetSummary, NumericColumnSummary } from './types'

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

export function analyzeCsv(csvText: string): DatasetSummary {
  const parsed = Papa.parse<Record<string, string>>(csvText, { header: true, skipEmptyLines: true })
  const rows = parsed.data.filter((row) => Object.values(row).some((value) => String(value ?? '').trim() !== ''))
  const fields = parsed.meta.fields ?? []
  const numericByColumn = new Map<string, number[]>()
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
