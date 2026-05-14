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
npm run app:install
npm run app:run
npm run app:stop
```

默认开发地址为 Vite 输出的本地地址，例如 `http://127.0.0.1:5174/`。

## 安装本地 App 图标

Math Tool 提供轻量本地启动器，不依赖 Electron 或 Tauri。安装后会在桌面生成一个本地入口，双击即可启动本地预览服务并打开浏览器。

```bash
npm run app:install
```

首次运行会询问安装目录。直接回车使用默认桌面目录；也可以指定目录：

```bash
npm run app:install -- --dir ~/Applications
npm run app:install -- --yes
npm run app:install -- --dry-run
```

生成位置：

- macOS：`~/Desktop/Math Tool.app`
- Windows：桌面 `Math Tool.lnk`，如果系统无法创建快捷方式则生成 `Math Tool.cmd`
- Linux：桌面 `Math Tool.desktop`

启动器会检查 `node_modules` 和 `dist`，缺失时自动安装依赖或构建。默认使用 `http://127.0.0.1:4173/`；如果端口被其他程序占用，会自动顺延到下一个可用端口。停止后台本地服务：

```bash
npm run app:stop
```

如果 macOS 双击图标后没有打开页面，先在项目目录重新安装一次图标：

```bash
npm run app:install -- --yes
```

启动器日志保存在 `~/.math-tool/launcher.log`，本地预览服务日志保存在项目目录的 `.math-tool/preview.log`。

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
