/**
 * 生成 CSS 主题变量 — 委托给 @nicenote/tokens 中的共享脚本
 */
import { execSync } from 'node:child_process'
import { resolve } from 'node:path'

const outputPath = resolve(import.meta.dirname, '../src/generated-tokens.css')
const scriptPath = resolve(import.meta.dirname, '../../../packages/tokens/scripts/generate-css.ts')
execSync(`tsx ${scriptPath} ${outputPath}`, { stdio: 'inherit' })
