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

  it('suggests poisson modeling for non-negative integer counts', () => {
    const summary = analyzeCsv('calls\n0\n1\n2\n3\n4')

    expect(summary.distributionSuggestions[0]).toMatchObject({
      column: 'calls',
      distributionId: 'poisson',
      params: { lambda: 2 },
      href: '#/poisson?lambda=2&mode=left&x=2',
    })
  })

  it('suggests binomial modeling for binary columns', () => {
    const summary = analyzeCsv('converted\n0\n1\n1\n0\n1')

    expect(summary.distributionSuggestions[0]).toMatchObject({
      column: 'converted',
      distributionId: 'binomial',
      params: { n: 1, p: 0.6 },
      href: '#/binomial?n=1&p=0.6&mode=exact&x=1',
    })
  })
})
