import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import js from '@eslint/js'
import prettierConfig from 'eslint-config-prettier'
import prettierPlugin from 'eslint-plugin-prettier'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import tailwindcss from 'eslint-plugin-tailwindcss'
import globals from 'globals'
import tseslint from 'typescript-eslint'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * 辅助函数：快速定位 tsconfig
 */
const getTsconfigPath = (path: string) => resolve(__dirname, path)

export default tseslint.config(
  // 1. 全局忽略配置
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.refs/**',
      '**/build/**',
      '**/.turbo/**',
      '**/drizzle/**',
      '**/*.d.ts',
      'apps/mobile/*.js',
      'apps/mobile/index.js',
      'apps/desktop/*.js',
      'packages/editor-bridge/src/assets/**',
    ],
  },

  // 2. 基础 JavaScript 配置
  js.configs.recommended,

  // 3. 基础 TypeScript 配置 (自动应用于 ts/tsx)
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      complexity: ['error', { max: 25 }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // 4. React 全局共享配置
  {
    files: ['apps/web/**/*.{ts,tsx}', 'packages/editor/**/*.{ts,tsx}', 'packages/ui/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      react,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: globals.browser,
    },
    settings: {
      react: { version: '19.2' },
    },
    rules: {
      ...reactHooks.configs['recommended-latest'].rules,
      ...react.configs.recommended.rules,
      'react-hooks/exhaustive-deps': 'error',
      'react/react-in-jsx-scope': 'off',
    },
  },

  // 5. 导入排序规则
  {
    files: ['**/*.{js,jsx,ts,tsx,mjs,cjs}'],
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            ['^react$', '^react-dom$', '^react-router', '^react-'],
            ['^\\u0000'],
            ['^node:'],
            ['^(?!@nicenote/|@/)(@?\\w)'],
            ['^@nicenote/'],
            ['^@/'],
            ['^\\.\\.(?!/?$)', '^\\.\\./?$'],
            ['^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)', '^\\./?$'],
            ['^.+\\.(css|scss)$'],
          ],
        },
      ],
      'simple-import-sort/exports': 'error',
    },
  },

  // 6. Tailwind 类名排序
  {
    files: [
      'apps/web/**/*.{ts,tsx,js,jsx}',
      'packages/ui/**/*.{ts,tsx,js,jsx}',
      'packages/editor/**/*.{ts,tsx,js,jsx}',
    ],
    plugins: {
      tailwindcss,
    },
    settings: {
      tailwindcss: {
        callees: ['cn', 'clsx', 'cva'],
        config: getTsconfigPath('apps/web/src/index.css'),
      },
    },
    rules: {
      'tailwindcss/classnames-order': 'error',
      'tailwindcss/no-arbitrary-value': 'error',
    },
  },

  // 7. Web 应用特定配置 (apps/web)
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    plugins: {
      'react-refresh': reactRefresh,
    },
    languageOptions: {
      ecmaVersion: 2020,
      parserOptions: {
        project: [getTsconfigPath('apps/web/tsconfig.eslint.json')],
      },
    },
    rules: {
      ...reactRefresh.configs.vite.rules,
    },
  },

  // 8. Editor & UI 包特定配置
  {
    files: ['packages/editor/**/*.{ts,tsx}', 'packages/ui/**/*.{ts,tsx}'],
    rules: {
      'react/prop-types': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/immutability': 'off',
    },
  },

  {
    files: ['packages/editor/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: [getTsconfigPath('packages/editor/tsconfig.eslint.json')],
      },
    },
  },

  {
    files: ['packages/ui/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: getTsconfigPath('packages/ui'),
      },
    },
  },

  // 9b. Playwright e2e：Playwright fixture 的 use() 与 React Hook 无关
  {
    files: ['apps/web/e2e/**/*.{ts,tsx}', 'apps/web/playwright.config.ts'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'off',
    },
  },

  // 10. Shared 包特定配置 (packages/shared)
  {
    files: ['packages/shared/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  // 10b. Core 业务内核边界：禁止依赖 React/Tauri/localStorage/SQLite
  {
    files: ['packages/core/**/*.ts'],
    ignores: ['packages/core/**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'react', message: 'core 不依赖 React' },
            { name: 'react-dom', message: 'core 不依赖 React' },
            { name: 'zustand', message: 'core 不依赖 Zustand（状态在 app-dom）' },
          ],
          patterns: [
            { group: ['@tauri-apps/*'], message: 'core 不依赖 Tauri' },
            { group: ['*sqlite*', 'op-sqlite'], message: 'core 不依赖 SQLite' },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'localStorage', message: 'core 不直接访问 localStorage' },
        { name: 'window', message: 'core 不依赖浏览器全局' },
        { name: 'document', message: 'core 不依赖 DOM' },
      ],
    },
  },

  // 11. Prettier 配置
  {
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'error',
      ...prettierConfig.rules,
    },
  }
)
