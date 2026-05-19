import {
  BookOpenText,
  Calculator,
  ChartArea,
  Database,
  FunctionSquare,
  Info,
  TableProperties,
} from 'lucide-react'
import type { ToolDefinition, ToolId } from './types'

export const TOOL_REGISTRY: ToolDefinition[] = [
  { id: 'normalGeneral', label: '正态分布', description: 'X ~ N(μ, σ²) 参数影响与概率查询', icon: ChartArea },
  { id: 'normal', label: '标准正态分布', description: 'Z ~ N(0,1) 概率与临界值', icon: ChartArea },
  { id: 'studentT', label: 't 分布', description: 'Student t 分布查询', icon: FunctionSquare },
  { id: 'chiSquare', label: '卡方分布', description: 'χ² 分布查询', icon: FunctionSquare },
  { id: 'f', label: 'F 分布', description: 'F 分布查询', icon: FunctionSquare },
  { id: 'binomial', label: '二项分布', description: 'Bin(n,p) 离散概率', icon: Calculator },
  { id: 'poisson', label: '泊松分布', description: 'Pois(λ) 离散概率', icon: Database },
  { id: 'calculator', label: '计算器', description: '表达式、变量与函数计算', icon: Calculator },
  { id: 'formulas', label: '公式库', description: '常用数学和统计公式', icon: BookOpenText },
  { id: 'data', label: '数据工具', description: 'CSV 描述统计与相关性', icon: TableProperties },
  { id: 'about', label: '关于', description: '项目与版本信息', icon: Info },
]

export const DEFAULT_TOOL_ID: ToolId = 'normalGeneral'

export function getToolDefinition(id: ToolId) {
  return TOOL_REGISTRY.find((tool) => tool.id === id) ?? TOOL_REGISTRY[0]
}

export function isToolId(value: string): value is ToolId {
  return TOOL_REGISTRY.some((tool) => tool.id === value)
}
