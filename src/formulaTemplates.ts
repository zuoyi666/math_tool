import type { FormulaTemplate, FormulaTemplateGroup } from './types'

export const DEFAULT_FORMULA_LATEX = '\\frac{\\partial f}{\\partial x}(x_0,y_0)=\\lim_{\\Delta x\\to 0}\\frac{f(x_0+\\Delta x,y_0)-f(x_0,y_0)}{\\Delta x}'

export const FORMULA_TEMPLATE_GROUPS: Array<{ id: FormulaTemplateGroup; label: string }> = [
  { id: 'basic', label: '基础结构' },
  { id: 'calculus', label: '微积分' },
  { id: 'linearAlgebra', label: '线性代数' },
  { id: 'statistics', label: '统计' },
  { id: 'symbols', label: '希腊/集合' },
]

export const FORMULA_TEMPLATES: FormulaTemplate[] = [
  { id: 'frac', group: 'basic', label: '分数', latex: '\\frac{a}{b}', description: '上下结构分数。' },
  { id: 'superscript', group: 'basic', label: '上标', latex: 'x^{n}', description: '幂、指数或平方。' },
  { id: 'subscript', group: 'basic', label: '下标', latex: 'x_{i}', description: '序号、变量下标。' },
  { id: 'sqrt', group: 'basic', label: '根号', latex: '\\sqrt{x}', description: '平方根结构。' },
  { id: 'absolute', group: 'basic', label: '绝对值', latex: '\\left|x\\right|', description: '可伸缩绝对值符号。' },
  { id: 'parentheses', group: 'basic', label: '括号', latex: '\\left(x\\right)', description: '可伸缩圆括号。' },

  { id: 'limit', group: 'calculus', label: '极限', latex: '\\lim_{x\\to a}f(x)', description: '极限下标结构。' },
  { id: 'integral', group: 'calculus', label: '不定积分', latex: '\\int f(x)\\,dx', description: '含微分间距。' },
  { id: 'definite-integral', group: 'calculus', label: '定积分', latex: '\\int_a^b f(x)\\,dx', description: '上下限积分。' },
  { id: 'derivative', group: 'calculus', label: '导数', latex: '\\frac{d}{dx}f(x)', description: '一元导数。' },
  { id: 'partial', group: 'calculus', label: '偏导', latex: '\\frac{\\partial f}{\\partial x}', description: '偏导数结构。' },
  { id: 'gradient', group: 'calculus', label: '梯度', latex: '\\nabla f', description: '梯度算子。' },

  { id: 'column-vector', group: 'linearAlgebra', label: '列向量', latex: '\\begin{pmatrix}a\\\\b\\end{pmatrix}', description: '二行列向量。' },
  { id: 'matrix-2x2', group: 'linearAlgebra', label: '2x2 矩阵', latex: '\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}', description: '二维矩阵。' },
  { id: 'dot-product', group: 'linearAlgebra', label: '点积', latex: '\\mathbf{a}\\cdot\\mathbf{b}', description: '向量内积符号。' },
  { id: 'linear-system', group: 'linearAlgebra', label: '线性方程', latex: '\\mathbf{A}\\mathbf{x}=\\mathbf{b}', description: '矩阵方程。' },
  { id: 'determinant', group: 'linearAlgebra', label: '行列式', latex: '\\det(A)', description: '行列式函数。' },

  { id: 'sum', group: 'statistics', label: '求和', latex: '\\sum_{i=1}^{n}x_i', description: '带上下限求和。' },
  { id: 'mean', group: 'statistics', label: '均值', latex: '\\bar{x}=\\frac{1}{n}\\sum_{i=1}^{n}x_i', description: '样本均值。' },
  { id: 'variance', group: 'statistics', label: '方差', latex: '\\operatorname{Var}(X)=\\frac{1}{n}\\sum_{i=1}^{n}(x_i-\\bar{x})^2', description: '方差常用写法。' },
  { id: 'probability', group: 'statistics', label: '概率', latex: 'P(A\\mid B)=\\frac{P(B\\mid A)P(A)}{P(B)}', description: '条件概率/贝叶斯结构。' },

  { id: 'alpha', group: 'symbols', label: 'α', latex: '\\alpha', description: '希腊字母 alpha。' },
  { id: 'beta', group: 'symbols', label: 'β', latex: '\\beta', description: '希腊字母 beta。' },
  { id: 'lambda', group: 'symbols', label: 'λ', latex: '\\lambda', description: '希腊字母 lambda。' },
  { id: 'mu', group: 'symbols', label: 'μ', latex: '\\mu', description: '均值常用符号。' },
  { id: 'sigma', group: 'symbols', label: 'σ', latex: '\\sigma', description: '标准差常用符号。' },
  { id: 'delta', group: 'symbols', label: 'Δ', latex: '\\Delta', description: '增量或差分符号。' },
  { id: 'real', group: 'symbols', label: 'ℝ', latex: '\\mathbb{R}', description: '实数集。' },
  { id: 'in', group: 'symbols', label: '∈', latex: '\\in', description: '属于符号。' },
]

export const FORMULA_EXAMPLES: FormulaTemplate[] = [
  { id: 'example-partial-definition', group: 'calculus', label: '偏导定义', latex: DEFAULT_FORMULA_LATEX, description: '偏导数的极限定义。' },
  { id: 'example-half-life', group: 'calculus', label: '半衰期方程', latex: 'c_0e^{-kt_{1/2}}=\\frac{c_0}{2}', description: '指数衰减半衰期形式。' },
  { id: 'example-separated-integral', group: 'calculus', label: '分离变量积分', latex: '\\int \\frac{1}{c}\\,dc=\\int -k\\,dt', description: '微分方程分离变量。' },
  { id: 'example-log-solution', group: 'calculus', label: '对数解', latex: '\\ln\\left|c\\right|=-kt+C', description: '积分后的对数形式。' },
  { id: 'example-gradient-vector', group: 'linearAlgebra', label: '梯度列向量', latex: '\\nabla f=\\begin{pmatrix}\\partial f/\\partial x\\\\\\partial f/\\partial y\\end{pmatrix}', description: '二维函数梯度。' },
  { id: 'example-dot-product', group: 'linearAlgebra', label: '二维向量点积', latex: '\\begin{pmatrix}a_1\\\\a_2\\end{pmatrix}\\cdot\\begin{pmatrix}b_1\\\\b_2\\end{pmatrix}=a_1b_1+a_2b_2\\in\\mathbb{R}', description: '二维向量内积展开。' },
  { id: 'example-variance', group: 'statistics', label: '样本方差', latex: '\\operatorname{Var}(X)=\\frac{1}{n}\\sum_{i=1}^{4}(x_i-\\bar{x})^2', description: '截图中的方差公式。' },
]
