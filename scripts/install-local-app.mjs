#!/usr/bin/env node
import readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { defaultInstallDir, installLocalApp, parseInstallArgs } from './localApp.mjs'

async function main() {
  const parsedArgs = parseInstallArgs(process.argv.slice(2))
  let userInput = ''

  if (!parsedArgs.dir && !parsedArgs.yes && !parsedArgs.dryRun) {
    const fallback = defaultInstallDir()
    const rl = readline.createInterface({ input, output })
    userInput = await rl.question(`安装目录 [${fallback}]: `)
    rl.close()
  }

  const result = await installLocalApp({ parsedArgs, userInput })
  if (result.dryRun) {
    console.log(`[dry-run] ${result.kind} -> ${result.installedPath}`)
    return
  }

  console.log(`Math Tool 本地入口已安装：${result.installedPath}`)
  console.log('双击图标即可启动本地 Math Tool。')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
