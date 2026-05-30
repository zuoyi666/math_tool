import type { ComponentType } from 'react'
import type { LucideProps } from 'lucide-react'

export type ToolId =
  | 'normal'
  | 'normalGeneral'
  | 'studentT'
  | 'chiSquare'
  | 'f'
  | 'binomial'
  | 'poisson'
  | 'calculator'
  | 'formulaEditor'
  | 'formulas'
  | 'data'
  | 'about'

export type DistributionId = Extract<ToolId, 'normal' | 'normalGeneral' | 'studentT' | 'chiSquare' | 'f' | 'binomial' | 'poisson'>
export type DistributionKind = 'continuous' | 'discrete'
export type QueryMode = 'left' | 'right' | 'between' | 'twoTail' | 'criticalLeft' | 'criticalRight' | 'exact'
export type ChartGuideKind = 'center' | 'spread'

export interface ToolDefinition {
  id: ToolId
  label: string
  description: string
  icon: ComponentType<LucideProps>
}

export interface ParameterDefinition {
  key: string
  label: string
  min: number
  max: number
  step: number
  defaultValue: number
  description: string
  integer?: boolean
}

export interface ParameterPreset {
  label: string
  params: Record<string, number>
}

export interface DistributionQuickValue {
  label: string
  value: number
}

export type DistributionQuickValues = Array<number | DistributionQuickValue> | ((params: Record<string, number>) => Array<number | DistributionQuickValue>)

export interface ChartGuide {
  value: number
  label: string
  kind: ChartGuideKind
}

export interface ReferenceCurve {
  label: string
  pdf: (x: number) => number
}

export interface FormulaExplanation {
  latex: string
  description: string
  terms?: Array<{ symbol: string; meaning: string }>
  example?: {
    question: string
    solution: string
    latex?: string
  }
}

export interface DistributionState {
  mode: QueryMode
  params: Record<string, number>
  x: number
  a: number
  b: number
  p: number
}

export interface DistributionDefinition {
  id: DistributionId
  kind: DistributionKind
  title: string
  subtitle: string
  variable: string
  parameterDefinitions: ParameterDefinition[]
  modes: QueryMode[]
  defaultState: DistributionState
  domain: (params: Record<string, number>) => [number, number]
  formulas: FormulaExplanation[]
  quickValues: DistributionQuickValues
  parameterPresets?: ParameterPreset[]
  center?: (params: Record<string, number>) => number
  chartGuides?: (params: Record<string, number>) => ChartGuide[]
  referenceCurves?: (params: Record<string, number>) => ReferenceCurve[]
  supportLabel?: (params: Record<string, number>) => string
  stats?: (params: Record<string, number>) => DistributionStatistic[]
  tableRows?: (params: Record<string, number>) => DistributionTableRow[]
  pdf?: (x: number, params: Record<string, number>) => number
  pmf?: (k: number, params: Record<string, number>) => number
  cdf: (x: number, params: Record<string, number>) => number
  quantile?: (p: number, params: Record<string, number>) => number
}

export interface DistributionStatistic {
  label: string
  value: string
  latex?: string
  description?: string
}

export interface DistributionTableRow {
  k: number
  pmf: number
  cdf: number
  rightTail: number
}

export type DistributionQueryType = 'probability' | 'critical'

export interface ChartAnnotations {
  shadeLabel?: string
  markerLabels?: string[]
  barLabel?: string
}

export interface ProbabilityResult {
  queryType: DistributionQueryType
  probability: number
  percent: number
  label: string
  primaryLabel: string
  primaryValue: string
  parameterSummary: string
  interpretation: string
  formula: string
  detailRows: Array<{ label: string; value: string }>
  markers: number[]
  shadeRanges: Array<[number, number]>
  chartAnnotations?: ChartAnnotations
  barRange?: [number, number]
}

export interface HistoryEntry<TState> {
  id: string
  createdAt: string
  state: TState
  label: string
  value: string
  parameterSummary?: string
}

export type AngleMode = 'rad' | 'deg'
export type CalculatorSymbolGroup = 'basic' | 'functions' | 'trig' | 'constants' | 'variables' | 'memory'

export interface CalculatorSymbol {
  id: string
  label: string
  insert: string
  group: CalculatorSymbolGroup
  ariaLabel: string
  cursorOffset?: number
}

export interface CalculatorEvaluation {
  ok: boolean
  value?: unknown
  numericValue?: number
  displayValue: string
  error?: string
  committedScope?: Record<string, unknown>
}

export interface CalculatorState {
  expression: string
  angleMode: AngleMode
  memory: number
  ans: number
}

export type CalculatorHistoryEntry = HistoryEntry<{ expression: string; angleMode?: AngleMode }>

export type FormulaTemplateGroup =
  | 'basic'
  | 'symbols'
  | 'elementary'
  | 'calculus'
  | 'multivariable'
  | 'linearAlgebra'
  | 'probability'
  | 'statistics'
  | 'discrete'
  | 'differentialEquations'
  | 'optimization'
  | 'numerical'

export type FormulaCatalogType = 'template' | 'symbol' | 'formula'
export type FormulaDifficulty = 'basic' | 'intermediate' | 'advanced'

export interface FormulaCatalogEntry {
  id: string
  type: FormulaCatalogType
  group: FormulaTemplateGroup
  topic: string
  label: string
  latex: string
  description: string
  keywords: string[]
  aliases?: string[]
  difficulty?: FormulaDifficulty
  featured?: boolean
  library?: boolean
  relatedTool?: ToolId
  example?: {
    question: string
    solution: string
    latex?: string
  }
}

export interface FormulaFavoriteEntry {
  id: string
  savedAt: string
}

export interface FormulaRecentEntry {
  id: string
  usedAt: string
}

export interface FormulaTemplate {
  id: string
  group: FormulaTemplateGroup
  label: string
  latex: string
  description?: string
}

export type FormulaEditorHistoryEntry = HistoryEntry<{ latex: string }>

export interface FormulaEntry {
  id: string
  category: string
  title: string
  latex: string
  description: string
  relatedTool?: ToolId
  example?: {
    question: string
    solution: string
    latex?: string
  }
}

export interface NumericColumnSummary {
  name: string
  count: number
  missing: number
  mean: number
  median: number
  variance: number
  stdDev: number
  min: number
  q1: number
  q3: number
  max: number
}

export interface DatasetSummary {
  rowCount: number
  columnCount: number
  numericColumns: NumericColumnSummary[]
  correlations: Array<{ left: string; right: string; value: number }>
  distributionSuggestions: DistributionSuggestion[]
}

export interface DistributionSuggestion {
  column: string
  distributionId: DistributionId
  label: string
  params: Record<string, number>
  reason: string
  href: string
}

export type ProbabilityMode = 'left' | 'right' | 'between' | 'twoTail'

export interface NormalParams {
  mode: ProbabilityMode
  z: number
  a: number
  b: number
}

export interface CalculationResult {
  probability: number
  percent: number
  density: number
  cdf: number
  label: string
  interpretation: string
  formula: string
  parameterSummary: string
  cdfSummary: string
  densitySummary: string
  activeMarkers: number[]
  shadeRanges: Array<[number, number]>
}
