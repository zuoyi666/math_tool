import type { FormulaCatalogEntry, FormulaCatalogType, FormulaTemplateGroup } from './types'

export interface FormulaGroupDefinition {
  id: FormulaTemplateGroup
  label: string
  description: string
}

export interface FormulaCatalogSearchFilters {
  group?: FormulaTemplateGroup | 'all'
  topic?: string
  types?: FormulaCatalogType[]
  ids?: string[]
  libraryOnly?: boolean
}

type FormulaCatalogInput = Omit<FormulaCatalogEntry, 'keywords'> & { keywords?: string[] }

export const DEFAULT_FORMULA_LATEX =
  '\\frac{\\partial f}{\\partial x}(x_0,y_0)=\\lim_{\\Delta x\\to 0}\\frac{f(x_0+\\Delta x,y_0)-f(x_0,y_0)}{\\Delta x}'

export const FORMULA_GROUPS: FormulaGroupDefinition[] = [
  { id: 'basic', label: '基础结构', description: '公式排版骨架和常用结构。' },
  { id: 'symbols', label: '符号', description: '希腊字母、集合、逻辑、关系和箭头。' },
  { id: 'elementary', label: '初等数学', description: '指数、对数、三角、复数和恒等式。' },
  { id: 'calculus', label: '微积分', description: '极限、导数、积分、级数和泰勒展开。' },
  { id: 'multivariable', label: '多元微积分', description: '偏导、梯度、散度、旋度和多重积分。' },
  { id: 'linearAlgebra', label: '线性代数', description: '矩阵、向量、行列式、特征值和线性方程组。' },
  { id: 'probability', label: '概率', description: '概率基础、随机变量和常见分布。' },
  { id: 'statistics', label: '统计', description: '描述统计、估计、置信区间和假设检验。' },
  { id: 'discrete', label: '离散数学', description: '组合、逻辑、递推、图论和同余。' },
  { id: 'differentialEquations', label: '微分方程', description: '常微分方程和常见解析形式。' },
  { id: 'optimization', label: '优化', description: '梯度下降、约束优化和凸优化基础。' },
  { id: 'numerical', label: '数值方法', description: '误差、插值、迭代和数值积分。' },
]

function entry(input: FormulaCatalogInput): FormulaCatalogEntry {
  return {
    keywords: [],
    difficulty: 'basic',
    ...input,
  }
}

function symbolEntry(
  id: string,
  topic: string,
  label: string,
  latex: string,
  description: string,
  aliases: string[] = [],
): FormulaCatalogEntry {
  return entry({
    id,
    type: 'symbol',
    group: 'symbols',
    topic,
    label,
    latex,
    description,
    aliases,
    keywords: [label, topic, ...aliases],
  })
}

const greekLower = [
  ['alpha', 'α', '\\alpha'],
  ['beta', 'β', '\\beta'],
  ['gamma', 'γ', '\\gamma'],
  ['delta', 'δ', '\\delta'],
  ['epsilon', 'ε', '\\epsilon'],
  ['zeta', 'ζ', '\\zeta'],
  ['eta', 'η', '\\eta'],
  ['theta', 'θ', '\\theta'],
  ['iota', 'ι', '\\iota'],
  ['kappa', 'κ', '\\kappa'],
  ['lambda', 'λ', '\\lambda'],
  ['mu', 'μ', '\\mu'],
  ['nu', 'ν', '\\nu'],
  ['xi', 'ξ', '\\xi'],
  ['pi', 'π', '\\pi'],
  ['rho', 'ρ', '\\rho'],
  ['sigma', 'σ', '\\sigma'],
  ['tau', 'τ', '\\tau'],
  ['upsilon', 'υ', '\\upsilon'],
  ['phi', 'φ', '\\phi'],
  ['chi', 'χ', '\\chi'],
  ['psi', 'ψ', '\\psi'],
  ['omega', 'ω', '\\omega'],
] as const

const greekUpper = [
  ['Gamma', 'Γ', '\\Gamma'],
  ['Delta', 'Δ', '\\Delta'],
  ['Theta', 'Θ', '\\Theta'],
  ['Lambda', 'Λ', '\\Lambda'],
  ['Xi', 'Ξ', '\\Xi'],
  ['Pi', 'Π', '\\Pi'],
  ['Sigma', 'Σ', '\\Sigma'],
  ['Upsilon', 'Υ', '\\Upsilon'],
  ['Phi', 'Φ', '\\Phi'],
  ['Psi', 'Ψ', '\\Psi'],
  ['Omega', 'Ω', '\\Omega'],
] as const

const generatedSymbols: FormulaCatalogEntry[] = [
  ...greekLower.map(([name, label, latex]) =>
    symbolEntry(`symbol-greek-${name.toLowerCase()}`, '希腊字母', label, latex, `希腊字母 ${name}。`, [name, `\\${name}`]),
  ),
  ...greekUpper.map(([name, label, latex]) =>
    symbolEntry(`symbol-greek-capital-${name.toLowerCase()}`, '希腊字母', label, latex, `大写希腊字母 ${name}。`, [name, latex]),
  ),
]

const catalogCore: FormulaCatalogEntry[] = [
  entry({
    id: 'basic-fraction',
    type: 'template',
    group: 'basic',
    topic: '结构',
    label: '分数',
    latex: '\\frac{a}{b}',
    description: '上下结构分数。',
    keywords: ['分数', 'fraction', 'frac'],
    featured: true,
  }),
  entry({
    id: 'basic-inline-fraction',
    type: 'template',
    group: 'basic',
    topic: '结构',
    label: '行内斜分数',
    latex: 'a/b',
    description: '适合较短的行内比例。',
    keywords: ['fraction', 'ratio', '比例'],
  }),
  entry({ id: 'basic-superscript', type: 'template', group: 'basic', topic: '上下标', label: '上标', latex: 'x^{n}', description: '幂、指数或平方。', keywords: ['上标', 'power', 'exponent'], featured: true }),
  entry({ id: 'basic-subscript', type: 'template', group: 'basic', topic: '上下标', label: '下标', latex: 'x_{i}', description: '序号、变量下标。', keywords: ['下标', 'subscript', 'index'], featured: true }),
  entry({ id: 'basic-sub-sup', type: 'template', group: 'basic', topic: '上下标', label: '上下标', latex: 'x_i^{n}', description: '同时带下标和上标。', keywords: ['上下标', 'subscript', 'superscript'] }),
  entry({ id: 'basic-square-root', type: 'template', group: 'basic', topic: '根式', label: '平方根', latex: '\\sqrt{x}', description: '平方根结构。', keywords: ['根号', 'sqrt', 'square root'], featured: true }),
  entry({ id: 'basic-nth-root', type: 'template', group: 'basic', topic: '根式', label: 'n 次根', latex: '\\sqrt[n]{x}', description: '带根指数的根式。', keywords: ['根号', 'nth root', 'radical'] }),
  entry({ id: 'basic-absolute', type: 'template', group: 'basic', topic: '括号', label: '绝对值', latex: '\\left|x\\right|', description: '可伸缩绝对值符号。', keywords: ['绝对值', 'absolute'], featured: true }),
  entry({ id: 'basic-norm', type: 'template', group: 'basic', topic: '括号', label: '范数', latex: '\\left\\|x\\right\\|', description: '向量或函数范数。', keywords: ['范数', 'norm'] }),
  entry({ id: 'basic-parentheses', type: 'template', group: 'basic', topic: '括号', label: '圆括号', latex: '\\left(x\\right)', description: '可伸缩圆括号。', keywords: ['括号', 'parentheses'] }),
  entry({ id: 'basic-brackets', type: 'template', group: 'basic', topic: '括号', label: '方括号', latex: '\\left[x\\right]', description: '可伸缩方括号。', keywords: ['方括号', 'brackets'] }),
  entry({ id: 'basic-braces', type: 'template', group: 'basic', topic: '括号', label: '花括号', latex: '\\left\\{x\\right\\}', description: '可伸缩花括号。', keywords: ['花括号', 'braces'] }),
  entry({ id: 'basic-cases', type: 'template', group: 'basic', topic: '多行', label: '分段函数', latex: 'f(x)=\\begin{cases}x^2,&x\\ge 0\\\\-x,&x<0\\end{cases}', description: '分段定义函数。', keywords: ['分段', 'cases', 'piecewise'], featured: true }),
  entry({ id: 'basic-aligned', type: 'template', group: 'basic', topic: '多行', label: '多行推导', latex: '\\begin{aligned}a&=b+c\\\\&=d\\end{aligned}', description: '适合连续等式推导。', keywords: ['对齐', 'aligned', '多行'] }),
  entry({ id: 'basic-overbrace', type: 'template', group: 'basic', topic: '标注', label: '上花括标注', latex: '\\overbrace{a+b+c}^{\\text{sum}}', description: '给一段表达式加上方说明。', keywords: ['overbrace', '标注'] }),
  entry({ id: 'basic-underbrace', type: 'template', group: 'basic', topic: '标注', label: '下花括标注', latex: '\\underbrace{a+b+c}_{\\text{sum}}', description: '给一段表达式加下方说明。', keywords: ['underbrace', '标注'] }),

  symbolEntry('symbol-real', '集合', 'ℝ', '\\mathbb{R}', '实数集。', ['real', 'reals', '实数']),
  symbolEntry('symbol-natural', '集合', 'ℕ', '\\mathbb{N}', '自然数集。', ['natural', 'naturals', '自然数']),
  symbolEntry('symbol-integer', '集合', 'ℤ', '\\mathbb{Z}', '整数集。', ['integer', 'integers', '整数']),
  symbolEntry('symbol-rational', '集合', 'ℚ', '\\mathbb{Q}', '有理数集。', ['rational', 'rationals', '有理数']),
  symbolEntry('symbol-complex', '集合', 'ℂ', '\\mathbb{C}', '复数集。', ['complex', 'complex numbers', '复数']),
  symbolEntry('symbol-empty', '集合', '∅', '\\varnothing', '空集。', ['empty set', '空集']),
  symbolEntry('symbol-in', '集合', '∈', '\\in', '属于关系。', ['in', 'belongs', '属于']),
  symbolEntry('symbol-not-in', '集合', '∉', '\\notin', '不属于关系。', ['notin', '不属于']),
  symbolEntry('symbol-subset', '集合', '⊂', '\\subset', '真子集。', ['subset', '子集']),
  symbolEntry('symbol-subseteq', '集合', '⊆', '\\subseteq', '子集或相等。', ['subseteq', '包含']),
  symbolEntry('symbol-union', '集合', '∪', '\\cup', '并集。', ['union', '并集']),
  symbolEntry('symbol-intersection', '集合', '∩', '\\cap', '交集。', ['intersection', '交集']),
  symbolEntry('symbol-setminus', '集合', '∖', '\\setminus', '差集。', ['setminus', '差集']),
  symbolEntry('symbol-forall', '逻辑', '∀', '\\forall', '全称量词。', ['forall', '任意']),
  symbolEntry('symbol-exists', '逻辑', '∃', '\\exists', '存在量词。', ['exists', '存在']),
  symbolEntry('symbol-not', '逻辑', '¬', '\\neg', '逻辑非。', ['not', 'neg', '非']),
  symbolEntry('symbol-and', '逻辑', '∧', '\\land', '逻辑与。', ['and', 'land', '且']),
  symbolEntry('symbol-or', '逻辑', '∨', '\\lor', '逻辑或。', ['or', 'lor', '或']),
  symbolEntry('symbol-implies', '逻辑', '⇒', '\\Rightarrow', '推出。', ['implies', '推出']),
  symbolEntry('symbol-iff', '逻辑', '⇔', '\\Leftrightarrow', '当且仅当。', ['iff', '等价']),
  symbolEntry('symbol-less-equal', '关系', '≤', '\\le', '小于等于。', ['le', 'less equal', '不等式']),
  symbolEntry('symbol-greater-equal', '关系', '≥', '\\ge', '大于等于。', ['ge', 'greater equal', '不等式']),
  symbolEntry('symbol-not-equal', '关系', '≠', '\\ne', '不等于。', ['not equal', 'ne']),
  symbolEntry('symbol-approx', '关系', '≈', '\\approx', '近似相等。', ['approx', '约等']),
  symbolEntry('symbol-equiv', '关系', '≡', '\\equiv', '恒等或同余。', ['equiv', '同余']),
  symbolEntry('symbol-propto', '关系', '∝', '\\propto', '正比于。', ['proportional', '正比']),
  symbolEntry('symbol-infty', '常用', '∞', '\\infty', '无穷。', ['infinity', '无穷']),
  symbolEntry('symbol-partial', '常用', '∂', '\\partial', '偏导符号。', ['partial', '偏导']),
  symbolEntry('symbol-nabla', '常用', '∇', '\\nabla', '梯度算子。', ['nabla', 'gradient', '梯度']),
  symbolEntry('symbol-pm', '常用', '±', '\\pm', '正负号。', ['plus minus', '正负']),
  symbolEntry('symbol-mp', '常用', '∓', '\\mp', '负正号。', ['minus plus']),
  symbolEntry('symbol-times', '常用', '×', '\\times', '乘号。', ['times', '乘']),
  symbolEntry('symbol-cdot', '常用', '·', '\\cdot', '点乘或乘法点。', ['dot', 'cdot']),
  symbolEntry('symbol-div', '常用', '÷', '\\div', '除号。', ['divide', '除']),
  symbolEntry('symbol-to', '箭头', '→', '\\to', '趋向或映射。', ['to', 'arrow']),
  symbolEntry('symbol-leftarrow', '箭头', '←', '\\leftarrow', '左箭头。', ['left arrow']),
  symbolEntry('symbol-mapsto', '箭头', '↦', '\\mapsto', '映射到。', ['mapsto', '映射']),
  symbolEntry('symbol-longrightarrow', '箭头', '⟶', '\\longrightarrow', '长右箭头。', ['long arrow']),
  symbolEntry('symbol-vee', '运算', '∨', '\\vee', '格论或逻辑中的或。', ['vee']),
  symbolEntry('symbol-wedge', '运算', '∧', '\\wedge', '外积或逻辑与。', ['wedge']),
  symbolEntry('symbol-oplus', '运算', '⊕', '\\oplus', '直和或异或。', ['oplus', '直和']),
  symbolEntry('symbol-otimes', '运算', '⊗', '\\otimes', '张量积。', ['tensor', '张量']),

  entry({ id: 'elementary-exp', type: 'template', group: 'elementary', topic: '指数对数', label: '指数函数', latex: 'e^{x}', description: '自然指数函数。', keywords: ['exp', 'exponential', '指数'], featured: true }),
  entry({ id: 'elementary-log', type: 'template', group: 'elementary', topic: '指数对数', label: '自然对数', latex: '\\ln x', description: '以 e 为底的对数。', keywords: ['ln', 'log', '对数'] }),
  entry({ id: 'elementary-log-base', type: 'template', group: 'elementary', topic: '指数对数', label: '任意底对数', latex: '\\log_a x', description: '以 a 为底的对数。', keywords: ['log', 'base', '对数'] }),
  entry({ id: 'elementary-log-change-base', type: 'formula', group: 'elementary', topic: '指数对数', label: '换底公式', latex: '\\log_a b=\\frac{\\ln b}{\\ln a}', description: '用自然对数换算任意底对数。', keywords: ['change of base', '换底'], library: true, example: { question: '如何计算 log₂ 8？', solution: '使用换底公式得到 ln8/ln2=3。', latex: '\\log_2 8=\\frac{\\ln 8}{\\ln 2}=3' } }),
  entry({ id: 'elementary-sin', type: 'template', group: 'elementary', topic: '三角函数', label: '正弦', latex: '\\sin x', description: '正弦函数。', keywords: ['sin', 'sine', '正弦'] }),
  entry({ id: 'elementary-cos', type: 'template', group: 'elementary', topic: '三角函数', label: '余弦', latex: '\\cos x', description: '余弦函数。', keywords: ['cos', 'cosine', '余弦'] }),
  entry({ id: 'elementary-tan', type: 'template', group: 'elementary', topic: '三角函数', label: '正切', latex: '\\tan x', description: '正切函数。', keywords: ['tan', 'tangent', '正切'] }),
  entry({ id: 'elementary-arcsin', type: 'template', group: 'elementary', topic: '反三角', label: '反正弦', latex: '\\arcsin x', description: '反正弦函数。', keywords: ['arcsin', '反正弦'] }),
  entry({ id: 'elementary-arccos', type: 'template', group: 'elementary', topic: '反三角', label: '反余弦', latex: '\\arccos x', description: '反余弦函数。', keywords: ['arccos', '反余弦'] }),
  entry({ id: 'elementary-arctan', type: 'template', group: 'elementary', topic: '反三角', label: '反正切', latex: '\\arctan x', description: '反正切函数。', keywords: ['arctan', '反正切'] }),
  entry({ id: 'elementary-pythagorean-identity', type: 'formula', group: 'elementary', topic: '三角恒等式', label: '平方和恒等式', latex: '\\sin^2 x+\\cos^2 x=1', description: '最常用的三角恒等式。', keywords: ['trigonometric identity', '三角恒等式'], library: true }),
  entry({ id: 'elementary-angle-sum-sine', type: 'formula', group: 'elementary', topic: '三角恒等式', label: '正弦和角公式', latex: '\\sin(a+b)=\\sin a\\cos b+\\cos a\\sin b', description: '展开正弦的和角。', keywords: ['angle sum', '和角公式'], library: true }),
  entry({ id: 'elementary-angle-sum-cosine', type: 'formula', group: 'elementary', topic: '三角恒等式', label: '余弦和角公式', latex: '\\cos(a+b)=\\cos a\\cos b-\\sin a\\sin b', description: '展开余弦的和角。', keywords: ['angle sum', '和角公式'], library: true }),
  entry({ id: 'elementary-euler', type: 'formula', group: 'elementary', topic: '复数', label: '欧拉公式', latex: 'e^{i\\theta}=\\cos\\theta+i\\sin\\theta', description: '连接复指数与三角函数。', keywords: ['Euler', 'complex', '欧拉公式'], library: true, featured: true }),
  entry({ id: 'elementary-complex-modulus', type: 'formula', group: 'elementary', topic: '复数', label: '复数模长', latex: '|z|=\\sqrt{a^2+b^2}', description: 'z=a+bi 的模长。', keywords: ['complex modulus', '复数模长'], library: true }),
  entry({ id: 'elementary-quadratic', type: 'formula', group: 'elementary', topic: '方程', label: '一元二次公式', latex: 'x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}', description: '求解 ax²+bx+c=0。', keywords: ['quadratic', '二次方程'], library: true, featured: true }),
  entry({ id: 'elementary-factorial', type: 'template', group: 'elementary', topic: '基础运算', label: '阶乘', latex: 'n!', description: '正整数连乘。', keywords: ['factorial', '阶乘'] }),
  entry({ id: 'elementary-binomial-theorem', type: 'formula', group: 'elementary', topic: '展开', label: '二项式定理', latex: '(x+y)^n=\\sum_{k=0}^{n}\\binom{n}{k}x^{n-k}y^k', description: '二项式幂的展开式。', keywords: ['binomial theorem', '二项式定理'], library: true }),

  entry({ id: 'calculus-limit', type: 'template', group: 'calculus', topic: '极限', label: '极限', latex: '\\lim_{x\\to a}f(x)', description: '极限下标结构。', keywords: ['极限', 'limit'], featured: true }),
  entry({ id: 'calculus-limit-infty', type: 'template', group: 'calculus', topic: '极限', label: '无穷远极限', latex: '\\lim_{x\\to\\infty}f(x)', description: 'x 趋于无穷时的极限。', keywords: ['limit infinity', '无穷'] }),
  entry({ id: 'calculus-epsilon-delta', type: 'formula', group: 'calculus', topic: '极限', label: 'ε-δ 定义', latex: '0<|x-a|<\\delta\\Rightarrow |f(x)-L|<\\varepsilon', description: '函数极限的 ε-δ 条件。', keywords: ['epsilon delta', '极限定义'], library: true }),
  entry({ id: 'calculus-derivative', type: 'template', group: 'calculus', topic: '导数', label: '导数', latex: '\\frac{d}{dx}f(x)', description: '一元导数。', keywords: ['导数', 'derivative'], featured: true }),
  entry({ id: 'calculus-second-derivative', type: 'template', group: 'calculus', topic: '导数', label: '二阶导数', latex: '\\frac{d^2}{dx^2}f(x)', description: '一元二阶导数。', keywords: ['second derivative', '二阶导'] }),
  entry({ id: 'calculus-derivative-definition', type: 'formula', group: 'calculus', topic: '导数', label: '导数定义', latex: 'f^{\\prime}(x)=\\lim_{h\\to0}\\frac{f(x+h)-f(x)}{h}', description: '导数的差商极限定义。', keywords: ['derivative definition', '差商'], library: true, featured: true }),
  entry({ id: 'calculus-product-rule', type: 'formula', group: 'calculus', topic: '导数法则', label: '乘积法则', latex: '(fg)^{\\prime}=f^{\\prime}g+fg^{\\prime}', description: '两个函数乘积的求导公式。', keywords: ['product rule', '乘积法则'], library: true }),
  entry({ id: 'calculus-quotient-rule', type: 'formula', group: 'calculus', topic: '导数法则', label: '商法则', latex: '\\left(\\frac{f}{g}\\right)^{\\prime}=\\frac{f^{\\prime}g-fg^{\\prime}}{g^2}', description: '两个函数商的求导公式。', keywords: ['quotient rule', '商法则'], library: true }),
  entry({ id: 'calculus-chain-rule', type: 'formula', group: 'calculus', topic: '导数法则', label: '链式法则', latex: '\\frac{dy}{dx}=\\frac{dy}{du}\\frac{du}{dx}', description: '复合函数求导。', keywords: ['chain rule', '链式法则'], library: true }),
  entry({ id: 'calculus-integral', type: 'template', group: 'calculus', topic: '积分', label: '不定积分', latex: '\\int f(x)\\,dx', description: '含微分间距的不定积分。', keywords: ['integral', '不定积分'], featured: true }),
  entry({ id: 'calculus-definite-integral', type: 'template', group: 'calculus', topic: '积分', label: '定积分', latex: '\\int_a^b f(x)\\,dx', description: '上下限积分。', keywords: ['definite integral', '定积分'], featured: true }),
  entry({ id: 'calculus-ftc', type: 'formula', group: 'calculus', topic: '积分', label: '微积分基本定理', latex: '\\int_a^b f(x)\\,dx=F(b)-F(a)', description: '定积分可由原函数差计算。', keywords: ['FTC', 'fundamental theorem', '基本定理'], library: true }),
  entry({ id: 'calculus-integration-by-parts', type: 'formula', group: 'calculus', topic: '积分技巧', label: '分部积分', latex: '\\int u\\,dv=uv-\\int v\\,du', description: '乘积形式积分的常用技巧。', keywords: ['integration by parts', '分部积分'], library: true }),
  entry({ id: 'calculus-substitution', type: 'formula', group: 'calculus', topic: '积分技巧', label: '换元积分', latex: '\\int f(g(x))g^{\\prime}(x)\\,dx=\\int f(u)\\,du', description: '用 u=g(x) 转换积分。', keywords: ['substitution', '换元积分'], library: true }),
  entry({ id: 'calculus-sum', type: 'template', group: 'calculus', topic: '级数', label: '求和', latex: '\\sum_{i=1}^{n}x_i', description: '带上下限求和。', keywords: ['sum', 'sigma', '求和'], featured: true }),
  entry({ id: 'calculus-product', type: 'template', group: 'calculus', topic: '级数', label: '连乘', latex: '\\prod_{i=1}^{n}x_i', description: '带上下限连乘。', keywords: ['product', '连乘'] }),
  entry({ id: 'calculus-series', type: 'template', group: 'calculus', topic: '级数', label: '无穷级数', latex: '\\sum_{n=0}^{\\infty}a_n', description: '无穷项求和。', keywords: ['series', 'infinite series', '级数'] }),
  entry({ id: 'calculus-geometric-series', type: 'formula', group: 'calculus', topic: '级数', label: '几何级数', latex: '\\sum_{n=0}^{\\infty}ar^n=\\frac{a}{1-r}', description: '|r|<1 时成立。', keywords: ['geometric series', '几何级数'], library: true }),
  entry({ id: 'calculus-taylor', type: 'formula', group: 'calculus', topic: '泰勒展开', label: '泰勒公式', latex: 'f(x)=\\sum_{n=0}^{\\infty}\\frac{f^{(n)}(a)}{n!}(x-a)^n', description: '函数在 a 点附近的幂级数展开。', keywords: ['Taylor', '泰勒'], library: true, featured: true }),
  entry({ id: 'calculus-maclaurin-exp', type: 'formula', group: 'calculus', topic: '泰勒展开', label: '指数函数展开', latex: 'e^x=\\sum_{n=0}^{\\infty}\\frac{x^n}{n!}', description: 'eˣ 的 Maclaurin 展开。', keywords: ['Maclaurin', 'exp series'], library: true }),
  entry({ id: 'calculus-lhopital', type: 'formula', group: 'calculus', topic: '极限技巧', label: '洛必达法则', latex: '\\lim_{x\\to a}\\frac{f(x)}{g(x)}=\\lim_{x\\to a}\\frac{f^{\\prime}(x)}{g^{\\prime}(x)}', description: '用于特定未定式极限。', keywords: ['LHopital', '洛必达'], library: true }),
  entry({ id: 'calculus-partial-definition', type: 'formula', group: 'calculus', topic: '导数', label: '偏导定义示例', latex: DEFAULT_FORMULA_LATEX, description: '偏导数的极限定义。', keywords: ['partial derivative', '偏导', '截图'], library: true, featured: true }),
  entry({ id: 'calculus-half-life', type: 'formula', group: 'calculus', topic: '指数模型', label: '半衰期方程', latex: 'c_0e^{-kt_{1/2}}=\\frac{c_0}{2}', description: '指数衰减半衰期形式。', keywords: ['half life', '半衰期'], library: true }),
  entry({ id: 'calculus-separated-integral', type: 'formula', group: 'calculus', topic: '积分', label: '分离变量积分', latex: '\\int \\frac{1}{c}\\,dc=\\int -k\\,dt', description: '微分方程分离变量后的积分形式。', keywords: ['separable', '分离变量'], library: true }),
  entry({ id: 'calculus-log-solution', type: 'formula', group: 'calculus', topic: '积分', label: '对数解', latex: '\\ln\\left|c\\right|=-kt+C', description: '分离变量积分后的对数形式。', keywords: ['log solution', '对数解'], library: true }),

  entry({ id: 'multi-partial', type: 'template', group: 'multivariable', topic: '偏导', label: '偏导', latex: '\\frac{\\partial f}{\\partial x}', description: '偏导数结构。', keywords: ['partial', '偏导'], featured: true }),
  entry({ id: 'multi-second-partial', type: 'template', group: 'multivariable', topic: '偏导', label: '二阶偏导', latex: '\\frac{\\partial^2 f}{\\partial x^2}', description: '二阶偏导数。', keywords: ['second partial', '二阶偏导'] }),
  entry({ id: 'multi-mixed-partial', type: 'template', group: 'multivariable', topic: '偏导', label: '混合偏导', latex: '\\frac{\\partial^2 f}{\\partial x\\partial y}', description: '对两个变量求偏导。', keywords: ['mixed partial', '混合偏导'] }),
  entry({ id: 'multi-gradient', type: 'template', group: 'multivariable', topic: '向量微积分', label: '梯度', latex: '\\nabla f', description: '梯度算子。', keywords: ['gradient', 'nabla', '梯度'], featured: true }),
  entry({ id: 'multi-gradient-vector', type: 'formula', group: 'multivariable', topic: '向量微积分', label: '二维梯度列向量', latex: '\\nabla f=\\begin{pmatrix}\\partial f/\\partial x\\\\\\partial f/\\partial y\\end{pmatrix}', description: '二维函数梯度。', keywords: ['gradient vector', '梯度列向量'], library: true, featured: true }),
  entry({ id: 'multi-divergence', type: 'template', group: 'multivariable', topic: '向量微积分', label: '散度', latex: '\\nabla\\cdot\\mathbf{F}', description: '向量场散度。', keywords: ['divergence', '散度'] }),
  entry({ id: 'multi-curl', type: 'template', group: 'multivariable', topic: '向量微积分', label: '旋度', latex: '\\nabla\\times\\mathbf{F}', description: '向量场旋度。', keywords: ['curl', '旋度'] }),
  entry({ id: 'multi-double-integral', type: 'template', group: 'multivariable', topic: '多重积分', label: '二重积分', latex: '\\iint_D f(x,y)\\,dA', description: '区域 D 上的二重积分。', keywords: ['double integral', '二重积分'] }),
  entry({ id: 'multi-triple-integral', type: 'template', group: 'multivariable', topic: '多重积分', label: '三重积分', latex: '\\iiint_V f(x,y,z)\\,dV', description: '区域 V 上的三重积分。', keywords: ['triple integral', '三重积分'] }),
  entry({ id: 'multi-lagrange-multiplier', type: 'formula', group: 'multivariable', topic: '约束', label: '拉格朗日乘子条件', latex: '\\nabla f=\\lambda\\nabla g', description: '单约束极值的必要条件。', keywords: ['Lagrange multiplier', '拉格朗日乘子'], library: true }),

  entry({ id: 'linear-column-vector', type: 'template', group: 'linearAlgebra', topic: '向量', label: '列向量', latex: '\\begin{pmatrix}a\\\\b\\end{pmatrix}', description: '二行列向量。', keywords: ['vector', 'column vector', '列向量'], featured: true }),
  entry({ id: 'linear-row-vector', type: 'template', group: 'linearAlgebra', topic: '向量', label: '行向量', latex: '\\begin{pmatrix}a&b&c\\end{pmatrix}', description: '一行向量。', keywords: ['row vector', '行向量'] }),
  entry({ id: 'linear-matrix-2x2', type: 'template', group: 'linearAlgebra', topic: '矩阵', label: '2x2 矩阵', latex: '\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}', description: '二维矩阵。', keywords: ['matrix', '矩阵'], aliases: ['2x2'], featured: true }),
  entry({ id: 'linear-matrix-3x3', type: 'template', group: 'linearAlgebra', topic: '矩阵', label: '3x3 矩阵', latex: '\\begin{pmatrix}a&b&c\\\\d&e&f\\\\g&h&i\\end{pmatrix}', description: '三阶矩阵。', keywords: ['matrix', '3x3', '矩阵'] }),
  entry({ id: 'linear-determinant', type: 'template', group: 'linearAlgebra', topic: '矩阵', label: '行列式', latex: '\\det(A)', description: '行列式函数。', keywords: ['determinant', 'det', '行列式'] }),
  entry({ id: 'linear-inverse', type: 'template', group: 'linearAlgebra', topic: '矩阵', label: '逆矩阵', latex: 'A^{-1}', description: '矩阵 A 的逆。', keywords: ['inverse matrix', '逆矩阵'] }),
  entry({ id: 'linear-transpose', type: 'template', group: 'linearAlgebra', topic: '矩阵', label: '转置', latex: 'A^{T}', description: '矩阵转置。', keywords: ['transpose', '转置'] }),
  entry({ id: 'linear-rank', type: 'template', group: 'linearAlgebra', topic: '矩阵', label: '秩', latex: '\\operatorname{rank}(A)', description: '矩阵的秩。', keywords: ['rank', '秩'] }),
  entry({ id: 'linear-dot-product', type: 'template', group: 'linearAlgebra', topic: '向量', label: '点积', latex: '\\mathbf{a}\\cdot\\mathbf{b}', description: '向量内积符号。', keywords: ['dot product', 'inner product', '点积'], featured: true }),
  entry({ id: 'linear-cross-product', type: 'template', group: 'linearAlgebra', topic: '向量', label: '叉积', latex: '\\mathbf{a}\\times\\mathbf{b}', description: '三维向量叉积。', keywords: ['cross product', '叉积'] }),
  entry({ id: 'linear-vector-norm', type: 'template', group: 'linearAlgebra', topic: '向量', label: '向量范数', latex: '\\left\\|\\mathbf{x}\\right\\|_2', description: '欧几里得范数。', keywords: ['norm', '范数'] }),
  entry({ id: 'linear-eigenvalue', type: 'formula', group: 'linearAlgebra', topic: '特征值', label: '特征值方程', latex: 'A\\mathbf{v}=\\lambda\\mathbf{v}', description: '矩阵特征值和特征向量关系。', keywords: ['eigenvalue', '特征值'], library: true, featured: true }),
  entry({ id: 'linear-characteristic', type: 'formula', group: 'linearAlgebra', topic: '特征值', label: '特征多项式', latex: '\\det(A-\\lambda I)=0', description: '求特征值的方程。', keywords: ['characteristic polynomial', '特征多项式'], library: true }),
  entry({ id: 'linear-system', type: 'formula', group: 'linearAlgebra', topic: '线性方程组', label: '矩阵方程', latex: 'A\\mathbf{x}=\\mathbf{b}', description: '线性方程组的矩阵形式。', keywords: ['linear system', '线性方程组'], library: true }),
  entry({ id: 'linear-dot-expanded', type: 'formula', group: 'linearAlgebra', topic: '向量', label: '二维向量点积', latex: '\\begin{pmatrix}a_1\\\\a_2\\end{pmatrix}\\cdot\\begin{pmatrix}b_1\\\\b_2\\end{pmatrix}=a_1b_1+a_2b_2\\in\\mathbb{R}', description: '二维向量内积展开。', keywords: ['dot product', '向量点积'], library: true }),
  entry({ id: 'linear-orthogonal', type: 'formula', group: 'linearAlgebra', topic: '向量', label: '正交条件', latex: '\\mathbf{u}\\cdot\\mathbf{v}=0', description: '两个向量正交的条件。', keywords: ['orthogonal', '正交'], library: true }),
  entry({ id: 'linear-trace', type: 'template', group: 'linearAlgebra', topic: '矩阵', label: '迹', latex: '\\operatorname{tr}(A)', description: '矩阵对角线元素之和。', keywords: ['trace', '迹'] }),

  entry({ id: 'prob-conditional', type: 'formula', group: 'probability', topic: '概率基础', label: '条件概率', latex: 'P(A\\mid B)=\\frac{P(A\\cap B)}{P(B)}', description: '在 B 已发生时 A 的概率。', keywords: ['conditional probability', '条件概率'], library: true, featured: true }),
  entry({ id: 'prob-bayes', type: 'formula', group: 'probability', topic: '概率基础', label: '贝叶斯公式', latex: 'P(A|B)=\\frac{P(B|A)P(A)}{P(B)}', description: '用证据更新事件概率。', keywords: ['Bayes', '贝叶斯'], library: true, featured: true }),
  entry({ id: 'prob-total', type: 'formula', group: 'probability', topic: '概率基础', label: '全概率公式', latex: 'P(A)=\\sum_i P(A\\mid B_i)P(B_i)', description: '按互斥完备事件组分解概率。', keywords: ['total probability', '全概率'], library: true }),
  entry({ id: 'prob-expectation', type: 'formula', group: 'probability', topic: '随机变量', label: '期望', latex: 'E[X]=\\sum_x xP(X=x)', description: '离散随机变量的期望。', keywords: ['expectation', 'mean', '期望'], library: true }),
  entry({ id: 'prob-continuous-expectation', type: 'formula', group: 'probability', topic: '随机变量', label: '连续期望', latex: 'E[X]=\\int_{-\\infty}^{\\infty}xf(x)\\,dx', description: '连续随机变量的期望。', keywords: ['expectation', 'continuous', '连续期望'], library: true }),
  entry({ id: 'prob-variance', type: 'formula', group: 'probability', topic: '随机变量', label: '方差', latex: '\\operatorname{Var}(X)=E[(X-E[X])^2]', description: '随机变量围绕均值的离散程度。', keywords: ['variance', '方差'], library: true }),
  entry({ id: 'prob-cdf', type: 'formula', group: 'probability', topic: '分布函数', label: '分布函数', latex: 'F_X(x)=P(X\\le x)', description: '累计分布函数定义。', keywords: ['CDF', '分布函数'], library: true }),
  entry({ id: 'prob-pdf-cdf', type: 'formula', group: 'probability', topic: '分布函数', label: '密度与分布函数', latex: 'F_X(x)=\\int_{-\\infty}^{x}f_X(t)\\,dt', description: '连续分布中 CDF 与 PDF 的关系。', keywords: ['PDF', 'CDF', '密度'], library: true }),
  entry({ id: 'prob-normal-pdf', type: 'formula', group: 'probability', topic: '常见分布', label: '标准正态密度', latex: '\\phi(z)=\\frac{1}{\\sqrt{2\\pi}}e^{-z^2/2}', description: '标准正态分布的概率密度函数。', keywords: ['normal', 'standard normal', '正态'], library: true, relatedTool: 'normal' }),
  entry({ id: 'prob-normal-general-pdf', type: 'formula', group: 'probability', topic: '常见分布', label: '一般正态密度', latex: 'f(x)=\\frac{1}{\\sigma\\sqrt{2\\pi}}e^{-\\frac{(x-\\mu)^2}{2\\sigma^2}}', description: '均值 μ 控制中心，标准差 σ 控制宽窄。', keywords: ['normal', 'Gaussian', '正态'], library: true, relatedTool: 'normalGeneral' }),
  entry({ id: 'prob-normal-standardization', type: 'formula', group: 'probability', topic: '常见分布', label: '标准化转换', latex: 'z=\\frac{x-\\mu}{\\sigma}', description: '把一般正态变量转换为标准正态 z 分数。', keywords: ['standardization', 'z score', '标准化'], library: true, relatedTool: 'normalGeneral' }),
  entry({ id: 'prob-binomial-pmf', type: 'formula', group: 'probability', topic: '常见分布', label: '二项分布 PMF', latex: 'P(X=k)=\\binom{n}{k}p^k(1-p)^{n-k}', description: 'n 次独立试验中恰好成功 k 次的概率。', keywords: ['binomial', '二项分布'], library: true, relatedTool: 'binomial' }),
  entry({ id: 'prob-poisson-pmf', type: 'formula', group: 'probability', topic: '常见分布', label: '泊松分布 PMF', latex: 'P(X=k)=\\frac{e^{-\\lambda}\\lambda^k}{k!}', description: '单位区间平均 λ 次事件发生 k 次的概率。', keywords: ['Poisson', '泊松'], library: true, relatedTool: 'poisson' }),
  entry({ id: 'prob-exponential-pdf', type: 'formula', group: 'probability', topic: '常见分布', label: '指数分布密度', latex: 'f(x)=\\lambda e^{-\\lambda x},\\quad x\\ge0', description: '等待时间模型的常见密度。', keywords: ['exponential distribution', '指数分布'], library: true }),
  entry({ id: 'prob-uniform-pdf', type: 'formula', group: 'probability', topic: '常见分布', label: '均匀分布密度', latex: 'f(x)=\\frac{1}{b-a},\\quad a\\le x\\le b', description: '区间上等可能的连续分布。', keywords: ['uniform distribution', '均匀分布'], library: true }),
  entry({ id: 'prob-covariance', type: 'formula', group: 'probability', topic: '随机变量', label: '协方差', latex: '\\operatorname{Cov}(X,Y)=E[(X-E[X])(Y-E[Y])]', description: '两个随机变量共同变化方向的度量。', keywords: ['covariance', '协方差'], library: true }),
  entry({ id: 'prob-independence', type: 'formula', group: 'probability', topic: '概率基础', label: '独立事件', latex: 'P(A\\cap B)=P(A)P(B)', description: '事件 A 与 B 独立的判定式。', keywords: ['independence', '独立'], library: true }),

  entry({ id: 'stat-mean', type: 'formula', group: 'statistics', topic: '描述统计', label: '样本均值', latex: '\\bar{x}=\\frac{1}{n}\\sum_{i=1}^{n}x_i', description: '一组数据的平均水平。', keywords: ['mean', 'average', '均值'], library: true, relatedTool: 'data', featured: true, example: { question: '数据 2、4、9 的均值是多少？', solution: '把三个数相加再除以 3，得到 5。', latex: '\\bar{x}=\\frac{2+4+9}{3}=5' } }),
  entry({ id: 'stat-sample-variance', type: 'formula', group: 'statistics', topic: '描述统计', label: '样本方差', latex: 's^2=\\frac{1}{n-1}\\sum_{i=1}^{n}(x_i-\\bar{x})^2', description: '数据离散程度的无偏估计。', keywords: ['variance', '样本方差'], library: true, relatedTool: 'data', featured: true }),
  entry({ id: 'stat-population-variance', type: 'formula', group: 'statistics', topic: '描述统计', label: '总体方差', latex: '\\sigma^2=\\frac{1}{N}\\sum_{i=1}^{N}(x_i-\\mu)^2', description: '总体数据的方差。', keywords: ['population variance', '总体方差'], library: true }),
  entry({ id: 'stat-standard-deviation', type: 'formula', group: 'statistics', topic: '描述统计', label: '标准差', latex: 's=\\sqrt{s^2}', description: '方差的平方根。', keywords: ['standard deviation', '标准差'], library: true }),
  entry({ id: 'stat-correlation', type: 'formula', group: 'statistics', topic: '描述统计', label: 'Pearson 相关系数', latex: 'r=\\frac{\\sum(x_i-\\bar{x})(y_i-\\bar{y})}{\\sqrt{\\sum(x_i-\\bar{x})^2\\sum(y_i-\\bar{y})^2}}', description: '衡量两个数值变量的线性相关程度。', keywords: ['correlation', 'Pearson', '相关系数'], library: true, relatedTool: 'data' }),
  entry({ id: 'stat-z-score', type: 'formula', group: 'statistics', topic: '标准化', label: 'z 分数', latex: 'z=\\frac{x-\\bar{x}}{s}', description: '样本值相对均值的标准化位置。', keywords: ['z score', '标准化'], library: true }),
  entry({ id: 'stat-standard-error', type: 'formula', group: 'statistics', topic: '估计', label: '标准误', latex: '\\operatorname{SE}=\\frac{s}{\\sqrt{n}}', description: '样本均值估计不确定性的常用度量。', keywords: ['standard error', '标准误'], library: true }),
  entry({ id: 'stat-ci-mean', type: 'formula', group: 'statistics', topic: '置信区间', label: '均值置信区间', latex: '\\bar{x}\\pm z_{\\alpha/2}\\frac{s}{\\sqrt{n}}', description: '大样本均值置信区间形式。', keywords: ['confidence interval', '置信区间'], library: true }),
  entry({ id: 'stat-t-statistic', type: 'formula', group: 'statistics', topic: '假设检验', label: 't 统计量', latex: 't=\\frac{\\bar{x}-\\mu_0}{s/\\sqrt{n}}', description: '单样本 t 检验统计量。', keywords: ['t test', 't statistic'], library: true, relatedTool: 'studentT' }),
  entry({ id: 'stat-chi-square', type: 'formula', group: 'statistics', topic: '假设检验', label: '卡方统计量', latex: '\\chi^2=\\sum\\frac{(O_i-E_i)^2}{E_i}', description: '拟合优度或列联表检验中的统计量。', keywords: ['chi-square', '卡方'], library: true, relatedTool: 'chiSquare' }),
  entry({ id: 'stat-f-statistic', type: 'formula', group: 'statistics', topic: '假设检验', label: 'F 统计量', latex: 'F=\\frac{s_1^2}{s_2^2}', description: '比较两个方差的统计量。', keywords: ['F statistic', 'F test'], library: true, relatedTool: 'f' }),
  entry({ id: 'stat-sample-proportion', type: 'formula', group: 'statistics', topic: '比例', label: '样本比例', latex: '\\hat{p}=\\frac{x}{n}', description: '成功次数占样本量的比例。', keywords: ['proportion', '样本比例'], library: true }),
  entry({ id: 'stat-regression-line', type: 'formula', group: 'statistics', topic: '回归', label: '简单线性回归', latex: '\\hat{y}=\\beta_0+\\beta_1x', description: '一元线性回归预测式。', keywords: ['linear regression', '线性回归'], library: true }),
  entry({ id: 'stat-r-squared', type: 'formula', group: 'statistics', topic: '回归', label: '决定系数', latex: 'R^2=1-\\frac{SS_{\\text{res}}}{SS_{\\text{tot}}}', description: '回归模型解释变异的比例。', keywords: ['R squared', '决定系数'], library: true }),
  entry({ id: 'stat-screenshot-variance', type: 'formula', group: 'statistics', topic: '描述统计', label: '样本方差示例', latex: '\\operatorname{Var}(X)=\\frac{1}{n}\\sum_{i=1}^{4}(x_i-\\bar{x})^2', description: '截图中的方差公式结构。', keywords: ['variance', '截图', '方差'], library: true }),

  entry({ id: 'discrete-combination', type: 'template', group: 'discrete', topic: '组合', label: '组合数', latex: '\\binom{n}{k}', description: '从 n 个对象中选 k 个。', keywords: ['combination', '组合'], featured: true }),
  entry({ id: 'discrete-combination-formula', type: 'formula', group: 'discrete', topic: '组合', label: '组合数公式', latex: '\\binom{n}{k}=\\frac{n!}{k!(n-k)!}', description: '组合数的阶乘形式。', keywords: ['combination formula', '组合数'], library: true }),
  entry({ id: 'discrete-permutation', type: 'formula', group: 'discrete', topic: '排列', label: '排列数', latex: 'P(n,k)=\\frac{n!}{(n-k)!}', description: '从 n 个对象中有序选 k 个。', keywords: ['permutation', '排列'], library: true }),
  entry({ id: 'discrete-recurrence', type: 'template', group: 'discrete', topic: '递推', label: '递推式', latex: 'a_n=ra_{n-1}+b', description: '一阶线性递推常见形式。', keywords: ['recurrence', '递推'] }),
  entry({ id: 'discrete-fibonacci', type: 'formula', group: 'discrete', topic: '递推', label: '斐波那契递推', latex: 'F_n=F_{n-1}+F_{n-2}', description: '斐波那契数列递推定义。', keywords: ['Fibonacci', '斐波那契'], library: true }),
  entry({ id: 'discrete-graph-degree-sum', type: 'formula', group: 'discrete', topic: '图论', label: '握手定理', latex: '\\sum_{v\\in V}\\deg(v)=2|E|', description: '图中所有顶点度数之和等于边数两倍。', keywords: ['graph', 'degree sum', '握手定理'], library: true }),
  entry({ id: 'discrete-mod', type: 'template', group: 'discrete', topic: '数论', label: '同余', latex: 'a\\equiv b\\pmod n', description: '模 n 同余。', keywords: ['mod', 'congruence', '同余'], featured: true }),
  entry({ id: 'discrete-gcd', type: 'template', group: 'discrete', topic: '数论', label: '最大公约数', latex: '\\gcd(a,b)', description: '最大公约数。', keywords: ['gcd', '最大公约数'] }),
  entry({ id: 'discrete-logic-quantifier', type: 'template', group: 'discrete', topic: '逻辑', label: '量词命题', latex: '\\forall x\\in A,\\ \\exists y\\in B', description: '全称和存在量词组合。', keywords: ['logic', 'quantifier', '量词'] }),
  entry({ id: 'discrete-truth-implication', type: 'formula', group: 'discrete', topic: '逻辑', label: '蕴含等价', latex: 'P\\Rightarrow Q\\equiv \\neg P\\lor Q', description: '命题逻辑中蕴含的等价形式。', keywords: ['implication', 'logic', '蕴含'], library: true }),
  entry({ id: 'discrete-cardinality-union', type: 'formula', group: 'discrete', topic: '集合计数', label: '容斥原理', latex: '|A\\cup B|=|A|+|B|-|A\\cap B|', description: '两个集合的容斥公式。', keywords: ['inclusion exclusion', '容斥'], library: true }),
  entry({ id: 'discrete-power-set', type: 'formula', group: 'discrete', topic: '集合计数', label: '幂集大小', latex: '|\\mathcal{P}(A)|=2^{|A|}', description: '有限集合幂集的元素个数。', keywords: ['power set', '幂集'], library: true }),

  entry({ id: 'ode-first-order', type: 'template', group: 'differentialEquations', topic: '常微分方程', label: '一阶 ODE', latex: '\\frac{dy}{dx}=f(x,y)', description: '一阶常微分方程通式。', keywords: ['ODE', '一阶微分方程'], featured: true }),
  entry({ id: 'ode-separable', type: 'formula', group: 'differentialEquations', topic: '分离变量', label: '分离变量', latex: '\\frac{dy}{dx}=g(x)h(y)\\Rightarrow \\int\\frac{1}{h(y)}\\,dy=\\int g(x)\\,dx', description: '可分离变量方程的积分形式。', keywords: ['separable', '分离变量'], library: true }),
  entry({ id: 'ode-linear-first-order', type: 'formula', group: 'differentialEquations', topic: '一阶线性', label: '一阶线性方程', latex: 'y^{\\prime}+p(x)y=q(x)', description: '一阶线性微分方程标准形式。', keywords: ['linear ODE', '一阶线性'], library: true }),
  entry({ id: 'ode-exponential-growth', type: 'formula', group: 'differentialEquations', topic: '模型', label: '指数增长', latex: '\\frac{dy}{dt}=ky\\Rightarrow y(t)=Ce^{kt}', description: '指数增长或衰减模型。', keywords: ['exponential growth', '指数增长'], library: true }),
  entry({ id: 'ode-logistic', type: 'formula', group: 'differentialEquations', topic: '模型', label: 'Logistic 方程', latex: '\\frac{dP}{dt}=rP\\left(1-\\frac{P}{K}\\right)', description: '带容量上限的增长模型。', keywords: ['logistic', '逻辑斯蒂'], library: true }),
  entry({ id: 'ode-second-order-linear', type: 'template', group: 'differentialEquations', topic: '二阶线性', label: '二阶线性 ODE', latex: 'ay^{\\prime\\prime}+by^{\\prime}+cy=0', description: '常系数二阶线性齐次方程。', keywords: ['second order ODE', '二阶线性'] }),
  entry({ id: 'ode-characteristic', type: 'formula', group: 'differentialEquations', topic: '二阶线性', label: '特征方程', latex: 'ar^2+br+c=0', description: '常系数二阶线性方程的特征方程。', keywords: ['characteristic equation', '特征方程'], library: true }),

  entry({ id: 'opt-argmin', type: 'template', group: 'optimization', topic: '目标函数', label: '最小化', latex: '\\operatorname*{arg\\,min}_{x} f(x)', description: '使目标函数最小的自变量。', keywords: ['argmin', 'minimize', '最小化'], featured: true }),
  entry({ id: 'opt-argmax', type: 'template', group: 'optimization', topic: '目标函数', label: '最大化', latex: '\\operatorname*{arg\\,max}_{x} f(x)', description: '使目标函数最大的自变量。', keywords: ['argmax', 'maximize', '最大化'] }),
  entry({ id: 'opt-gradient-descent', type: 'formula', group: 'optimization', topic: '梯度法', label: '梯度下降', latex: 'x_{k+1}=x_k-\\eta\\nabla f(x_k)', description: '沿负梯度方向迭代更新。', keywords: ['gradient descent', '梯度下降'], library: true, featured: true }),
  entry({ id: 'opt-first-order-condition', type: 'formula', group: 'optimization', topic: '最优性条件', label: '一阶条件', latex: '\\nabla f(x^*)=0', description: '无约束可微优化的驻点条件。', keywords: ['first order condition', '一阶条件'], library: true }),
  entry({ id: 'opt-hessian', type: 'template', group: 'optimization', topic: '二阶信息', label: 'Hessian 矩阵', latex: 'H_f(x)=\\nabla^2 f(x)', description: '二阶偏导构成的矩阵。', keywords: ['Hessian', '海森矩阵'] }),
  entry({ id: 'opt-convex', type: 'formula', group: 'optimization', topic: '凸优化', label: '凸函数定义', latex: 'f(\\theta x+(1-\\theta)y)\\le\\theta f(x)+(1-\\theta)f(y)', description: '0≤θ≤1 时的凸性条件。', keywords: ['convex', '凸函数'], library: true }),
  entry({ id: 'opt-lagrangian', type: 'template', group: 'optimization', topic: '约束优化', label: '拉格朗日函数', latex: '\\mathcal{L}(x,\\lambda)=f(x)+\\lambda g(x)', description: '等式约束优化的拉格朗日函数。', keywords: ['Lagrangian', '拉格朗日'] }),
  entry({ id: 'opt-kkt', type: 'formula', group: 'optimization', topic: '约束优化', label: '互补松弛', latex: '\\lambda_i g_i(x)=0', description: 'KKT 条件中的互补松弛。', keywords: ['KKT', 'complementary slackness', '互补松弛'], library: true }),

  entry({ id: 'num-absolute-error', type: 'formula', group: 'numerical', topic: '误差', label: '绝对误差', latex: 'E_a=|x-\\hat{x}|', description: '真实值与近似值的绝对差。', keywords: ['absolute error', '绝对误差'], library: true }),
  entry({ id: 'num-relative-error', type: 'formula', group: 'numerical', topic: '误差', label: '相对误差', latex: 'E_r=\\frac{|x-\\hat{x}|}{|x|}', description: '绝对误差相对真实值的比例。', keywords: ['relative error', '相对误差'], library: true }),
  entry({ id: 'num-newton', type: 'formula', group: 'numerical', topic: '非线性方程', label: '牛顿迭代', latex: 'x_{n+1}=x_n-\\frac{f(x_n)}{f^{\\prime}(x_n)}', description: '求方程根的经典迭代法。', keywords: ['Newton method', '牛顿法'], library: true, featured: true }),
  entry({ id: 'num-bisection', type: 'formula', group: 'numerical', topic: '非线性方程', label: '二分中点', latex: 'c=\\frac{a+b}{2}', description: '二分法中的区间中点。', keywords: ['bisection', '二分法'], library: true }),
  entry({ id: 'num-lagrange-interpolation', type: 'formula', group: 'numerical', topic: '插值', label: '拉格朗日插值', latex: 'P(x)=\\sum_{j=0}^{n}y_j\\prod_{m\\ne j}\\frac{x-x_m}{x_j-x_m}', description: '通过 n+1 个点的插值多项式。', keywords: ['Lagrange interpolation', '拉格朗日插值'], library: true }),
  entry({ id: 'num-trapezoid', type: 'formula', group: 'numerical', topic: '数值积分', label: '梯形公式', latex: '\\int_a^b f(x)\\,dx\\approx\\frac{b-a}{2}\\left[f(a)+f(b)\\right]', description: '用梯形面积近似积分。', keywords: ['trapezoidal rule', '梯形公式'], library: true }),
  entry({ id: 'num-simpson', type: 'formula', group: 'numerical', topic: '数值积分', label: '辛普森公式', latex: '\\int_a^b f(x)\\,dx\\approx\\frac{b-a}{6}\\left[f(a)+4f\\left(\\frac{a+b}{2}\\right)+f(b)\\right]', description: '用二次插值近似积分。', keywords: ['Simpson rule', '辛普森'], library: true }),
]

export const FORMULA_CATALOG: FormulaCatalogEntry[] = [...catalogCore, ...generatedSymbols]

export const FORMULA_EXAMPLE_IDS = [
  'calculus-partial-definition',
  'calculus-half-life',
  'calculus-separated-integral',
  'calculus-log-solution',
  'multi-gradient-vector',
  'linear-dot-expanded',
  'stat-screenshot-variance',
] as const

export function getFormulaGroupLabel(group: FormulaTemplateGroup) {
  return FORMULA_GROUPS.find((item) => item.id === group)?.label ?? group
}

export function getFormulaTopics(entries: FormulaCatalogEntry[] = FORMULA_CATALOG, group?: FormulaTemplateGroup | 'all') {
  return Array.from(
    new Set(
      entries
        .filter((entry) => !group || group === 'all' || entry.group === group)
        .map((entry) => entry.topic)
        .filter(Boolean),
    ),
  )
}

export function getFormulaGroups(entries: FormulaCatalogEntry[] = FORMULA_CATALOG) {
  const usedGroups = new Set(entries.map((entry) => entry.group))
  return FORMULA_GROUPS.filter((group) => usedGroups.has(group.id))
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase()
}

export function searchFormulaCatalog(
  entries: FormulaCatalogEntry[] = FORMULA_CATALOG,
  query = '',
  filters: FormulaCatalogSearchFilters = {},
) {
  const normalizedQuery = normalizeSearch(query)
  const ids = filters.ids ? new Set(filters.ids) : null
  const types = filters.types ? new Set(filters.types) : null

  return entries.filter((entry) => {
    if (ids && !ids.has(entry.id)) return false
    if (types && !types.has(entry.type)) return false
    if (filters.libraryOnly && entry.library === false) return false
    if (filters.group && filters.group !== 'all' && entry.group !== filters.group) return false
    if (filters.topic && filters.topic !== '全部' && entry.topic !== filters.topic) return false
    if (!normalizedQuery) return true

    const haystack = [
      entry.id,
      entry.type,
      entry.group,
      entry.topic,
      entry.label,
      entry.latex,
      entry.description,
      ...entry.keywords,
      ...(entry.aliases ?? []),
    ]
      .join(' ')
      .toLowerCase()

    return haystack.includes(normalizedQuery)
  })
}

export function getFormulaCatalogEntry(id: string) {
  return FORMULA_CATALOG.find((entry) => entry.id === id)
}

export function getFormulaCatalogEntries(ids: string[]) {
  const byId = new Map(FORMULA_CATALOG.map((entry) => [entry.id, entry]))
  return ids.map((id) => byId.get(id)).filter((entry): entry is FormulaCatalogEntry => Boolean(entry))
}
