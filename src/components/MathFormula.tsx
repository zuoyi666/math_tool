import katex from 'katex'
import 'katex/dist/katex.min.css'

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
  return <span className={className} dangerouslySetInnerHTML={{ __html: renderLatex(latex, displayMode) }} />
}
