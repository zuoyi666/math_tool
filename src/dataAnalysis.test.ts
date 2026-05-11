import { describe, expect, it } from 'vitest'
import { analyzeCsv } from './dataAnalysis'

describe('data analysis', () => {
  it('summarizes numeric CSV columns', () => {
    const summary = analyzeCsv('name,x,y\na,1,2\nb,2,4\nc,3,6')

    expect(summary.rowCount).toBe(3)
    expect(summary.columnCount).toBe(3)
    expect(summary.numericColumns).toHaveLength(2)
    expect(summary.numericColumns[0].mean).toBeCloseTo(2)
    expect(summary.correlations[0].value).toBeCloseTo(1)
  })

  it('counts missing values in numeric columns', () => {
    const summary = analyzeCsv('x\n1\n\n3')

    expect(summary.numericColumns[0].count).toBe(2)
    expect(summary.numericColumns[0].missing).toBe(0)
  })
})
