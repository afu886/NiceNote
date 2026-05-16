import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { ErrorBoundary, initI18n } from '@nicenote/app-dom'

import { WebHost } from './host/WebHost'

import './index.css'

// 初始化 i18n（Web 端 storage key）
initI18n({ storageKey: 'nicenote-lang' })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <WebHost />
    </ErrorBoundary>
  </StrictMode>
)
