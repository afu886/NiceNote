import type { AppRuntime } from '@nicenote/core'

import { AppService } from '../bindings/tauri'
import { desktopPrefs } from '../runtime/desktop-prefs'
import { DesktopRuntimeContext } from '../runtime/desktop-runtime-context'
import { DesktopSystemIntegration } from '../runtime/desktop-system-integration'
import { TauriNoteRepository } from '../runtime/tauri-note-repository'
import { TauriSearchService } from '../runtime/tauri-search-service'
import { TauriSettingsRepository } from '../runtime/tauri-settings-repository'
import { TauriTagRepository } from '../runtime/tauri-tag-repository'
import { TauriWorkspaceRepository } from '../runtime/tauri-workspace-repository'

/** 组装 Desktop 平台 AppRuntime（Tauri IPC 实现 core 端口；唯一 invoke 出口为 bindings/tauri）。 */
export function createDesktopRuntime(): AppRuntime {
  const ctx = new DesktopRuntimeContext()
  return {
    notes: new TauriNoteRepository(AppService, ctx),
    tags: new TauriTagRepository(AppService, ctx),
    workspaces: new TauriWorkspaceRepository(AppService, ctx),
    settings: new TauriSettingsRepository(AppService),
    search: new TauriSearchService(AppService, ctx),
    system: new DesktopSystemIntegration(AppService, ctx),
    prefs: desktopPrefs,
  }
}
