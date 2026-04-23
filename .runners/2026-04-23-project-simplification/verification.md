# NiceNote Project Simplification Verification

日期：`2026-04-23`

这份文档只回答一件事：`nicenote-project-simplification` 这轮减法到底减少了什么，以及哪些边界仍然故意没有提升为正式支持。

## supported_surface verification

- `99-01-supported-surface-regression` 已在 `2026-04-22` 完成，日志位于 `.runners/2026-04-23-project-simplification/logs/99-01-supported-surface-regression.log`。
- 最终通过结果已经固定：
  - `pnpm lint` 通过，`madge` 报告 `No circular dependency found`
  - `pnpm typecheck` 通过
  - `pnpm test` 通过：`shared` 175 tests，`editor` 13，`app-shell` 36，`web` 5，`desktop` 当前无测试文件，使用 `--passWithNoTests`
  - `pnpm build` 通过：`web` 和 `desktop` 前端都完成 Vite 生产构建
- 这次通过不再只是“web/shared 绿了”。root 验证面现在实际覆盖：
  - `apps/web`
  - `apps/desktop/frontend`
  - `packages/app-shell`
  - `packages/editor`
  - `packages/shared`
  - `packages/tokens`
  - `packages/ui`
- 当前 supported surface 的结论是：`web + desktop frontend + 仍被两端真实消费的共享包` 已经完成 root 级验证闭环。
- 本轮没有把 `apps/desktop/src-tauri` 纳入 root `pnpm` 门禁，也没有执行 `cargo tauri build`；这不是“已验证通过”的一部分，而是下面单独列出的剩余风险。

## before/after metrics

| Metric                      | Before                                                                                                                                                                                    | After                                                                                                          | 固定结论                                                                                                                                                                                                              |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `desktop_search_paths`      | `2` 条 desktop 前端搜索路径：`searchSlice` 阴影实现 + provider/repository/AppService 实际实现                                                                                             | `1` 条路径：`SearchDialog -> AppShellContext.searchNotes -> DesktopAppShellProvider -> AppService.searchNotes` | desktop 搜索入口已经从“双实现争议题”变成单一路径；`apps/desktop/frontend/src/store/slices/searchSlice.ts` 已删除，`apps/desktop/frontend/src/providers/AppShellProvider.tsx` 直接调用 `AppService.searchNotes(...)`。 |
| `noop_context_fields`       | `2` 个 shared context no-op 字段：`selectedTag`、`setSelectedTag`                                                                                                                         | `0`                                                                                                            | `packages/app-shell/src/context.ts` 不再暴露这两个字段；标签过滤状态回收到 `packages/app-shell/src/components/NotesSidebar.tsx` 的局部 `tagFilterName`。                                                              |
| `web_load_fanout`           | Web 初始化为 `1 + N` 次 repository 调用，`limit=100` 时最坏 `101` 次 localStorage 全量读取/解析                                                                                           | `1` 次直接加载完整笔记                                                                                         | `apps/web/src/store/useNoteStore.ts` 的 `loadNotes()` 现在直接调用 `loadStoredNotes()`；初始化不再执行 `list + Promise.all(get)`。                                                                                    |
| `dead_runtime_modules`      | `8` 个 mobile dead runtime modules 在入口链路里空转                                                                                                                                       | `0` 个 active runtime dead modules                                                                             | `apps/mobile/src` 当前活跃树只剩 `App.tsx`、`navigation/index.tsx`、`screens/HomeScreen.tsx`、`screens/NoteEditorScreen.tsx`；provider / adapter / store 运行时壳已退出主路径。                                       |
| `root_quality_gate_surface` | root `typecheck` 漏掉 `apps/desktop/frontend`、`packages/app-shell`；root `lint/test/build` 实际没跑到 `@nicenote/desktop`；CI 还额外显式检查 `@nicenote/database`、`@nicenote/ui-native` | root `typecheck` 已和 supported TS surface 对齐，root `lint/test/build` 也已纳入 `@nicenote/desktop`           | `tsconfig.json` 现在显式引用 `apps/desktop/frontend` 和 `packages/app-shell`；`apps/desktop/frontend/package.json` 现在具备 `build`、`lint`、`test`。剩余未收口部分见“remaining risks”。                              |

直接回答“这轮减法减少了什么”：

- desktop 前端不再存在第二条搜索和 repository I/O 主路径。
- shared context 不再为未落地标签/视图语义保留空字段。
- web 首屏读笔记不再做 `list + N 次 get` 的重复存储读取。
- mobile 不再伪装成必须同步维护的共享 runtime。
- root 验证命令终于开始覆盖当前真正 supported 的 TS 表面。

## removed structure frozen

这轮 rollout 已经删除或收缩的结构，后续团队不需要重新盘点一遍：

- Desktop 双路径和多层壳：
  - `apps/desktop/frontend/src/adapters/repository-provider.ts`
  - `apps/desktop/frontend/src/adapters/tauri-note-repository.ts`
  - `apps/desktop/frontend/src/store/slices/folderSlice.ts`
  - `apps/desktop/frontend/src/store/slices/noteSlice.ts`
  - `apps/desktop/frontend/src/store/slices/searchSlice.ts`
  - `apps/desktop/frontend/src/store/slices/settingsSlice.ts`
  - `apps/desktop/frontend/src/store/slices/watcherSlice.ts`
- Web / shared 伪统一层：
  - `apps/web/src/adapters/repository-provider.ts`
  - `packages/app-shell/src/lib/create-repository-provider.ts`
  - `packages/app-shell/src/lib/search-utils.ts`
  - `packages/app-shell/src/lib/search-utils.test.ts`
- Mobile dead runtime shell：
  - `apps/mobile/src/adapters/repository-provider.ts`
  - `apps/mobile/src/adapters/sqlite-note-repository.ts`
  - `apps/mobile/src/providers/MobileAppShellProvider.tsx`
  - `apps/mobile/src/store/index.ts`
  - `apps/mobile/src/store/useFolderStore.ts`
  - `apps/mobile/src/store/useNoteStore.ts`
  - `apps/mobile/src/store/useSettingsStore.ts`
  - `apps/mobile/src/store/useSidebarStore.ts`
  - `apps/mobile/src/store/useTagStore.ts`
  - `apps/mobile/src/store/useToastStore.ts`
- Draft package surface：
  - `packages/domain/` 整体删除
  - `packages/database/src/adapter.ts`
  - `packages/database/src/adapters/op-sqlite.ts`

## experimental_surface remaining

剩余 experimental surface 现在是明确的，不再维持模糊中间态：

| Surface                  | 当前状态     | 为什么仍是 experimental                                                                  | 只有满足这些条件才允许升格                                               |
| ------------------------ | ------------ | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `apps/mobile`            | experimental | 当前只保留最小导航壳和占位 screen，没有真实笔记列表/打开/编辑/保存链路                   | 必须先具备真实 note list/open/edit/save 路径，并补齐独立质量门禁。       |
| `packages/database`      | experimental | 现在是 mobile-only 数据层；draft adapter 已删，但它本身还不是 supported surface 的一部分 | 只有 mobile 被明确提升为 supported，或出现第二个真实调用面时才考虑扩张。 |
| `packages/editor-bridge` | experimental | 仍然只服务 mobile WebView 编辑桥，当前不决定 web/desktop 的支持边界                      | 必须先进入真实 mobile 产品链路，再讨论是否保留或扩张。                   |
| `packages/ui-native`     | experimental | 仍然只服务 mobile，当前没有资格反向约束 supported surface                                | 必须伴随 mobile 升格一起进入正式门禁。                                   |

## remaining risks

- `.github/workflows/ci-cd.yml` 仍然显式执行 `pnpm --filter @nicenote/database typecheck` 和 `pnpm --filter @nicenote/ui-native typecheck`。这说明 CI 还有一截 experimental 验证尾巴，但不代表这些包已经变成 supported。
- `.github/workflows/ci-cd.yml` 的路径触发仍然只看 `apps/desktop/frontend/**`，没有覆盖 `apps/desktop/src-tauri/**`。
- root `pnpm` 门禁也还没有 `cargo check` / `cargo tauri build`。所以 desktop backend 的验证状态当前是“代码在 supported product path 内，但不在这轮 root Node 门禁闭环里”。

## non-goals locked

这轮 rollout 明确不做以下事情，后续不要再把它们当成隐含 TODO：

- 不恢复 `repository-provider`、`create-repository-provider`、`@nicenote/domain` 或任何过渡 facade / adapter / manager。
- 不为了 experimental mobile 保留 shared context 空字段、双接口、兼容层或 no-op 实现。
- 不把 `apps/mobile`、`packages/database`、`packages/editor-bridge`、`packages/ui-native` 默认视为“半支持态”。
- 不把未来可能存在的多端实现当成今天保留共享抽象的理由。
- 不在这个 rollout 里顺手把 `apps/desktop/src-tauri` 并入 root cargo/CI 大一统流水线；如果要做，必须单独开 batch，明确新增验证成本和触发边界。

后续如果还要继续沿 experimental 路线推进，顺序应保持明确：

1. 先决定 mobile 是否真的要升级为 supported。
2. 如果要升级，先补真实产品链路，再补质量门禁。
3. 最后再更新 `.docs/simplification-guardrails.md`，而不是反过来先恢复共享层。
