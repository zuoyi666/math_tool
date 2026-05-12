import { useMemo, useState } from 'react'
import { analyzeCsv } from '../dataAnalysis'

const SAMPLE_CSV = `name,score,time\nA,82,12\nB,91,9\nC,76,15\nD,88,11\nE,95,8\nF,69,18`

function fmt(value: number) {
  return Number.isFinite(value) ? value.toLocaleString('zh-CN', { maximumFractionDigits: 4 }) : '无效'
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

      <div className="history-table-wrap">
        <table className="history-table">
          <thead>
            <tr>
              <th>列</th>
              <th>有效值</th>
              <th>缺失</th>
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
          </article>
        ))}
      </div>
    </section>
  )
}
