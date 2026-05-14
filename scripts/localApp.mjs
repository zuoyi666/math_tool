import { existsSync, readdirSync, statSync } from 'node:fs'
import { mkdir, open, readFile, rm, writeFile } from 'node:fs/promises'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'

export const APP_NAME = 'Math Tool'
export const DEFAULT_HOST = '127.0.0.1'
export const DEFAULT_PORT = 4173
export const STATE_DIR = '.math-tool'
export const SERVER_STATE_FILE = 'preview-server.json'

export function parseInstallArgs(argv) {
  const parsed = { dir: undefined, yes: false, dryRun: false }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--yes' || arg === '-y') {
      parsed.yes = true
    } else if (arg === '--dry-run') {
      parsed.dryRun = true
    } else if (arg === '--dir') {
      parsed.dir = argv[index + 1]
      index += 1
    } else if (arg.startsWith('--dir=')) {
      parsed.dir = arg.slice('--dir='.length)
    } else {
      throw new Error(`未知参数：${arg}`)
    }
  }

  if (parsed.dir !== undefined && parsed.dir.trim() === '') {
    throw new Error('--dir 需要提供目录路径')
  }

  return parsed
}

export function expandHome(value, homeDir = os.homedir()) {
  if (value === '~') return homeDir
  if (value.startsWith('~/') || value.startsWith('~\\')) return path.join(homeDir, value.slice(2))
  return value
}

export function defaultInstallDir(platform = process.platform, homeDir = os.homedir()) {
  if (platform === 'win32') return path.join(homeDir, 'Desktop')
  return path.join(homeDir, 'Desktop')
}

export function resolveInstallDirectory({ parsedArgs, platform = process.platform, homeDir = os.homedir(), userInput = '' }) {
  const selected = parsedArgs.dir ?? (parsedArgs.yes || parsedArgs.dryRun ? '' : userInput)
  const raw = selected.trim() || defaultInstallDir(platform, homeDir)
  return path.resolve(expandHome(raw, homeDir))
}

export function createInstallPlan({ platform = process.platform, projectRoot = process.cwd(), installDir }) {
  const root = path.resolve(projectRoot)

  if (platform === 'darwin') {
    return {
      platform,
      kind: 'macos-app',
      projectRoot: root,
      installDir,
      targetPath: path.join(installDir, `${APP_NAME}.app`),
      iconPath: path.join(root, 'public', 'app-icon.icns'),
    }
  }

  if (platform === 'win32') {
    return {
      platform,
      kind: 'windows-shortcut',
      projectRoot: root,
      installDir,
      targetPath: path.join(installDir, `${APP_NAME}.lnk`),
      fallbackPath: path.join(installDir, `${APP_NAME}.cmd`),
      iconPath: path.join(root, 'public', 'app-icon.ico'),
    }
  }

  return {
    platform,
    kind: 'linux-desktop',
    projectRoot: root,
    installDir,
    targetPath: path.join(installDir, `${APP_NAME}.desktop`),
    iconPath: path.join(root, 'public', 'app-icon.png'),
  }
}

function quotePlist(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`
}

export function renderMacInfoPlist() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>zh_CN</string>
  <key>CFBundleDisplayName</key>
  <string>${quotePlist(APP_NAME)}</string>
  <key>CFBundleExecutable</key>
  <string>math-tool-launcher</string>
  <key>CFBundleIconFile</key>
  <string>AppIcon</string>
  <key>CFBundleIdentifier</key>
  <string>com.zuoyi666.mathtool.local</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>${quotePlist(APP_NAME)}</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0</string>
  <key>CFBundleVersion</key>
  <string>1</string>
  <key>LSMinimumSystemVersion</key>
  <string>10.15</string>
</dict>
</plist>
`
}

export function renderMacLauncher(projectRoot, { nodePath = process.execPath } = {}) {
  const nodeBinDir = path.dirname(nodePath)
  const runnerPath = path.join(projectRoot, 'scripts', 'run-local-app.mjs')
  const logPath = path.join(os.homedir(), STATE_DIR, 'launcher.log')
  const launchPath = `${nodeBinDir}:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin`

  return `#!/bin/zsh
set -e
export PATH=${shellQuote(launchPath)}:"$PATH"
PROJECT_ROOT=${shellQuote(projectRoot)}
RUNNER=${shellQuote(runnerPath)}
LOG_FILE=${shellQuote(logPath)}

mkdir -p "$(dirname "$LOG_FILE")"

set +e
{
  echo "[$(/bin/date '+%Y-%m-%d %H:%M:%S')] Launching Math Tool"
  cd "$PROJECT_ROOT"
  if [ -x ${shellQuote(nodePath)} ]; then
    ${shellQuote(nodePath)} "$RUNNER"
  elif command -v node >/dev/null 2>&1; then
    node "$RUNNER"
  else
    echo "Node.js was not found. Install Node.js, then run npm run app:install again."
    exit 127
  fi
} >> "$LOG_FILE" 2>&1
STATUS=$?
set -e

if [ "$STATUS" -ne 0 ]; then
  /usr/bin/osascript -e 'display dialog "Math Tool 启动失败。请在终端进入项目目录后运行 npm run app:install 重新安装；详细日志在 ~/.math-tool/launcher.log。" buttons {"好"} default button "好" with icon caution' >/dev/null 2>&1 || true
  exit "$STATUS"
fi
`
}

export function renderWindowsCommand(projectRoot) {
  return `@echo off
cd /d "${projectRoot.replaceAll('"', '""')}"
npm run app:run
`
}

export function renderLinuxDesktop(plan) {
  const command = `cd ${shellQuote(plan.projectRoot)} && npm run app:run`
  return `[Desktop Entry]
Type=Application
Name=${APP_NAME}
Comment=Open Math Tool locally
Exec=sh -lc ${shellQuote(command)}
Icon=${plan.iconPath}
Terminal=false
Categories=Education;Science;
`
}

async function installMacApp(plan) {
  const contents = path.join(plan.targetPath, 'Contents')
  const macos = path.join(contents, 'MacOS')
  const resources = path.join(contents, 'Resources')

  await rm(plan.targetPath, { recursive: true, force: true })
  await mkdir(macos, { recursive: true })
  await mkdir(resources, { recursive: true })
  await writeFile(path.join(contents, 'Info.plist'), renderMacInfoPlist())
  await writeFile(path.join(macos, 'math-tool-launcher'), renderMacLauncher(plan.projectRoot), { mode: 0o755 })
  await writeFile(path.join(contents, 'PkgInfo'), 'APPL????')
  await writeFile(path.join(resources, 'AppIcon.icns'), await readFile(plan.iconPath))
}

async function installLinuxLauncher(plan) {
  await writeFile(plan.targetPath, renderLinuxDesktop(plan), { mode: 0o755 })
}

async function createWindowsLnk(plan) {
  const psCommand = [
    '$shell = New-Object -ComObject WScript.Shell',
    `$shortcut = $shell.CreateShortcut(${JSON.stringify(plan.targetPath)})`,
    '$shortcut.TargetPath = "cmd.exe"',
    `$shortcut.Arguments = ${JSON.stringify(`/c "cd /d "${plan.projectRoot}" && npm run app:run"` )}`,
    `$shortcut.WorkingDirectory = ${JSON.stringify(plan.projectRoot)}`,
    `$shortcut.IconLocation = ${JSON.stringify(plan.iconPath)}`,
    '$shortcut.Save()',
  ].join('; ')
  const result = spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psCommand], { stdio: 'ignore' })
  return result.status === 0 && existsSync(plan.targetPath)
}

async function installWindowsLauncher(plan) {
  if (await createWindowsLnk(plan)) return plan.targetPath
  await writeFile(plan.fallbackPath, renderWindowsCommand(plan.projectRoot))
  return plan.fallbackPath
}

export async function installLocalApp({ parsedArgs, platform = process.platform, projectRoot = process.cwd(), homeDir = os.homedir(), userInput = '' }) {
  const installDir = resolveInstallDirectory({ parsedArgs, platform, homeDir, userInput })
  const plan = createInstallPlan({ platform, projectRoot, installDir })

  if (parsedArgs.dryRun) {
    return { ...plan, dryRun: true, installedPath: plan.targetPath }
  }

  await mkdir(installDir, { recursive: true })

  if (plan.kind === 'macos-app') {
    await installMacApp(plan)
    return { ...plan, dryRun: false, installedPath: plan.targetPath }
  }

  if (plan.kind === 'windows-shortcut') {
    const installedPath = await installWindowsLauncher(plan)
    return { ...plan, dryRun: false, installedPath }
  }

  await installLinuxLauncher(plan)
  return { ...plan, dryRun: false, installedPath: plan.targetPath }
}

export function serverStatePath(projectRoot = process.cwd()) {
  return path.join(projectRoot, STATE_DIR, SERVER_STATE_FILE)
}

export async function probeLocalPort(port, { host = DEFAULT_HOST, fetchImpl = globalThis.fetch } = {}) {
  const connectable = await new Promise((resolve) => {
    const socket = net.createConnection({ host, port })
    socket.setTimeout(500)
    socket.once('connect', () => {
      socket.destroy()
      resolve(true)
    })
    socket.once('timeout', () => {
      socket.destroy()
      resolve(false)
    })
    socket.once('error', () => resolve(false))
  })

  if (!connectable) return 'available'

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 900)
    const response = await fetchImpl(`http://${host}:${port}/`, { signal: controller.signal })
    clearTimeout(timeout)
    const text = await response.text()
    return text.includes('Math Tool') ? 'math-tool' : 'occupied'
  } catch {
    return 'occupied'
  }
}

export async function choosePreviewPort({ startPort = DEFAULT_PORT, maxAttempts = 20, probe = probeLocalPort } = {}) {
  for (let offset = 0; offset < maxAttempts; offset += 1) {
    const port = startPort + offset
    const status = await probe(port)
    if (status === 'available') return { port, status, url: `http://${DEFAULT_HOST}:${port}/` }
    if (status === 'math-tool') return { port, status, url: `http://${DEFAULT_HOST}:${port}/` }
  }
  throw new Error(`未找到可用端口：${startPort}-${startPort + maxAttempts - 1}`)
}

function runChecked(command, args, options) {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options })
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} 执行失败`)
  }
}

export function ensureProjectReady(projectRoot = process.cwd()) {
  let installed = false
  let built = false
  if (!existsSync(path.join(projectRoot, 'node_modules'))) {
    runChecked('npm', ['install'], { cwd: projectRoot, shell: process.platform === 'win32' })
    installed = true
  }
  if (shouldBuildDist(projectRoot)) {
    runChecked('npm', ['run', 'build'], { cwd: projectRoot, shell: process.platform === 'win32' })
    built = true
  }
  return { installed, built }
}

function latestMtimeMs(target) {
  if (!existsSync(target)) return 0
  const stat = statSync(target)
  if (!stat.isDirectory()) return stat.mtimeMs

  return readdirSync(target).reduce((latest, entry) => {
    return Math.max(latest, latestMtimeMs(path.join(target, entry)))
  }, stat.mtimeMs)
}

export function shouldBuildDist(projectRoot = process.cwd()) {
  const distIndex = path.join(projectRoot, 'dist', 'index.html')
  if (!existsSync(distIndex)) return true

  const distMtime = statSync(distIndex).mtimeMs
  const sourceMtime = Math.max(
    latestMtimeMs(path.join(projectRoot, 'src')),
    latestMtimeMs(path.join(projectRoot, 'public')),
    latestMtimeMs(path.join(projectRoot, 'index.html')),
    latestMtimeMs(path.join(projectRoot, 'package.json')),
    latestMtimeMs(path.join(projectRoot, 'vite.config.ts')),
  )
  return sourceMtime > distMtime
}

async function waitForMathTool(port, attempts = 40) {
  for (let index = 0; index < attempts; index += 1) {
    const status = await probeLocalPort(port)
    if (status === 'math-tool') return
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`本地服务启动超时：http://${DEFAULT_HOST}:${port}/`)
}

async function openBrowser(url, platform = process.platform) {
  if (platform === 'darwin') {
    spawn('open', [url], { detached: true, stdio: 'ignore' }).unref()
  } else if (platform === 'win32') {
    spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref()
  } else {
    spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref()
  }
}

export async function runLocalApp({ projectRoot = process.cwd(), shouldOpenBrowser = true } = {}) {
  const readiness = ensureProjectReady(projectRoot)
  if (readiness.built) {
    await stopLocalApp({ projectRoot })
  }
  const selected = await choosePreviewPort()

  if (selected.status !== 'math-tool') {
    const stateDir = path.join(projectRoot, STATE_DIR)
    await mkdir(stateDir, { recursive: true })
    const logFile = await open(path.join(stateDir, 'preview.log'), 'a')
    const child = spawn('npm', ['run', 'preview', '--', '--host', DEFAULT_HOST, '--port', String(selected.port), '--strictPort'], {
      cwd: projectRoot,
      detached: true,
      shell: process.platform === 'win32',
      stdio: ['ignore', logFile.fd, logFile.fd],
    })
    child.unref()
    await logFile.close()
    await writeFile(
      serverStatePath(projectRoot),
      JSON.stringify({ pid: child.pid, port: selected.port, url: selected.url, startedAt: new Date().toISOString() }, null, 2),
    )
    await waitForMathTool(selected.port)
  }

  if (shouldOpenBrowser) await openBrowser(selected.url)
  return selected
}

export async function stopLocalApp({ projectRoot = process.cwd() } = {}) {
  const file = serverStatePath(projectRoot)
  if (!existsSync(file)) return { stopped: false, reason: 'no-state' }

  const state = JSON.parse(await readFile(file, 'utf8'))
  if (state.pid) {
    try {
      process.kill(process.platform === 'win32' ? state.pid : -state.pid)
    } catch {
      // Stale pid files are cleaned up below.
    }
  }
  await rm(file, { force: true })
  return { stopped: true, pid: state.pid, port: state.port }
}
