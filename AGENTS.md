# NiceNote

笔记应用，支持富文本编辑，跨平台（Web / Desktop / Mobile）。

## Monorepo 结构

```
apps/
  web/            # React 19 + Vite 7 + TailwindCSS v4 前端
  desktop/        # Tauri v2 (Rust + React 19) 桌面端
    src-tauri/    #   Rust 后端（IPC commands、文件系统、SQLite 缓存）
    frontend/     #   React 前端（复用 editor/ui/tokens/shared/domain 包）
  mobile/         # React Native 0.79 (iOS/Android)
packages/
  app-shell/      # 共享 App Shell（组件、hooks、i18n、store 工厂、repository provider 工厂）
  domain/         # 领域层：Repository 接口 + 契约测试（纯 TS，零 I/O）
  editor/         # Tiptap v3 富文本编辑器组件（core/ + components/ + preset-note/）
  ui/             # Radix UI 组件库（Button, Popover, Toolbar 等）+ 通用 hooks
  tokens/         # Design tokens（颜色、字体、间距、阴影）+ CSS 生成
  shared/         # 共享工具函数、类型、Zod schemas
  database/       # op-sqlite + Drizzle ORM (native apps)
  editor-bridge/  # Tiptap WebView bridge (native apps, Vite 6)
  ui-native/      # Native UI 组件
.docs/            # 规划文档（PRD、架构评审、迁移计划）
```

## 技术栈

- **Runtime**: Node.js 22, pnpm 10.28 monorepo + Turborepo
- **Language**: TypeScript 5.9 (strict mode, `bundler` module resolution)
- **Frontend**: React 19, Vite 7, TailwindCSS v4, Zustand v5
- **Desktop**: Tauri v2, Rust (rusqlite bundled, anyhow, walkdir, notify)
- **Native**: React Native 0.79, React Navigation v7, NativeWind v4
- **Database**: rusqlite (desktop 缓存), op-sqlite + Drizzle ORM (mobile)
- **Validation**: Zod v4
- **Editor**: Tiptap v3 (ProseMirror), 内容以 **Markdown** 格式存储
- **UI**: Radix UI, Floating UI, lucide-react (图标)
- **i18n**: i18next + react-i18next (web)
- **Linting**: ESLint 9 (flat config) + Prettier + madge (循环依赖检测)
- **Testing**: Vitest + @vitest/coverage-v8
- **Git Hooks**: Husky + lint-staged

## 常用命令

```bash
# 根目录
pnpm dev                # 启动所有 apps/packages 开发模式
pnpm build              # 构建全部（Turborepo）
pnpm lint               # ESLint + madge 循环依赖检查
pnpm typecheck          # tsc -b 全量类型检查
pnpm test               # Vitest 全量测试
pnpm test -- --coverage # 测试 + 覆盖率

# Web (apps/web)
pnpm --filter @nicenote/web dev            # Vite 开发服务器 (port 5173)
pnpm --filter @nicenote/web build          # 构建（自动先生成 CSS tokens）
pnpm --filter @nicenote/web generate:css   # 从 design tokens 重新生成 CSS

# Desktop (apps/desktop)
cd apps/desktop && cargo tauri dev    # 开发模式（自动启动前端）
cd apps/desktop && cargo tauri build  # 生产构建
pnpm --filter @nicenote/desktop dev:frontend     # 仅启动前端 Vite 开发服务器
pnpm --filter @nicenote/desktop build:frontend   # 仅构建前端
pnpm --filter @nicenote/desktop generate:css     # 重新生成 CSS tokens

# Mobile (apps/mobile)
pnpm --filter @nicenote/editor-bridge build:template  # 构建 Tiptap 编辑器 HTML（启动前必须执行）
pnpm --filter @nicenote/mobile ios                     # 启动 iOS
pnpm --filter @nicenote/mobile android                 # 启动 Android
```

## 质量门禁

### 本地（pre-commit 自动执行）

Husky + lint-staged 在每次 commit 时自动运行：

```bash
pnpm --filter @nicenote/web generate:css   # 确保 CSS tokens 最新
# lint-staged: eslint --fix + prettier --write（仅暂存文件）
```

### CI/CD（GitHub Actions, push to main / PR）

按顺序执行以下检查，任一失败则阻断：

1. `pnpm generate:css` — 生成 CSS tokens
2. `pnpm lint` — ESLint + 循环依赖检查
3. `pnpm typecheck` — TypeScript 类型检查（含 native 包单独检查）
4. `pnpm test -- --coverage` — 测试 + 覆盖率
5. `pnpm build` — 全量构建

覆盖率报告：`packages/editor/coverage/` 和 `apps/web/coverage/`

### 测试

Vitest workspace 模式，覆盖范围：`packages/app-shell`、`packages/editor`、`packages/shared`、`apps/web`。

```bash
pnpm test                        # 全量
pnpm --filter @nicenote/web test           # 单包
pnpm test -- --coverage          # 带覆盖率
```

## 架构

### Domain 层 (`packages/domain`)

纯 TypeScript Repository 接口定义，零 I/O 依赖：

- **Repository 接口**：`NoteRepository`、`SearchIndex`、`SettingsRepository`
- **契约测试**：`testNoteRepositoryContract()` — 各端 Repository 实现可调用此函数验证接口一致性

各平台提供自己的 Repository 实现（Desktop 用文件系统，Mobile 用 SQLite，Web 用 localStorage），通过 `@nicenote/app-shell` 的 `createRepositoryProvider()` 工厂管理实例生命周期。

### Desktop 数据架构

```
前端组件
  → Store (Zustand slices)
    → Bindings (frontend/src/bindings/tauri.ts)
      → IPC (Tauri invoke)
        → Commands (src-tauri/src/commands/*.rs)  — 返回 Result<T, String>
          → Services (src-tauri/src/services/*.rs) — 使用 anyhow::Result
            → 文件系统 (.md 文件) + SQLite 缓存 (cache.db)
```

**核心原则**：文件系统是唯一数据源，SQLite 仅作缓存。

#### Rust 后端结构

| 模块                        | 职责                                                                    |
| --------------------------- | ----------------------------------------------------------------------- |
| `commands/note.rs`          | 笔记 CRUD（list / get / save / create / rename / delete / folder tree） |
| `commands/folder.rs`        | 文件夹对话框、在资源管理器中显示                                        |
| `commands/cache.rs`         | SQLite 缓存（settings / recent_folders / tag_colors / favorites）       |
| `commands/search.rs`        | 全文搜索（内存索引 + 文件系统扫描兜底）                                 |
| `commands/watcher.rs`       | 文件系统监听（notify-debouncer-mini）                                   |
| `services/frontmatter.rs`   | YAML frontmatter 解析 / 写入                                            |
| `services/note_io.rs`       | 文件系统笔记 I/O（原子写入、walkdir 递归扫描）                          |
| `services/search_engine.rs` | 目录扫描式全文搜索                                                      |
| `services/search_index.rs`  | 内存搜索索引（HashMap 缓存，watcher 事件驱动更新）                      |
| `db/mod.rs`                 | rusqlite 初始化 + migration                                             |

#### AppState（全局状态）

```rust
struct AppState {
    db: Mutex<Connection>,                    // SQLite 连接
    watcher: Mutex<Option<RecommendedWatcher>>, // 文件系统监听器
    search_index: Mutex<SearchIndex>,          // 内存搜索索引
}
```

#### 前端 Store（混合模式：独立 store + slice 组合）

独立 store（来自 `@nicenote/app-shell` 工厂）：

| Store             | 职责                  |
| ----------------- | --------------------- |
| `useSidebarStore` | 侧边栏折叠 / 展开状态 |
| `useToastStore`   | Toast 通知消息管理    |

主 store：`frontend/src/store/useDesktopStore.ts`，组合 5 个 slice：

| Slice           | 职责                                             |
| --------------- | ------------------------------------------------ |
| `folderSlice`   | 文件夹选择、最近文件夹、触发 watcher + 笔记加载  |
| `noteSlice`     | 笔记 CRUD、防抖保存 (800ms)、防抖重命名 (1500ms) |
| `searchSlice`   | 全文搜索状态                                     |
| `settingsSlice` | 主题 / 语言 / 视图切换 / 收藏 / 标签颜色         |
| `watcherSlice`  | 文件系统事件处理（created / modified / deleted） |

#### Desktop 启动流程

1. `loadSettings()` — 加载主题、语言，应用到 DOM
2. `loadFavorites()` — 加载收藏列表
3. `loadTagColors()` — 加载标签颜色
4. 注册 Tauri 文件系统事件（`file:created` / `file:modified` / `file:deleted`）
5. 用户选择文件夹 → `openFolder()` → 启动 watcher → 加载笔记列表

#### Desktop 全局快捷键

- `Cmd/Ctrl+K` — 打开搜索
- `Cmd/Ctrl+N` — 创建笔记
- `Cmd/Ctrl+\` — 切换侧边栏
- `Escape` — 关闭搜索

#### Desktop 三栏布局

```
┌────────────┬──────────────┬──────────────────┐
│ NavSidebar │  NoteList    │  Editor          │
│  (64px)    │  (280px)     │  (fill)          │
│  图标/导航  │  (可折叠)     │  (lazy-loaded)   │
└────────────┴──────────────┴──────────────────┘
```

未选择文件夹时显示 Welcome 页。

### Web 端状态管理

Zustand 独立 store 模式：

| Store              | 职责                                |
| ------------------ | ----------------------------------- |
| `useNoteStore`     | 笔记 CRUD + 标签管理                |
| `useSettingsStore` | 主题 + 语言（合并 store）           |
| `useSidebarStore`  | 侧边栏折叠 / 展开（app-shell 工厂） |
| `useToastStore`    | Toast 通知消息（app-shell 工厂）    |

数据层已移除（原 Cloudflare Workers API），待接入新数据源。

### 主题系统

Design tokens 在 `packages/tokens/` 中定义，`pnpm --filter @nicenote/tokens build` 自动执行 CSS 生成，输出到 `packages/tokens/dist/generated-tokens.css`。各 app 通过 `@import '@nicenote/tokens/generated-tokens.css'` 引用，无需各自运行生成脚本。

暗色模式使用 Tailwind `class` 策略 + localStorage 持久化。Desktop 端持久化 key：`nicenote-desktop-theme`。Web 端：`nicenote-theme`。`index.html` 内联脚本防止闪烁。

### 编辑器

Tiptap v3，入口 `packages/editor/src/index.ts`。目录结构：`core/`（状态、序列化、命令）、`components/`（React DOM 编辑器 UI）、`preset-note/`（扩展配置）。扩展：StarterKit (含 Link)、TextAlign、Typography、Placeholder、Markdown。**内容始终以 Markdown 格式存储**。

### UI 组件库

基于 Radix UI，入口 `packages/ui/src/index.tsx`。工具函数 `cn()` 来自 `packages/ui/src/lib/utils.ts`（clsx + tailwind-merge）。

### Shared 包

工具函数（debounce、throttle、toKebabCase）、验证器、笔记相关的完整 CRUD 类型和 Zod schemas。详见 `packages/shared/src/`。

## 命名规范

| 类别                  | 规范                                | 示例                            |
| --------------------- | ----------------------------------- | ------------------------------- |
| TS 变量 / 函数        | camelCase                           | `loadNotes`, `isLoading`        |
| TS 类型 / 接口 / 枚举 | PascalCase                          | `NoteFile`, `SearchResult`      |
| 全局常量              | UPPER_SNAKE_CASE                    | `MAX_RECENT_FOLDERS`            |
| CSS 类名              | kebab-case（Tailwind utility 除外） | `note-list-item`                |
| 目录名                | kebab-case                          | `editor-bridge/`                |
| 组件文件              | PascalCase.tsx                      | `NotesSidebar.tsx`              |
| 通用 TS 文件          | kebab-case.ts                       | `generate-css.ts`               |
| Hook 文件             | useXxx.ts                           | `useTauriEvents.ts`             |
| Store slice           | xxxSlice.ts                         | `noteSlice.ts`                  |
| Rust 模块             | snake_case.rs                       | `note_io.rs`                    |
| Tauri command 函数    | snake_case                          | `list_notes`, `save_note`       |
| Tauri 前端 invoke     | snake_case 字符串                   | `invoke('list_notes', { ... })` |

## 编码约定

### 通用

- 内部包使用 `workspace:*` 协议
- 所有包从 `src/index.ts`（或 `src/index.tsx`）导出
- Strict TypeScript, `bundler` module resolution
- 函数式组件 + hooks，需要 ref 转发时用 forwardRef
- CSS 变量用于可主题化的值（通过 design tokens）
- Mobile-first 响应式设计（sm=640, md=768, lg=1024, xl=1280）
- 编辑器链接输入使用非阻塞 UI（Popover/Modal + 验证），禁止 `window.prompt`

### Prettier

```json
{ "semi": false, "singleQuote": true, "printWidth": 100, "trailingComma": "es5", "endOfLine": "lf" }
```

### Native 端

- ID 生成：`nanoid/non-secure`（无 crypto 依赖）
- Mobile store 位于 `apps/mobile/src/store/`（不再是独立包），使用 lazy `svc()` accessor（每次创建新 service 实例——无状态）
- op-sqlite 是 `@nicenote/database` 的 peer dependency

### Vite 路径别名

- Web：`@` → `packages/editor/src`
- Desktop frontend 同理

## 反模式（禁止）

### Desktop 端：禁止绕过 bindings 层

```typescript
// ❌ 禁止：组件中直接调用 Tauri invoke
import { invoke } from '@tauri-apps/api/core'
const notes = await invoke('list_notes', { folderPath: folder })

// ✅ 正确：通过 bindings 层
import { AppService } from '@/bindings/tauri'
const notes = await AppService.ListNotes(folder)
```

### Desktop 端：禁止 Store slice 间直接调用

```typescript
// ❌ 禁止：在 slice 内部导入和调用另一个 slice 的 action
import { useSettingsSlice } from './settingsSlice'
useSettingsSlice.getState().loadTagColors()

// ✅ 正确：组件层协调多个 slice 的操作
```

### 编辑器：禁止存储非 Markdown 格式

```typescript
// ❌ 禁止：存储 ProseMirror JSON
await saveNote(path, editor.getJSON())

// ✅ 正确：始终存储 Markdown
await saveNote(path, editor.storage.markdown.getMarkdown())
```

### Rust 端：禁止在 command 中直接 panic

```rust
// ❌ 禁止：unwrap 可能失败的操作
let content = std::fs::read_to_string(&path).unwrap();

// ✅ 正确：用 map_err 转换为 String 返回给前端
let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
```

### 数据源：禁止 Desktop 端用 SQLite 存储笔记数据

```rust
// ❌ 禁止：笔记内容写入 SQLite
db.execute("INSERT INTO notes (title, content) VALUES (?1, ?2)", ...);

// ✅ 正确：笔记始终写入 .md 文件，SQLite 仅缓存 settings / favorites / tag_colors
```

## 实现原则

- **最短路径**：选择最直接的可行方案，不搞过度设计。
- **文件系统优先**：Desktop 端 .md 文件是唯一数据源，不引入额外数据库写入。
- **Markdown 规范**：编辑器内容以 Markdown 为唯一存储格式，不存储 ProseMirror JSON。
- **三端兼容**：修改 `packages/` 下的共享包时，必须考虑 web / desktop / mobile 三端兼容性。
- **主动清理**：发现冗余 / 废弃代码时主动移除，不留兼容层。
- **可读性优先**：优化可读性、可测试性和可维护性。

## AI 协作指引

- 修改前先读懂上下文，不要猜测文件内容。
- 优先复用 `packages/ui` 和 `packages/shared` 中的现有组件和工具函数。
- 新增 UI 组件时遵循 Radix UI + `cn()` 模式。
- 新增 Rust command 时参考 `commands/` 下现有模式：`#[tauri::command]` + `Result<T, String>` + `map_err`。
- 修改 store 时：Desktop 业务逻辑使用 slice 组合模式，通用状态（sidebar / toast）使用 `@nicenote/app-shell` 工厂创建独立 store。Web 使用独立 store 模式。
- 提交前确保 `pnpm lint` 和 `pnpm test` 通过。
- 新增前端 IPC 调用时，同步更新 `frontend/src/bindings/tauri.ts` 的类型定义。
- 新增 Tauri command 后，在 `src-tauri/src/lib.rs` 的 `generate_handler!` 中注册。

## 注释规范

代码中的注释使用中文。

## 部署

- **CI/CD**: GitHub Actions (`ci-cd.yml`)，详见上方"质量门禁"章节。
