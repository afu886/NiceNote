import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  'packages/app-dom',
  'packages/core',
  'packages/editor',
  'packages/shared',
  'apps/web',
  'apps/desktop/frontend',
])
