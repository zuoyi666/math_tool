import { describe, expect, it } from 'vitest'
import { DEFAULT_TOOL_ID, TOOL_REGISTRY } from './toolRegistry'

describe('tool registry defaults', () => {
  it('opens the adjustable normal distribution page by default', () => {
    expect(DEFAULT_TOOL_ID).toBe('normalGeneral')
    expect(TOOL_REGISTRY[0]?.id).toBe('normalGeneral')
  })
})
