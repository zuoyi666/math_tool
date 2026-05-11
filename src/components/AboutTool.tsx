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
          <a href="https://github.com/zuoyi666/math_tool" target="_blank" rel="noreferrer">
            zuoyi666/math_tool
          </a>
        </p>
      </article>
    </section>
  )
}
