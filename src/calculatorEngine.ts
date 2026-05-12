import { evaluate } from 'mathjs'
import type { AngleMode, CalculatorEvaluation } from './types'

export type CalculatorScope = Record<string, unknown>

const RESERVED_SCOPE_KEYS = new Set([
  'ans',
  'pi',
  'e',
  'tau',
  'phi',
  'sin',
  'cos',
  'tan',
  'asin',
  'acos',
  'atan',
])

function toRadians(value: number, angleMode: AngleMode) {
  return angleMode === 'deg' ? (value * Math.PI) / 180 : value
}

function fromRadians(value: number, angleMode: AngleMode) {
  return angleMode === 'deg' ? (value * 180) / Math.PI : value
}

function buildEvaluationScope(scope: CalculatorScope, angleMode: AngleMode, ans: number): CalculatorScope {
  return {
    ...scope,
    ans,
    pi: Math.PI,
    e: Math.E,
    tau: Math.PI * 2,
    phi: (1 + Math.sqrt(5)) / 2,
    sin: (value: number) => Math.sin(toRadians(value, angleMode)),
    cos: (value: number) => Math.cos(toRadians(value, angleMode)),
    tan: (value: number) => Math.tan(toRadians(value, angleMode)),
    asin: (value: number) => fromRadians(Math.asin(value), angleMode),
    acos: (value: number) => fromRadians(Math.acos(value), angleMode),
    atan: (value: number) => fromRadians(Math.atan(value), angleMode),
  }
}

function extractUserScope(workingScope: CalculatorScope): CalculatorScope {
  return Object.fromEntries(Object.entries(workingScope).filter(([key, value]) => !RESERVED_SCOPE_KEYS.has(key) && typeof value !== 'function'))
}

function isResultSet(value: unknown): value is { entries: unknown[] } {
  return typeof value === 'object' && value !== null && 'entries' in value && Array.isArray((value as { entries?: unknown }).entries)
}

export function getNumericValue(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (isResultSet(value)) return getNumericValue(value.entries.at(-1))
  return undefined
}

export function formatCalculatorValue(value: unknown): string {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return String(value)
    return value.toLocaleString('zh-CN', { maximumFractionDigits: 12 })
  }

  if (isResultSet(value)) {
    return value.entries.map((entry) => formatCalculatorValue(entry)).join(' ; ')
  }

  if (typeof value === 'string') return value
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (value === null || value === undefined) return ''
  return String(value)
}

interface EvaluateCalculatorOptions {
  expression: string
  scope: CalculatorScope
  angleMode: AngleMode
  ans: number
  commit?: boolean
}

export function evaluateCalculatorExpression({
  expression,
  scope,
  angleMode,
  ans,
  commit = false,
}: EvaluateCalculatorOptions): CalculatorEvaluation {
  const trimmed = expression.trim()
  if (!trimmed) {
    return { ok: false, displayValue: '', error: '请输入表达式' }
  }

  const workingScope = buildEvaluationScope(scope, angleMode, ans)

  try {
    const value = evaluate(trimmed, workingScope) as unknown
    return {
      ok: true,
      value,
      numericValue: getNumericValue(value),
      displayValue: formatCalculatorValue(value),
      committedScope: commit ? extractUserScope(workingScope) : undefined,
    }
  } catch (caught) {
    return {
      ok: false,
      displayValue: '',
      error: caught instanceof Error ? caught.message : '表达式无法计算',
    }
  }
}
