import { CircleHelp, Keyboard, Menu, Settings, Sigma } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { TOOL_REGISTRY } from '../toolRegistry'
import type { ToolDefinition, ToolId } from '../types'

interface AppShellProps {
  activeTool: ToolId
  tool: ToolDefinition
  children: ReactNode
}

type TopbarPanel = 'nav' | 'shortcuts' | 'help' | 'settings'

const PANEL_TITLES: Record<TopbarPanel, string> = {
  nav: '工具导航',
  shortcuts: '快捷键',
  help: '帮助',
  settings: '设置',
}

export function AppShell({ activeTool, tool, children }: AppShellProps) {
  const [activePanel, setActivePanel] = useState<TopbarPanel | null>(null)
  const openPanel = (panel: TopbarPanel) => setActivePanel((current) => (current === panel ? null : panel))

  useEffect(() => {
    if (!activePanel) return undefined
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActivePanel(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activePanel])

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
          <button type="button" className="icon-button menu-button" aria-label="打开导航" aria-expanded={activePanel === 'nav'} onClick={() => openPanel('nav')}>
            <Menu size={21} />
          </button>
          <div className="top-actions" aria-label="辅助操作">
            <button type="button" className="text-action" aria-expanded={activePanel === 'shortcuts'} onClick={() => openPanel('shortcuts')}>
              <Keyboard size={17} />
              快捷键
            </button>
            <button type="button" className="text-action" aria-expanded={activePanel === 'help'} onClick={() => openPanel('help')}>
              <CircleHelp size={18} />
              帮助
            </button>
            <button type="button" className="text-action" aria-expanded={activePanel === 'settings'} onClick={() => openPanel('settings')}>
              <Settings size={18} />
              设置
            </button>
          </div>
        </header>

        {activePanel ? (
          <section className="topbar-panel" aria-label={PANEL_TITLES[activePanel]}>
            <div className="topbar-panel-header">
              <h2>{PANEL_TITLES[activePanel]}</h2>
              <button type="button" className="ghost-button" onClick={() => setActivePanel(null)}>
                关闭
              </button>
            </div>
            {activePanel === 'nav' ? (
              <div className="topbar-panel-grid">
                {TOOL_REGISTRY.map((item) => (
                  <a key={item.id} className={item.id === activeTool ? 'active' : ''} href={`#/${item.id}`} onClick={() => setActivePanel(null)}>
                    <strong>{item.label}</strong>
                    <span>{item.description}</span>
                  </a>
                ))}
              </div>
            ) : null}
            {activePanel === 'shortcuts' ? (
              <dl className="shortcut-list">
                <div>
                  <dt>Enter</dt>
                  <dd>在计算器中执行当前表达式。</dd>
                </div>
                <div>
                  <dt>Shift + Enter</dt>
                  <dd>在计算器中插入换行。</dd>
                </div>
                <div>
                  <dt>Esc</dt>
                  <dd>关闭当前顶部面板。</dd>
                </div>
                <div>
                  <dt>点击历史项</dt>
                  <dd>恢复对应分布参数或计算器表达式。</dd>
                </div>
              </dl>
            ) : null}
            {activePanel === 'help' ? (
              <div className="help-copy">
                <p>分布页适合查概率、临界值和学习公式含义；每条公式都附有例题和符号解释。</p>
                <p>计算器支持表达式、变量、Ans、记忆键和角度模式。数据工具支持 CSV 粘贴或导入，并自动识别数值列。</p>
              </div>
            ) : null}
            {activePanel === 'settings' ? (
              <div className="settings-list">
                <div>
                  <strong>主题</strong>
                  <span>当前使用浅色工具界面。</span>
                </div>
                <div>
                  <strong>数据保存</strong>
                  <span>历史记录保存在当前浏览器本地存储中。</span>
                </div>
                <div>
                  <strong>版本控制</strong>
                  <span>项目已连接 GitHub public 仓库 zuoyi666/math_tool。</span>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

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
