# NiceNote

NiceNote 是一个跨平台笔记应用，支持富文本编辑，并以 Markdown 作为唯一内容存储格式。项目采用 pnpm workspace + Turborepo 管理 Web、Desktop、Mobile 三端应用与共享包。

## 特性

- Web / Desktop / Mobile 多端架构
- 基于 Tiptap v3 的富文本编辑体验
- 笔记内容始终保存为 Markdown
- Desktop 端以本地 `.md` 文件作为唯一数据源，SQLite 仅用于缓存
- 共享 App Shell、UI 组件、Design Tokens、领域接口和通用工具
- 支持主题、国际化、全文搜索、文件系统监听和收藏等基础能力

## 技术栈

| 分类       | 技术                                                   |
| ---------- | ------------------------------------------------------ |
| Runtime    | Node.js 22, pnpm 10.28, Turborepo                      |
| Language   | TypeScript 5.9, strict mode, bundler module resolution |
| Web        | React 19, Vite 7, TailwindCSS v4, Zustand v5           |
| Desktop    | Tauri v2, Rust, rusqlite, anyhow, walkdir, notify      |
| Mobile     | React Native 0.79, React Navigation v7, NativeWind v4  |
| Editor     | Tiptap v3, ProseMirror, Markdown                       |
| UI         | Radix UI, Floating UI, lucide-react                    |
| Validation | Zod v4                                                 |
| Test       | Vitest, @vitest/coverage-v8                            |
| Quality    | ESLint 9 flat config, Prettier, Husky, lint-staged     |

## 目录结构

```text
apps/
  web/            # React 19 + Vite 7 + TailwindCSS v4 前端
  desktop/        # Tauri v2 桌面端
    src-tauri/    # Rust 后端：IPC commands、文件系统、SQLite 缓存
    frontend/     # React 前端：复用 editor/ui/tokens/shared/domain 包
  mobile/         # React Native iOS / Android
packages/
  app-shell/      # 共享 App Shell、hooks、i18n、store 工厂
  domain/         # Repository 接口与契约测试，纯 TypeScript，零 I/O
  editor/         # Tiptap 富文本编辑器组件
  ui/             # Radix UI 组件库与通用 hooks
  tokens/         # Design tokens 与 CSS 生成
  shared/         # 工具函数、类型、Zod schemas
  database/       # op-sqlite + Drizzle ORM，供 native apps 使用
  editor-bridge/  # Native 端 Tiptap WebView bridge
  ui-native/      # Native UI 组件
```

## 快速开始

### 环境要求

- Node.js 22
- pnpm 10.28.x
- Desktop 开发需要 Rust 与 Tauri v2 相关系统依赖
- Mobile 开发需要 React Native iOS / Android 本地环境

### 安装依赖

```bash
pnpm install
```

### 启动 Web

```bash
pnpm --filter @nicenote/web dev
```

默认 Vite 开发服务器端口为 `5173`。

### 启动 Desktop

```bash
cd apps/desktop
cargo tauri dev
```

仅启动 Desktop 前端：

```bash
pnpm --filter @nicenote/desktop dev:frontend
```

### 启动 Mobile

首次启动前先构建编辑器 WebView 模板：

```bash
pnpm --filter @nicenote/editor-bridge build:template
```

启动 iOS 或 Android：

```bash
pnpm --filter @nicenote/mobile ios
pnpm --filter @nicenote/mobile android
```

## 常用命令

```bash
# 根目录
pnpm dev                # 启动所有 apps/packages 开发模式
pnpm build              # 构建全部
pnpm lint               # ESLint 检查
pnpm typecheck          # TypeScript 全量类型检查
pnpm test               # Vitest 全量测试
pnpm test -- --coverage # 测试并生成覆盖率报告

# CSS tokens
pnpm generate:css
pnpm --filter @nicenote/tokens build

# Web
pnpm --filter @nicenote/web build
pnpm --filter @nicenote/web test
pnpm --filter @nicenote/web preview

# Desktop frontend
pnpm --filter @nicenote/desktop build:frontend
pnpm --filter @nicenote/desktop preview

# Desktop Tauri
cd apps/desktop && cargo tauri build
```

## 架构概览

### Domain 层

`packages/domain` 定义纯 TypeScript Repository 接口，不包含 I/O 依赖：

- `NoteRepository`
- `SearchIndex`
- `SettingsRepository`
- `testNoteRepositoryContract()`

各端提供自己的 Repository 实现，并通过 `@nicenote/app-shell` 的 `createRepositoryProvider()` 管理实例生命周期。Desktop 使用文件系统，Mobile 使用 SQLite，Web 当前数据层待接入新数据源。

### Desktop 数据流

```text
前端组件
  -> Store (Zustand slices)
    -> Bindings (frontend/src/bindings/tauri.ts)
      -> IPC (Tauri invoke)
        -> Commands (src-tauri/src/commands/*.rs)
          -> Services (src-tauri/src/services/*.rs)
            -> 文件系统 (.md 文件) + SQLite 缓存
```

Desktop 端核心原则：文件系统中的 `.md` 文件是唯一数据源，SQLite 仅缓存 settings、recent folders、tag colors、favorites 等辅助数据。

### Desktop 状态管理

Desktop 前端采用“独立 store + slice 组合”的混合模式：

- `useSidebarStore`：侧边栏折叠 / 展开状态
- `useToastStore`：Toast 通知
- `useDesktopStore`：组合 folder、note、search、settings、watcher 五个 slice

### Web 状态管理

Web 端使用 Zustand 独立 store：

- `useNoteStore`：笔记 CRUD 与标签管理
- `useSettingsStore`：主题与语言
- `useSidebarStore`：侧边栏状态
- `useToastStore`：Toast 通知

### 主题系统

Design tokens 位于 `packages/tokens/`，构建后输出 `packages/tokens/dist/generated-tokens.css`。各 app 通过 `@import '@nicenote/tokens/generated-tokens.css'` 引入。

暗色模式使用 Tailwind `class` 策略并写入 localStorage：

- Desktop：`nicenote-desktop-theme`
- Web：`nicenote-theme`

### 编辑器

编辑器入口为 `packages/editor/src/index.ts`，主要目录包括：

- `core/`：状态、序列化、命令
- `components/`：React DOM 编辑器 UI
- `preset-note/`：扩展配置

编辑器扩展包含 StarterKit、Link、TextAlign、Typography、Placeholder、Markdown。所有内容保存时必须转换为 Markdown。

## 质量门禁

CI 在 push 到 `main` 或创建 PR 时按顺序执行：

1. `pnpm generate:css`
2. `pnpm lint`
3. `pnpm typecheck`
4. `pnpm test -- --coverage`
5. `pnpm build`

覆盖率报告输出位置：

- `packages/editor/coverage/`
- `apps/web/coverage/`

本地 commit 前由 Husky + lint-staged 自动处理暂存文件的 ESLint fix 与 Prettier 格式化。

## 开发约定

- 内部包使用 `workspace:*` 协议
- 所有包从 `src/index.ts` 或 `src/index.tsx` 导出
- 函数组件优先使用 hooks，需要 ref 转发时使用 `forwardRef`
- 可主题化的值使用 CSS 变量与 design tokens
- 响应式设计采用 mobile-first
- 编辑器链接输入使用非阻塞 UI，禁止 `window.prompt`
- 代码注释使用中文

### 命名规范

| 类别                  | 规范             | 示例                        |
| --------------------- | ---------------- | --------------------------- |
| TS 变量 / 函数        | camelCase        | `loadNotes`                 |
| TS 类型 / 接口 / 枚举 | PascalCase       | `NoteFile`                  |
| 全局常量              | UPPER_SNAKE_CASE | `MAX_RECENT_FOLDERS`        |
| CSS 类名              | kebab-case       | `note-list-item`            |
| 目录名                | kebab-case       | `editor-bridge/`            |
| 组件文件              | PascalCase.tsx   | `NotesSidebar.tsx`          |
| 通用 TS 文件          | kebab-case.ts    | `generate-css.ts`           |
| Hook 文件             | useXxx.ts        | `useTauriEvents.ts`         |
| Store slice           | xxxSlice.ts      | `noteSlice.ts`              |
| Rust 模块             | snake_case.rs    | `note_io.rs`                |
| Tauri command         | snake_case       | `list_notes`                |
| Tauri invoke 字符串   | snake_case       | `invoke('list_notes', ...)` |

## 重要约束

- Desktop 组件禁止直接调用 `invoke`，必须通过 `frontend/src/bindings/tauri.ts`。
- Desktop store slice 之间禁止直接互相调用，跨 slice 协调放在组件层。
- 编辑器禁止存储 ProseMirror JSON，笔记内容只保存 Markdown。
- Rust command 禁止 `unwrap()` / `panic!` 处理可失败路径，应返回 `Result<T, String>`。
- Desktop 禁止把笔记正文写入 SQLite，SQLite 只作为缓存。

## 相关文档

- [AGENTS.md](./AGENTS.md)：面向 AI 协作与实现细节的完整工程指南
