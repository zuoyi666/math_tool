import { useMemo, useState } from 'react'
import { analyzeCsv } from '../dataAnalysis'

const SAMPLE_CSV = `name,score,time\nA,82,12\nB,91,9\nC,76,15\nD,88,11\nE,95,8\nF,69,18`

function fmt(value: number) {
  return Number.isFinite(value) ? value.toLocaleString('zh-CN', { maximumFractionDigits: 4 }) : '无效'
}

function fmtCompact(value: number) {
  return Number.isFinite(value) ? value.toLocaleString('zh-CN', { maximumFractionDigits: 3 }) : ''
}

const TYPE_LABELS = {
  numeric: '数值',
  mixed: '混合',
  text: '文本',
  empty: '空列',
} as const

function correlationLabel(value: number) {
  const abs = Math.abs(value)
  if (!Number.isFinite(value)) return '样本不足'
  if (abs >= 0.8) return '强相关'
  if (abs >= 0.5) return '中等相关'
  if (abs >= 0.3) return '弱相关'
  return '相关性很弱'
}

export function DataTool() {
  const [csvText, setCsvText] = useState(SAMPLE_CSV)
  const summary = useMemo(() => analyzeCsv(csvText), [csvText])

  const importFile = (file: File | undefined) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setCsvText(String(reader.result ?? ''))
    reader.readAsText(file)
  }

  return (
    <section className="tool-surface data-tool">
      <div className="workspace-card">
        <h2>CSV / 粘贴数据</h2>
        <textarea className="csv-input" value={csvText} onChange={(event) => setCsvText(event.target.value)} aria-label="CSV 数据输入" />
        <input type="file" accept=".csv,text/csv" onChange={(event) => importFile(event.target.files?.[0])} aria-label="导入 CSV 文件" />
      </div>

      <section className="workspace-card learning-example-panel">
        <h2>例题：成绩与用时</h2>
        <p>使用当前示例 CSV，观察 `score` 与 `time` 两列。先看均值和中位数判断总体水平，再看 Pearson r 判断分数和用时是否大致线性相关。</p>
        <ol>
          <li>确认 `score` 和 `time` 被识别为数值列。</li>
          <li>比较 `score` 的均值、中位数和四分位数。</li>
          <li>查看相关性卡片，判断用时越长是否可能对应分数越低。</li>
        </ol>
      </section>

      <div className="stats-strip">
        <div>
          <span>行数</span>
          <strong>{summary.rowCount}</strong>
        </div>
        <div>
          <span>列数</span>
          <strong>{summary.columnCount}</strong>
        </div>
        <div>
          <span>数值列</span>
          <strong>{summary.numericColumns.length}</strong>
        </div>
      </div>

      <section className="workspace-card data-profile-panel">
        <div className="learning-panel-heading">
          <div>
            <h2>数据画像</h2>
            <p>先检查每列类型、缺失值、唯一值和高频取值，再决定是否进入分布建模或相关性分析。</p>
          </div>
        </div>
        <div className="data-profile-grid">
          {summary.columnProfiles.map((profile) => (
            <article key={profile.name} className={`data-profile-card ${profile.type}`}>
              <div className="data-profile-card-head">
                <span>{TYPE_LABELS[profile.type]}</span>
                <strong>{profile.name}</strong>
              </div>
              <dl>
                <div>
                  <dt>非空</dt>
                  <dd>{profile.nonEmpty}</dd>
                </div>
                <div>
                  <dt>缺失</dt>
                  <dd>{profile.missing}</dd>
                </div>
                <div>
                  <dt>唯一值</dt>
                  <dd>{profile.uniqueCount}</dd>
                </div>
              </dl>
              <div className="top-value-list" aria-label={`${profile.name} 高频值`}>
                {profile.topValues.length ? (
                  profile.topValues.map((item) => (
                    <span key={item.value}>
                      {item.value}
                      <b>{item.count}</b>
                    </span>
                  ))
                ) : (
                  <em>暂无非空值</em>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      {summary.distributionSuggestions.length ? (
        <section className="workspace-card suggestion-panel">
          <div className="learning-panel-heading">
            <div>
              <h2>分布建模建议</h2>
              <p>根据数值列的取值形态，快速把数据带入合适的分布工具。</p>
            </div>
          </div>
          <div className="suggestion-grid">
            {summary.distributionSuggestions.map((suggestion) => (
              <article key={`${suggestion.column}-${suggestion.distributionId}`} className="suggestion-card">
                <span>{suggestion.column}</span>
                <h3>{suggestion.label}</h3>
                <p>{suggestion.reason}</p>
                <a className="ghost-button" href={suggestion.href}>
                  打开对应工具
                </a>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {summary.numericColumns.length ? (
        <section className="workspace-card data-profile-panel">
          <div className="learning-panel-heading">
            <div>
              <h2>数值列直方图</h2>
              <p>用轻量柱状图观察分布形状、集中区间和异常值数量。</p>
            </div>
          </div>
          <div className="data-histogram-grid">
            {summary.numericColumns.map((column) => {
              const maxCount = Math.max(1, ...column.histogram.map((bin) => bin.count))
              return (
                <article key={column.name} className="data-histogram-card">
                  <div className="data-histogram-head">
                    <div>
                      <h3>{column.name}</h3>
                      <span>
                        IQR {fmt(column.iqr)} · 异常值 {column.outlierCount}
                      </span>
                    </div>
                    <strong>n={column.count}</strong>
                  </div>
                  <div className="data-histogram-bars" aria-label={`${column.name} 直方图`}>
                    {column.histogram.map((bin) => (
                      <div key={`${bin.from}-${bin.to}`} className="data-histogram-bin">
                        <span style={{ height: `${Math.max(8, (bin.count / maxCount) * 100)}%` }} title={`${fmtCompact(bin.from)} - ${fmtCompact(bin.to)}: ${bin.count}`} />
                      </div>
                    ))}
                  </div>
                  <div className="data-histogram-axis">
                    <span>{fmtCompact(column.min)}</span>
                    <span>{fmtCompact(column.max)}</span>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      ) : null}

      <div className="history-table-wrap">
        <table className="history-table">
          <thead>
            <tr>
              <th>列</th>
              <th>有效值</th>
              <th>缺失</th>
              <th>唯一值</th>
              <th>均值</th>
              <th>中位数</th>
              <th>标准差</th>
              <th>最小</th>
              <th>Q1</th>
              <th>Q3</th>
              <th>最大</th>
            </tr>
          </thead>
          <tbody>
            {summary.numericColumns.map((column) => (
              <tr key={column.name}>
                <td>{column.name}</td>
                <td>{column.count}</td>
                <td>{column.missing}</td>
                <td>{column.uniqueCount}</td>
                <td>{fmt(column.mean)}</td>
                <td>{fmt(column.median)}</td>
                <td>{fmt(column.stdDev)}</td>
                <td>{fmt(column.min)}</td>
                <td>{fmt(column.q1)}</td>
                <td>{fmt(column.q3)}</td>
                <td>{fmt(column.max)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="formula-grid compact">
        {summary.correlations.map((item) => (
          <article key={`${item.left}-${item.right}`} className="formula-card">
            <span className="formula-category">Pearson r</span>
            <h2>
              {item.left} / {item.right}
            </h2>
            <strong>{fmt(item.value)}</strong>
            <p>{correlationLabel(item.value)}</p>
          </article>
        ))}
      </div>

      {summary.sampleRows.length ? (
        <section className="workspace-card data-preview-panel">
          <div className="learning-panel-heading">
            <div>
              <h2>前 5 行预览</h2>
              <p>快速确认导入的数据是否分列正确。</p>
            </div>
          </div>
          <div className="history-table-wrap data-preview-wrap">
            <table className="history-table">
              <thead>
                <tr>
                  {Object.keys(summary.sampleRows[0]).map((field) => (
                    <th key={field}>{field}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {summary.sampleRows.map((row, index) => (
                  <tr key={`${index}-${Object.values(row).join('-')}`}>
                    {Object.entries(row).map(([field, value]) => (
                      <td key={field}>{value || '空'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </section>
  )
}
