# Batch 00-02-support-matrix: Write Support Matrix And Guardrails

You are implementing the rollout `nicenote-project-simplification` in the repository rooted at `/home/afu/dev/NiceNote`.

## Phase

- `00-baseline` — Baseline And Guardrails
- Goal: 把当前复杂度证据、支持边界和减法规则固定下来，避免后续边改边漂移。
- Context: 先固化证据和约束，再开始删除结构。

## Phase Entry Criteria

- 现有审查结论已经明确 P0 和 P1 热点。

## Phase Exit Criteria

- 有可对比的基线证据。
- 支持表面和实验表面已经写清。
- 团队后续 batch 有统一减法规则可遵循。

## Phase Risks

- 如果支持边界不先写清，后续每个 batch 都会争论是否要继续兼容 mobile 或 domain 抽象。

## Batch Shape

- Kind: `docs`
- Execution: `codex`

## Batch Goal

明确哪些 app/package 处于 supported，哪些处于 experimental，以及共享抽象的准入规则。

## Depends On

- `00-01-baseline-evidence`

## Deliverables

- .docs/simplification-guardrails.md
- 文档中写清 web、desktop、mobile、domain、app-shell、database、ui-native、editor-bridge 的当前状态和准入标准。

## Acceptance

- 后续代码 batch 可以直接引用该文档判断是否保留或删除某层抽象。
- 文档明确写出‘没有两个活跃支持表面，不新增共享抽象’。

## Evidence To Capture

- 支持表面列表。
- 实验表面列表。
- 共享抽象准入标准。

## Verification Commands (must pass before declaring success)

- `test -f .docs/simplification-guardrails.md`
- `rg -n "supported surfaces|experimental surfaces|shared abstraction|no compatibility shim" .docs/simplification-guardrails.md`

## Likely Files

- `.docs/simplification-guardrails.md`

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

- 这里先写规则，不要提前实现大规模代码改动。

## Working Agreement

- 只完成当前 batch 和让它通过验证所必需的最小改动。
