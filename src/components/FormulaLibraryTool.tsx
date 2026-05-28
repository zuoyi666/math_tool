import { useMemo, useState } from 'react'
import type { FormulaEntry } from '../types'
import { getToolDefinition } from '../toolRegistry'
import { MathFormula } from './MathFormula'

const FORMULAS: FormulaEntry[] = [
  {
    id: 'normal-pdf',
    category: '概率分布',
    title: '标准正态密度',
    latex: '\\phi(z)=\\frac{1}{\\sqrt{2\\pi}}e^{-z^2/2}',
    description: '标准正态分布的概率密度函数。',
    relatedTool: 'normal',
    example: { question: 'z=0 时曲线高度是多少？', solution: '代入公式得到约 0.3989，这是钟形曲线最高点。' },
  },
  {
    id: 'normal-general-pdf',
    category: '概率分布',
    title: '一般正态密度',
    latex: 'f(x)=\\frac{1}{\\sigma\\sqrt{2\\pi}}e^{-\\frac{(x-\\mu)^2}{2\\sigma^2}}',
    description: '均值 μ 控制曲线中心，标准差 σ 控制曲线宽窄和峰高。',
    relatedTool: 'normalGeneral',
    example: { question: '把 μ 从 0 调到 2 会怎样？', solution: '整条钟形曲线向右平移，形状不变。' },
  },
  {
    id: 'normal-standardization',
    category: '概率分布',
    title: '标准化转换',
    latex: 'z=\\frac{x-\\mu}{\\sigma}',
    description: '把一般正态变量转换为标准正态 z 分数，便于查 Φ(z)。',
    relatedTool: 'normalGeneral',
    example: { question: 'X~N(100,15²)，x=115 对应的 z 是多少？', solution: 'z=(115-100)/15=1。', latex: 'z=\\frac{115-100}{15}=1' },
  },
  {
    id: 'binomial',
    category: '概率分布',
    title: '二项分布 PMF',
    latex: 'P(X=k)=\\binom{n}{k}p^k(1-p)^{n-k}',
    description: 'n 次独立试验中恰好成功 k 次的概率。',
    relatedTool: 'binomial',
    example: { question: '10 次公平硬币中恰好 5 次正面。', solution: '令 n=10、p=0.5、k=5，代入公式计算点概率。' },
  },
  {
    id: 'poisson',
    category: '概率分布',
    title: '泊松分布 PMF',
    latex: 'P(X=k)=\\frac{e^{-\\lambda}\\lambda^k}{k!}',
    description: '单位区间平均 λ 次事件发生 k 次的概率。',
    relatedTool: 'poisson',
    example: { question: '平均每分钟 3 次，恰好 2 次。', solution: '令 λ=3、k=2，代入公式得到 P(X=2)。' },
  },
  {
    id: 'mean',
    category: '描述统计',
    title: '样本均值',
    latex: '\\bar{x}=\\frac{1}{n}\\sum_{i=1}^{n}x_i',
    description: '一组数据的平均水平。',
    relatedTool: 'data',
    example: { question: '数据 2、4、9 的均值是多少？', solution: '把三个数相加再除以 3，得到 5。', latex: '\\bar{x}=\\frac{2+4+9}{3}=5' },
  },
  {
    id: 'variance',
    category: '描述统计',
    title: '样本方差',
    latex: 's^2=\\frac{1}{n-1}\\sum_{i=1}^{n}(x_i-\\bar{x})^2',
    description: '数据离散程度的无偏估计。',
    relatedTool: 'data',
    example: { question: '为什么分母是 n-1？', solution: '样本方差用于估计总体方差，使用 n-1 可以减少估计偏差。' },
  },
  {
    id: 'correlation',
    category: '描述统计',
    title: 'Pearson 相关系数',
    latex: 'r=\\frac{\\sum(x_i-\\bar{x})(y_i-\\bar{y})}{\\sqrt{\\sum(x_i-\\bar{x})^2\\sum(y_i-\\bar{y})^2}}',
    description: '衡量两个数值变量的线性相关程度。',
    relatedTool: 'data',
    example: { question: 'r=0.9 说明什么？', solution: '通常表示两个变量存在较强正线性关系，但不直接说明因果关系。' },
  },
  {
    id: 'bayes',
    category: '概率基础',
    title: '贝叶斯公式',
    latex: 'P(A|B)=\\frac{P(B|A)P(A)}{P(B)}',
    description: '用观察到的证据更新事件概率。',
    example: { question: '看到检测阳性后，如何更新患病概率？', solution: '把患病作为 A，阳性作为 B，代入先验概率和检测准确率求 P(A|B)。' },
  },
]

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
              <span className="formula-category">{item.category}</span>
              <h2>{item.title}</h2>
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
