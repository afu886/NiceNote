# NiceNote Project Simplification Baseline

日期：`2026-04-23`

## 计量边界

- 本基线把 `apps/web`、`apps/desktop/frontend`、`apps/desktop/src-tauri` 以及它们真实依赖的 `packages/app-shell`、`packages/domain`、`packages/editor`、`packages/shared`、`packages/tokens`、`packages/ui` 视为当前 supported surface。
- 本基线把 `apps/mobile`、`packages/database`、`packages/editor-bridge`、`packages/ui-native` 视为 experimental surface。原因不是它们不存在，而是当前运行入口和界面仍明显处于占位状态，后续 batch 必须显式决定是否继续保留。
- 后续减法以当前 rollout hard rules 为准：desktop 前端只能保留 `AppService` 一条 I/O 主路径；没有两个 supported surface 共同需要的抽象，不继续上共享层；优先删除、合并、内联。

## Before 状态表

| Metric                      | Before                                                                                                          | 对照口径                     |
| --------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `desktop_search_paths`      | `2` 条 desktop 前端搜索实现，`1` 条实际消费，`1` 条阴影实现                                                     | 目标是收缩到 `1`             |
| `noop_context_fields`       | `2` 个 shared context 字段在 supported surface 上是语义空转：`selectedTag`、`setSelectedTag`                    | 目标是收缩到 `0`             |
| `dead_runtime_modules`      | `8` 个 mobile 运行时模块已进入入口路径，但当前 screen 不消费它们产出的任何 UI 行为                              | 目标是收缩到 `0`             |
| `web_load_fanout`           | Web 首次加载是 `1 + N` 次 repository 调用；`limit=100` 时最坏为 `101` 次完整 localStorage 读取/解析             | 目标是收缩到单次直接加载     |
| `root_quality_gate_surface` | root/CI 门禁少覆盖 `2` 个 supported TS 包和 `1` 个 supported Rust 目标，同时额外显式检查 `2` 个 experimental 包 | 目标是门禁面和正式支持面一致 |

## `desktop_search_paths`

结论：当前 desktop 前端有 `2` 条搜索实现路径。

- 实际消费路径：
  `apps/desktop/frontend/src/App.tsx:34` 只从 store 取 `searchOpen` / `setSearchOpen`，真正执行搜索的是 `packages/app-shell/src/components/SearchDialog.tsx:20-22` 读取 `useAppShell().searchNotes`，再走 `apps/desktop/frontend/src/providers/AppShellProvider.tsx:177-187`，最后落到 `apps/desktop/frontend/src/adapters/tauri-note-repository.ts:136` 和 `apps/desktop/frontend/src/bindings/tauri.ts:71-72` 的 `AppService.searchNotes(...)`。
- 阴影路径：
  `apps/desktop/frontend/src/store/slices/searchSlice.ts:8-48` 仍保留完整的 `searchQuery` / `searchResults` / `isSearching` / `search()`，内部同样调用 `repo.search({ q, limit: 20 })`。
- 后端搜索命令本身只有一条：
  `apps/desktop/src-tauri/src/commands/search.rs:11-27` 统一暴露 `search_notes`，前端双路径只是重复包装，不是后端需求。

调用链（当前实际路径）：

`App.tsx` 搜索开关
-> `SearchDialog`
-> `AppShellContext.searchNotes`
-> `DesktopAppShellProvider.searchNotes`
-> `getCurrentRepo().search(...)`
-> `TauriNoteRepository.search(...)`
-> `AppService.searchNotes(...)`
-> `search_notes` Tauri command

关键 `rg` 证据：

```text
$ rg -n "\bsearchQuery\b|\bsearchResults\b|\bisSearching\b|search: async" apps/desktop/frontend/src/store/slices/searchSlice.ts apps/desktop/frontend/src/App.tsx apps/desktop/frontend/src/providers/AppShellProvider.tsx packages/app-shell/src/components/SearchDialog.tsx
apps/desktop/frontend/src/store/slices/searchSlice.ts:10:  searchQuery: string
apps/desktop/frontend/src/store/slices/searchSlice.ts:11:  searchResults: NoteSearchResult[]
apps/desktop/frontend/src/store/slices/searchSlice.ts:12:  isSearching: boolean
apps/desktop/frontend/src/store/slices/searchSlice.ts:30:  search: async (query: string) => {
```

上面的输出说明：这三个搜索状态字段和 `search()` 实现只存在于 `searchSlice`，`App.tsx` 与 `SearchDialog` 都不消费它们。

## `noop_context_fields`

结论：当前 shared runtime context 至少有 `2` 个字段在 supported surface 上是语义空转的：`selectedTag`、`setSelectedTag`。

- 字段定义：
  `packages/app-shell/src/context.ts:43-44` 把 `selectedTag` 和 `setSelectedTag` 作为统一 context 契约暴露。
- Web provider 明确填空值：
  `apps/web/src/providers/AppShellProvider.tsx:202-203` 直接写成 `selectedTag: null` 和 `setSelectedTag: () => {}`。
- 真实过滤状态并不走 context：
  `packages/app-shell/src/components/NotesSidebar.tsx:124-125` 在组件内部维护 `selectedTagName`；`181-191` 也只按本地 `selectedTagName` 过滤 `notes`。`setSelectedTag(...)` 虽然会在 `165-179` 被调用，但不会驱动实际过滤结果。
- `selectedTag` 没有真实 consumer：
  对 `packages/app-shell/src/components`、`packages/app-shell/src/hooks`、`apps/web/src/App.tsx`、`apps/desktop/frontend/src/App.tsx` 搜索 `\bselectedTag\b` 没有命中，说明这个字段没有消费点。

关键 `rg` 证据：

```text
$ rg -n "\bselectedTag\b|setSelectedTag" packages/app-shell/src/context.ts apps/web/src/providers/AppShellProvider.tsx apps/desktop/frontend/src/providers/AppShellProvider.tsx apps/desktop/frontend/src/store/slices/settingsSlice.ts packages/app-shell/src/components/NotesSidebar.tsx
packages/app-shell/src/context.ts:43:  selectedTag: string | null
packages/app-shell/src/context.ts:44:  setSelectedTag: (tag: string | null) => void
apps/web/src/providers/AppShellProvider.tsx:202:      selectedTag: null,
apps/web/src/providers/AppShellProvider.tsx:203:      setSelectedTag: () => {},
packages/app-shell/src/components/NotesSidebar.tsx:125:  const [selectedTagName, setSelectedTagName] = useState<string | null>(null)
packages/app-shell/src/components/NotesSidebar.tsx:181:  const filteredNotes = useMemo(() => {
```

补充：这组空转字段还拖着一组 desktop 影子状态。

- `apps/desktop/frontend/src/providers/AppShellProvider.tsx:227-245` 里的 `extraNavItems` 只根据 `store.currentView` 做高亮。
- 但 `packages/app-shell/src/components/NotesSidebar.tsx:124-125` 真正切换面板用的是组件本地 `navView`，不是 `currentView`。
- 这说明 `selectedTag/currentView/extraNavItems` 属于同一类“写了但没有形成真实跨层行为”的 P1 热点。

## `dead_runtime_modules`

结论：当前 mobile 入口路径上有 `8` 个本地模块已经进入运行时，但当前 screen 不消费它们。

计入本次 baseline 的 `8` 个 active runtime dead modules：

1. `apps/mobile/src/providers/MobileAppShellProvider.tsx`
2. `apps/mobile/src/adapters/repository-provider.ts`
3. `apps/mobile/src/adapters/sqlite-note-repository.ts`
4. `apps/mobile/src/store/useNoteStore.ts`
5. `apps/mobile/src/store/useSettingsStore.ts`
6. `apps/mobile/src/store/useSidebarStore.ts`
7. `apps/mobile/src/store/useTagStore.ts`
8. `apps/mobile/src/store/useToastStore.ts`

判定依据：

- `apps/mobile/src/App.tsx:5-14` 把整个应用包在 `MobileAppShellProvider` 里，因此 provider 和它的依赖会进入运行时。
- `apps/mobile/src/providers/MobileAppShellProvider.tsx:14-19` 导入了 repository-provider 与 5 个 store；`136-183` 还组装出一整套 `AppShellContextValue`。
- 但 `apps/mobile/src/screens/HomeScreen.tsx:4-18` 和 `apps/mobile/src/screens/NoteEditorScreen.tsx:4-14` 仍然是 TODO/placeholder screen，没有 `useAppShell`、没有 store、没有 repository 调用。
- 对 `apps/mobile/src/screens` 与 `apps/mobile/src/navigation` 搜索 `useAppShell|use[A-Z][A-Za-z]+Store|getRepository|initRepository|MobileAppShellProvider` 没有命中。

关键 `rg` 证据：

```text
$ rg -n "MobileAppShellProvider|getRepository\(|useNoteStore|useSettingsStore|useSidebarStore|useTagStore|useToastStore|SqliteNoteRepository" apps/mobile/src/App.tsx apps/mobile/src/providers/MobileAppShellProvider.tsx apps/mobile/src/adapters/repository-provider.ts apps/mobile/src/adapters/sqlite-note-repository.ts
apps/mobile/src/adapters/repository-provider.ts:3:import { SqliteNoteRepository } from './sqlite-note-repository'
apps/mobile/src/providers/MobileAppShellProvider.tsx:15:import { useNoteStore } from '../store/useNoteStore'
apps/mobile/src/providers/MobileAppShellProvider.tsx:16:import { useSettingsStore } from '../store/useSettingsStore'
apps/mobile/src/providers/MobileAppShellProvider.tsx:17:import { useSidebarStore } from '../store/useSidebarStore'
apps/mobile/src/providers/MobileAppShellProvider.tsx:18:import { useTagStore } from '../store/useTagStore'
apps/mobile/src/providers/MobileAppShellProvider.tsx:19:import { useToastStore } from '../store/useToastStore'
apps/mobile/src/App.tsx:5:import { MobileAppShellProvider } from './providers/MobileAppShellProvider'
```

不计入本项但需要后续处理的 dead structure：

- `apps/mobile/src/store/useFolderStore.ts`
- `apps/mobile/src/store/index.ts`

这两个文件当前没有进入 `App.tsx` 运行时链路，但仍然是明显的预埋结构。

## `web_load_fanout`

结论：Web 首次加载当前是 `1 + N` 次 repository 调用，`N` 是 `repo.list({ limit: 100 })` 返回条数；在默认上限下最坏是 `101` 次完整 localStorage 扫描。

调用链：

`WebAppShellProvider`
-> `useNoteStore` 模块加载
-> `useNoteStore.getState().loadNotes()`
-> `repo.list({ limit: 100 })`
-> `Promise.all(result.data.map((item) => repo.get(item.id)))`
-> `LocalStorageNoteRepository.list/get`
-> `loadAll()`
-> `localStorage.getItem + JSON.parse`

代码证据：

- `apps/web/src/store/useNoteStore.ts:84-90` 先 `repo.list({ limit: 100 })`，再对每条结果执行 `repo.get(item.id)`。
- `apps/web/src/store/useNoteStore.ts:203-204` 在模块底部直接调用 `useNoteStore.getState().loadNotes()`，所以这组请求扇出发生在应用初始化阶段。
- `apps/web/src/adapters/local-storage-note-repository.ts:15-22` 的 `loadAll()` 每次都会完整读取并 `JSON.parse` 存量数据。
- `apps/web/src/adapters/local-storage-note-repository.ts:32-67` 的 `list()` 会调用一次 `loadAll()`；`69-70` 的 `get()` 每调用一次又会再调用一次 `loadAll()`。

关键 `rg` 证据：

```text
$ rg -n "loadNotes\(|repo\.list\(|repo\.get\(|Promise\.all" apps/web/src
apps/web/src/store/useNoteStore.ts:84:  loadNotes: async () => {
apps/web/src/store/useNoteStore.ts:87:      const result = await repo.list({ limit: 100 })
apps/web/src/store/useNoteStore.ts:89:      const fetched = await Promise.all(result.data.map((item) => repo.get(item.id)))
apps/web/src/store/useNoteStore.ts:204:useNoteStore.getState().loadNotes()
```

量化口径：

- repository fanout：`1 list + N get`
- storage fanout：`1 loadAll() + N loadAll()`
- 默认上限：`N <= 100`
- 最坏 full-scan 次数：`101`

## `root_quality_gate_surface`

结论：当前 root/CI 质量门禁和“web + desktop 为 supported，mobile 为 experimental”的实际支持面并不对齐。

本次 baseline 里把差异拆成两类计数：

- 少覆盖的 supported target：`3`
  - `apps/desktop/frontend`
  - `packages/app-shell`
  - `apps/desktop/src-tauri`
- 额外显式检查的 experimental package：`2`
  - `packages/database`
  - `packages/ui-native`

### 1. `pnpm typecheck` 少覆盖 supported TS 包

- root `package.json:44` 的 `typecheck` 是 `tsc -b --pretty false`。
- root `tsconfig.json:3-14` 只引用了 `apps/web`、`packages/editor`、`packages/shared`、`packages/tokens`、`packages/ui`、`packages/domain`。
- 这意味着当前 root typecheck 没有覆盖 `apps/desktop/frontend`，也没有覆盖 `packages/app-shell`。

### 2. CI 反而补了 experimental 包

- `.github/workflows/ci-cd.yml:64-70` 先跑 `pnpm typecheck`，随后单独补跑 `@nicenote/database` 和 `@nicenote/ui-native`。
- 这两者都属于 mobile 侧实验表面，却先于 supported 的 desktop frontend / app-shell 获得了显式 typecheck 入口。

### 3. root build / lint / test 也没有按 supported surface 对齐

- root `package.json:38` 是 `turbo build`，但 `apps/desktop/frontend/package.json:6-10` 只有 `build:frontend`，没有 `build`，所以 desktop frontend 不在 root build 面里。
- root `package.json:41-42` 是 `turbo lint && pnpm lint:cycles`。其中：
  - `apps/desktop/frontend/package.json:6-10` 没有 `lint`
  - `apps/mobile/package.json:5-8` 也没有 `lint`
  - `lint:cycles` 只扫描 `apps/web`、`packages/editor`、`packages/shared`、`packages/tokens`、`packages/ui`
- root `package.json:45` 是 `turbo test`，而可见的 test script 只覆盖 `@nicenote/app-shell`、`@nicenote/editor`、`@nicenote/shared`、`@nicenote/web`。

### 4. supported 的 desktop Rust backend 连 CI 触发面都不在内

- `.github/workflows/ci-cd.yml:7-17` 和 `21-31` 只监听 `apps/desktop/frontend/**`，没有 `apps/desktop/src-tauri/**`。
- root `package.json`、`turbo.json`、CI workflow 里都没有 `cargo`、`src-tauri` 或 `tauri` 检查步骤。
- 这意味着 desktop backend 改动既不会单独触发当前 CI，也没有落在现有 root pnpm 门禁里。

脚本面证据（静态脚本矩阵）：

```text
apps/web/package.json              @nicenote/web        build  -              -          lint  test
apps/desktop/frontend/package.json @nicenote/desktop    -      build:frontend -          -     -
packages/app-shell/package.json    @nicenote/app-shell  build  -              -          lint  test
packages/domain/package.json       @nicenote/domain     -      -              typecheck  -     -
apps/mobile/package.json           @nicenote/mobile     -      -              -          -     -
packages/database/package.json     @nicenote/database   -      -              typecheck  lint  -
packages/ui-native/package.json    @nicenote/ui-native  -      -              typecheck  lint  -
```

## 后续 batch 可直接对照的基线结论

- `desktop_search_paths` 现在不是“是否有重复”的争论题，而是明确的 `2 -> 1` 收缩题。
- `noop_context_fields` 现在至少有 `2` 个可删/可下沉目标，不需要继续为 `selectedTag` 这类空转字段保留统一契约。
- `dead_runtime_modules` 已经说明 mobile 当前更接近 experimental 占位运行时，而不是必须同步维护的 supported runtime。
- `web_load_fanout` 已经把 web 首屏笔记加载的扇出模式固定为可验证的 `1 + N`。
- `root_quality_gate_surface` 已经说明门禁不是单纯“多或少”，而是“少覆盖 supported，同时额外照顾 experimental”的结构性错位。
