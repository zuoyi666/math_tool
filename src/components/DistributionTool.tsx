import { useEffect, useMemo, useState } from 'react'
import { BookmarkPlus, RotateCcw, Trash2 } from 'lucide-react'
import { applyDistributionQuickValue, calculateDistribution, normalizeDistributionState, QUERY_MODE_LABELS } from '../distributions'
import type { DistributionDefinition, DistributionState, HistoryEntry, QueryMode } from '../types'
import { DistributionChart } from './DistributionChart'

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
            <ul>
              <li>{result.formula}</li>
              {definition.formulas.map((formula) => (
                <li key={formula}>{formula}</li>
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
