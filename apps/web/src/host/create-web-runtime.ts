import type { AppRuntime } from '@nicenote/core'

import { CoreLocalStorageNoteRepository } from '../runtime/local-storage-note-repository.adapter'
import { CoreLocalStorageTagRepository } from '../runtime/local-storage-tag-repository.adapter'
import { webPrefs } from '../runtime/web-prefs'
import { WebSearchService } from '../runtime/web-search-service'
import { WebSettingsRepository } from '../runtime/web-settings-repository'
import { WebSystemIntegration } from '../runtime/web-system-integration'
import { WebWorkspaceRepository } from '../runtime/web-workspace-repository'

/** 组装 Web 平台 AppRuntime（localStorage 实现 core 端口）。 */
export function createWebRuntime(): AppRuntime {
  const notes = new CoreLocalStorageNoteRepository()
  return {
    notes,
    tags: new CoreLocalStorageTagRepository(),
    workspaces: new WebWorkspaceRepository(),
    settings: new WebSettingsRepository(),
    search: new WebSearchService(),
    system: new WebSystemIntegration(notes),
    prefs: webPrefs,
  }
}
