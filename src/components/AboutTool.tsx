import { GITHUB_REPO_LABEL, GITHUB_REPO_URL } from '../projectLinks'

export function AboutTool() {
  return (
    <section className="tool-surface about-grid">
      <article className="workspace-card">
        <h2>Math Tool</h2>
        <p>一个面向学习、教学和日常分析的浏览器数学工具集。当前版本覆盖常用概率分布、表达式计算、公式检索和 CSV 描述统计。</p>
      </article>
      <article className="workspace-card">
        <h2>技术栈</h2>
        <ul>
          <li>React + Vite + TypeScript</li>
          <li>jStat / mathjs / Papa Parse / KaTeX</li>
          <li>自绘 SVG 图表</li>
        </ul>
      </article>
      <article className="workspace-card">
        <h2>版本控制</h2>
        <p>
          GitHub 仓库：
          <a className="external-link" href={GITHUB_REPO_URL}>
            {GITHUB_REPO_LABEL}
          </a>
        </p>
      </article>
      <article className="workspace-card">
        <h2>本地 App 图标</h2>
        <p>运行安装命令后，会默认在桌面生成 Math Tool 本地入口，双击即可启动并打开浏览器。</p>
        <code className="inline-command">npm run app:install</code>
        <p>首次安装可手动输入目录；直接回车会使用桌面。</p>
      </article>
      <article className="workspace-card learning-example-panel">
        <h2>例题学习路径</h2>
        <p>建议从标准正态的左尾概率开始，再切换到 t 分布临界值，最后用数据工具验证一组 CSV 的描述统计。</p>
        <ol>
          <li>标准正态：求 P(Z ≤ 1.96)。</li>
          <li>t 分布：设置自由度 ν=10，求右尾 p=0.05 的临界值。</li>
          <li>数据工具：粘贴两列数值，观察均值、标准差和相关系数。</li>
        </ol>
      </article>
    </section>
  )
}
