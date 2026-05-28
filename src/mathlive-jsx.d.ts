import type { DetailedHTMLProps, HTMLAttributes } from 'react'
import type { MathfieldElement } from 'mathlive'

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'math-field': DetailedHTMLProps<HTMLAttributes<MathfieldElement>, MathfieldElement> & {
        value?: string
        placeholder?: string
        'math-virtual-keyboard-policy'?: 'auto' | 'manual' | 'sandboxed'
      }
    }
  }
}
