# Batch 05-01-prune-domain-runtime: Prune Domain Runtime Abstractions

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

把 Theme、Language 等值类型收回 shared，并删除没有真实消费者的 domain 接口和契约测试导出。

## Depends On

- None

## Deliverables

- 不再要求 app 通过 @nicenote/domain 引入纯值类型。
- NoteRepository、SettingsRepository、SearchIndex 及其契约测试被删除或明确冻结为非 runtime 表面。

## Acceptance

- domain 不再作为当前产品主路径的伪多态边界。
- 调用方导入关系更直接。

## Evidence To Capture

- domain 删除或收缩前后的导出对照。
- 受影响调用点清单。

## Verification Commands (must pass before declaring success)

- `pnpm typecheck`
- `pnpm --filter @nicenote/shared typecheck`

## Likely Files

- `packages/domain/src/**`
- `packages/shared/src/**`
- `apps/**/src/**`
- `packages/app-shell/src/**`

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

- 优先删除没有真实消费者的接口，不要把它们迁到另一个共享包继续保留。

## Working Agreement

- 只完成当前 batch 和让它通过验证所必需的最小改动。
