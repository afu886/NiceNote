import { useState } from 'react'

import { NiceNoteApp } from '@nicenote/app-dom'

import { createWebRuntime } from './create-web-runtime'

/** Web 宿主：创建 Web runtime 并挂载统一产品界面。不维护产品 UI。 */
export function WebHost() {
  const [runtime] = useState(createWebRuntime)
  return <NiceNoteApp runtime={runtime} />
}
