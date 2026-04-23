# Batch 05-02-delete-draft-adapters-and-dead-packages: Delete Draft Adapters And Dead Package Surface

You are implementing the rollout `nicenote-project-simplification` in the repository rooted at `/home/afu/dev/NiceNote`.

## Phase

- `05-package-pruning` — Prune Unused Packages And Runtime Contracts
- Goal: 把不再有真实收益的 domain 和 draft package 彻底收掉。
- Context: 只保留被活跃表面真实消费的共享边界。

## Phase Entry Criteria

- web 和 desktop 主路径已经缩短。

## Phase Exit Criteria

- @nicenote/domain 不再承担伪 runtime 边界。
- database draft adapter 和其他死代码被删除。
- 包图更贴近真实支持表面。

## Phase Risks

- 如果 repo 外部还有未识别的包消费者，直接删 domain exports 可能带来兼容性问题。

## Batch Shape

- Kind: `code`
- Execution: `codex`

## Batch Goal

删除 packages/database 中未实现的 adapter 抽象，并清理未被活跃表面消费的 dead exports 和依赖。

## Depends On

- `05-01-prune-domain-runtime`

## Deliverables

- packages/database/src/adapter.ts 被删除。
- packages/database/src/adapters/op-sqlite.ts 被删除。
- 未使用的 package exports、依赖、根引用和实验包入口被同步清理或标明 experimental。

## Acceptance

- 仓库不再保留明确未实现但看起来像正式架构的 adapter 壳。
- 活跃支持表面和 package 边界一致。

## Evidence To Capture

- 被删除的 draft surface 列表。
- 包图收缩说明。

## Verification Commands (must pass before declaring success)

- `pnpm --filter @nicenote/database typecheck`
- `test ! -f packages/database/src/adapter.ts`
- `test ! -f packages/database/src/adapters/op-sqlite.ts`

## Likely Files

- `packages/database/src/**`
- `packages/*/package.json`
- `tsconfig.json`

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

- 删除优先于保留 TODO 壳；如果某个实验包保留，必须在文档和 tsconfig 中明确其实验状态。

## Working Agreement

- 只完成当前 batch 和让它通过验证所必需的最小改动。
