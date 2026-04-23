# Batch 99-01-supported-surface-regression: Run Supported Surface Regression

You are implementing the rollout `nicenote-project-simplification` in the repository rooted at `/home/afu/dev/NiceNote`.

## Phase

- `99-verification` — Verify And Lock In
- Goal: 确认简化真的降低维护成本，并把结果固定成可持续的工程规则。
- Context: 先跑全量支持表面验证，再补齐 before/after 证据。

## Phase Entry Criteria

- 所有结构收缩 batch 已完成。

## Phase Exit Criteria

- 支持表面验证通过。
- before/after 指标已落档。
- 剩余 experimental 表面已经列清。

## Phase Risks

- 如果验证只看编译不看路径收缩，很容易‘功能没坏但复杂度没降’。

## Batch Shape

- Kind: `verification`
- Execution: `codex`

## Batch Goal

对当前 supported 表面执行完整回归验证，确认减法没有引入回归。

## Depends On

- None

## Deliverables

- web、desktop、shared packages 的回归验证结果。
- 失败项和修复结果清单。

## Acceptance

- 支持表面的 lint、typecheck、test、build 都通过。
- 不再依赖 experimental 表面的隐藏前提。

## Evidence To Capture

- 验证命令输出摘要。
- 若有补修，记录补修批次。

## Verification Commands (must pass before declaring success)

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

## Likely Files

- `apps/web/**`
- `apps/desktop/**`
- `packages/**`

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

- 不要在这个 batch 顺手做新重构；只修复回归。

## Working Agreement

- 只完成当前 batch 和让它通过验证所必需的最小改动。
