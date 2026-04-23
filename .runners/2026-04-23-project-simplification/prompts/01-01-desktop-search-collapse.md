# Batch 01-01-desktop-search-collapse: Collapse Desktop Search To One Path

You are implementing the rollout `nicenote-project-simplification` in the repository rooted at `/home/afu/dev/NiceNote`.

## Phase

- `01-stop-bleeding` — Stop The Worst Path Inflation
- Goal: 先收掉最明显的双路径和空转状态，立刻降低调试成本。
- Context: 优先处理 desktop 搜索双实现和无行为状态。

## Phase Entry Criteria

- 00-baseline 完成，支持矩阵已固定。

## Phase Exit Criteria

- desktop 搜索只剩一条主路径。
- 明显的无行为 desktop 状态被删除或下沉为局部状态。

## Phase Risks

- 如果 desktop 占位导航其实被产品视为即将上线功能，需要先确认是删除而不是补实现。

## Batch Shape

- Kind: `code`
- Execution: `codex`

## Batch Goal

删除 desktop searchSlice 中未被 UI 消费的搜索状态和 repo 搜索路径，统一为单一实现。

## Depends On

- None

## Deliverables

- desktop 搜索不再同时存在 searchSlice 状态和 provider 搜索路径。
- 搜索查询执行统一直连 AppService.searchNotes 或等价的单一路径。

## Acceptance

- desktop 搜索只有一条可解释的数据流。
- SearchDialog 仍可正常搜索和选中结果。
- useDesktopStore 不再保留未消费的 searchQuery、searchResults、isSearching、search 方法。

## Evidence To Capture

- 删除字段和调用链前后的对照。
- 前端搜索路径数量从 2 降到 1 的说明。

## Verification Commands (must pass before declaring success)

- `pnpm --filter @nicenote/desktop build:frontend`
- `! rg -n "searchResults:|isSearching:|searchQuery:|search: async" apps/desktop/frontend/src/store/slices/searchSlice.ts`

## Likely Files

- `apps/desktop/frontend/src/App.tsx`
- `apps/desktop/frontend/src/providers/AppShellProvider.tsx`
- `apps/desktop/frontend/src/store/slices/searchSlice.ts`
- `apps/desktop/frontend/src/store/useDesktopStore.ts`

## Sources Of Truth

- `AGENTS.md`
- `.docs/PLAN-desktop-tauri.md`
- `.docs/PRD-desktop.md`

## Planning Notes

- 本次工作优先做减法，不保留低价值兼容层。
- web 和 desktop 是当前活跃支持表面；mobile 仍是实验性表面，除非某个 batch 明确提升其状态。
- 共享抽象必须由当前真实调用倒逼产生，而不是为未来可能性预埋。

## Success Metrics

- desktop 搜索前端实现路径从两条收缩为一条。
- 支持表面中的共享 context 不再包含 no-op 字段。
- web 初始笔记加载不再执行 list 加每条笔记的二次读取。
- root typecheck 和正式支持的 app/package 表面一致。

## Global Context

- NiceNote 是 pnpm monorepo，当前主要活跃表面为 web 和 Tauri desktop。
- desktop 前端应以 AppService 作为唯一前端 I/O 边界，不再额外叠加 repository provider。
- 注释保持中文，desktop 端仍坚持文件系统是笔记唯一数据源，Markdown 是唯一存储格式。
- 共享包的目标是减少真实重复，不是制造额外的统一层。

## Hard Rules

- 优先删除、合并、内联，不要为保留旧结构新增 facade、adapter、manager 或兼容层。
- 没有两个活跃支持表面同时需要的抽象，不要上共享层。
- desktop 前端不得重新引入 AppService 之外的第二条 I/O 主路径。
- mobile 相关改动必须明确标注为 experimental 或 supported，不能维持模糊中间态。
- 每个 batch 只完成当前目标和通过验收所必需的改动。
- 执行 batch 前后都要运行列出的验证命令。

## Batch Context

- 不要新增新的 search service 或 helper。

## Working Agreement

- 只完成当前 batch 和让它通过验证所必需的最小改动。
