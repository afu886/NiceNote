import { useState } from 'react'

import { NiceNoteApp } from '@nicenote/app-dom'

import { createDesktopRuntime } from './create-desktop-runtime'

/** Desktop 宿主：创建 Desktop runtime 并挂载统一产品界面。不维护单独 Desktop UI。 */
export function DesktopHost() {
  const [runtime] = useState(createDesktopRuntime)
  return <NiceNoteApp runtime={runtime} />
}
