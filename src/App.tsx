import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { DISTRIBUTIONS } from './distributions'
import { AppShell } from './components/AppShell'
import { DEFAULT_TOOL_ID, getToolDefinition, isToolId } from './toolRegistry'
import type { DistributionId, ToolId } from './types'

const DistributionTool = lazy(() => import('./components/DistributionTool').then((module) => ({ default: module.DistributionTool })))
const CalculatorTool = lazy(() => import('./components/CalculatorTool').then((module) => ({ default: module.CalculatorTool })))
const FormulaLibraryTool = lazy(() => import('./components/FormulaLibraryTool').then((module) => ({ default: module.FormulaLibraryTool })))
const DataTool = lazy(() => import('./components/DataTool').then((module) => ({ default: module.DataTool })))
const AboutTool = lazy(() => import('./components/AboutTool').then((module) => ({ default: module.AboutTool })))

function readHashTool(): ToolId {
  const raw = window.location.hash.replace(/^#\/?/, '')
  return isToolId(raw) ? raw : DEFAULT_TOOL_ID
}

function renderTool(toolId: ToolId) {
  if (toolId === 'calculator') return <CalculatorTool />
  if (toolId === 'formulas') return <FormulaLibraryTool />
  if (toolId === 'data') return <DataTool />
  if (toolId === 'about') return <AboutTool />

  return <DistributionTool key={toolId} definition={DISTRIBUTIONS[toolId as DistributionId]} />
}

function App() {
  const [activeTool, setActiveTool] = useState<ToolId>(readHashTool)

  useEffect(() => {
    if (!window.location.hash) {
      window.location.hash = `/${DEFAULT_TOOL_ID}`
    }

    const onHashChange = () => setActiveTool(readHashTool())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const tool = useMemo(() => getToolDefinition(activeTool), [activeTool])

  return (
    <AppShell activeTool={activeTool} tool={tool}>
      <Suspense fallback={<div className="tool-surface">正在加载工具...</div>}>{renderTool(activeTool)}</Suspense>
    </AppShell>
  )
}

export default App
