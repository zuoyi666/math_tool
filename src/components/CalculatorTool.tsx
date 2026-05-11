import { useMemo, useState } from 'react'
import { evaluate } from 'mathjs'
import type { CalculatorHistoryEntry } from '../types'

const EXAMPLES = ['sqrt(2)', 'sin(pi / 6)', 'log(100, 10)', 'x = 12', 'x^2 + 3x + 2']

function readCalculatorHistory(): CalculatorHistoryEntry[] {
  try {
    return JSON.parse(window.localStorage.getItem('math-tool:calculator-history') ?? '[]') as CalculatorHistoryEntry[]
  } catch {
    return []
  }
}

function writeCalculatorHistory(history: CalculatorHistoryEntry[]) {
  window.localStorage.setItem('math-tool:calculator-history', JSON.stringify(history))
}

export function CalculatorTool() {
  const [expression, setExpression] = useState('sqrt(2) + sin(pi / 6)')
  const [history, setHistory] = useState<CalculatorHistoryEntry[]>(readCalculatorHistory)
  const scope = useMemo<Record<string, unknown>>(() => ({}), [])
  const [result, setResult] = useState('1.9142135624')
  const [error, setError] = useState('')

  const run = (nextExpression = expression) => {
    try {
      const value = evaluate(nextExpression, scope)
      const formatted = typeof value === 'number' ? value.toLocaleString('zh-CN', { maximumFractionDigits: 12 }) : String(value)
      setResult(formatted)
      setError('')
      const entry: CalculatorHistoryEntry = {
        id: `${Date.now()}-${nextExpression}`,
        createdAt: new Date().toLocaleString('zh-CN', { hour12: false }),
        state: { expression: nextExpression },
        label: nextExpression,
        value: formatted,
      }
      const nextHistory = [entry, ...history.filter((item) => item.label !== nextExpression)].slice(0, 8)
      setHistory(nextHistory)
      writeCalculatorHistory(nextHistory)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '表达式无法计算')
    }
  }

  return (
    <section className="tool-surface two-column-tool">
      <div className="workspace-card">
        <h2>表达式计算</h2>
        <textarea className="formula-input" value={expression} onChange={(event) => setExpression(event.target.value)} aria-label="数学表达式" />
        <div className="button-row">
          <button type="button" className="primary-button" onClick={() => run()}>
            计算
          </button>
          {EXAMPLES.map((item) => (
            <button key={item} type="button" className="ghost-button" onClick={() => setExpression(item)}>
              {item}
            </button>
          ))}
        </div>
        {error ? <p className="error-text">{error}</p> : null}
      </div>
      <aside className="result-panel standalone">
        <div className="panel-heading">
          <h2>计算结果</h2>
        </div>
        <p className="calculator-result">{result}</p>
        <h3>历史</h3>
        <div className="history-list">
          {history.map((entry) => (
            <button key={entry.id} type="button" onClick={() => setExpression(entry.state.expression)}>
              <span>{entry.label}</span>
              <strong>{entry.value}</strong>
            </button>
          ))}
        </div>
      </aside>
    </section>
  )
}
