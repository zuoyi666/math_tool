import katex from 'katex'
import 'katex/dist/katex.min.css'
import './MathFormula.css'

interface MathFormulaProps {
  latex: string
  displayMode?: boolean
  className?: string
}

function renderLatex(latex: string, displayMode = true) {
  return katex.renderToString(latex, {
    displayMode,
    throwOnError: false,
    strict: false,
  })
}

export function MathFormula({ latex, displayMode = true, className = '' }: MathFormulaProps) {
  const html = { __html: renderLatex(latex, displayMode) }

  if (displayMode) {
    return <div className={className} dangerouslySetInnerHTML={html} />
  }

  return <span className={className} dangerouslySetInnerHTML={html} />
}
