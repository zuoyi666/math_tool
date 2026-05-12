import type { DistributionDefinition, ProbabilityResult } from '../types'

const WIDTH = 920
const HEIGHT = 340
const PAD_X = 42
const TOP = 28
const BASELINE = 266
const SAMPLE_COUNT = 220

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

function clampLabelX(x: number) {
  return Math.min(WIDTH - PAD_X - 24, Math.max(PAD_X + 24, x))
}

function markerLabelY(index: number, marker: number, min: number, max: number) {
  const x = xScale(marker, min, max)
  const isLeftEdge = x < PAD_X + 120
  const isRightEdge = x > WIDTH - PAD_X - 120
  if (isLeftEdge || isRightEdge) return TOP + 72 + index * 20
  return TOP + 38 + index * 20
}

function pathFromPoints(points: ReadonlyArray<readonly [number, number]>) {
  return points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`).join(' ')
}

function continuousPath(definition: DistributionDefinition, params: Record<string, number>, min: number, max: number, maxY: number) {
  const points = Array.from({ length: SAMPLE_COUNT + 1 }, (_, index) => {
    const ratio = index / SAMPLE_COUNT
    const x = min + (max - min) * ratio
    return [xScale(x, min, max), yScale(definition.pdf?.(x, params) ?? 0, maxY)] as const
  })
  return pathFromPoints(points)
}

function continuousShade(definition: DistributionDefinition, params: Record<string, number>, min: number, max: number, maxY: number, from: number, to: number) {
  const start = Math.max(min, Math.min(from, to))
  const end = Math.min(max, Math.max(from, to))
  const samples = Math.max(16, Math.round(((end - start) / (max - min || 1)) * SAMPLE_COUNT))
  const points = Array.from({ length: samples + 1 }, (_, index) => {
    const ratio = index / samples
    const x = start + (end - start) * ratio
    return [xScale(x, min, max), yScale(definition.pdf?.(x, params) ?? 0, maxY)] as const
  })
  return `M ${xScale(start, min, max).toFixed(2)} ${BASELINE} ${pathFromPoints(points).replace('M', 'L')} L ${xScale(end, min, max).toFixed(
    2,
  )} ${BASELINE} Z`
}

export function DistributionChart({ definition, params, result }: DistributionChartProps) {
  const [domainMin, domainMax] = definition.domain(params)

  if (definition.kind === 'discrete') {
    const min = Math.ceil(domainMin)
    const max = Math.floor(domainMax)
    const values = Array.from({ length: max - min + 1 }, (_, index) => min + index)
    const heights = values.map((value) => definition.pmf?.(value, params) ?? 0)
    const maxY = Math.max(...heights, 0.01)
    const barWidth = Math.max(5, (WIDTH - PAD_X * 2) / values.length - 4)
    const activeValues = result.barRange ? values.filter((value) => value >= result.barRange![0] && value <= result.barRange![1]) : []
    const labelX = activeValues.length ? xScale((activeValues[0] + activeValues[activeValues.length - 1]) / 2, min, max) : PAD_X

    return (
      <section className="chart-panel" aria-label={`${definition.title} 图表`}>
        <div className="chart-legend">
          <span className="legend-swatch" />
          <span>{result.label}</span>
          {result.chartAnnotations?.barLabel ? <span className="chart-legend-detail">{result.chartAnnotations.barLabel}</span> : null}
        </div>
        <svg className="normal-chart" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={result.label}>
          <line x1={PAD_X} x2={WIDTH - PAD_X} y1={BASELINE} y2={BASELINE} className="chart-axis" />
          {values.map((value) => {
            const active = result.barRange ? value >= result.barRange[0] && value <= result.barRange[1] : false
            const h = BASELINE - yScale(definition.pmf?.(value, params) ?? 0, maxY)
            const x = xScale(value, min, max) - barWidth / 2
            return (
              <g key={value}>
                <rect x={x} y={BASELINE - h} width={barWidth} height={h} rx="4" className={active ? 'bar active' : 'bar'} />
                {active && activeValues.length <= 4 ? (
                  <text x={xScale(value, min, max)} y={Math.max(TOP + 16, BASELINE - h - 8)} textAnchor="middle" className="bar-value-label">
                    {value}
                  </text>
                ) : null}
              </g>
            )
          })}
          {result.chartAnnotations?.barLabel && activeValues.length <= 1 ? (
            <text x={clampLabelX(labelX)} y={TOP + 20} textAnchor="middle" className="chart-annotation-label">
              {result.chartAnnotations.barLabel}
            </text>
          ) : null}
          {values.filter((value) => value === min || value === max || value % Math.max(1, Math.ceil(values.length / 8)) === 0).map((value) => (
            <text key={value} x={xScale(value, min, max)} y={BASELINE + 28} textAnchor="middle" className="chart-tick">
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

  const sampleValues = Array.from({ length: SAMPLE_COUNT + 1 }, (_, index) => {
    const x = domainMin + ((domainMax - domainMin) * index) / SAMPLE_COUNT
    return definition.pdf?.(x, params) ?? 0
  })
  const maxY = Math.max(...sampleValues, 0.01)

  return (
    <section className="chart-panel" aria-label={`${definition.title} 曲线图`}>
      <div className="chart-legend">
        <span className="legend-swatch" />
        <span>{result.label}</span>
        {result.chartAnnotations?.shadeLabel ? <span className="chart-legend-detail">{result.chartAnnotations.shadeLabel}</span> : null}
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
        <path d={continuousPath(definition, params, domainMin, domainMax, maxY)} className="curve-line" />
        <line x1={PAD_X} x2={WIDTH - PAD_X} y1={BASELINE} y2={BASELINE} className="chart-axis" />
        {Array.from({ length: 9 }, (_, index) => domainMin + ((domainMax - domainMin) * index) / 8).map((tick) => (
          <g key={tick}>
            <line x1={xScale(tick, domainMin, domainMax)} x2={xScale(tick, domainMin, domainMax)} y1={TOP} y2={BASELINE} className="chart-grid" />
            <text x={xScale(tick, domainMin, domainMax)} y={BASELINE + 30} textAnchor="middle" className="chart-tick">
              {tick.toLocaleString('zh-CN', { maximumFractionDigits: 1 })}
            </text>
          </g>
        ))}
        {result.markers.map((marker, index) => (
          <g key={`${marker}-${index}`}>
            <line x1={xScale(marker, domainMin, domainMax)} x2={xScale(marker, domainMin, domainMax)} y1={TOP} y2={BASELINE} className="marker-line" />
            <circle cx={xScale(marker, domainMin, domainMax)} cy={BASELINE} r="5.5" className="marker-dot" />
            <text x={clampLabelX(xScale(marker, domainMin, domainMax))} y={markerLabelY(index, marker, domainMin, domainMax)} textAnchor="middle" className="marker-label">
              {result.chartAnnotations?.markerLabels?.[index] ?? marker.toLocaleString('zh-CN', { maximumFractionDigits: 3 })}
            </text>
          </g>
        ))}
        <text x={WIDTH - PAD_X} y={HEIGHT - 12} textAnchor="end" className="axis-label">
          {definition.variable}
        </text>
      </svg>
    </section>
  )
}
