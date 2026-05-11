import { useMemo, useState } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import type { FormulaEntry } from '../types'

const FORMULAS: FormulaEntry[] = [
  { id: 'normal-pdf', category: '概率分布', title: '标准正态密度', latex: '\\phi(z)=\\frac{1}{\\sqrt{2\\pi}}e^{-z^2/2}', description: '标准正态分布的概率密度函数。' },
  { id: 'binomial', category: '概率分布', title: '二项分布 PMF', latex: 'P(X=k)=\\binom{n}{k}p^k(1-p)^{n-k}', description: 'n 次独立试验中恰好成功 k 次的概率。' },
  { id: 'poisson', category: '概率分布', title: '泊松分布 PMF', latex: 'P(X=k)=\\frac{e^{-\\lambda}\\lambda^k}{k!}', description: '单位区间平均 λ 次事件发生 k 次的概率。' },
  { id: 'mean', category: '描述统计', title: '样本均值', latex: '\\bar{x}=\\frac{1}{n}\\sum_{i=1}^{n}x_i', description: '一组数据的平均水平。' },
  { id: 'variance', category: '描述统计', title: '样本方差', latex: 's^2=\\frac{1}{n-1}\\sum_{i=1}^{n}(x_i-\\bar{x})^2', description: '数据离散程度的无偏估计。' },
  { id: 'correlation', category: '描述统计', title: 'Pearson 相关系数', latex: 'r=\\frac{\\sum(x_i-\\bar{x})(y_i-\\bar{y})}{\\sqrt{\\sum(x_i-\\bar{x})^2\\sum(y_i-\\bar{y})^2}}', description: '衡量两个数值变量的线性相关程度。' },
  { id: 'bayes', category: '概率基础', title: '贝叶斯公式', latex: 'P(A|B)=\\frac{P(B|A)P(A)}{P(B)}', description: '用观察到的证据更新事件概率。' },
]

function renderLatex(latex: string) {
  return katex.renderToString(latex, { throwOnError: false, displayMode: true })
}

export function FormulaLibraryTool() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('全部')
  const categories = ['全部', ...Array.from(new Set(FORMULAS.map((item) => item.category)))]
  const formulas = useMemo(
    () =>
      FORMULAS.filter((item) => {
        const matchesCategory = category === '全部' || item.category === category
        const q = query.trim().toLowerCase()
        const matchesQuery = !q || `${item.title} ${item.description} ${item.latex}`.toLowerCase().includes(q)
        return matchesCategory && matchesQuery
      }),
    [category, query],
  )

  return (
    <section className="tool-surface">
      <div className="toolbar-card">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索公式、符号或说明" aria-label="搜索公式" />
        <div className="button-row">
          {categories.map((item) => (
            <button key={item} type="button" className={category === item ? 'primary-button' : 'ghost-button'} onClick={() => setCategory(item)}>
              {item}
            </button>
          ))}
        </div>
      </div>
      <div className="formula-grid">
        {formulas.map((item) => (
          <article key={item.id} className="formula-card">
            <div>
              <span>{item.category}</span>
              <h2>{item.title}</h2>
            </div>
            <div className="latex-render" dangerouslySetInnerHTML={{ __html: renderLatex(item.latex) }} />
            <p>{item.description}</p>
            <button type="button" className="ghost-button" onClick={() => void navigator.clipboard?.writeText(item.latex)}>
              复制 LaTeX
            </button>
          </article>
        ))}
      </div>
    </section>
  )
}
