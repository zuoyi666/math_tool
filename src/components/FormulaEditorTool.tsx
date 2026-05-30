import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import katex from 'katex'
import 'mathlive'
import 'mathlive/static.css'
import type { MathfieldElement } from 'mathlive'
import { Clock, Copy, Download, ImageDown, RotateCcw, Save, Search, Star } from 'lucide-react'
import {
  FORMULA_CATALOG,
  FORMULA_EXAMPLE_IDS,
  FORMULA_GROUPS,
  getFormulaCatalogEntries,
  getFormulaGroupLabel,
  getFormulaTopics,
  searchFormulaCatalog,
} from '../formulaCatalog'
import {
  readFormulaFavorites,
  readFormulaRecents,
  recordRecentFormula,
  toggleFormulaFavorite,
  writeFormulaFavorites,
  writeFormulaRecents,
} from '../formulaCatalogState'
import { copyTextToClipboard, downloadFormulaPng, downloadFormulaSvg } from '../formulaExport'
import {
  compactFormulaLabel,
  latexFromFormulaEditorHash,
  readFormulaHistory,
  upsertFormulaHistory,
  writeFormulaHistory,
} from '../formulaEditorState'
import { DEFAULT_FORMULA_LATEX } from '../formulaTemplates'
import type { FormulaCatalogEntry, FormulaEditorHistoryEntry, FormulaFavoriteEntry, FormulaRecentEntry, FormulaTemplateGroup } from '../types'
import { MathFormula } from './MathFormula'

type StatusState = {
  tone: 'idle' | 'success' | 'error'
  message: string
}

const FORMULA_RESULT_LIMIT = 48

function nowLabel() {
  return new Date().toLocaleString('zh-CN', { hour12: false })
}

function nowIso() {
  return new Date().toISOString()
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

function readInitialFavorites() {
  if (typeof window === 'undefined') return []
  return readFormulaFavorites(window.localStorage)
}

function readInitialRecents() {
  if (typeof window === 'undefined') return []
  return readFormulaRecents(window.localStorage)
}

function getEntryPreviewLabel(entry: FormulaCatalogEntry) {
  return `${entry.label} · ${getFormulaGroupLabel(entry.group)} / ${entry.topic}`
}

export function FormulaEditorTool() {
  const mathfieldRef = useRef<MathfieldElement | null>(null)
  const previewRef = useRef<HTMLDivElement | null>(null)
  const [latex, setLatex] = useState(readInitialLatex)
  const [activeGroup, setActiveGroup] = useState<FormulaTemplateGroup | 'all'>('all')
  const [activeTopic, setActiveTopic] = useState('全部')
  const [catalogQuery, setCatalogQuery] = useState('')
  const [favorites, setFavorites] = useState<FormulaFavoriteEntry[]>(readInitialFavorites)
  const [recents, setRecents] = useState<FormulaRecentEntry[]>(readInitialRecents)
  const [history, setHistory] = useState<FormulaEditorHistoryEntry[]>(readInitialHistory)
  const [status, setStatus] = useState<StatusState>({ tone: 'idle', message: '选择模板或直接输入 LaTeX。' })

  const favoriteIds = useMemo(() => favorites.map((item) => item.id), [favorites])
  const recentIds = useMemo(() => recents.map((item) => item.id), [recents])
  const topics = useMemo(() => ['全部', ...getFormulaTopics(FORMULA_CATALOG, activeGroup)], [activeGroup])
  const filteredCatalog = useMemo(
    () =>
      searchFormulaCatalog(FORMULA_CATALOG, catalogQuery, {
        group: activeGroup,
        topic: activeTopic,
      }),
    [activeGroup, activeTopic, catalogQuery],
  )
  const visibleCatalog = useMemo(() => filteredCatalog.slice(0, FORMULA_RESULT_LIMIT), [filteredCatalog])
  const featuredEntries = useMemo(() => FORMULA_CATALOG.filter((entry) => entry.featured).slice(0, 12), [])
  const favoriteEntries = useMemo(() => getFormulaCatalogEntries(favoriteIds).slice(0, 12), [favoriteIds])
  const recentEntries = useMemo(() => getFormulaCatalogEntries(recentIds).slice(0, 12), [recentIds])
  const exampleEntries = useMemo(() => getFormulaCatalogEntries([...FORMULA_EXAMPLE_IDS]), [])
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

  const insertEntry = (entry: FormulaCatalogEntry) => {
    insertLatex(entry.latex)
    const next = recordRecentFormula(recents, entry.id, nowIso())
    setRecents(next)
    if (typeof window !== 'undefined') writeFormulaRecents(window.localStorage, next)
    setStatus({ tone: 'success', message: `已插入：${entry.label}` })
  }

  const toggleFavorite = (entry: FormulaCatalogEntry) => {
    const next = toggleFormulaFavorite(favorites, entry.id, nowIso())
    setFavorites(next)
    if (typeof window !== 'undefined') writeFormulaFavorites(window.localStorage, next)
    setStatus({ tone: 'success', message: next.some((item) => item.id === entry.id) ? `已收藏：${entry.label}` : `已取消收藏：${entry.label}` })
  }

  const loadExample = (entry: FormulaCatalogEntry) => {
    setLatex(entry.latex)
    const next = recordRecentFormula(recents, entry.id, nowIso())
    setRecents(next)
    if (typeof window !== 'undefined') writeFormulaRecents(window.localStorage, next)
    setStatus({ tone: 'success', message: `已载入：${entry.label}` })
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

  const renderCatalogEntry = (entry: FormulaCatalogEntry, compact = false) => {
    const isFavorite = favoriteIds.includes(entry.id)

    return (
      <article key={entry.id} className={compact ? 'formula-catalog-card compact' : 'formula-catalog-card'}>
        <div className="formula-catalog-card-head">
          <div>
            <strong>{entry.label}</strong>
            <span>
              {getFormulaGroupLabel(entry.group)} / {entry.topic}
            </span>
          </div>
          <button
            type="button"
            className={isFavorite ? 'formula-favorite-button active' : 'formula-favorite-button'}
            onClick={() => toggleFavorite(entry)}
            aria-label={isFavorite ? `取消收藏${entry.label}` : `收藏${entry.label}`}
            aria-pressed={isFavorite}
          >
            <Star size={15} fill={isFavorite ? 'currentColor' : 'none'} />
          </button>
        </div>
        <button type="button" className="formula-catalog-insert" onClick={() => insertEntry(entry)} title={entry.latex}>
          <span className="sr-only">插入{getEntryPreviewLabel(entry)}</span>
          <div className="formula-template-render-wrap">
            <MathFormula latex={entry.latex} className="formula-template-render" />
          </div>
          {!compact ? <span className="formula-template-description">{entry.description}</span> : null}
        </button>
      </article>
    )
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
          <div className="formula-catalog-heading">
            <div>
              <h2>公式与符号库</h2>
              <p>搜索或按领域筛选，点击公式即可插入到当前光标位置。</p>
            </div>
            <span>{FORMULA_CATALOG.length} 个条目</span>
          </div>

          <label className="formula-catalog-search" htmlFor="formula-catalog-search">
            <Search size={16} />
            <input
              id="formula-catalog-search"
              value={catalogQuery}
              onChange={(event) => setCatalogQuery(event.target.value)}
              placeholder="搜索：偏导、matrix、sigma、\\int、置信区间..."
              aria-label="搜索公式和符号"
            />
          </label>

          <div className="calculator-tabs formula-template-tabs formula-group-tabs" role="tablist" aria-label="公式领域分类">
            <button
              type="button"
              role="tab"
              aria-selected={activeGroup === 'all'}
              className={activeGroup === 'all' ? 'active' : ''}
              onClick={() => {
                setActiveGroup('all')
                setActiveTopic('全部')
              }}
            >
              全部
            </button>
            {FORMULA_GROUPS.map((group) => (
              <button
                key={group.id}
                type="button"
                role="tab"
                aria-selected={activeGroup === group.id}
                className={activeGroup === group.id ? 'active' : ''}
                onClick={() => {
                  setActiveGroup(group.id)
                  setActiveTopic('全部')
                }}
              >
                {group.label}
              </button>
            ))}
          </div>

          <div className="formula-topic-row" aria-label="公式主题筛选">
            {topics.map((topic) => (
              <button
                key={topic}
                type="button"
                className={activeTopic === topic ? 'active' : ''}
                onClick={() => setActiveTopic(topic)}
                aria-pressed={activeTopic === topic}
              >
                {topic}
              </button>
            ))}
          </div>

          <div className="formula-catalog-body">
            <section className="formula-catalog-results" aria-label="公式筛选结果">
              <div className="formula-catalog-result-heading">
                <h3>筛选结果</h3>
                <span>
                  {visibleCatalog.length}/{filteredCatalog.length} 项
                </span>
              </div>
              {filteredCatalog.length > visibleCatalog.length ? (
                <p className="formula-result-note">结果较多，已先显示前 {FORMULA_RESULT_LIMIT} 项；继续输入关键词或选择主题可缩小范围。</p>
              ) : null}
              {visibleCatalog.length ? (
                <div className="formula-template-grid">{visibleCatalog.map((entry) => renderCatalogEntry(entry))}</div>
              ) : (
                <div className="empty-state">没有找到匹配公式。可以尝试搜索英文名、符号名或 LaTeX 命令。</div>
              )}
            </section>

            <aside className="formula-assist-column" aria-label="公式辅助入口">
              <section className="formula-assist-panel">
                <h3>常用</h3>
                <div className="formula-compact-grid">{featuredEntries.map((entry) => renderCatalogEntry(entry, true))}</div>
              </section>
              <section className="formula-assist-panel">
                <h3>
                  <Clock size={15} />
                  最近使用
                </h3>
                {recentEntries.length ? (
                  <div className="formula-compact-grid">{recentEntries.map((entry) => renderCatalogEntry(entry, true))}</div>
                ) : (
                  <p>点击任意公式后会自动记录。</p>
                )}
              </section>
              <section className="formula-assist-panel">
                <h3>
                  <Star size={15} />
                  收藏
                </h3>
                {favoriteEntries.length ? (
                  <div className="formula-compact-grid">{favoriteEntries.map((entry) => renderCatalogEntry(entry, true))}</div>
                ) : (
                  <p>点击星标可收藏高频公式。</p>
                )}
              </section>
              <section className="formula-assist-panel formula-example-library compact">
                <h3>复杂公式示例</h3>
                <p>点击后会替换当前公式，适合直接改写完整结构。</p>
                <div className="formula-example-grid compact">
                  {exampleEntries.map((example) => (
                    <button key={example.id} type="button" onClick={() => loadExample(example)}>
                      <strong>{example.label}</strong>
                      <MathFormula latex={example.latex} className="formula-example-render" />
                      <span>{example.description}</span>
                    </button>
                  ))}
                </div>
              </section>
            </aside>
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
