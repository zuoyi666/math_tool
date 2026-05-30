import { describe, expect, it } from 'vitest'
import { DEFAULT_TOOL_ID, getToolsByGroup, TOOL_GROUPS, TOOL_REGISTRY } from './toolRegistry'

describe('tool registry defaults', () => {
  it('opens the formula editor by default', () => {
    expect(DEFAULT_TOOL_ID).toBe('formulaEditor')
    expect(TOOL_REGISTRY[0]?.id).toBe('formulaEditor')
  })

  it('groups tools by user workflow', () => {
    expect(TOOL_GROUPS.map((group) => group.id)).toEqual(['input', 'distributions', 'learning', 'project'])
    expect(getToolsByGroup('input').map((tool) => tool.id)).toEqual(['formulaEditor', 'calculator'])
    expect(getToolsByGroup('distributions').map((tool) => tool.id)).toEqual(['normalGeneral', 'normal', 'studentT', 'chiSquare', 'f', 'binomial', 'poisson'])
  })
})
