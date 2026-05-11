import { useEffect, useMemo, useState } from 'react'
import { RotateCcw, Trash2 } from 'lucide-react'
import { calculateDistribution, normalizeDistributionState, QUERY_MODE_LABELS } from '../distributions'
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
    return JSON.parse(window.localStorage.getItem(storageKey(id)) ?? '[]') as Array<HistoryEntry<DistributionState>>
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

export function DistributionTool({ definition }: DistributionToolProps) {
  const [state, setState] = useState<DistributionState>(() => normalizeDistributionState(definition, definition.defaultState))
  const [history, setHistory] = useState<Array<HistoryEntry<DistributionState>>>(() => readHistory(definition.id))
  const normalizedState = useMemo(() => normalizeDistributionState(definition, state), [definition, state])
  const result = useMemo(() => calculateDistribution(definition, normalizedState), [definition, normalizedState])

  useEffect(() => {
    window.localStorage.setItem(storageKey(definition.id), JSON.stringify(history))
  }, [definition.id, history])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const entry: HistoryEntry<DistributionState> = {
        id: `${Date.now()}-${result.label}`,
        createdAt: new Date().toLocaleString('zh-CN', { hour12: false }),
        state: normalizedState,
        label: result.label,
        value: result.primaryValue,
      }
      setHistory((current) => {
        const latest = current[0]
        if (latest?.label === entry.label && latest.value === entry.value) return current
        return [entry, ...current].slice(0, 6)
      })
    }, 650)

    return () => window.clearTimeout(timer)
  }, [normalizedState, result.label, result.primaryValue])

  const setMode = (mode: QueryMode) => setState((current) => ({ ...current, mode }))
  const setQueryValue = (key: 'x' | 'a' | 'b' | 'p', value: number) => setState((current) => ({ ...current, [key]: value }))
  const setParam = (key: string, value: number) => setState((current) => ({ ...current, params: { ...current.params, [key]: value } }))
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
                  <div className="value-control" key={item.key}>
                    <label htmlFor={`${definition.id}-${item.key}`}>{item.label}</label>
                    <input
                      id={`${definition.id}-${item.key}`}
                      type="number"
                      min={item.min}
                      max={item.max}
                      step={item.step}
                      value={formatInput(normalizedState.params[item.key])}
                      onChange={(event) => setParam(item.key, parseValue(event.target.value, normalizedState.params[item.key], item.min, item.max, item.integer))}
                      aria-label={`${item.label} 输入`}
                    />
                    <small>{item.description}</small>
                  </div>
                ))}

                {queryControls.map((control) => (
                  <div className="value-control" key={control.key}>
                    <label htmlFor={`${definition.id}-${control.key}`}>{control.label}</label>
                    <input
                      id={`${definition.id}-${control.key}`}
                      type="number"
                      min={control.min ?? queryMin}
                      max={control.max ?? queryMax}
                      step={control.step ?? (integerQuery ? 1 : 0.01)}
                      value={formatInput(control.value)}
                      onChange={(event) =>
                        setQueryValue(control.key, parseValue(event.target.value, control.value, control.min ?? queryMin, control.max ?? queryMax, integerQuery && control.key !== 'p'))
                      }
                      aria-label={`${control.label} 输入`}
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
                <div className="quick-header">
                  <span>快速选择</span>
                  <small>常用参数</small>
                </div>
                <div className="quick-grid">
                  {definition.quickValues.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        if (normalizedState.mode === 'between') setState((current) => ({ ...current, a: definition.kind === 'discrete' ? Math.max(0, Math.round(value - 1)) : -Math.abs(value), b: Math.abs(value) }))
                        else setState((current) => ({ ...current, x: value }))
                      }}
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
          <div className="panel-heading">
            <h2>计算结果</h2>
            <strong>{result.primaryValue}</strong>
          </div>
          <dl className="result-list">
            {result.detailRows.map((row) => (
              <div key={row.label}>
                <dt>{row.label}</dt>
                <dd className={row.label === '概率' ? 'accent' : ''}>{row.value}</dd>
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
          <button type="button" className="ghost-button danger" onClick={() => setHistory([])} disabled={history.length === 0}>
            <Trash2 size={15} />
            清空记录
          </button>
        </div>
        <div className="history-table-wrap">
          <table className="history-table">
            <thead>
              <tr>
                <th>时间</th>
                <th>模式</th>
                <th>结果</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {history.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.createdAt}</td>
                  <td>{entry.label}</td>
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
                  <td colSpan={4} className="empty-history">
                    调整参数后会自动记录最近 6 次计算。
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
