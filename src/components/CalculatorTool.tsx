import { useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { CornerDownLeft, Delete, RotateCcw } from 'lucide-react'
import { evaluateCalculatorExpression, formatCalculatorValue } from '../calculatorEngine'
import type { CalculatorHistoryEntry, CalculatorSymbol, CalculatorSymbolGroup, AngleMode } from '../types'
import type { CalculatorScope } from '../calculatorEngine'

const INITIAL_EXPRESSION = 'sqrt(2) + sin(pi / 6)'
const EXAMPLES = ['sqrt(2)', 'sin(30)', 'log(100, 10)', 'x = 12', 'x^2 + 3x + 2']
const HISTORY_KEY = 'math-tool:calculator-history'

const CALCULATOR_EXAMPLES = [
  { title: '角度模式', expression: 'sin(30)', note: '切到 DEG 后计算，结果应为 0.5；RAD 模式下结果不同。' },
  { title: '变量赋值', expression: 'x = 12', note: '先计算赋值表达式，再输入 x^2 可复用变量。' },
  { title: '常用对数', expression: 'log(100, 10)', note: '第二个参数 10 表示以 10 为底，结果为 2。' },
]

const SYMBOL_GROUPS: Array<{ id: CalculatorSymbolGroup; label: string }> = [
  { id: 'basic', label: '基础' },
  { id: 'functions', label: '函数' },
  { id: 'trig', label: '三角' },
  { id: 'constants', label: '常数' },
  { id: 'variables', label: '变量' },
  { id: 'memory', label: '记忆' },
]

const SYMBOLS: CalculatorSymbol[] = [
  ...['7', '8', '9', '/', '4', '5', '6', '*', '1', '2', '3', '-', '0', '.', '%', '+'].map((item) => ({
    id: `basic-${item}`,
    label: item,
    insert: item,
    group: 'basic' as const,
    ariaLabel: `插入 ${item}`,
  })),
  { id: 'open-paren', label: '(', insert: '(', group: 'basic', ariaLabel: '插入左括号' },
  { id: 'close-paren', label: ')', insert: ')', group: 'basic', ariaLabel: '插入右括号' },
  { id: 'power', label: '^', insert: '^', group: 'basic', ariaLabel: '插入乘方' },
  { id: 'factorial', label: '!', insert: '!', group: 'basic', ariaLabel: '插入阶乘' },
  { id: 'equals', label: '=', insert: ' = ', group: 'basic', ariaLabel: '插入等号' },
  { id: 'comma', label: ',', insert: ', ', group: 'basic', ariaLabel: '插入逗号' },

  { id: 'sqrt', label: 'sqrt', insert: 'sqrt()', group: 'functions', ariaLabel: '插入平方根函数', cursorOffset: -1 },
  { id: 'abs', label: 'abs', insert: 'abs()', group: 'functions', ariaLabel: '插入绝对值函数', cursorOffset: -1 },
  { id: 'exp', label: 'exp', insert: 'exp()', group: 'functions', ariaLabel: '插入指数函数', cursorOffset: -1 },
  { id: 'ln', label: 'ln', insert: 'log()', group: 'functions', ariaLabel: '插入自然对数函数', cursorOffset: -1 },
  { id: 'log10', label: 'log10', insert: 'log(, 10)', group: 'functions', ariaLabel: '插入常用对数函数', cursorOffset: -5 },
  { id: 'floor', label: 'floor', insert: 'floor()', group: 'functions', ariaLabel: '插入向下取整函数', cursorOffset: -1 },
  { id: 'ceil', label: 'ceil', insert: 'ceil()', group: 'functions', ariaLabel: '插入向上取整函数', cursorOffset: -1 },
  { id: 'round', label: 'round', insert: 'round()', group: 'functions', ariaLabel: '插入四舍五入函数', cursorOffset: -1 },
  { id: 'min', label: 'min', insert: 'min(, )', group: 'functions', ariaLabel: '插入最小值函数', cursorOffset: -3 },
  { id: 'max', label: 'max', insert: 'max(, )', group: 'functions', ariaLabel: '插入最大值函数', cursorOffset: -3 },

  { id: 'sin', label: 'sin', insert: 'sin()', group: 'trig', ariaLabel: '插入正弦函数', cursorOffset: -1 },
  { id: 'cos', label: 'cos', insert: 'cos()', group: 'trig', ariaLabel: '插入余弦函数', cursorOffset: -1 },
  { id: 'tan', label: 'tan', insert: 'tan()', group: 'trig', ariaLabel: '插入正切函数', cursorOffset: -1 },
  { id: 'asin', label: 'asin', insert: 'asin()', group: 'trig', ariaLabel: '插入反正弦函数', cursorOffset: -1 },
  { id: 'acos', label: 'acos', insert: 'acos()', group: 'trig', ariaLabel: '插入反余弦函数', cursorOffset: -1 },
  { id: 'atan', label: 'atan', insert: 'atan()', group: 'trig', ariaLabel: '插入反正切函数', cursorOffset: -1 },

  { id: 'pi', label: 'pi', insert: 'pi', group: 'constants', ariaLabel: '插入圆周率 pi' },
  { id: 'e', label: 'e', insert: 'e', group: 'constants', ariaLabel: '插入自然常数 e' },
  { id: 'tau', label: 'tau', insert: 'tau', group: 'constants', ariaLabel: '插入 tau' },
  { id: 'phi', label: 'phi', insert: 'phi', group: 'constants', ariaLabel: '插入黄金比例 phi' },
  { id: 'ans', label: 'ans', insert: 'ans', group: 'constants', ariaLabel: '插入上次结果 ans' },

  ...['x', 'y', 'z', 'a', 'b'].map((item) => ({
    id: `variable-${item}`,
    label: item,
    insert: item,
    group: 'variables' as const,
    ariaLabel: `插入变量 ${item}`,
  })),
]

function readCalculatorHistory(): CalculatorHistoryEntry[] {
  try {
    return (JSON.parse(window.localStorage.getItem(HISTORY_KEY) ?? '[]') as CalculatorHistoryEntry[]).slice(0, 20)
  } catch {
    return []
  }
}

function writeCalculatorHistory(history: CalculatorHistoryEntry[]) {
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
}

function nowLabel() {
  return new Date().toLocaleString('zh-CN', { hour12: false })
}

function compactExpression(expression: string) {
  return expression.replace(/\s+/g, ' ').trim()
}

export function CalculatorTool() {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const initialEvaluation = useMemo(
    () => evaluateCalculatorExpression({ expression: INITIAL_EXPRESSION, scope: {}, angleMode: 'rad', ans: 0, commit: true }),
    [],
  )
  const [expression, setExpression] = useState(INITIAL_EXPRESSION)
  const [angleMode, setAngleMode] = useState<AngleMode>('rad')
  const [committedScope, setCommittedScope] = useState<CalculatorScope>({})
  const [ans, setAns] = useState(initialEvaluation.numericValue ?? 0)
  const [memory, setMemory] = useState(0)
  const [lastResult, setLastResult] = useState(initialEvaluation.displayValue)
  const [activeGroup, setActiveGroup] = useState<CalculatorSymbolGroup>('basic')
  const [history, setHistory] = useState<CalculatorHistoryEntry[]>(readCalculatorHistory)

  const preview = useMemo(
    () => evaluateCalculatorExpression({ expression, scope: committedScope, angleMode, ans }),
    [ans, angleMode, committedScope, expression],
  )
  const variableNames = useMemo(() => Object.keys(committedScope).sort(), [committedScope])
  const symbolButtons = useMemo(() => {
    const baseSymbols = SYMBOLS.filter((symbol) => symbol.group === activeGroup)
    if (activeGroup !== 'variables') return baseSymbols

    const dynamicSymbols: CalculatorSymbol[] = variableNames
      .filter((name) => !baseSymbols.some((symbol) => symbol.insert === name))
      .map((name) => ({
        id: `scope-${name}`,
        label: name,
        insert: name,
        group: 'variables',
        ariaLabel: `插入变量 ${name}`,
      }))

    return [...baseSymbols, ...dynamicSymbols]
  }, [activeGroup, variableNames])

  const currentNumeric = preview.ok && preview.numericValue !== undefined ? preview.numericValue : ans

  const focusCursor = (position: number) => {
    requestAnimationFrame(() => {
      const textarea = textareaRef.current
      textarea?.focus()
      textarea?.setSelectionRange(position, position)
    })
  }

  const insertText = (insert: string, cursorOffset = 0) => {
    const textarea = textareaRef.current
    const start = textarea?.selectionStart ?? expression.length
    const end = textarea?.selectionEnd ?? expression.length
    const nextExpression = `${expression.slice(0, start)}${insert}${expression.slice(end)}`
    const nextPosition = Math.max(0, start + insert.length + cursorOffset)
    setExpression(nextExpression)
    focusCursor(nextPosition)
  }

  const backspaceAtCursor = () => {
    const textarea = textareaRef.current
    const start = textarea?.selectionStart ?? expression.length
    const end = textarea?.selectionEnd ?? expression.length
    if (start === 0 && end === 0) return

    const deleteFrom = start === end ? Math.max(0, start - 1) : start
    setExpression(`${expression.slice(0, deleteFrom)}${expression.slice(end)}`)
    focusCursor(deleteFrom)
  }

  const commitExpression = (nextExpression = expression) => {
    const evaluation = evaluateCalculatorExpression({
      expression: nextExpression,
      scope: committedScope,
      angleMode,
      ans,
      commit: true,
    })

    if (!evaluation.ok) return

    const nextScope = evaluation.committedScope ?? committedScope
    const nextAns = evaluation.numericValue ?? ans
    const label = compactExpression(nextExpression)
    const entry: CalculatorHistoryEntry = {
      id: `${Date.now()}-${angleMode}-${label}`,
      createdAt: nowLabel(),
      state: { expression: nextExpression, angleMode },
      label,
      value: evaluation.displayValue,
    }
    const nextHistory = [entry, ...history.filter((item) => item.label !== label || item.state.angleMode !== angleMode)].slice(0, 20)

    setCommittedScope(nextScope)
    setAns(nextAns)
    setLastResult(evaluation.displayValue)
    setHistory(nextHistory)
    writeCalculatorHistory(nextHistory)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      commitExpression()
    }
  }

  const runMemoryCommand = (command: 'clear' | 'recall' | 'add' | 'subtract') => {
    if (command === 'clear') setMemory(0)
    if (command === 'recall') insertText(String(memory))
    if (command === 'add') setMemory((value) => value + currentNumeric)
    if (command === 'subtract') setMemory((value) => value - currentNumeric)
  }

  return (
    <section className="tool-surface calculator-tool">
      <div className="calculator-main">
        <div className="workspace-card calculator-editor-card">
          <div className="calculator-card-heading">
            <div>
              <h2>科学计算器</h2>
              <p>支持表达式、变量、函数、角度模式和实时预览。</p>
            </div>
            <div className="angle-switch" aria-label="角度模式">
              {(['rad', 'deg'] as AngleMode[]).map((mode) => (
                <button key={mode} type="button" className={angleMode === mode ? 'active' : ''} onClick={() => setAngleMode(mode)}>
                  {mode.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <textarea
            ref={textareaRef}
            className="formula-input calculator-input"
            value={expression}
            onChange={(event) => setExpression(event.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="数学表达式"
          />

          <div className={preview.ok ? 'calculator-preview' : 'calculator-preview error'}>
            <span>实时预览</span>
            <strong>{preview.ok ? preview.displayValue : preview.error}</strong>
          </div>

          <div className="calculator-action-row">
            <button type="button" className="primary-button" onClick={() => commitExpression()}>
              <CornerDownLeft size={16} />
              计算
            </button>
            <button type="button" className="ghost-button" onClick={backspaceAtCursor}>
              <Delete size={16} />
              退格
            </button>
            <button
              type="button"
              className="ghost-button danger"
              onClick={() => {
                setExpression('')
                focusCursor(0)
              }}
            >
              <RotateCcw size={16} />
              清空
            </button>
          </div>

          <div className="quick-expression-row" aria-label="快捷表达式">
            {EXAMPLES.map((item) => (
              <button key={item} type="button" className="ghost-button" onClick={() => setExpression(item)}>
                {item}
              </button>
            ))}
          </div>

          <section className="learning-example-panel">
            <h3>例题练习</h3>
            <div className="learning-example-grid">
              {CALCULATOR_EXAMPLES.map((item) => (
                <button key={item.expression} type="button" onClick={() => setExpression(item.expression)}>
                  <strong>{item.title}</strong>
                  <code>{item.expression}</code>
                  <span>{item.note}</span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="workspace-card calculator-symbol-card">
          <div className="calculator-tabs" role="tablist" aria-label="符号分类">
            {SYMBOL_GROUPS.map((group) => (
              <button
                key={group.id}
                type="button"
                role="tab"
                aria-selected={activeGroup === group.id}
                className={activeGroup === group.id ? 'active' : ''}
                onClick={() => setActiveGroup(group.id)}
              >
                {group.label}
              </button>
            ))}
          </div>

          {activeGroup === 'memory' ? (
            <div className="symbol-grid memory-grid">
              <button type="button" className="symbol-button" onClick={() => runMemoryCommand('clear')}>
                <strong>MC</strong>
                <span>清除</span>
              </button>
              <button type="button" className="symbol-button" onClick={() => runMemoryCommand('recall')}>
                <strong>MR</strong>
                <span>插入</span>
              </button>
              <button type="button" className="symbol-button" onClick={() => runMemoryCommand('add')}>
                <strong>M+</strong>
                <span>加当前值</span>
              </button>
              <button type="button" className="symbol-button" onClick={() => runMemoryCommand('subtract')}>
                <strong>M-</strong>
                <span>减当前值</span>
              </button>
            </div>
          ) : (
            <div className="symbol-grid">
              {symbolButtons.map((symbol) => (
                <button key={symbol.id} type="button" className="symbol-button" aria-label={symbol.ariaLabel} onClick={() => insertText(symbol.insert, symbol.cursorOffset)}>
                  {symbol.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <aside className="result-panel standalone calculator-side">
        <div className="panel-heading">
          <h2>计算结果</h2>
        </div>
        <p className="calculator-result">{lastResult}</p>

        <div className="calculator-meta-grid">
          <div>
            <span>Ans</span>
            <strong>{formatCalculatorValue(ans)}</strong>
          </div>
          <div>
            <span>Memory</span>
            <strong>{formatCalculatorValue(memory)}</strong>
          </div>
          <div>
            <span>角度</span>
            <strong>{angleMode.toUpperCase()}</strong>
          </div>
        </div>

        <section className="calculator-side-section">
          <h3>变量</h3>
          <div className="variable-list">
            {variableNames.length ? (
              variableNames.map((name) => (
                <button key={name} type="button" onClick={() => insertText(name)}>
                  <span>{name}</span>
                  <strong>{formatCalculatorValue(committedScope[name])}</strong>
                </button>
              ))
            ) : (
              <p>暂无变量，输入并计算 `x = 12` 可创建。</p>
            )}
          </div>
        </section>

        <section className="calculator-side-section">
          <h3>历史</h3>
          <div className="history-list">
            {history.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => {
                  setExpression(entry.state.expression)
                  setAngleMode(entry.state.angleMode ?? 'rad')
                }}
              >
                <span>
                  {entry.label}
                  {entry.state.angleMode === 'deg' ? ' · DEG' : ''}
                </span>
                <strong>{entry.value}</strong>
              </button>
            ))}
          </div>
        </section>
      </aside>
    </section>
  )
}
