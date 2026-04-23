# Batch 03-03-remove-repository-provider-factory: Remove Repository Provider Factory

You are implementing the rollout `nicenote-project-simplification` in the repository rooted at `/home/afu/dev/NiceNote`.

## Phase

- `03-app-shell-contraction` — Contract The Shared Shell
- Goal: 把 app-shell 收缩回真正的共享展示层，不再承载超大 context 和伪统一模型。
- Context: shared shell 只保留 web 和 desktop 的真实公共交集。

## Phase Entry Criteria

- mobile 已退出 shared shell 主路径。

## Phase Exit Criteria

- shared context 没有 no-op 字段。
- platform-only 扩展点不再隐藏在全局 context。
- 壳层专用 App\* 模型层被移除或显著收缩。

## Phase Risks

- web 和 desktop provider 会出现一轮签名调整，需要谨慎分批。

## Batch Shape

- Kind: `code`
- Execution: `codex`

## Batch Goal

删除 createRepositoryProvider 和相关壳层导出，避免 app-shell 继续承载 service 生命周期职责。

## Depends On

- `03-02-remove-appshell-model-layer`

## Deliverables

- packages/app-shell 中不再存在 createRepositoryProvider。
- web、desktop、mobile 中不再有 repository-provider 调用链。

## Acceptance

- app-shell 只保留 UI、轻量 store 工厂和必要 DOM helper。
- 不再通过共享壳层管理平台数据实例生命周期。

## Evidence To Capture

- 被删除的 provider 工厂及调用点。

## Verification Commands (must pass before declaring success)

- `pnpm --filter @nicenote/app-shell build`
- `! rg -n "createRepositoryProvider|repository-provider" apps packages`

## Likely Files

- `packages/app-shell/src/lib/create-repository-provider.ts`
- `packages/app-shell/src/index.ts`
- `apps/**/src/adapters/repository-provider.ts`

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

- 允许直接用模块级单例或局部实例，但不要再包一层 set/get/reset 工厂。

## Working Agreement

- 只完成当前 batch 和让它通过验证所必需的最小改动。
