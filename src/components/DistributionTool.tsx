import { useEffect, useMemo, useState } from 'react'
import { BookmarkPlus, RotateCcw, Trash2 } from 'lucide-react'
import {
  applyDistributionQuickValue,
  calculateDistribution,
  formatProbability,
  getDistributionStats,
  getDistributionTableRows,
  normalizeDistributionState,
  QUERY_MODE_LABELS,
} from '../distributions'
import type { DistributionDefinition, DistributionState, DistributionStatistic, DistributionTableRow, FormulaExplanation, HistoryEntry, QueryMode } from '../types'
import { DistributionChart } from './DistributionChart'
import { MathFormula } from './MathFormula'

interface DistributionToolProps {
  definition: DistributionDefinition
}

type QueryControl = {
  key: 'x' | 'a' | 'b' | 'p'
  label: string
  value: number
  min?: number
  max?: number
  step?: number
}

function storageKey(id: string) {
  return `math-tool:distribution:${id}:history`
}

function readHistory(id: string): Array<HistoryEntry<DistributionState>> {
  try {
    return (JSON.parse(window.localStorage.getItem(storageKey(id)) ?? '[]') as Array<HistoryEntry<DistributionState>>).slice(0, 12)
  } catch {
    return []
  }
}

function formatInput(value: number) {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 1000) / 1000)
}

function parseValue(value: string, fallback: number, min: number, max: number, integer = false) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  const bounded = Math.min(max, Math.max(min, parsed))
  return integer ? Math.round(bounded) : Math.round(bounded * 1000) / 1000
}

function cdfSymbol(definition: DistributionDefinition) {
  if (definition.id === 'normal') return '\\Phi'
  if (definition.id === 'studentT') return 'F_t'
  if (definition.id === 'chiSquare') return 'F_{\\chi^2}'
  if (definition.id === 'f') return 'F_F'
  return 'F'
}

function queryFormulaExplanation(definition: DistributionDefinition, mode: QueryMode): Omit<FormulaExplanation, 'latex'> {
  const cumulativeSymbol = cdfSymbol(definition)

  if (mode === 'criticalLeft' || mode === 'criticalRight') {
    return {
      description: mode === 'criticalLeft' ? '临界值查询：给定左侧累计概率 p，反查对应的边界点。' : '临界值查询：给定右尾概率 p，先换成 1-p 的累计概率，再反查边界点。',
      terms: [
        { symbol: `${cumulativeSymbol}^{-1}`, meaning: '分布的反函数，也叫分位数函数或临界值函数。' },
        { symbol: 'p', meaning: '输入的目标概率。' },
      ],
      example:
        mode === 'criticalLeft'
          ? { question: '若左侧累计概率 p=0.95，求对应临界值。', solution: '在临界值模式输入 p=0.95，结果就是左侧 95% 面积对应的边界点。' }
          : { question: '若右尾显著性水平 p=0.05，求拒绝域边界。', solution: '在右侧临界值模式输入 p=0.05，工具会用 1-p 反查临界点。' },
    }
  }

  if (definition.kind === 'discrete') {
    if (mode === 'exact') {
      return {
        description: '点概率：计算离散随机变量恰好等于 k 的概率。',
        terms: [
          { symbol: 'X', meaning: '当前离散分布的随机变量。' },
          { symbol: 'k', meaning: '输入的整数查询值。' },
        ],
        example: { question: '想知道事件恰好发生 3 次的概率。', solution: '选择“点概率”，把 k 设为 3，主结果就是 P(X=3)。' },
      }
    }
    if (mode === 'right') {
      return {
        description: '右尾概率：计算 X 至少为 k 的概率；用 k-1 是为了保留 X=k 这一柱。',
        terms: [
          { symbol: 'F(k-1)', meaning: '小于 k 的累计概率。' },
          { symbol: '1-F(k-1)', meaning: '从 k 到右端所有柱形概率的总和。' },
        ],
        example: { question: '想知道 X 至少为 5 的概率。', solution: '选择“右尾”，把 k 设为 5，工具会累加 5 及以上所有柱形。' },
      }
    }
    if (mode === 'between') {
      return {
        description: '区间概率：计算从 a 到 b 之间所有整数取值的概率总和。',
        terms: [
          { symbol: 'a,b', meaning: '区间端点；如果输入顺序反了，会自动按小到大计算。' },
          { symbol: 'F', meaning: '离散分布的累计分布函数。' },
        ],
        example: { question: '想知道 X 落在 2 到 6 之间的概率。', solution: '选择“区间”，输入 a=2、b=6，结果为这些整数点概率之和。' },
      }
    }
    return {
      description: '左尾概率：计算 X 不超过 k 的累计概率。',
      terms: [
        { symbol: 'F(k)', meaning: '从最小可能值累加到 k 的概率。' },
        { symbol: 'k', meaning: '当前输入的整数查询值。' },
      ],
      example: { question: '想知道 X 不超过 4 的概率。', solution: '选择“左尾”，把 k 设为 4，结果就是 0 到 4 的累计概率。' },
    }
  }

  if (mode === 'right') {
    return {
      description: '右尾概率：计算曲线在 x 右侧的面积，常用于右尾检验。',
      terms: [
        { symbol: `${cumulativeSymbol}(x)`, meaning: '从左端到 x 的累计概率。' },
        { symbol: `1-${cumulativeSymbol}(x)`, meaning: 'x 右侧剩余面积。' },
      ],
      example: { question: '想知道统计量大于 1.96 的概率。', solution: '选择“右尾”，把 x 设为 1.96，阴影面积就是右侧概率。' },
    }
  }
  if (mode === 'between') {
    return {
      description: '区间概率：计算曲线在 a 与 b 之间的面积。',
      terms: [
        { symbol: 'a,b', meaning: '区间端点；输入顺序反了也会自动按小到大计算。' },
        { symbol: `${cumulativeSymbol}(b)-${cumulativeSymbol}(a)`, meaning: '右端累计概率减去左端累计概率。' },
      ],
      example: { question: '想知道变量落在 -1 到 1 之间的概率。', solution: '选择“区间”，输入 a=-1、b=1，结果就是两条竖线之间的面积。' },
    }
  }
  if (mode === 'twoTail') {
    return {
      description: '双尾概率：计算左右两端同样极端区域的总面积。',
      terms: [
        { symbol: '|x|', meaning: 'x 的绝对值，用来同时定位左右两侧临界点。' },
        { symbol: cumulativeSymbol, meaning: `${definition.title} 的累计分布函数。` },
      ],
      example: { question: '双侧检验中想看 |x|≥1.96 的概率。', solution: '选择“双尾”，输入 x=1.96，工具会同时计算左右两端面积。' },
    }
  }
  return {
    description: '左尾概率：计算曲线在 x 左侧的累计面积。',
    terms: [
      { symbol: `${cumulativeSymbol}(x)`, meaning: '当前分布的累计分布函数。' },
      { symbol: 'x', meaning: '当前输入的横轴查询值。' },
    ],
    example: { question: '想知道变量不超过 0 的概率。', solution: '选择“左尾”，把 x 设为 0，曲线左侧阴影面积就是结果。' },
  }
}

function FormulaItem({ title, formula }: { title: string; formula: FormulaExplanation }) {
  return (
    <li className="formula-list-item">
      <span className="formula-item-title">{title}</span>
      <MathFormula latex={formula.latex} className="formula-render" />
      <p>{formula.description}</p>
      {formula.terms?.length ? (
        <dl className="formula-terms">
          {formula.terms.map((term) => (
            <div key={`${formula.latex}-${term.symbol}`}>
              <dt>
                <MathFormula latex={term.symbol} displayMode={false} className="formula-term-symbol" />
              </dt>
              <dd>{term.meaning}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {formula.example ? (
        <div className="formula-example">
          <strong>例题</strong>
          <p>{formula.example.question}</p>
          {formula.example.latex ? <MathFormula latex={formula.example.latex} className="formula-example-render" /> : null}
          <p>{formula.example.solution}</p>
        </div>
      ) : null}
    </li>
  )
}

function StatisticCard({ item }: { item: DistributionStatistic }) {
  return (
    <article className="distribution-stat-card">
      <span>{item.label}</span>
      <strong>{item.value}</strong>
      {item.latex ? <MathFormula latex={item.latex} displayMode={false} className="stat-formula" /> : null}
      {item.description ? <p>{item.description}</p> : null}
    </article>
  )
}

function ProbabilityTable({
  rows,
  activeRange,
}: {
  rows: DistributionTableRow[]
  activeRange?: [number, number]
}) {
  if (!rows.length) return null

  return (
    <section className="probability-table-panel" aria-label="离散概率表">
      <div className="learning-panel-heading">
        <div>
          <h2>概率表</h2>
          <p>查看每个整数取值的点概率、左尾累计和右尾累计。</p>
        </div>
      </div>
      <div className="distribution-table-wrap">
        <table className="distribution-table">
          <thead>
            <tr>
              <th>k</th>
              <th>P(X=k)</th>
              <th>P(X≤k)</th>
              <th>P(X≥k)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const active = activeRange ? row.k >= activeRange[0] && row.k <= activeRange[1] : false
              return (
                <tr key={row.k} className={active ? 'active' : ''}>
                  <td>{row.k}</td>
                  <td>{formatProbability(row.pmf)}</td>
                  <td>{formatProbability(row.cdf)}</td>
                  <td>{formatProbability(row.rightTail)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

interface NumberControlProps {
  id: string
  label: string
  value: number
  min: number
  max: number
  step: number
  integer?: boolean
  description?: string
  onCommit: (value: number) => void
}

function NumberControl({ id, label, value, min, max, step, integer = false, description, onCommit }: NumberControlProps) {
  const [draft, setDraft] = useState(formatInput(value))

  const commit = () => {
    const parsed = parseValue(draft, value, min, max, integer)
    onCommit(parsed)
    setDraft(formatInput(parsed))
  }

  return (
    <div className="value-control">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.currentTarget.blur()
          }
        }}
        aria-label={`${label} 输入`}
      />
      {description ? <small>{description}</small> : null}
    </div>
  )
}

export function DistributionTool({ definition }: DistributionToolProps) {
  const [state, setState] = useState<DistributionState>(() => normalizeDistributionState(definition, definition.defaultState))
  const [history, setHistory] = useState<Array<HistoryEntry<DistributionState>>>(() => readHistory(definition.id))
  const normalizedState = useMemo(() => normalizeDistributionState(definition, state), [definition, state])
  const result = useMemo(() => calculateDistribution(definition, normalizedState), [definition, normalizedState])
  const statistics = useMemo(() => getDistributionStats(definition, normalizedState.params), [definition, normalizedState.params])
  const probabilityRows = useMemo(() => getDistributionTableRows(definition, normalizedState.params), [definition, normalizedState.params])
  const queryFormula: FormulaExplanation = useMemo(
    () => ({
      latex: result.formula,
      ...queryFormulaExplanation(definition, normalizedState.mode),
    }),
    [definition, normalizedState.mode, result.formula],
  )

  useEffect(() => {
    window.localStorage.setItem(storageKey(definition.id), JSON.stringify(history))
  }, [definition.id, history])

  const setMode = (mode: QueryMode) => setState((current) => ({ ...current, mode }))
  const setQueryValue = (key: 'x' | 'a' | 'b' | 'p', value: number) => setState((current) => ({ ...current, [key]: value }))
  const setParam = (key: string, value: number) => setState((current) => ({ ...current, params: { ...current.params, [key]: value } }))
  const applyPreset = (params: Record<string, number>) => setState((current) => normalizeDistributionState(definition, { ...current, params: { ...current.params, ...params } }))
  const saveCurrentResult = () => {
    const entry: HistoryEntry<DistributionState> = {
      id: `${Date.now()}-${result.label}`,
      createdAt: new Date().toLocaleString('zh-CN', { hour12: false }),
      state: normalizedState,
      label: result.label,
      value: `${result.primaryLabel}: ${result.primaryValue}`,
      parameterSummary: result.parameterSummary,
    }
    setHistory((current) => {
      const latest = current[0]
      if (latest?.label === entry.label && latest.value === entry.value && latest.parameterSummary === entry.parameterSummary) return current
      return [entry, ...current].slice(0, 12)
    })
  }
  const [domainMin, domainMax] = definition.domain(normalizedState.params)
  const integerQuery = definition.kind === 'discrete'
  const queryMin = integerQuery ? Math.ceil(domainMin) : domainMin
  const queryMax = integerQuery ? Math.floor(domainMax) : domainMax

  const queryControls: QueryControl[] = (() => {
    if (normalizedState.mode === 'between') {
      return [
        { key: 'a' as const, label: integerQuery ? '起点 a' : 'a 值', value: normalizedState.a },
        { key: 'b' as const, label: integerQuery ? '终点 b' : 'b 值', value: normalizedState.b },
      ]
    }
    if (normalizedState.mode === 'criticalLeft' || normalizedState.mode === 'criticalRight') {
      return [{ key: 'p' as const, label: '概率 p', value: normalizedState.p, min: 0.001, max: 0.999, step: 0.001 }]
    }
    return [{ key: 'x' as const, label: integerQuery ? 'k 值' : 'x 值', value: normalizedState.x }]
  })()

  return (
    <>
      <div className="primary-grid">
        <div className="main-column">
          <section className="controls-panel">
            <div className="mode-row">
              <span className="section-label">计算模式</span>
              <div className="segmented-control" role="tablist" aria-label={`${definition.title} 计算模式`}>
                {definition.modes.map((mode) => (
                  <button key={mode} type="button" role="tab" aria-selected={normalizedState.mode === mode} className={normalizedState.mode === mode ? 'active' : ''} onClick={() => setMode(mode)}>
                    {QUERY_MODE_LABELS[mode]}
                  </button>
                ))}
              </div>
            </div>

            <div className="control-grid">
              <div className="control-stack">
                {definition.parameterDefinitions.map((item) => (
                  <NumberControl
                    key={`${item.key}-${normalizedState.params[item.key]}`}
                    id={`${definition.id}-${item.key}`}
                    label={item.label}
                    value={normalizedState.params[item.key]}
                    min={item.min}
                    max={item.max}
                    step={item.step}
                    integer={item.integer}
                    description={item.description}
                    onCommit={(value) => setParam(item.key, value)}
                  />
                ))}

                {queryControls.map((control) => (
                  <div className="value-control range-value-control" key={control.key}>
                    <NumberControl
                      key={`${control.key}-${control.value}`}
                      id={`${definition.id}-${control.key}`}
                      label={control.label}
                      value={control.value}
                      min={control.min ?? queryMin}
                      max={control.max ?? queryMax}
                      step={control.step ?? (integerQuery ? 1 : 0.01)}
                      integer={integerQuery && control.key !== 'p'}
                      onCommit={(value) => setQueryValue(control.key, value)}
                    />
                    <input
                      className="range-control"
                      type="range"
                      min={control.min ?? queryMin}
                      max={control.max ?? queryMax}
                      step={control.step ?? (integerQuery ? 1 : 0.01)}
                      value={control.value}
                      onChange={(event) => setQueryValue(control.key, parseValue(event.target.value, control.value, control.min ?? queryMin, control.max ?? queryMax, integerQuery && control.key !== 'p'))}
                      aria-label={`${control.label} 滑块`}
                    />
                  </div>
                ))}
              </div>

              <div className="quick-panel">
                {definition.parameterPresets?.length ? (
                  <>
                    <div className="quick-header">
                      <span>参数预设</span>
                      <small>改变分布参数</small>
                    </div>
                    <div className="quick-grid preset-grid">
                      {definition.parameterPresets.map((preset) => (
                        <button key={preset.label} type="button" onClick={() => applyPreset(preset.params)}>
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </>
                ) : null}
                <div className="quick-header">
                  <span>常用 {integerQuery ? 'k' : 'x'} 值</span>
                  <small>只改变查询值</small>
                </div>
                <div className="quick-grid">
                  {definition.quickValues.map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={normalizedState.mode !== 'between' && normalizedState.x === value ? 'selected' : ''}
                      onClick={() => setState((current) => applyDistributionQuickValue(definition, current, value))}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <DistributionChart definition={definition} params={normalizedState.params} result={result} />

          {statistics.length ? (
            <section className="distribution-learning-panel" aria-label={`${definition.title} 统计特征`}>
              <div className="learning-panel-heading">
                <div>
                  <h2>统计特征</h2>
                  <p>{definition.supportLabel?.(normalizedState.params) ?? '当前分布的常用特征值。'}</p>
                </div>
              </div>
              <div className="distribution-stat-grid">
                {statistics.map((item) => (
                  <StatisticCard key={`${item.label}-${item.value}`} item={item} />
                ))}
              </div>
            </section>
          ) : null}

          <ProbabilityTable rows={probabilityRows} activeRange={result.barRange} />
        </div>

        <aside className="result-panel">
          <div className="panel-heading result-heading">
            <div>
              <h2>{result.queryType === 'critical' ? '临界值查询' : '概率查询'}</h2>
              <span>{result.primaryLabel}</span>
            </div>
            <strong>{result.primaryValue}</strong>
          </div>
          <dl className="result-list">
            {result.detailRows.map((row) => (
              <div key={row.label}>
                <dt>{row.label}</dt>
                <dd className={row.label === result.primaryLabel ? 'accent' : ''}>{row.value}</dd>
              </div>
            ))}
          </dl>
          <div className="interpretation-block">
            <h3>结果解读</h3>
            <p>{result.interpretation}</p>
          </div>
          <div className="formula-block">
            <h3>公式说明</h3>
            <ul className="formula-list">
              <FormulaItem title="当前查询公式" formula={queryFormula} />
              {definition.formulas.map((formula) => (
                <FormulaItem key={formula.latex} title="分布基础" formula={formula} />
              ))}
            </ul>
          </div>
        </aside>
      </div>

      <section className="history-panel">
        <div className="history-header">
          <h2>历史记录</h2>
          <div className="history-actions">
            <button type="button" className="ghost-button" onClick={saveCurrentResult}>
              <BookmarkPlus size={15} />
              保存本次结果
            </button>
            <button type="button" className="ghost-button danger" onClick={() => setHistory([])} disabled={history.length === 0}>
              <Trash2 size={15} />
              清空记录
            </button>
          </div>
        </div>
        <div className="history-table-wrap">
          <table className="history-table">
            <thead>
              <tr>
                <th>时间</th>
                <th>模式</th>
                <th>参数</th>
                <th>结果</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {history.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.createdAt}</td>
                  <td>{entry.label}</td>
                  <td>{entry.parameterSummary ?? calculateDistribution(definition, entry.state).parameterSummary}</td>
                  <td>{entry.value}</td>
                  <td>
                    <button type="button" className="icon-button" onClick={() => setState(entry.state)} aria-label="恢复这条记录">
                      <RotateCcw size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="empty-history">
                    点击“保存本次结果”后会记录最近 12 次计算。
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
