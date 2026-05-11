declare module 'jstat' {
  export const jStat: {
    normal: {
      pdf: (x: number, mean: number, sd: number) => number
      cdf: (x: number, mean: number, sd: number) => number
      inv: (p: number, mean: number, sd: number) => number
    }
    studentt: {
      pdf: (x: number, dof: number) => number
      cdf: (x: number, dof: number) => number
      inv: (p: number, dof: number) => number
    }
    chisquare: {
      pdf: (x: number, dof: number) => number
      cdf: (x: number, dof: number) => number
      inv: (p: number, dof: number) => number
    }
    centralF: {
      pdf: (x: number, dof1: number, dof2: number) => number
      cdf: (x: number, dof1: number, dof2: number) => number
      inv: (p: number, dof1: number, dof2: number) => number
    }
    binomial: {
      pdf: (k: number, n: number, p: number) => number
      cdf: (k: number, n: number, p: number) => number
    }
    poisson: {
      pdf: (k: number, lambda: number) => number
      cdf: (k: number, lambda: number) => number
    }
  }
}
