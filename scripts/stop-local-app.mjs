#!/usr/bin/env node
import { stopLocalApp } from './localApp.mjs'

stopLocalApp()
  .then((result) => {
    if (result.stopped) {
      console.log(`Math Tool 本地服务已停止：pid=${result.pid}, port=${result.port}`)
    } else {
      console.log('没有找到正在运行的 Math Tool 本地服务。')
    }
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
