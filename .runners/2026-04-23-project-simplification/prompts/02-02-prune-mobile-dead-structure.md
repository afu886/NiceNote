# Batch 02-02-prune-mobile-dead-structure: Prune Mobile Dead Stores And Experimental Surface

You are implementing the rollout `nicenote-project-simplification` in the repository rooted at `/home/afu/dev/NiceNote`.

## Phase

- `02-mobile-boundary-reset` — Reset Mobile To Experimental Boundary
- Goal: 把 mobile 从假统一架构里拆出来，恢复为清晰的实验性表面。
- Context: 先把未落地的 runtime 架构退出主路径，再谈未来是否重建共享。

## Phase Entry Criteria

- shared shell 的 P0 噪音已经开始收缩。

## Phase Exit Criteria

- mobile 不再依赖无真实收益的 shared shell runtime。
- mobile 相关死 provider/store/package 有明确去留。

## Phase Risks

- 如果后续马上要做 mobile 正式功能，删除过多中间层会让短期 diff 变大。

## Batch Shape

- Kind: `code`
- Execution: `codex`

## Batch Goal

删除当前 mobile 中没有 screen 消费的 store 和导出，明确 experimental 边界。

## Depends On

- `02-01-detach-mobile-runtime-shell`

## Deliverables

- 未被 screen 使用的 mobile store、provider、index re-export 被删除或移出活跃表面。
- root tsconfig 和支持矩阵与 mobile experimental 状态保持一致。

## Acceptance

- mobile 代码树只保留当前 screen 真正会走到的结构。
- 根质量门禁对 mobile 的覆盖策略有明确结论并已文档化。

## Evidence To Capture

- 删除的死 store/module 列表。
- supported 与 experimental 的最终矩阵。

## Verification Commands (must pass before declaring success)

- `pnpm --filter @nicenote/mobile exec tsc --noEmit -p tsconfig.json`
- `rg -n "experimental" .docs/simplification-guardrails.md`

## Likely Files

- `apps/mobile/src/store/**`
- `apps/mobile/src/providers/**`
- `apps/mobile/src/navigation/**`
- `tsconfig.json`
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

- 如果某个 mobile store 只是为未来功能预留且当前 screen 不消费，优先删除。

## Working Agreement

- 只完成当前 batch 和让它通过验证所必需的最小改动。
