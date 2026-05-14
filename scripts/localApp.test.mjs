import { describe, expect, it } from 'vitest'
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {
  choosePreviewPort,
  createInstallPlan,
  installLocalApp,
  parseInstallArgs,
  renderMacLauncher,
  resolveInstallDirectory,
  shouldBuildDist,
} from './localApp.mjs'

describe('local app installer', () => {
  it('parses install CLI arguments', () => {
    expect(parseInstallArgs(['--dir', '~/Applications', '--yes', '--dry-run'])).toEqual({
      dir: '~/Applications',
      yes: true,
      dryRun: true,
    })
    expect(parseInstallArgs(['--dir=/tmp/math-tool'])).toMatchObject({ dir: '/tmp/math-tool' })
  })

  it('resolves default and user-selected install directories', () => {
    expect(resolveInstallDirectory({ parsedArgs: {}, platform: 'darwin', homeDir: '/Users/tester', userInput: '' })).toBe('/Users/tester/Desktop')
    expect(resolveInstallDirectory({ parsedArgs: {}, platform: 'darwin', homeDir: '/Users/tester', userInput: '~/Apps' })).toBe('/Users/tester/Apps')
    expect(resolveInstallDirectory({ parsedArgs: { dir: '/tmp/tools' }, platform: 'darwin', homeDir: '/Users/tester' })).toBe('/tmp/tools')
  })

  it('builds platform-specific install plans', () => {
    const mac = createInstallPlan({ platform: 'darwin', projectRoot: '/repo/math-tool', installDir: '/Users/tester/Desktop' })
    const win = createInstallPlan({ platform: 'win32', projectRoot: 'C:\\repo\\math-tool', installDir: 'C:\\Users\\tester\\Desktop' })
    const linux = createInstallPlan({ platform: 'linux', projectRoot: '/repo/math-tool', installDir: '/home/tester/Desktop' })

    expect(mac).toMatchObject({ kind: 'macos-app', targetPath: '/Users/tester/Desktop/Math Tool.app' })
    expect(win.kind).toBe('windows-shortcut')
    expect(win.targetPath.endsWith('Math Tool.lnk')).toBe(true)
    expect(win.fallbackPath.endsWith('Math Tool.cmd')).toBe(true)
    expect(linux).toMatchObject({ kind: 'linux-desktop', targetPath: '/home/tester/Desktop/Math Tool.desktop' })
  })

  it('supports dry-run without writing launcher files', async () => {
    const result = await installLocalApp({
      parsedArgs: { dryRun: true },
      platform: 'darwin',
      projectRoot: '/repo/math-tool',
      homeDir: '/Users/tester',
    })

    expect(result).toMatchObject({
      dryRun: true,
      kind: 'macos-app',
      installedPath: '/Users/tester/Desktop/Math Tool.app',
    })
  })

  it('renders a macOS launcher that does not depend on Finder PATH', () => {
    const launcher = renderMacLauncher('/repo/math-tool', { nodePath: '/Users/tester/.nvm/versions/node/v20/bin/node' })

    expect(launcher).toContain('/Users/tester/.nvm/versions/node/v20/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin')
    expect(launcher).toContain('/repo/math-tool/scripts/run-local-app.mjs')
    expect(launcher).toContain('.math-tool/launcher.log')
    expect(launcher).toContain('/Users/tester/.nvm/versions/node/v20/bin/node')
    expect(launcher).not.toContain('/usr/bin/env npm run app:run')
  })

  it('chooses the default port when available', async () => {
    const result = await choosePreviewPort({ probe: async () => 'available' })

    expect(result).toEqual({ port: 4173, status: 'available', url: 'http://127.0.0.1:4173/' })
  })

  it('reuses an existing Math Tool server', async () => {
    const result = await choosePreviewPort({ probe: async () => 'math-tool' })

    expect(result).toEqual({ port: 4173, status: 'math-tool', url: 'http://127.0.0.1:4173/' })
  })

  it('skips ports occupied by other services', async () => {
    const result = await choosePreviewPort({
      startPort: 4173,
      probe: async (port) => (port === 4173 ? 'occupied' : 'available'),
    })

    expect(result).toEqual({ port: 4174, status: 'available', url: 'http://127.0.0.1:4174/' })
  })

  it('detects when dist should be rebuilt', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'math-tool-local-app-'))
    await mkdir(path.join(root, 'dist'), { recursive: true })
    await mkdir(path.join(root, 'src'), { recursive: true })
    await writeFile(path.join(root, 'dist', 'index.html'), 'old build')

    expect(shouldBuildDist(root)).toBe(false)

    await new Promise((resolve) => setTimeout(resolve, 10))
    await writeFile(path.join(root, 'src', 'main.tsx'), 'new source')

    expect(shouldBuildDist(root)).toBe(true)
  })
})
