#!/usr/bin/env node
import { runLocalApp } from './localApp.mjs'

runLocalApp()
  .then((result) => {
    console.log(`Math Tool 已打开：${result.url}`)
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
