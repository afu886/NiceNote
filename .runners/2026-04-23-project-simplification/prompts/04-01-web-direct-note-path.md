# Batch 04-01-web-direct-note-path: Make Web Note Loading Direct

You are implementing the rollout `nicenote-project-simplification` in the repository rooted at `/home/afu/dev/NiceNote`.

## Phase

- `04-platform-path-shortening` — Shorten Web And Desktop Data Paths
- Goal: 收短 web 和 desktop 的真实修改路径，让单个需求触达更少文件和层级。
- Context: 平台层各自直达自己的主数据路径，不再伪统一。

## Phase Entry Criteria

- shared shell 已经收缩。

## Phase Exit Criteria

- web 初始加载没有 N+1。
- desktop 前端只保留 AppService 一条 I/O 边界。
- desktop store 结构比当前 slice 组合更直接。

## Phase Risks

- web 和 desktop 的 store 改动都较集中，需要保证行为不回退。

## Batch Shape

- Kind: `code`
- Execution: `codex`

## Batch Goal

删除 web 当前 list 加 N 次 get 的加载方式，改成单次直接加载，并清除已死的 web repository-provider。

## Depends On

- None

## Deliverables

- web useNoteStore 使用单次直接加载的本地数据路径。
- apps/web/src/adapters/repository-provider.ts 被删除。
- selectNoteList 这类无调用导出被顺手清理。

## Acceptance

- web 初始加载不再有 N+1 fanout。
- web 数据路径更接近 localStorage 实际实现。

## Evidence To Capture

- 旧加载路径与新加载路径的对照。
- 删除的死文件或死导出列表。

## Verification Commands (must pass before declaring success)

- `pnpm --filter @nicenote/web build`
- `pnpm --filter @nicenote/web test`
- `! test -f apps/web/src/adapters/repository-provider.ts`

## Likely Files

- `apps/web/src/store/useNoteStore.ts`
- `apps/web/src/adapters/local-storage-note-repository.ts`
- `apps/web/src/adapters/repository-provider.ts`

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

- 优先减少读取层数，其次再考虑是否完全删除 repository 类。

## Working Agreement

- 只完成当前 batch 和让它通过验证所必需的最小改动。
