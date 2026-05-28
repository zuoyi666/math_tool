import { toPng, toSvg } from 'html-to-image'

export interface FormulaExportResult {
  ok: boolean
  dataUrl?: string
  error?: string
}

type ImageExporter = (node: HTMLElement) => Promise<string>

const EXPORT_OPTIONS = {
  backgroundColor: '#ffffff',
  cacheBust: true,
  pixelRatio: 2,
}

function safeFilename(filename: string, extension: 'png' | 'svg') {
  const trimmed = filename.trim() || 'math-tool-formula'
  return trimmed.endsWith(`.${extension}`) ? trimmed : `${trimmed}.${extension}`
}

export async function createFormulaImageDataUrl(node: HTMLElement | null, exporter: ImageExporter): Promise<FormulaExportResult> {
  if (!node) return { ok: false, error: '没有找到公式预览区域。' }
  try {
    return { ok: true, dataUrl: await exporter(node) }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : '导出图片失败。' }
  }
}

export function downloadDataUrl(dataUrl: string, filename: string, documentRef: Document = document) {
  const link = documentRef.createElement('a')
  link.href = dataUrl
  link.download = filename
  link.click()
}

export async function copyTextToClipboard(text: string, navigatorRef?: Navigator, documentRef?: Document) {
  const runtimeNavigator = navigatorRef ?? (typeof navigator !== 'undefined' ? navigator : undefined)
  const runtimeDocument = documentRef ?? (typeof document !== 'undefined' ? document : undefined)

  try {
    if (runtimeNavigator?.clipboard?.writeText) {
      await runtimeNavigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // Fall through to the textarea fallback below.
  }

  try {
    if (!runtimeDocument) return false
    const textarea = runtimeDocument.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', 'true')
    textarea.style.position = 'fixed'
    textarea.style.left = '-9999px'
    runtimeDocument.body.appendChild(textarea)
    textarea.select()
    const copied = runtimeDocument.execCommand('copy')
    textarea.remove()
    return copied
  } catch {
    return false
  }
}

export async function downloadFormulaPng(node: HTMLElement | null, filename = 'math-tool-formula.png') {
  const result = await createFormulaImageDataUrl(node, (target) => toPng(target, EXPORT_OPTIONS))
  if (result.ok && result.dataUrl) downloadDataUrl(result.dataUrl, safeFilename(filename, 'png'))
  return result
}

export async function downloadFormulaSvg(node: HTMLElement | null, filename = 'math-tool-formula.svg') {
  const result = await createFormulaImageDataUrl(node, (target) => toSvg(target, { ...EXPORT_OPTIONS, pixelRatio: 1 }))
  if (result.ok && result.dataUrl) downloadDataUrl(result.dataUrl, safeFilename(filename, 'svg'))
  return result
}
