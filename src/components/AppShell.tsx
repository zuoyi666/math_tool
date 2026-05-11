import { CircleHelp, Keyboard, Menu, Settings, Sigma } from 'lucide-react'
import type { ReactNode } from 'react'
import { TOOL_REGISTRY } from '../toolRegistry'
import type { ToolDefinition, ToolId } from '../types'

interface AppShellProps {
  activeTool: ToolId
  tool: ToolDefinition
  children: ReactNode
}

export function AppShell({ activeTool, tool, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="数学工具导航">
        <a className="brand" href="#/normal" aria-label="Math Tool 首页">
          <Sigma size={32} aria-hidden="true" />
          <span>Math Tool</span>
        </a>

        <nav className="tool-nav">
          {TOOL_REGISTRY.map((item) => {
            const Icon = item.icon
            return (
              <a key={item.id} className={item.id === activeTool ? 'active' : ''} href={`#/${item.id}`} title={item.description}>
                <Icon size={20} aria-hidden="true" />
                <span>{item.label}</span>
              </a>
            )
          })}
        </nav>

        <button type="button" className="theme-control" aria-label="浅色模式">
          <span className="sun-icon" />
          浅色模式
        </button>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <button type="button" className="icon-button menu-button" aria-label="打开导航">
            <Menu size={21} />
          </button>
          <div className="top-actions" aria-label="辅助操作">
            <button type="button" className="text-action">
              <Keyboard size={17} />
              快捷键
            </button>
            <button type="button" className="text-action">
              <CircleHelp size={18} />
              帮助
            </button>
            <button type="button" className="text-action">
              <Settings size={18} />
              设置
            </button>
          </div>
        </header>

        <section className="tool-header">
          <div>
            <h1>{tool.label}</h1>
            <p>{tool.description}</p>
          </div>
          <div className="mode-summary">{tool.label}</div>
        </section>

        {children}
      </main>
    </div>
  )
}
