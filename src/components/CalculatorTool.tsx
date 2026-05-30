import { useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { CornerDownLeft, Delete, RotateCcw } from 'lucide-react'
import { evaluateCalculatorExpression, formatCalculatorValue } from '../calculatorEngine'
import type { CalculatorHistoryEntry, CalculatorSymbol, CalculatorSymbolGroup, AngleMode } from '../types'
import type { CalculatorScope } from '../calculatorEngine'

const INITIAL_EXPRESSION = 'sqrt(2) + sin(pi / 6)'
const EXAMPLES = ['sqrt(2)', 'sin(30)', 'log10(100)', 'x = 12', 'x^2 + 3x + 2', '(2 + 3) * (4 - 1)']
const HISTORY_KEY = 'math-tool:calculator-history'

type CalculatorKeyVariant = 'number' | 'operator' | 'function' | 'control' | 'equals' | 'mode'
type CalculatorKeyAction =
  | { type: 'insert'; value: string; cursorOffset?: number }
  | { type: 'function'; value: string }
  | { type: 'wrap'; before: string; after: string; fallback?: string }
  | { type: 'command'; value: 'toggle-inverse' | 'toggle-angle' | 'clear' | 'delete' | 'commit' | 'sign' | 'memory-clear' | 'memory-recall' | 'memory-add' | 'memory-subtract' }

interface CalculatorKey {
  id: string
  label: string
  hint?: string
  variant: CalculatorKeyVariant
  action: CalculatorKeyAction
  wide?: boolean
}

const BASE_KEYPAD_ROWS: CalculatorKey[][] = [
  [
    { id: 'inv', label: 'INV', hint: '反函数', variant: 'mode', action: { type: 'command', value: 'toggle-inverse' } },
    { id: 'angle', label: 'RAD', hint: '角度', variant: 'mode', action: { type: 'command', value: 'toggle-angle' } },
    { id: 'sin', label: 'sin', variant: 'function', action: { type: 'function', value: 'sin' } },
    { id: 'cos', label: 'cos', variant: 'function', action: { type: 'function', value: 'cos' } },
    { id: 'tan', label: 'tan', variant: 'function', action: { type: 'function', value: 'tan' } },
    { id: 'log', label: 'log', hint: '10 为底', variant: 'function', action: { type: 'function', value: 'log10' } },
  ],
  [
    { id: 'ln', label: 'ln', variant: 'function', action: { type: 'function', value: 'ln' } },
    { id: 'sqrt', label: '√x', variant: 'function', action: { type: 'wrap', before: 'sqrt(', after: ')', fallback: 'sqrt()' } },
    { id: 'square', label: 'x²', variant: 'function', action: { type: 'wrap', before: '(', after: ')^2', fallback: '^2' } },
    { id: 'power', label: 'xʸ', variant: 'function', action: { type: 'insert', value: '^' } },
    { id: 'open-paren-key', label: '(', variant: 'operator', action: { type: 'insert', value: '(' } },
    { id: 'close-paren-key', label: ')', variant: 'operator', action: { type: 'insert', value: ')' } },
  ],
  [
    { id: 'mc', label: 'MC', hint: '清记忆', variant: 'control', action: { type: 'command', value: 'memory-clear' } },
    { id: 'mr', label: 'MR', hint: '取记忆', variant: 'control', action: { type: 'command', value: 'memory-recall' } },
    { id: 'm-plus', label: 'M+', variant: 'control', action: { type: 'command', value: 'memory-add' } },
    { id: 'm-minus', label: 'M-', variant: 'control', action: { type: 'command', value: 'memory-subtract' } },
    { id: 'clear', label: 'C', hint: '清空', variant: 'control', action: { type: 'command', value: 'clear' } },
    { id: 'delete-key', label: 'DEL', variant: 'control', action: { type: 'command', value: 'delete' } },
  ],
  [
    { id: '7', label: '7', variant: 'number', action: { type: 'insert', value: '7' } },
    { id: '8', label: '8', variant: 'number', action: { type: 'insert', value: '8' } },
    { id: '9', label: '9', variant: 'number', action: { type: 'insert', value: '9' } },
    { id: 'divide', label: '÷', variant: 'operator', action: { type: 'insert', value: ' / ' } },
    { id: 'percent', label: '%', variant: 'operator', action: { type: 'insert', value: '%' } },
    { id: 'reciprocal', label: '1/x', variant: 'function', action: { type: 'wrap', before: '1 / (', after: ')', fallback: '1 / ()' } },
  ],
  [
    { id: '4', label: '4', variant: 'number', action: { type: 'insert', value: '4' } },
    { id: '5', label: '5', variant: 'number', action: { type: 'insert', value: '5' } },
    { id: '6', label: '6', variant: 'number', action: { type: 'insert', value: '6' } },
    { id: 'multiply', label: '×', variant: 'operator', action: { type: 'insert', value: ' * ' } },
    { id: 'sign', label: '±', variant: 'operator', action: { type: 'command', value: 'sign' } },
    { id: 'exp-notation', label: 'EXP', hint: 'e 记数', variant: 'function', action: { type: 'insert', value: 'e' } },
  ],
  [
    { id: '1', label: '1', variant: 'number', action: { type: 'insert', value: '1' } },
    { id: '2', label: '2', variant: 'number', action: { type: 'insert', value: '2' } },
    { id: '3', label: '3', variant: 'number', action: { type: 'insert', value: '3' } },
    { id: 'minus', label: '−', variant: 'operator', action: { type: 'insert', value: ' - ' } },
    { id: 'ans-key', label: 'Ans', variant: 'function', action: { type: 'insert', value: 'ans' } },
    { id: 'mod-key', label: 'mod', variant: 'function', action: { type: 'insert', value: ' mod ' } },
  ],
  [
    { id: '0', label: '0', variant: 'number', action: { type: 'insert', value: '0' } },
    { id: 'dot', label: '.', variant: 'number', action: { type: 'insert', value: '.' } },
    { id: 'pi-key', label: 'π', variant: 'function', action: { type: 'insert', value: 'pi' } },
    { id: 'plus', label: '+', variant: 'operator', action: { type: 'insert', value: ' + ' } },
    { id: 'e-key', label: 'e', variant: 'function', action: { type: 'insert', value: 'e' } },
    { id: 'equals-key', label: '=', variant: 'equals', action: { type: 'command', value: 'commit' } },
  ],
]

const CALCULATOR_EXAMPLES: Array<{ title: string; expression: string; note: string; angleMode?: AngleMode }> = [
  { title: '一元二次式', expression: 'x = 2\nx^2 + 3*x + 2', note: '用多行表达式先给 x 赋值，再计算二次式。' },
  { title: '对数换底', expression: 'log(32) / log(2)', note: '用 ln(32) / ln(2) 计算以 2 为底的对数。' },
  { title: '三角角度模式', expression: 'sin(30)', note: '模板会切到 DEG，计算 30° 的正弦值。', angleMode: 'deg' },
  { title: '变量赋值示例', expression: 'x = 12\nx^2', note: '正式计算后变量 x 会保存，后续可继续引用。' },
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
  const historyIdRef = useRef(0)
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
  const [isInverse, setIsInverse] = useState(false)
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
  const unmatchedParenCount = useMemo(() => {
    let count = 0
    for (const char of expression) {
      if (char === '(') count += 1
      if (char === ')') count = Math.max(0, count - 1)
    }
    return count
  }, [expression])

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

  const insertWrappedText = (before: string, after: string, fallback?: string) => {
    const textarea = textareaRef.current
    const start = textarea?.selectionStart ?? expression.length
    const end = textarea?.selectionEnd ?? expression.length
    const selected = expression.slice(start, end)

    if (selected) {
      const nextExpression = `${expression.slice(0, start)}${before}${selected}${after}${expression.slice(end)}`
      const nextPosition = start + before.length + selected.length + after.length
      setExpression(nextExpression)
      focusCursor(nextPosition)
      return
    }

    if (fallback) {
      insertText(fallback, fallback.includes('()') ? -1 : 0)
      return
    }

    const template = `${before}${after}`
    setExpression(`${expression.slice(0, start)}${template}${expression.slice(end)}`)
    focusCursor(start + before.length)
  }

  const insertFunctionCall = (functionName: string) => {
    const inverseName: Record<string, string> = {
      sin: 'asin',
      cos: 'acos',
      tan: 'atan',
      log10: '10^',
      ln: 'exp',
    }
    const resolvedName = isInverse ? (inverseName[functionName] ?? functionName) : functionName
    if (resolvedName === '10^') {
      insertWrappedText('10^(', ')', '10^()')
      return
    }
    insertWrappedText(`${resolvedName}(`, ')', `${resolvedName}()`)
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

  const toggleSignAtCursor = () => {
    const textarea = textareaRef.current
    const start = textarea?.selectionStart ?? expression.length
    const end = textarea?.selectionEnd ?? expression.length
    const selected = expression.slice(start, end)

    if (selected) {
      insertWrappedText('-(', ')')
      return
    }

    if (!expression.trim()) {
      insertText('-')
      return
    }

    if (expression.startsWith('-(') && expression.endsWith(')')) {
      const nextExpression = expression.slice(2, -1)
      setExpression(nextExpression)
      focusCursor(Math.min(nextExpression.length, start))
      return
    }

    const nextExpression = `-(${expression})`
    setExpression(nextExpression)
    focusCursor(nextExpression.length)
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
    historyIdRef.current += 1
    const entry: CalculatorHistoryEntry = {
      id: `${historyIdRef.current}-${angleMode}-${label}`,
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

  const handleKeyAction = (key: CalculatorKey) => {
    const { action } = key
    if (action.type === 'insert') {
      insertText(action.value, action.cursorOffset)
      return
    }
    if (action.type === 'function') {
      insertFunctionCall(action.value)
      return
    }
    if (action.type === 'wrap') {
      insertWrappedText(action.before, action.after, action.fallback)
      return
    }

    if (action.value === 'toggle-inverse') setIsInverse((value) => !value)
    if (action.value === 'toggle-angle') setAngleMode((value) => (value === 'rad' ? 'deg' : 'rad'))
    if (action.value === 'clear') {
      setExpression('')
      focusCursor(0)
    }
    if (action.value === 'delete') backspaceAtCursor()
    if (action.value === 'commit') commitExpression()
    if (action.value === 'sign') toggleSignAtCursor()
    if (action.value === 'memory-clear') runMemoryCommand('clear')
    if (action.value === 'memory-recall') runMemoryCommand('recall')
    if (action.value === 'memory-add') runMemoryCommand('add')
    if (action.value === 'memory-subtract') runMemoryCommand('subtract')
  }

  const keyLabel = (key: CalculatorKey) => {
    if (key.id === 'angle') return angleMode.toUpperCase()
    if (!isInverse) return key.label
    if (key.id === 'sin') return 'sin⁻¹'
    if (key.id === 'cos') return 'cos⁻¹'
    if (key.id === 'tan') return 'tan⁻¹'
    if (key.id === 'log') return '10ˣ'
    if (key.id === 'ln') return 'eˣ'
    return key.label
  }

  return (
    <section className="tool-surface calculator-tool">
      <div className="calculator-main">
        <div className="workspace-card calculator-editor-card">
          <div className="calculator-card-heading">
            <div>
              <h2>科学计算器</h2>
              <p>常用科学键盘、表达式编辑、变量、角度模式和实时预览在同一页完成。</p>
            </div>
            <div className="angle-switch" aria-label="角度模式">
              {(['rad', 'deg'] as AngleMode[]).map((mode) => (
                <button key={mode} type="button" className={angleMode === mode ? 'active' : ''} onClick={() => setAngleMode(mode)}>
                  {mode.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="calculator-display-board" aria-label="计算器显示屏">
            <div>
              <span>当前表达式</span>
              <strong>{compactExpression(expression) || '0'}</strong>
            </div>
            <div className={preview.ok ? 'calculator-display-result' : 'calculator-display-result error'}>
              <span>{preview.ok ? '实时结果' : '表达式错误'}</span>
              <strong>{preview.ok ? preview.displayValue : preview.error}</strong>
            </div>
            <div className="calculator-mode-strip">
              <span>{angleMode.toUpperCase()}</span>
              <span className={isInverse ? 'active' : ''}>INV {isInverse ? '开' : '关'}</span>
              <span>{unmatchedParenCount ? `${unmatchedParenCount} 个未闭合括号` : '括号完整'}</span>
            </div>
          </div>

          <label className="formula-source-label" htmlFor="calculator-expression-input">
            表达式编辑器
          </label>
          <textarea
            id="calculator-expression-input"
            ref={textareaRef}
            className="formula-input calculator-input"
            value={expression}
            onChange={(event) => setExpression(event.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="数学表达式"
          />

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

          <section className="calculator-keypad-panel" aria-label="科学计算器常用键盘">
            <div className="calculator-keypad-heading">
              <h3>常用科学键盘</h3>
              <p>按键会插入到光标位置；选中文本后点击 √x、x²、1/x 会自动包裹选中内容。</p>
            </div>
            <div className="calculator-keypad">
              {BASE_KEYPAD_ROWS.flat().map((key) => (
                <button
                  key={key.id}
                  type="button"
                  className={`calculator-key ${key.variant}${key.id === 'inv' && isInverse ? ' active' : ''}${key.wide ? ' wide' : ''}`}
                  data-calculator-key={key.id}
                  aria-label={`计算器按键 ${keyLabel(key)}`}
                  onClick={() => handleKeyAction(key)}
                  title={key.hint}
                >
                  <strong>{keyLabel(key)}</strong>
                  {key.hint ? <span>{key.hint}</span> : null}
                </button>
              ))}
            </div>
          </section>

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
                <button
                  key={item.expression}
                  type="button"
                  onClick={() => {
                    setExpression(item.expression)
                    if (item.angleMode) setAngleMode(item.angleMode)
                  }}
                >
                  <strong>{item.title}</strong>
                  <code>{item.expression}</code>
                  <span>{item.note}</span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="workspace-card calculator-symbol-card">
          <div className="calculator-card-heading compact">
            <div>
              <h2>进阶符号面板</h2>
              <p>按分类补充变量、常数、记忆和更少用的函数。</p>
            </div>
          </div>
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
          <div className="calculator-side-section-heading">
            <h3>历史</h3>
            <button
              type="button"
              className="mini-action"
              disabled={!history.length}
              onClick={() => {
                setHistory([])
                writeCalculatorHistory([])
              }}
            >
              清空
            </button>
          </div>
          <div className="history-list">
            {history.length ? (
              history.map((entry) => (
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
              ))
            ) : (
              <p className="empty-calculator-note">点击“计算”后会保留最近 20 条结果。</p>
            )}
          </div>
        </section>
      </aside>
    </section>
  )
}
