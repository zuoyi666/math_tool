import {
  BookOpenText,
  Calculator,
  ChartArea,
  Database,
  FunctionSquare,
  Info,
  SquarePen,
  TableProperties,
} from 'lucide-react'
import type { ToolDefinition, ToolGroupDefinition, ToolGroupId, ToolId } from './types'

export const TOOL_GROUPS: ToolGroupDefinition[] = [
  { id: 'input', label: '输入与计算', description: '公式排版、科学计算和表达式处理' },
  { id: 'distributions', label: '概率分布', description: '常用连续与离散分布查询' },
  { id: 'learning', label: '学习与数据', description: '公式学习、CSV 描述统计和建模建议' },
  { id: 'project', label: '项目信息', description: '版本、仓库和本地使用说明' },
]

export const TOOL_REGISTRY: ToolDefinition[] = [
  { id: 'formulaEditor', label: '公式编辑器', description: '可视化输入、预览和导出复杂公式', group: 'input', icon: SquarePen },
  { id: 'calculator', label: '计算器', description: '表达式、变量与函数计算', group: 'input', icon: Calculator },
  { id: 'normalGeneral', label: '正态分布', description: 'X ~ N(μ, σ²) 参数影响与概率查询', group: 'distributions', icon: ChartArea },
  { id: 'normal', label: '标准正态分布', description: 'Z ~ N(0,1) 概率与临界值', group: 'distributions', icon: ChartArea },
  { id: 'studentT', label: 't 分布', description: 'Student t 分布查询', group: 'distributions', icon: FunctionSquare },
  { id: 'chiSquare', label: '卡方分布', description: 'χ² 分布查询', group: 'distributions', icon: FunctionSquare },
  { id: 'f', label: 'F 分布', description: 'F 分布查询', group: 'distributions', icon: FunctionSquare },
  { id: 'binomial', label: '二项分布', description: 'Bin(n,p) 离散概率', group: 'distributions', icon: Calculator },
  { id: 'poisson', label: '泊松分布', description: 'Pois(λ) 离散概率', group: 'distributions', icon: Database },
  { id: 'formulas', label: '公式库', description: '常用数学和统计公式', group: 'learning', icon: BookOpenText },
  { id: 'data', label: '数据工具', description: 'CSV 描述统计与相关性', group: 'learning', icon: TableProperties },
  { id: 'about', label: '关于', description: '项目与版本信息', group: 'project', icon: Info },
]

export const DEFAULT_TOOL_ID: ToolId = 'formulaEditor'

export function getToolsByGroup(groupId: ToolGroupId) {
  return TOOL_REGISTRY.filter((tool) => tool.group === groupId)
}

export function getToolDefinition(id: ToolId) {
  return TOOL_REGISTRY.find((tool) => tool.id === id) ?? TOOL_REGISTRY[0]
}

export function isToolId(value: string): value is ToolId {
  return TOOL_REGISTRY.some((tool) => tool.id === value)
}
