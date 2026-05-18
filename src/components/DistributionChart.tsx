import { useState } from 'react'
import { adaptiveSampleRange, type SamplePoint } from '../chartSampling'
import type { DistributionDefinition, ProbabilityResult } from '../types'

const WIDTH = 920
const HEIGHT = 360
const PAD_X = 42
const TOP = 64
const BASELINE = 286
const SAMPLE_COUNT = 240

interface DistributionChartProps {
  definition: DistributionDefinition
  params: Record<string, number>
  result: ProbabilityResult
}

function xScale(value: number, min: number, max: number) {
  return PAD_X + ((value - min) / (max - min || 1)) * (WIDTH - PAD_X * 2)
}

function yScale(value: number, maxY: number) {
  return BASELINE - (value / (maxY || 1)) * (BASELINE - TOP)
}

function pathFromPoints(points: ReadonlyArray<readonly [number, number]>) {
  return points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`).join(' ')
}

function formatChartNumber(value: number, digits = 4) {
  return value.toLocaleString('zh-CN', { maximumFractionDigits: digits })
}

function formatChartProbability(value: number) {
  return value.toLocaleString('zh-CN', { minimumFractionDigits: 4, maximumFractionDigits: 4 })
}

function safeDensity(definition: DistributionDefinition, params: Record<string, number>, x: number) {
  return safePdfValue((value) => definition.pdf?.(value, params) ?? 0, x)
}

function safePdfValue(pdf: (x: number) => number, x: number) {
  const value = pdf(x)
  return Number.isFinite(value) && value > 0 ? value : 0
}

function pixelPoints(points: ReadonlyArray<SamplePoint>, min: number, max: number, maxY: number) {
  return points.map(([x, y]) => [xScale(x, min, max), yScale(y, maxY)] as const)
}

function estimateMaxY(definition: DistributionDefinition, params: Record<string, number>, min: number, max: number) {
  const referenceCurves = definition.referenceCurves?.(params) ?? []
  const sampleValues = Array.from({ length: SAMPLE_COUNT + 1 }, (_, index) => {
    const x = min + ((max - min) * index) / SAMPLE_COUNT
    return Math.max(safeDensity(definition, params, x), ...referenceCurves.map((curve) => safePdfValue(curve.pdf, x)))
  })
  return Math.max(...sampleValues, 0.01)
}

function continuousPath(definition: DistributionDefinition, params: Record<string, number>, min: number, max: number, maxY: number) {
  return continuousPdfPath((x) => safeDensity(definition, params, x), min, max, maxY)
}

function continuousPdfPath(pdf: (x: number) => number, min: number, max: number, maxY: number) {
  const rawPoints = adaptiveSampleRange(min, max, (x) => safePdfValue(pdf, x), {
    initialSegments: 72,
    maxDepth: 6,
    scale: maxY,
    tolerance: 0.0022,
  })
  return pathFromPoints(pixelPoints(rawPoints, min, max, maxY))
}

function continuousShade(definition: DistributionDefinition, params: Record<string, number>, min: number, max: number, maxY: number, from: number, to: number) {
  const start = Math.max(min, Math.min(from, to))
  const end = Math.min(max, Math.max(from, to))
  if (end <= start) {
    return ''
  }

  const spanRatio = (end - start) / (max - min || 1)
  const rawPoints = adaptiveSampleRange(start, end, (x) => safeDensity(definition, params, x), {
    initialSegments: Math.max(12, Math.round(spanRatio * 72)),
    maxDepth: 6,
    scale: maxY,
    tolerance: 0.0022,
  })
  const points = pixelPoints(rawPoints, min, max, maxY)
  return `M ${xScale(start, min, max).toFixed(2)} ${BASELINE} ${pathFromPoints(points).replace('M', 'L')} L ${xScale(end, min, max).toFixed(
    2,
  )} ${BASELINE} Z`
}

export function DistributionChart({ definition, params, result }: DistributionChartProps) {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null)
  const [domainMin, domainMax] = definition.domain(params)

  if (definition.kind === 'discrete') {
    const min = Math.ceil(domainMin)
    const max = Math.floor(domainMax)
    const values = Array.from({ length: max - min + 1 }, (_, index) => min + index)
    const heights = values.map((value) => definition.pmf?.(value, params) ?? 0)
    const maxY = Math.max(...heights, 0.01)
    const barWidth = Math.max(5, (WIDTH - PAD_X * 2) / values.length - 4)
    const activeValues = result.barRange ? values.filter((value) => value >= result.barRange![0] && value <= result.barRange![1]) : []
    const focusedValue = hoveredBar ?? (activeValues.length === 1 ? activeValues[0] : null)
    const focusedPmf = focusedValue === null ? null : definition.pmf?.(focusedValue, params) ?? 0
    const focusedCdf = focusedValue === null ? null : definition.cdf(focusedValue, params)
    const focusedRightTail = focusedValue === null ? null : 1 - definition.cdf(focusedValue - 1, params)

    return (
      <section className="chart-panel" aria-label={`${definition.title} 图表`}>
        <div className="chart-legend">
          <span className="legend-swatch" />
          <span>{result.label}</span>
          {result.chartAnnotations?.barLabel ? <span className="chart-legend-detail">{result.chartAnnotations.barLabel}</span> : null}
          {activeValues.length > 1 ? (
            <span className="chart-data-chip">选中 k={activeValues[0]} 到 {activeValues[activeValues.length - 1]}</span>
          ) : null}
          {focusedValue !== null && focusedPmf !== null && focusedCdf !== null && focusedRightTail !== null ? (
            <span className="chart-data-chip">
              k={focusedValue} · PMF {formatChartProbability(focusedPmf)} · CDF {formatChartProbability(focusedCdf)} · 右尾 {formatChartProbability(focusedRightTail)}
            </span>
          ) : null}
        </div>
        <svg className="normal-chart" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={result.label}>
          <line x1={PAD_X} x2={WIDTH - PAD_X} y1={BASELINE} y2={BASELINE} className="chart-axis" />
          {values.map((value) => {
            const active = result.barRange ? value >= result.barRange[0] && value <= result.barRange[1] : false
            const h = BASELINE - yScale(definition.pmf?.(value, params) ?? 0, maxY)
            const x = xScale(value, min, max) - barWidth / 2
            return (
              <g
                key={`bar-${value}`}
                tabIndex={0}
                role="listitem"
                aria-label={`k=${value}, PMF=${formatChartProbability(definition.pmf?.(value, params) ?? 0)}`}
                onMouseEnter={() => setHoveredBar(value)}
                onMouseLeave={() => setHoveredBar(null)}
                onFocus={() => setHoveredBar(value)}
                onBlur={() => setHoveredBar(null)}
              >
                <rect x={x} y={BASELINE - h} width={barWidth} height={h} rx="4" className={active ? 'bar active' : 'bar'} />
              </g>
            )
          })}
          {values.filter((value) => value === min || value === max || value % Math.max(1, Math.ceil(values.length / 8)) === 0).map((value) => (
            <text key={`tick-${value}`} x={xScale(value, min, max)} y={BASELINE + 28} textAnchor="middle" className="chart-tick">
              {value}
            </text>
          ))}
          <text x={WIDTH - PAD_X} y={HEIGHT - 12} textAnchor="end" className="axis-label">
            {definition.variable}
          </text>
        </svg>
      </section>
    )
  }

  const maxY = estimateMaxY(definition, params, domainMin, domainMax)
  const referenceCurves = definition.referenceCurves?.(params) ?? []
  const chartGuides = definition.chartGuides?.(params).filter((guide) => guide.value >= domainMin && guide.value <= domainMax) ?? []

  return (
    <section className="chart-panel" aria-label={`${definition.title} 曲线图`}>
      <div className="chart-legend">
        <span className="legend-swatch" />
        <span>{result.label}</span>
        {result.chartAnnotations?.shadeLabel ? <span className="chart-legend-detail">{result.chartAnnotations.shadeLabel}</span> : null}
        {referenceCurves.map((curve) => (
          <span key={curve.label} className="chart-data-chip reference-chip">
            {curve.label}
          </span>
        ))}
        {chartGuides.map((guide) => (
          <span key={`${guide.kind}-${guide.value}`} className={`chart-data-chip guide-chip ${guide.kind}`}>
            {guide.label}
          </span>
        ))}
        {result.chartAnnotations?.markerLabels?.map((label, index) => (
          <span key={`${label}-${index}`} className="chart-data-chip">
            {label}
          </span>
        ))}
      </div>
      <svg className="normal-chart" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`${result.label} 的阴影面积`}>
        <defs>
          <linearGradient id={`areaFill-${definition.id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#f7b955" stopOpacity="0.82" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.25" />
          </linearGradient>
        </defs>
        {result.shadeRanges.map(([from, to], index) => (
          <path key={`${from}-${to}-${index}`} d={continuousShade(definition, params, domainMin, domainMax, maxY, from, to)} fill={`url(#areaFill-${definition.id})`} />
        ))}
        {referenceCurves.map((curve) => (
          <path key={curve.label} d={continuousPdfPath(curve.pdf, domainMin, domainMax, maxY)} className="reference-curve-line" />
        ))}
        <path d={continuousPath(definition, params, domainMin, domainMax, maxY)} className="curve-line" />
        <line x1={PAD_X} x2={WIDTH - PAD_X} y1={BASELINE} y2={BASELINE} className="chart-axis" />
        {Array.from({ length: 9 }, (_, index) => domainMin + ((domainMax - domainMin) * index) / 8).map((tick, index) => (
          <g key={`tick-${index}`}>
            <line x1={xScale(tick, domainMin, domainMax)} x2={xScale(tick, domainMin, domainMax)} y1={TOP} y2={BASELINE} className="chart-grid" />
            <text x={xScale(tick, domainMin, domainMax)} y={BASELINE + 30} textAnchor="middle" className="chart-tick">
              {tick.toLocaleString('zh-CN', { maximumFractionDigits: 1 })}
            </text>
          </g>
        ))}
        {chartGuides.map((guide) => (
          <line
            key={`guide-${guide.kind}-${guide.value}`}
            x1={xScale(guide.value, domainMin, domainMax)}
            x2={xScale(guide.value, domainMin, domainMax)}
            y1={TOP}
            y2={BASELINE}
            className={`chart-guide-line ${guide.kind}`}
          />
        ))}
        {result.markers.map((marker, index) => {
          return (
            <g key={`${marker}-${index}`}>
              <line x1={xScale(marker, domainMin, domainMax)} x2={xScale(marker, domainMin, domainMax)} y1={TOP} y2={BASELINE} className="marker-line" />
              <circle cx={xScale(marker, domainMin, domainMax)} cy={BASELINE} r="5.5" className="marker-dot" />
              <text x={xScale(marker, domainMin, domainMax)} y={TOP - 16} textAnchor="middle" className="marker-index-label">
                {formatChartNumber(marker, 3)}
              </text>
            </g>
          )
        })}
        <text x={WIDTH - PAD_X} y={HEIGHT - 12} textAnchor="end" className="axis-label">
          {definition.variable}
        </text>
      </svg>
    </section>
  )
}
