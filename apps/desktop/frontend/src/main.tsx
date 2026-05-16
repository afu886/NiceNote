import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { ErrorBoundary, initI18n } from '@nicenote/app-dom'

import { DesktopHost } from './host/DesktopHost'

import './index.css'

// 初始化 i18n（Desktop 端 storage key）
initI18n({ storageKey: 'nicenote-desktop-lang' })

// 挂载 React 应用
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <DesktopHost />
    </ErrorBoundary>
  </StrictMode>
)
