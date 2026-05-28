import { describe, expect, it } from 'vitest'
import { copyTextToClipboard, createFormulaImageDataUrl, downloadDataUrl } from './formulaExport'

describe('formula export helpers', () => {
  it('returns a clear error without a preview node', async () => {
    const result = await createFormulaImageDataUrl(null, async () => 'data:image/png;base64,ok')
    expect(result).toEqual({ ok: false, error: '没有找到公式预览区域。' })
  })

  it('returns a generated image data url', async () => {
    const node = {} as HTMLElement
    const result = await createFormulaImageDataUrl(node, async () => 'data:image/png;base64,ok')
    expect(result).toEqual({ ok: true, dataUrl: 'data:image/png;base64,ok' })
  })

  it('reports exporter failures', async () => {
    const node = {} as HTMLElement
    const result = await createFormulaImageDataUrl(node, async () => {
      throw new Error('canvas failed')
    })
    expect(result).toEqual({ ok: false, error: 'canvas failed' })
  })

  it('downloads data urls with the requested filename', () => {
    const anchor = {
      href: '',
      download: '',
      clicked: false,
      click() {
        this.clicked = true
      },
    }
    const documentRef = {
      createElement: () => anchor,
    } as unknown as Document

    downloadDataUrl('data:image/svg+xml,ok', 'formula.svg', documentRef)
    expect(anchor.href).toBe('data:image/svg+xml,ok')
    expect(anchor.download).toBe('formula.svg')
    expect(anchor.clicked).toBe(true)
  })

  it('copies text with clipboard API when available', async () => {
    let copied = ''
    const navigatorRef = {
      clipboard: {
        writeText: async (text: string) => {
          copied = text
        },
      },
    } as unknown as Navigator

    await expect(copyTextToClipboard('x^2', navigatorRef)).resolves.toBe(true)
    expect(copied).toBe('x^2')
  })

  it('falls back to textarea copy when clipboard API fails', async () => {
    const textarea = {
      value: '',
      style: { position: '', left: '' },
      setAttribute: () => undefined,
      select: () => undefined,
      remove: () => undefined,
    }
    const documentRef = {
      body: { appendChild: () => undefined },
      createElement: () => textarea,
      execCommand: () => true,
    } as unknown as Document
    const navigatorRef = {
      clipboard: {
        writeText: async () => {
          throw new Error('blocked')
        },
      },
    } as unknown as Navigator

    await expect(copyTextToClipboard('x^2', navigatorRef, documentRef)).resolves.toBe(true)
    expect(textarea.value).toBe('x^2')
  })
})
