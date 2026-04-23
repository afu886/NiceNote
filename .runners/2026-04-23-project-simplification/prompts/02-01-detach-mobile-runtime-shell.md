# Batch 02-01-detach-mobile-runtime-shell: Detach Mobile Runtime From App Shell

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

移除 MobileAppShellProvider 和 repository-provider 对当前 mobile 运行时的包裹，保留最小可运行入口。

## Depends On

- None

## Deliverables

- apps/mobile/src/App.tsx 不再包裹 MobileAppShellProvider。
- 未被 screen 使用的 mobile repository-provider 从运行时主路径退出。

## Acceptance

- 当前 mobile app 仍能以最小导航壳运行。
- 不再为了还没落地的共享 UI 维持 provider 树。

## Evidence To Capture

- 删除的 provider 和调用入口。
- mobile 运行时依赖图收缩说明。

## Verification Commands (must pass before declaring success)

- `pnpm --filter @nicenote/mobile exec tsc --noEmit -p tsconfig.json`
- `! rg -n "MobileAppShellProvider|initRepository\(|getRepository\(" apps/mobile/src/App.tsx apps/mobile/src`

## Likely Files

- `apps/mobile/src/App.tsx`
- `apps/mobile/src/providers/MobileAppShellProvider.tsx`
- `apps/mobile/src/adapters/repository-provider.ts`

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

- 不要为了过渡重新引入一个更小的 mobile shell provider。

## Working Agreement

- 只完成当前 batch 和让它通过验证所必需的最小改动。
