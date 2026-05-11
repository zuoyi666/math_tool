# Math Tool

可扩展的浏览器数学工具。当前覆盖常用概率分布、表达式计算、公式库和 CSV 描述统计。

## 功能

- 标准正态、t、卡方、F、二项、泊松分布完整计算器
- 连续分布曲线阴影、离散分布柱状概率图
- 表达式计算器、公式库、CSV 描述统计与相关性
- 每个分布工具保存最近 6 次计算历史，可点击恢复
- 桌面与移动端响应式布局

## 开发命令

```bash
npm install
npm run dev
npm run test
npm run lint
npm run build
npm run checkpoint
```

默认开发地址为 Vite 输出的本地地址，例如 `http://127.0.0.1:5174/`。

## GitHub 工作流

仓库目标：`https://github.com/zuoyi666/math_tool`

本地固定流程：

```bash
npm run checkpoint
git add -A
git commit -m "implement completed feature"
git push
```

只在功能完成并且 lint/test/build 全部通过后推送，避免把半成品推到 `main`。
