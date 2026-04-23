# Batch 99-02-capture-post-rollout-evidence: Capture Post-Rollout Evidence

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

- Kind: `docs`
- Execution: `codex`

## Batch Goal

把 before/after 指标、剩余风险和后续 experimental 路线固定成最终证据文档。

## Depends On

- `99-01-supported-surface-regression`

## Deliverables

- .runners/2026-04-23-project-simplification/verification.md
- 文档中包含路径缩短结果、已删除结构、剩余 experimental 表面、后续不做事项。

## Acceptance

- 可以直接回答‘这轮减法到底减少了什么’。
- 后续团队不需要重新做一次同样的诊断。

## Evidence To Capture

- before/after 指标表。
- 剩余风险与后续非目标清单。

## Verification Commands (must pass before declaring success)

- `test -f .runners/2026-04-23-project-simplification/verification.md`
- `rg -n "desktop_search_paths|noop_context_fields|web_load_fanout|supported_surface|experimental_surface" .runners/2026-04-23-project-simplification/verification.md`

## Likely Files

- `.runners/2026-04-23-project-simplification/verification.md`

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

- 这份文档是交付证明，不是新的大 spec。

## Working Agreement

- 只完成当前 batch 和让它通过验证所必需的最小改动。
