# NiceNote Target Architecture (v2)

> v2 修订要点：① 全量采用 `topicly-ui`，并补齐"如何安全消费"的版本与构建契约；
> ② 新增「统一领域模型」章节，解决 Web(id) / Desktop(path) 模型冲突；
> ③ `AppRuntime` 引入能力发现模型；④ 明确状态层归属与契约测试机制；
> ⑤ 重排迁移路线为"先定模型 → 抽界面 → 换设计系统"；
> ⑥ 补全所有现存包的去向台账；⑦ 共享界面包更名 `app-web` → `app-dom`。

## 目标定位

NiceNote 的终局架构不是三端各自维护一套应用，而是：

- Web 和 Desktop 共享同一套 React DOM 产品界面。
- Mobile 使用 bare React Native 独立实现原生界面。
- 三端共享 NiceNote 业务内核、领域契约、Markdown 持久化规则和测试契约。
- 通用前端 UI 能力沉淀到 `../topicly-ui`，NiceNote 仓库不再维护自己的通用组件库与 token。

最重要的不变量保持不变：用户笔记正文只以 Markdown 字符串持久化。Tiptap / ProseMirror 只是编辑时模型，不作为持久化格式。

## 架构原则

1. Web/Desktop 前端界面完全一致。
   `apps/web` 和 `apps/desktop/frontend` 只作为运行宿主存在，不再各自维护产品界面。

2. Mobile 不共享前端界面代码。
   `apps/mobile` 是 bare React Native app，界面代码留在 app 内；它只共享业务内核、数据契约、Markdown 规则和 editor bridge。

3. `topicly-ui` 是唯一通用 UI 与 token 来源。
   除 `packages/editor` 的编辑器专属 UI 外，NiceNote 不再新增任何通用 UI primitive 或 design token；需要的能力一律推动进 `topicly-ui`。

4. 平台适配留在 app 内。
   Web 的 localStorage/浏览器能力、Desktop 的 Tauri IPC、Mobile 的 SQLite/Native module 适配，默认放在对应 app 的 `src/runtime/`，不放进共享包。

5. 共享包只承载真正跨端稳定的内容。
   满足两个以上 app 复用，或属于跨端稳定业务契约，才进入 `packages/`。

6. **先统一模型，再统一界面，最后统一设计系统。**
   领域模型（标识、标签、能力）必须在共享界面抽取之前定稿；设计系统切换必须在界面边界冻结且有视觉基线之后进行。

## 统一领域模型（新增，最高优先级）

共享一套 `NiceNoteApp` 界面的前提是**先有一套统一领域模型**。当前 Web 与 Desktop 模型直接冲突，必须在 `packages/core` 内先行收敛：

| 维度     | Web 现状                       | Desktop 现状                         | 终局统一口径（`core`）                                                                                          |
| -------- | ------------------------------ | ------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| 笔记标识 | `id: string`（合成）           | 文件 `path`                          | `NoteId`（`core` 持有的稳定合成 ID）。`path` 降级为 Desktop runtime 实现细节，在 repository 边界翻译为 `NoteId` |
| 标签模型 | 关系型 `tags[]` + `noteTags{}` | 扁平 `string[]` + `tagColors{}`      | 关系型为准（`TagId` ↔ `NoteId`）。`tagColors` 归入 settings 域，不进笔记模型                                    |
| 工作区   | 无                             | `currentFolder` / `recentFolders`    | `WorkspaceRepository` + 能力位；Web 端能力可为 `unsupported`                                                    |
| 保存态   | 无                             | `saveState` 状态机                   | 统一的 `SaveState` 由 `core` usecase 暴露，UI 只读不分叉                                                        |
| 收藏     | 无                             | `favorites[]`                        | `core` 一等概念；Web 实现可后置但模型先统一                                                                     |
| 文件监听 | 无                             | `handleFileCreated/Modified/Deleted` | `WorkspaceRepository.watch()` 可选能力，事件归一为领域变更                                                      |

设计约束：

- `core` 领域内**只用 `NoteId`**；任何 `path` / localStorage key / SQLite rowid 都是 runtime 私有，禁止泄漏进 `app-dom`。
- 笔记寻址、标签关系、保存态、收藏、工作区，都是**领域概念**而非 UI 形态，平台差异只能通过 runtime 能力位表达，不得 fork 界面。
- 这一章是迁移**第一份产出**，先于任何界面抽取（见迁移路线）。

## 状态层归属（新增）

`AppRuntime` 只是 I/O 端口，不是状态。统一界面需要明确状态住在哪：

- **领域 usecase / action 工厂**：`packages/core`，纯函数 + 端口，无 React、无 Zustand。
- **视图状态（选中笔记、侧栏、toast、保存态投影、过滤器）**：`packages/app-dom`，以 Zustand store 形式，构建在 `core` usecase 之上。Web/Desktop 共用同一组 store。
- **Mobile 视图状态**：`apps/mobile/src/`，复用同一批 `core` usecase，但用 RN 自己的 store/screen 编排，不复用 `app-dom` 的 store。
- 现有 `apps/web/src/store/*`、`apps/desktop/frontend/src/store/useDesktopStore.ts`、`packages/app-shell/src/store/*` 全部收敛到上述两个落点，不保留第三处状态源。

## 终局目录

```text
apps/
  web/
    src/
      main.tsx
      host/
        WebHost.tsx
        create-web-runtime.ts
      runtime/
        local-storage-note-repository.ts
        web-settings-repository.ts
        web-workspace-repository.ts
      styles.css

  desktop/
    frontend/
      src/
        main.tsx
        host/
          DesktopHost.tsx
          create-desktop-runtime.ts
        runtime/
          tauri-note-repository.ts
          tauri-settings-repository.ts
          tauri-workspace-repository.ts
        bindings/
          tauri.ts
        styles.css
    src-tauri/
      src/
        commands/
        services/
        db/
        lib.rs

  mobile/
    android/
    ios/
    index.js
    metro.config.js
    babel.config.js
    package.json
    src/
      App.tsx
      host/
        MobileHost.tsx
        create-mobile-runtime.ts
      navigation/
        RootNavigator.tsx
        route-types.ts
        linking.ts
      screens/
        NotesScreen.tsx
        NoteEditorScreen.tsx
        SearchScreen.tsx
        TagsScreen.tsx
        SettingsScreen.tsx
        WorkspaceScreen.tsx
      components/
        MobileNoteList.tsx
        MobileEditorHeader.tsx
        MobileTagSheet.tsx
        MobileWorkspacePicker.tsx
      runtime/
        sqlite-note-repository.ts
        sqlite-tag-repository.ts
        mobile-settings-repository.ts
        mobile-search-service.ts
      storage/
        sqlite-driver.ts
        migrations.ts
      editor/
        MobileEditorWebView.tsx

packages/
  app-dom/                       # 原 app-web，更名（服务 Web+Desktop 两个 DOM 宿主）
    src/
      NiceNoteApp.tsx            # 原 NiceNoteWebApp，去掉 "Web" 字样
      providers/
        NiceNoteProvider.tsx
      state/                     # Web/Desktop 共享 Zustand 视图状态
        view-store.ts
        selection-store.ts
      layout/
        AppLayout.tsx
        NotesSidebar.tsx
        EditorWorkspace.tsx
      panels/
        NoteListPanel.tsx
        TagPanel.tsx
        SettingsPanel.tsx
      dialogs/
        SearchDialog.tsx
        ImportDialog.tsx
        ConfirmDialog.tsx
        ShortcutsDialog.tsx
      components/
        SaveStateIndicator.tsx
        TagInput.tsx
        NoteEmptyState.tsx
      i18n/
        react-binding.ts         # 仅 React 绑定，文案目录在 core
      styles/
        app.css
      index.ts

  core/
    src/
      app-runtime.ts
      capabilities.ts            # 能力发现模型
      note/
        types.ts                 # NoteId 等品牌类型
        repository.ts
        usecases.ts
        repository-contract.ts   # 可复用契约测试套件（导出，非 .test）
      tag/
        types.ts
        repository.ts
        usecases.ts
        repository-contract.ts
      workspace/
        types.ts
        repository.ts
      settings/
        types.ts
        repository.ts
      search/
        types.ts
        service.ts
      markdown/
        frontmatter.ts
        persistence-policy.ts
        roundtrip-contract.ts    # 可复用 round-trip 套件（导出）
      i18n/
        catalog/                 # 跨端共享文案目录与 key（Mobile 也用）
        keys.ts
      index.ts

  editor/
    src/
      components/
      core/
      preset-note/
      styles/
      index.ts

  editor-bridge/
    src/
      EditorWebView.tsx
      useEditorBridge.ts
      types.ts
      index.ts
    template/

  shared/
    src/
      schemas/
      utils/
      constants.ts
      index.ts
```

## 包职责

### `packages/app-dom`

`app-dom` 是 Web 和 Desktop 唯一共享的 React DOM 产品界面（更名自 `app-web`：它服务两个 DOM 宿主，旧名会持续诱导"Desktop 是否该 fork"的误解，与禁止双界面目标相悖）。

它可以依赖：

- `@topicly-ui/react`
- `@nicenote/core`
- `@nicenote/editor`
- `@nicenote/shared`

它不可以依赖：

- Tauri API、localStorage、SQLite、React Native、Desktop Rust 生成物、app-local runtime 实现。

`app-dom` 通过 `AppRuntime` 接收所有业务能力，自己负责渲染、交互编排、视图状态（Zustand）和用户反馈。

### `packages/core`

`core` 是 NiceNote 的业务内核，取代单独的 `packages/domain` 和共享大 runtime 包。

它包含：领域类型与品牌标识（`NoteId`/`TagId`）、Repository 端口、usecase/action 工厂、能力发现模型、Markdown 持久化规则、跨端 i18n 文案目录与 key、**可复用的契约测试套件（以普通模块导出，不是 `.test` 文件）**。

它不依赖 React、Tauri、localStorage、SQLite 具体实现。平台 repository 实现一律放在对应 app 的 `src/runtime/`。

契约测试机制（关键）：`core` 导出 `createNoteRepositoryContract(makeRepo)`、`createMarkdownRoundtripContract(...)` 等工厂；各 app 在自己的测试里 import 并对**本地实现**运行。`core` 不直接测 app 实现，但保证三端跑同一套契约。

### `packages/editor`

Web/Desktop 使用的 Tiptap 编辑器，保留编辑器专属 CSS 和 toolbar 结构。

约束：读取走 Markdown API；写入以 Markdown content type 写入编辑器；不持久化 ProseMirror JSON；不承担 app layout/settings/sidebar/dialog 等产品 UI。

迁移注意：`editor` 当前**硬依赖 `@nicenote/ui`**（`Toolbar`/`EditorShell`/`LinkToolbarButton`/`CommandDropdownMenu`/`ActionToolbarButton` 5 处在用）。删除 `packages/ui` 前，必须先把这 5 处迁到 `@topicly-ui/react` 的等价 primitive，这是迁移路线里的显式步骤，不是"按需依赖"。

### `packages/editor-bridge`

Mobile 使用的 WebView 编辑器桥。约束：输入输出都必须是 Markdown 字符串；与 `packages/editor` 共享 Markdown round-trip 契约套件；不承载 Mobile 业务界面。

### `packages/shared`

只保留平台无关、业务无关的工具：schema 基础能力、sanitize/snippet/summary/debounce/throttle、常量与轻量类型。Note/Tag/Workspace 业务 schema 逐步迁入 `core`，避免 `shared` 变业务杂物箱。

## 包去向台账（补全：覆盖全部 8 个现存包）

| 现存包                   | 终局去向                                                                                                                                                              |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/app-shell`     | 拆解：共享产品界面 → `app-dom`；store factory → `app-dom/state`；i18n 文案与 key → `core/i18n`，React 绑定 → `app-dom/i18n`；其余工具 → `shared`/`core`。完成后删除。 |
| `packages/ui`            | 删除。能力由 `@topicly-ui/react` 承担；`editor` 与 `app-shell` 的引用先迁移再删。                                                                                     |
| `packages/tokens`        | 删除并停止被任何 NiceNote app 消费。token 由 `@topicly-ui/tokens` 承担。                                                                                              |
| `packages/ui-native`     | 删除。Mobile 通用 UI 由 `@topicly-ui/native` 承担。                                                                                                                   |
| `packages/database`      | 删除。Mobile 数据层下沉为 `apps/mobile/src/runtime` + `apps/mobile/src/storage`，实现 `core` 契约；op-sqlite 作为 app 内依赖。                                        |
| `packages/editor`        | 保留（去 `@nicenote/ui` 依赖）。                                                                                                                                      |
| `packages/editor-bridge` | 保留。                                                                                                                                                                |
| `packages/shared`        | 保留（瘦身）。                                                                                                                                                        |
| 新增 `packages/app-dom`  | 新建。                                                                                                                                                                |
| 新增 `packages/core`     | 新建。                                                                                                                                                                |

终局 `packages/`：`app-dom`、`core`、`editor`、`editor-bridge`、`shared`（5 个）。

## App 宿主职责

### `apps/web`

负责：初始化 React root；创建 Web runtime；引入 `@topicly-ui/react` 与 `@nicenote/editor` 样式；挂载 `NiceNoteApp`。不维护产品 UI。

### `apps/desktop/frontend`

负责：初始化 React root；创建 Desktop runtime；维护 `bindings/tauri.ts` 作为唯一 Tauri `invoke` 出口；引入与 Web 一致的样式入口；挂载 `NiceNoteApp`。不维护单独 Desktop UI；Desktop 特有能力只能通过 runtime 注入为统一产品能力。

### `apps/mobile`

bare React Native app，负责：原生导航、原生屏幕与业务组件、Mobile runtime、SQLite/native storage、`editor-bridge` 接入、`@topicly-ui/native` 接入。Mobile UI 不入共享包。

## 依赖方向

```text
apps/web                 -> @nicenote/app-dom, apps/web/src/runtime
apps/desktop/frontend    -> @nicenote/app-dom, apps/desktop/frontend/src/runtime, bindings/tauri.ts
apps/mobile              -> apps/mobile/src/{screens,runtime}, @nicenote/core,
                            @nicenote/editor-bridge, @topicly-ui/native

@nicenote/app-dom        -> @topicly-ui/react, @nicenote/core, @nicenote/editor, @nicenote/shared
@nicenote/core           -> @nicenote/shared
@nicenote/editor         -> @topicly-ui/react, @nicenote/shared
@nicenote/editor-bridge  -> Tiptap packages
```

禁止反向依赖：`core` 不依赖任何 app；`app-dom` 不依赖 `apps/web`/`apps/desktop/frontend`；`apps/mobile` 不依赖 `app-dom`；`editor` 不依赖 `app-dom`。

## `topicly-ui` 消费契约（新增，全量采用前置条件）

已确定全量采用。`topicly-ui` 是 NiceNote 工作区**之外**的独立私有 monorepo（root `private`，但 `@topicly-ui/{react,native,tokens,recipes,shared}` 带 `publishConfig.access:public` + `files:[dist]`，设计上即为可发布）。其入口指向 `dist/`（react）与 `lib/`（native），**源码不可直链，必须先构建产物**。因此必须定义消费契约：

### 兼容性矩阵（已核验）

| 维度         | topicly-ui 要求                                                                                            | NiceNote 现状      | 结论                                    |
| ------------ | ---------------------------------------------------------------------------------------------------------- | ------------------ | --------------------------------------- |
| React        | `>=19.0.0`                                                                                                 | `^19.2.0`          | 兼容                                    |
| Tailwind     | `>=4.0.0`                                                                                                  | v4                 | 兼容                                    |
| React Native | `@topicly-ui/native` 要求 `>=0.81.0`                                                                       | Mobile RN **0.79** | **冲突：Mobile 必须先升级 RN 至 ≥0.81** |
| 原生依赖栈   | reanimated 4.1、gesture-handler ≥2.28、safe-area ≥5、svg ≥15.12、`uniwind` ≥1、可选 `@gorhom/bottom-sheet` | 未引入             | Mobile 接入前需补齐                     |

### 消费方式

- **首选：发布 + 锁版本。** 由 topicly-ui CI 将 `@topicly-ui/{react,native,tokens,recipes,shared}` 发布到私有 registry（含预发布 tag，如 `0.0.1-rc.N`），NiceNote 按精确版本 pin。理由：设计系统切换不可逆，且 topicly-ui API 正在活跃破坏性重构，**版本锁定是唯一安全的耦合方式**。
- **本地开发回退：** 允许 `pnpm` 通过 `link:`/`overrides` 指向本地 `../topicly-ui/packages/*`，但前提是已 `pnpm --filter @topicly-ui/react build` 产出 `dist/`；CI 不走此路径。
- 升级 topicly-ui 必须走"改版本号 + 视觉回归"流程，禁止浮动版本（`*` / `latest` / 工作区直链进 CI）。
- topicly-ui 破坏性变更的吸收点统一收敛在 `app-dom` 与 `editor`，不得散落到 app 宿主。

## `topicly-ui` 集成范围

终局消费：Web/Desktop 用 `@topicly-ui/react`，Mobile 用 `@topicly-ui/native`，token 用 `@topicly-ui/tokens`。

应进入 `topicly-ui` 的通用能力：Button/Input/Dialog/Drawer/Popover/Tooltip/Toast、Resizable layout、Command palette、Confirm dialog、Tag/Chip/Badge、Toolbar primitives、List/Virtual list、Tabs/Segmented/Switch/Select、Color picker。

NiceNote 内保留业务组合组件（`NoteListPanel`/`EditorWorkspace`/`TagInput`/`WorkspaceSwitcher`/`MobileNoteList`/`MobileEditorHeader`）；一旦通用化，迁往 `topicly-ui`。

## 样式策略

Web/Desktop 样式入口保持一致：

```css
@import 'tailwindcss';
@import '@topicly-ui/tokens/variables.css';
@import '@topicly-ui/tokens/theme.css';
@import '@topicly-ui/react/styles';
@import '@nicenote/editor/styles/editor.css';
@import '@nicenote/app-dom/styles/app.css';
```

原则：不再引入 `@nicenote/tokens/generated-tokens.css`；不再新增 `packages/ui` 组件；NiceNote app CSS 只写产品布局与编辑器整合所需少量样式；通用视觉变体、组件默认样式、主题 token 全在 `topicly-ui`。主题由 `topicly-ui` Provider 渲染，NiceNote settings 只保存用户偏好。

## Runtime 与能力发现模型

`packages/core/src/app-runtime.ts`：

```ts
export interface AppRuntime {
  notes: NoteRepository
  tags: TagRepository
  workspaces: WorkspaceRepository
  settings: SettingsRepository
  search: SearchService
  system: SystemIntegration
}

export type CapabilityState = 'available' | 'unsupported' | 'requiresWorkspacePermission'

export interface SystemCapabilities {
  revealInExplorer: CapabilityState
  pickWorkspaceFolder: CapabilityState
  fileWatch: CapabilityState
  download: CapabilityState
}

export interface SystemIntegration {
  readonly capabilities: SystemCapabilities
  revealItem?(ref: NoteRef): Promise<void>
  pickWorkspaceFolder?(): Promise<WorkspaceRef | null>
  exportToFile?(name: string, markdown: string): Promise<void>
}
```

设计要点（针对本仓 `strict` + `exactOptionalPropertyTypes`）：

- UI **只读 `capabilities` 判别状态来渲染统一界面**（按钮 disabled/隐藏/引导授权），不通过 optional 方法的存在与否分叉 UI，也不 fork 组件。
- Web/Desktop/Mobile 各自 runtime 填充不同 `capabilities`，平台差异**只走能力位**。
- `NiceNoteApp` 只接收 `AppRuntime`：`<NiceNoteApp runtime={runtime} />`。Mobile `MobileHost` 创建同类 runtime 但渲染 RN screens。

## 数据和持久化

### Web

可继续 localStorage repository，终局可升级 IndexedDB / File System Access API。约束：note content 只存 Markdown；读写经过 `core` contract；读取边界做 schema 校验与迁移；对外只暴露 `NoteId`，localStorage key 不外泄。

### Desktop

`.md` 文件是 note source of truth。约束：SQLite 只存 settings、recent folders、favorites、tag colors、搜索 cache；note body 不写 SQLite；Tauri IPC 只经 `bindings/tauri.ts`；Rust note I/O 保留用户已有 frontmatter 未知字段；`path` 不外泄进 `app-dom`，在 repository 边界翻译为 `NoteId`。

### Mobile

SQLite 为本地 source of truth。约束：note content 可存 SQLite，但字段值必须是 Markdown 字符串；不存 ProseMirror JSON；editor bridge I/O 走 Markdown contract；未来文件同步另起 sync 层，不塞进 RN screens 或 editor bridge。

## Web/Desktop 一致性规则

不可出现两套产品界面。允许的平台差异：runtime 实现不同、系统集成能力不同（经能力位表达）、底层搜索实现不同。

不允许的平台差异：Sidebar 结构、Settings 面板、Note editor chrome、Tag 交互、Search dialog 不同；收藏/导入/导出等用户可见能力只有一端存在。

Desktop 已有而 Web 暂无底层支持的能力，在 `SystemCapabilities` 标记为 `unsupported`/`requiresWorkspacePermission`，由统一 UI 呈现能力状态，不 fork UI。

## Mobile 一致性规则

不要求与 Web/Desktop 共享界面或像素一致。需一致：业务概念、Markdown 持久化、usecase 语义、数据迁移规则、搜索/标签/设置核心行为、i18n 文案 key（共享自 `core/i18n`）。Mobile UI 可用符合原生交互的导航/sheet/screen layout。

## 质量门

终局 CI 至少包含：

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm --filter @nicenote/app-dom test
pnpm --filter @nicenote/core test
pnpm --filter @nicenote/editor test
pnpm --filter @nicenote/editor-bridge typecheck
pnpm --filter @nicenote/editor-bridge build:template
pnpm --filter @nicenote/mobile typecheck
cd apps/desktop/src-tauri && cargo check
```

新增质量规则：

- ESLint 禁止 Web/Desktop 产品代码导入 `@nicenote/ui` / `@nicenote/tokens`。
- ESLint 禁止 `packages/app-dom` 直接导入 Tauri/localStorage/SQLite/RN。
- ESLint 禁止 `apps/mobile` 导入 `@nicenote/app-dom`。
- ESLint 禁止 `app-dom` 出现 `path` 字面寻址（只允许 `NoteId`）。
- ESLint 禁止 NiceNote 内对 `@topicly-ui/*` 使用浮动版本或工作区直链（CI 必须 pin 版本）。
- 契约测试：Web/Desktop/Mobile repository 实现各自 import `core` 导出的契约套件运行。
- Markdown round-trip 套件覆盖 `editor` 和 `editor-bridge`。
- **Playwright 视觉/交互基线必须在设计系统切换之前建立**，切换后回归对比。

## 迁移路线（重排：先模型 → 抽界面 → 换设计系统）

> 排序原则：共享界面依赖统一模型，故模型先行；设计系统切换不可逆且 topicly-ui API 活跃变动，故放到界面边界冻结、视觉基线就绪之后。

### 阶段 0：建立 `packages/core` 统一领域模型（纯类型与契约，不动 UI）

- 定稿 `NoteId`/`TagId` 品牌类型与"path 在 repository 边界翻译"策略。
- 定稿关系型标签模型，`tagColors` 归 settings 域。
- 定义 Note/Tag/Workspace/Settings/Search 端口与 `SystemCapabilities` 能力模型。
- 导出可复用契约套件；先为现有 Web localStorage 与 Desktop Tauri repository 接入契约测试。

### 阶段 1：用现有 UI 抽出 `packages/app-dom` 并冻结边界

- 从 `app-shell` 迁出 Web/Desktop 共享产品界面到 `app-dom`，**仍用现有 `@nicenote/ui`**。
- `apps/web/App.tsx`、`apps/desktop/frontend/App.tsx` 收敛为宿主；统一状态层进 `app-dom/state`。
- 删除 Desktop 专属 UI 注入，收藏/搜索/设置改为经能力位的统一产品能力。
- **建立 Playwright 视觉与交互基线**（在换设计系统之前）。

### 阶段 2：解耦 `editor` 与 `@nicenote/ui`

- 将 `editor` 的 5 处 `@nicenote/ui` 引用迁到 `@topicly-ui/react` 等价 primitive。
- 跑 editor Markdown round-trip 与视觉基线，确保 toolbar/link 行为不回退。

### 阶段 3：在冻结边界之下切换到 `topicly-ui`

- 接入 `@topicly-ui/{react,tokens}`（按消费契约 pin 版本）。
- 用 `topicly-ui` Provider 替换主题渲染入口，统一 Web/Desktop CSS 入口。
- `app-dom` 组件逐个替换为 `topicly-ui` primitive，每步用视觉回归兜底。
- 新增 lint：禁止新增 `@nicenote/ui`/`@nicenote/tokens` 使用点与浮动版本。

### 阶段 4：平台 runtime 下沉到 apps

- Web/Desktop/Mobile runtime 分别留在各自 `apps/*/src/runtime`，实现 `core` 契约。
- 删除共享大 runtime 包诉求，避免平台实现污染共享层。

### 阶段 5：Mobile 原生闭环

- **前置：Mobile 升级 RN 0.79 → ≥0.81，并补齐 `@topicly-ui/native` 原生依赖栈**（reanimated4/uniwind/gesture-handler/safe-area/svg）。
- 保持 bare RN；接入 `@topicly-ui/native` 与 `editor-bridge`；SQLite repository 实现 `core` contract；screens 留 `apps/mobile/src/screens`，复用 `core` usecase 与 i18n 目录。

### 阶段 6：清理旧包

- 按「包去向台账」删除 `packages/{ui,tokens,ui-native,database,app-shell}`。
- 更新 README/AGENTS/CI，使文档与真实架构一致。

## 禁止事项

- 不在 NiceNote 内新增通用 UI primitive 或 design token。
- 不让 Web/Desktop 分别维护产品界面；不把 Mobile UI 放入 `packages/`。
- 不把平台 repository 实现放入 `packages/core`；`core` 内不出现 React/Tauri/localStorage/SQLite。
- 不在 UI 组件里直接调用 Tauri `invoke` 或直接操作 localStorage/SQLite。
- `app-dom` 内不出现 `path` 等平台寻址，只用 `NoteId`。
- 不持久化 ProseMirror JSON。
- 不对 `@topicly-ui/*` 使用浮动版本或把工作区直链带进 CI。
- 不在设计系统切换前缺失视觉基线。
- 不让 README 描述不存在的包或已移除的架构。

## 最终形态总结

```text
topicly-ui (外部，pin 版本消费)
  -> 通用 UI、主题、组件默认样式、design token

packages/core      -> 三端共享业务内核、统一领域模型、能力模型、契约套件、i18n 目录
packages/app-dom   -> Web/Desktop 唯一 React DOM 产品界面与共享视图状态
packages/editor    -> Tiptap 编辑器（依赖 topicly-ui，不依赖 @nicenote/ui）
packages/editor-bridge -> Mobile WebView 编辑器桥
packages/shared    -> 平台/业务无关工具

apps/web               -> 浏览器宿主与 Web runtime
apps/desktop/frontend  -> Tauri 宿主与 Desktop runtime
apps/mobile            -> bare RN 原生界面与 Mobile runtime（RN ≥0.81 + @topicly-ui/native）
```

这套架构把"界面共享"和"业务共享"分开：Web/Desktop 共享界面，Mobile 共享业务内核但保留原生界面。v2 在此基础上补齐了三件让它真正可落地的事——**统一领域模型先行、能力发现模型替代 UI 分叉、设计系统切换在冻结边界与视觉基线之后**，并把 topicly-ui 的全量采用建立在明确的版本/构建/兼容契约之上。
