# nicenote-project-simplification guardrails

本文件冻结 `00-baseline` 阶段的支持边界和减法规则，供后续 batch 直接引用。除非后续 batch 明确更新本文件，否则默认按这里的分类执行删除、合并和内联。

## baseline evidence

- `AGENTS.md` 已明确当前主要活跃表面是 `web` 和 `desktop`，并要求 `desktop` 前端以 `AppService` 作为唯一前端 I/O 边界，不再额外叠加 repository provider。
- `.docs/PLAN-desktop-tauri.md` 和 `.docs/PRD-desktop.md` 都以桌面端为核心产品路径，强调文件系统 `.md` 是唯一数据源，SQLite 仅作缓存。
- 仓库当前调用现状也支持同一结论：
  - `apps/desktop/frontend/src/bindings/tauri.ts` 已经提供 `AppService` IPC 路径。
  - `apps/desktop/frontend/src/adapters/repository-provider.ts` 仍保留第二条 repository provider 路径，属于后续应收缩对象，不应再扩张。
  - `apps/mobile/src/screens/HomeScreen.tsx` 和 `apps/mobile/src/screens/NoteEditorScreen.tsx` 仍是占位实现，存在多条 `TODO`，说明 mobile 还不是完整支持表面。
  - `packages/database`、`packages/ui-native`、`packages/editor-bridge` 的实际引用基本只来自 `apps/mobile`，不是当前活跃支持表面的必需共享层。

## supported surfaces

当前只有两个 supported surfaces：

| Surface        | Status    | 当前判断         | 保留标准                                                                                 |
| -------------- | --------- | ---------------- | ---------------------------------------------------------------------------------------- |
| `apps/web`     | supported | 当前活跃支持表面 | 后续改动必须服务真实 Web 交付路径，并纳入根级质量门禁的目标范围。                        |
| `apps/desktop` | supported | 当前活跃支持表面 | 后续改动必须服务真实 Tauri Desktop 交付路径，并坚持 `AppService` 是唯一前端 I/O 主路径。 |

对 supported surfaces 的统一要求：

- 只有 `web` 和 `desktop` 可以共同决定共享抽象是否保留。
- 后续 root `typecheck`、`lint`、`test`、`build` 的正式支持范围，必须和这两个 supported surfaces 及其仍然需要的共享包保持一致。
- `desktop` 端继续坚持文件系统 `.md` 是唯一数据源，Markdown 是唯一存储格式，SQLite 仅作缓存。
- `desktop` 前端不得重新引入 `AppService` 之外的第二条 I/O 主路径。

## experimental surfaces

当前 experimental surfaces 如下：

| Surface       | Status       | 当前判断                                           | 处理规则                                                                                                    |
| ------------- | ------------ | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `apps/mobile` | experimental | 仍有占位页面和未落地编辑链路，不是当前活跃支持表面 | 不得反向约束 `web` / `desktop` 的减法；若某个 batch 触达 mobile，必须显式标注为 experimental 或 supported。 |

experimental surfaces 的统一要求：

- experimental 表面可以暂时滞后、收缩、跳过适配，不能要求 supported surfaces 为其保留兼容层。
- 若后续要把 `mobile` 提升为 supported，必须由单独 batch 明确完成，并同步更新本文件。
- 在升级为 supported 之前，mobile 相关包和抽象都默认不具备“必须保留”的资格。

### 02-mobile-boundary-reset evidence

当前 `apps/mobile` 的活跃代码树只保留：

- `src/App.tsx`
- `src/navigation/index.tsx`
- `src/screens/HomeScreen.tsx`
- `src/screens/NoteEditorScreen.tsx`

本轮从 mobile 活跃表面移除的 dead modules：

- `src/adapters/repository-provider.ts`
- `src/adapters/sqlite-note-repository.ts`
- `src/providers/MobileAppShellProvider.tsx`
- `src/store/index.ts`
- `src/store/useFolderStore.ts`
- `src/store/useNoteStore.ts`
- `src/store/useSettingsStore.ts`
- `src/store/useSidebarStore.ts`
- `src/store/useTagStore.ts`
- `src/store/useToastStore.ts`

本轮同步结论：

- `apps/mobile/package.json` 不再声明 `@nicenote/app-shell`、`@nicenote/domain`、`@nicenote/database`、`@nicenote/editor-bridge`、`@nicenote/shared`、`@nicenote/ui-native`、`immer`、`zustand`、`nativewind` 这些当前 screen 未消费的依赖。
- root `tsconfig.json` 只保留 supported surfaces 当前必需的 project references；`apps/mobile`、`packages/database`、`packages/editor-bridge`、`packages/ui-native` 继续停留在 experimental 边界之外。
- 根质量门禁对 experimental mobile 的结论是：不进入 root `tsc -b` 正式支持范围；若某个 batch 触达 mobile，最低要求是执行 `pnpm --filter @nicenote/mobile exec tsc --noEmit -p tsconfig.json` 作为定向 smoke check。

`apps/mobile` 升级为 supported 前，至少满足以下准入条件：

- 有真实可用的笔记列表、打开、编辑、保存路径，不再依赖占位页面。
- `@nicenote/editor-bridge`、`@nicenote/database`、`@nicenote/ui-native` 不再只是预埋结构，而是实际产品路径的一部分。
- 有明确的质量门禁归属，不能继续维持“仓库里存在，但不决定支持边界”的中间态。

## package status matrix

下表固定当前争议包的状态和准入边界：

| Package                  | Status                  | 当前结论                                                             | 准入标准                                                                                                                    |
| ------------------------ | ----------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `packages/app-shell`     | supported, narrow scope | 仅作为 `web` + `desktop` 的共享 shell 工具层保留                     | 只有当 `web` 和 `desktop` 现在都需要、且抽出后能减少真实重复时，才允许继续留在共享层。                                      |
| `packages/domain`        | experimental            | 当前更像为多端 repository 统一预埋的抽象层，不是正式支持边界的一部分 | 没有两个活跃支持表面同时需要的 shared abstraction，不新增、不扩张；仅为 mobile 或未来可能性存在的接口，应删除、内联或下沉。 |
| `packages/database`      | experimental            | Mobile-only 数据层                                                   | 只有在明确服务 experimental mobile，或未来有独立 batch 提升 mobile 状态时，才保留或演进。                                   |
| `packages/ui-native`     | experimental            | Mobile-only UI 层                                                    | 不能要求 `web` / `desktop` 为它保留共享接口或兼容字段。                                                                     |
| `packages/editor-bridge` | experimental            | Mobile-only WebView 编辑桥                                           | 在 mobile 未升级为 supported 前，不得成为支持边界的前置约束。                                                               |

对 `packages/app-shell` 的进一步限制：

- 可保留：`web` 和 `desktop` 共同使用的 UI 外壳、store 工厂、主题/语言应用、编辑器承载组件。
- 不可扩张：仅为了维持旧结构而新增的 repository provider、兼容字段、空实现字段、跨端 no-op API。
- 如果某段逻辑只剩一个 supported surface 使用，应优先下沉回 app 内，而不是继续挂在 `app-shell`。

对 `packages/domain` 的进一步限制：

- 允许临时保留被 `web` 和 `desktop` 共同使用的简单共享类型，但这不自动证明 repository 抽象本身应继续存在。
- `NoteRepository`、`SearchIndex`、`SettingsRepository` 这类接口，只有在两个活跃 supported surfaces 的真实生产调用都依赖它们时，才有保留理由。
- 如果抽象主要是为了兼容 experimental mobile，或只是为了“以后也许会有第二实现”，默认按删除目标处理。

## shared abstraction guardrails

后续 batch 一律按以下规则判断共享层是否保留：

1. 没有两个活跃支持表面，不新增共享抽象。
2. 没有两个活跃支持表面同时需要的 shared abstraction，不保留为共享层。
3. 优先删除、合并、内联；不要为了保留旧结构新增 facade、adapter、manager 或 wrapper。
4. `desktop` 前端只允许一条 I/O 主路径，即 `AppService`。凡是额外 repository provider、bridge provider、双写路径，默认视为待删除。
5. experimental surface 不能作为共享抽象存在的主要理由；supported surfaces 先收敛，experimental surface 之后再适配或直接删除。
6. no compatibility shim: 不为了平滑过渡保留兼容层、双接口、空字段、空实现或 no-op context 字段；调用方应直接迁到最终结构。
7. 如果一个共享包不能同时减少 `web` 和 `desktop` 的真实重复，就不要因为“架构完整性”继续保留它。

可以直接复用的判定句：

- “这层抽象是否同时服务两个活跃 supported surfaces？”
- “如果删除这层，`web` 和 `desktop` 是否会失去同一段真实共享能力？”
- “如果答案是否定的，就应删除、合并或下沉，而不是继续保留。”

## batch usage rule

后续代码 batch 在遇到保留/删除争议时，按下面顺序裁决：

1. 先判断对象是否直接服务 `web` 或 `desktop`。
2. 若不是，再判断它是否同时被两个 supported surfaces 的当前生产路径真实需要。
3. 若仍不是，默认归入 experimental 或删除范围，不为其新增共享抽象。
4. 若有人提出“先保留兼容，后面再收”，默认驳回，除非该兼容层本身是本 batch 验收所必需。

本文件的目标不是定义长期愿景，而是给本轮简化提供可执行的收缩边界。后续若要扩大支持面，先更新这里，再改代码。
