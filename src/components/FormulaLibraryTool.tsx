import { useMemo, useState } from 'react'
import { FORMULA_CATALOG, getFormulaGroupLabel, getFormulaGroups, searchFormulaCatalog } from '../formulaCatalog'
import type { FormulaTemplateGroup } from '../types'
import { getToolDefinition } from '../toolRegistry'
import { MathFormula } from './MathFormula'

export function FormulaLibraryTool() {
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<FormulaTemplateGroup | 'all'>('all')
  const libraryEntries = useMemo(() => FORMULA_CATALOG.filter((item) => item.type === 'formula' && item.library !== false), [])
  const groups = useMemo(() => getFormulaGroups(libraryEntries), [libraryEntries])
  const formulas = useMemo(
    () =>
      searchFormulaCatalog(libraryEntries, query, {
        group,
        types: ['formula'],
        libraryOnly: true,
      }),
    [group, libraryEntries, query],
  )

  return (
    <section className="tool-surface">
      <div className="toolbar-card">
        <div className="formula-library-toolbar">
          <div>
            <h2>公式检索</h2>
            <p>查找常用公式，或把公式带入编辑器继续排版。</p>
          </div>
          <a className="primary-button" href="#/formulaEditor">
            打开公式编辑器
          </a>
        </div>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索公式、符号或说明" aria-label="搜索公式" />
        <div className="button-row">
          <button type="button" className={group === 'all' ? 'primary-button' : 'ghost-button'} onClick={() => setGroup('all')}>
            全部
          </button>
          {groups.map((item) => (
            <button key={item.id} type="button" className={group === item.id ? 'primary-button' : 'ghost-button'} onClick={() => setGroup(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div className="formula-grid">
        {formulas.map((item) => (
          <article key={item.id} className="formula-card">
            <div>
              <span className="formula-category">
                {getFormulaGroupLabel(item.group)} / {item.topic}
              </span>
              <h2>{item.label}</h2>
            </div>
            <MathFormula latex={item.latex} className="latex-render" />
            <p>{item.description}</p>
            {item.example ? (
              <div className="formula-card-example">
                <strong>例题</strong>
                <p>{item.example.question}</p>
                {item.example.latex ? <MathFormula latex={item.example.latex} className="formula-example-render" /> : null}
                <p>{item.example.solution}</p>
              </div>
            ) : null}
            <div className="formula-card-actions">
              <button type="button" className="ghost-button" onClick={() => void navigator.clipboard?.writeText(item.latex)}>
                复制 LaTeX
              </button>
              {item.relatedTool ? (
                <a className="ghost-button" href={`#/${item.relatedTool}`}>
                  打开{getToolDefinition(item.relatedTool).label}
                </a>
              ) : null}
              <a className="ghost-button" href={`#/formulaEditor?latex=${encodeURIComponent(item.latex)}`}>
                编辑公式
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
