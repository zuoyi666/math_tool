import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import katex from 'katex'
import 'mathlive'
import 'mathlive/static.css'
import type { MathfieldElement } from 'mathlive'
import { Copy, Download, ImageDown, RotateCcw, Save } from 'lucide-react'
import { copyTextToClipboard, downloadFormulaPng, downloadFormulaSvg } from '../formulaExport'
import {
  compactFormulaLabel,
  latexFromFormulaEditorHash,
  readFormulaHistory,
  upsertFormulaHistory,
  writeFormulaHistory,
} from '../formulaEditorState'
import { DEFAULT_FORMULA_LATEX, FORMULA_EXAMPLES, FORMULA_TEMPLATE_GROUPS, FORMULA_TEMPLATES } from '../formulaTemplates'
import type { FormulaEditorHistoryEntry, FormulaTemplateGroup } from '../types'
import { MathFormula } from './MathFormula'

type StatusState = {
  tone: 'idle' | 'success' | 'error'
  message: string
}

function nowLabel() {
  return new Date().toLocaleString('zh-CN', { hour12: false })
}

function previewError(latex: string) {
  try {
    katex.renderToString(latex || ' ', { displayMode: true, throwOnError: true, strict: false })
    return ''
  } catch (error) {
    return error instanceof Error ? error.message : '公式预览失败。'
  }
}

function readInitialHistory() {
  if (typeof window === 'undefined') return []
  return readFormulaHistory(window.localStorage)
}

function readInitialLatex() {
  if (typeof window === 'undefined') return DEFAULT_FORMULA_LATEX
  return latexFromFormulaEditorHash(window.location.hash)
}

export function FormulaEditorTool() {
  const mathfieldRef = useRef<MathfieldElement | null>(null)
  const previewRef = useRef<HTMLDivElement | null>(null)
  const [latex, setLatex] = useState(readInitialLatex)
  const [activeGroup, setActiveGroup] = useState<FormulaTemplateGroup>('calculus')
  const [history, setHistory] = useState<FormulaEditorHistoryEntry[]>(readInitialHistory)
  const [status, setStatus] = useState<StatusState>({ tone: 'idle', message: '选择模板或直接输入 LaTeX。' })

  const templates = useMemo(() => FORMULA_TEMPLATES.filter((template) => template.group === activeGroup), [activeGroup])
  const error = useMemo(() => previewError(latex), [latex])

  useEffect(() => {
    const mathfield = mathfieldRef.current
    if (!mathfield || mathfield.value === latex) return
    mathfield.setValue(latex, { silenceNotifications: true })
  }, [latex])

  useEffect(() => {
    const onHashChange = () => {
      if (window.location.hash.replace(/^#\/?/, '').split('?')[0] === 'formulaEditor') {
        setLatex(latexFromFormulaEditorHash(window.location.hash))
      }
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const syncHistory = (nextLatex = latex) => {
    const next = upsertFormulaHistory(history, nextLatex, nowLabel())
    setHistory(next)
    writeFormulaHistory(window.localStorage, next)
    setStatus({ tone: 'success', message: '已保存到历史记录。' })
  }

  const handleMathInput = (event: FormEvent<MathfieldElement>) => {
    setLatex(event.currentTarget.getValue('latex'))
  }

  const insertLatex = (insert: string) => {
    const mathfield = mathfieldRef.current
    if (!mathfield) {
      setLatex((current) => `${current}${insert}`)
      return
    }
    mathfield.focus()
    mathfield.insert(insert, { focus: true, selectionMode: 'item' })
    setLatex(mathfield.getValue('latex'))
  }

  const copyLatex = async () => {
    if (await copyTextToClipboard(latex)) {
      syncHistory()
      setStatus({ tone: 'success', message: 'LaTeX 已复制。' })
    } else {
      setStatus({ tone: 'error', message: '当前浏览器不允许自动复制，请手动复制 LaTeX 源码。' })
    }
  }

  const exportImage = async (type: 'png' | 'svg') => {
    const result = type === 'png' ? await downloadFormulaPng(previewRef.current) : await downloadFormulaSvg(previewRef.current)
    if (result.ok) {
      syncHistory()
      setStatus({ tone: 'success', message: `${type.toUpperCase()} 已开始下载。` })
    } else {
      setStatus({ tone: 'error', message: result.error ?? '导出失败。' })
    }
  }

  return (
    <section className="tool-surface formula-editor-tool">
      <div className="formula-editor-main">
        <section className="workspace-card formula-editor-card">
          <div className="formula-editor-heading">
            <div>
              <h2>可视化公式输入</h2>
              <p>适合偏导、积分、矩阵、方差等复杂公式排版；输入结果会同步为 LaTeX。</p>
            </div>
            <button type="button" className="ghost-button" onClick={() => setLatex(DEFAULT_FORMULA_LATEX)}>
              <RotateCcw size={16} />
              恢复示例
            </button>
          </div>

          <math-field
            ref={mathfieldRef}
            className="mathlive-field"
            math-virtual-keyboard-policy="auto"
            onInput={handleMathInput}
            aria-label="可视化公式输入"
          >
            {latex}
          </math-field>

          <label className="formula-source-label" htmlFor="formula-latex-source">
            LaTeX 源码
          </label>
          <textarea
            id="formula-latex-source"
            className="formula-input formula-source-input"
            value={latex}
            onChange={(event) => setLatex(event.target.value)}
            spellCheck={false}
            aria-label="LaTeX 源码"
          />

          <div className={status.tone === 'error' ? 'formula-editor-status error' : 'formula-editor-status'}>
            {status.message}
          </div>
        </section>

        <section className="workspace-card formula-template-card">
          <div className="calculator-tabs formula-template-tabs" role="tablist" aria-label="公式模板分类">
            {FORMULA_TEMPLATE_GROUPS.map((group) => (
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

          <div className="formula-template-grid">
            {templates.map((template) => (
              <button key={template.id} type="button" className="formula-template-button" onClick={() => insertLatex(template.latex)}>
                <strong>{template.label}</strong>
                <code>{template.latex}</code>
                {template.description ? <span>{template.description}</span> : null}
              </button>
            ))}
          </div>
        </section>

        <section className="workspace-card learning-example-panel formula-example-library">
          <h2>复杂公式示例</h2>
          <p>这些示例覆盖偏导定义、半衰期、分离变量积分、梯度、向量点积和方差公式。</p>
          <div className="formula-example-grid">
            {FORMULA_EXAMPLES.map((example) => (
              <button
                key={example.id}
                type="button"
                onClick={() => {
                  setLatex(example.latex)
                  setStatus({ tone: 'success', message: `已载入：${example.label}` })
                }}
              >
                <strong>{example.label}</strong>
                <MathFormula latex={example.latex} className="formula-example-render" />
                <span>{example.description}</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      <aside className="result-panel standalone formula-editor-side">
        <div className="panel-heading">
          <h2>公式预览</h2>
        </div>
        <div ref={previewRef} className="formula-export-preview">
          {error ? <p className="error-text">{error}</p> : <MathFormula latex={latex || ' '} className="formula-editor-preview-render" />}
        </div>

        <div className="formula-editor-actions">
          <button type="button" className="primary-button" onClick={copyLatex}>
            <Copy size={16} />
            复制 LaTeX
          </button>
          <button type="button" className="ghost-button" onClick={() => void exportImage('png')}>
            <ImageDown size={16} />
            PNG
          </button>
          <button type="button" className="ghost-button" onClick={() => void exportImage('svg')}>
            <Download size={16} />
            SVG
          </button>
          <button type="button" className="ghost-button" onClick={() => syncHistory()}>
            <Save size={16} />
            保存公式
          </button>
        </div>

        <section className="calculator-side-section">
          <h3>当前 LaTeX</h3>
          <code className="formula-current-code">{compactFormulaLabel(latex)}</code>
        </section>

        <section className="calculator-side-section">
          <h3>历史</h3>
          <div className="history-list formula-history-list">
            {history.length ? (
              history.map((entry) => (
                <button key={entry.id} type="button" onClick={() => setLatex(entry.state.latex)}>
                  <span>{entry.createdAt}</span>
                  <strong>{entry.label}</strong>
                </button>
              ))
            ) : (
              <p>保存或导出公式后会出现在这里。</p>
            )}
          </div>
        </section>
      </aside>
    </section>
  )
}
