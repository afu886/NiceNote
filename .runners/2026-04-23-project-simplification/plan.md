# NiceNote Project Simplification Implementation Plan

这是一个可生成 `rollout.py` 的 implementation plan。

当前已根据这份计划生成 runner，用于承载仓库内可自动执行的 batch；但以下判断仍然成立：

- 这次工作仍带有明显的诊断和策略确认性质，尤其是 mobile 支持边界、desktop 占位导航移除策略、`@nicenote/domain` 去留范围。
- 多个高优先级批次依赖“做减法”的明确选择，因此 manual checkpoint 仍需保留在 runner 之外。
- 更安全的执行方式是按 phase / batch 渐进推进，而不是直接从头到尾无人值守跑完整个 rollout。

这个计划以“减少层级、减少包装、减少跳转、减少伪复用”为核心，默认优先删除、内联、收回本地，而不是新增兼容层。

## Baseline Focus

这次简化要持续跟踪以下基线和目标：

- desktop 搜索前端实现路径数：`2 -> 1`
- 共享 runtime context 中的 no-op 字段数：`>0 -> 0`
- web 笔记初始加载模式：`list + N 次 get -> 单次直接加载`
- 活跃运行时中的死模块数量：`>0 -> 0`
- root 质量门禁覆盖面与“官方支持表面”的一致性：`不一致 -> 一致`

<!-- rollout-plan:start -->
```yaml
rollout:
  name: "nicenote-project-simplification"
  repo_root: "/home/afu/dev/NiceNote"
  workdir: ".runners/2026-04-23-project-simplification"
  codex_cmd: null
  model: null
  max_fix_attempts: 1
  allow_dirty: false
  commit_per_batch: false
  sources_of_truth:
    - "AGENTS.md"
    - ".docs/PLAN-desktop-tauri.md"
    - ".docs/PRD-desktop.md"
  planning_notes:
    - "本次工作优先做减法，不保留低价值兼容层。"
    - "web 和 desktop 是当前活跃支持表面；mobile 仍是实验性表面，除非某个 batch 明确提升其状态。"
    - "共享抽象必须由当前真实调用倒逼产生，而不是为未来可能性预埋。"
  success_metrics:
    - "desktop 搜索前端实现路径从两条收缩为一条。"
    - "支持表面中的共享 context 不再包含 no-op 字段。"
    - "web 初始笔记加载不再执行 list 加每条笔记的二次读取。"
    - "root typecheck 和正式支持的 app/package 表面一致。"
  global_context:
    - "NiceNote 是 pnpm monorepo，当前主要活跃表面为 web 和 Tauri desktop。"
    - "desktop 前端应以 AppService 作为唯一前端 I/O 边界，不再额外叠加 repository provider。"
    - "注释保持中文，desktop 端仍坚持文件系统是笔记唯一数据源，Markdown 是唯一存储格式。"
    - "共享包的目标是减少真实重复，不是制造额外的统一层。"
  hard_rules:
    - "优先删除、合并、内联，不要为保留旧结构新增 facade、adapter、manager 或兼容层。"
    - "没有两个活跃支持表面同时需要的抽象，不要上共享层。"
    - "desktop 前端不得重新引入 AppService 之外的第二条 I/O 主路径。"
    - "mobile 相关改动必须明确标注为 experimental 或 supported，不能维持模糊中间态。"
    - "每个 batch 只完成当前目标和通过验收所必需的改动。"
    - "执行 batch 前后都要运行列出的验证命令。"
  batch_prompt_suffix:
    - "只完成当前 batch 和让它通过验证所必需的最小改动。"
phases:
  - id: "00-baseline"
    title: "Baseline And Guardrails"
    goal: "把当前复杂度证据、支持边界和减法规则固定下来，避免后续边改边漂移。"
    depends_on: []
    summary: "先固化证据和约束，再开始删除结构。"
    entry_criteria:
      - "现有审查结论已经明确 P0 和 P1 热点。"
    exit_criteria:
      - "有可对比的基线证据。"
      - "支持表面和实验表面已经写清。"
      - "团队后续 batch 有统一减法规则可遵循。"
    risks:
      - "如果支持边界不先写清，后续每个 batch 都会争论是否要继续兼容 mobile 或 domain 抽象。"
    batches:
      - id: "00-01-baseline-evidence"
        title: "Capture Baseline Evidence"
        kind: "analysis"
        execution: "codex"
        goal: "把当前过度设计的可量化证据落成文档，作为后续验证基线。"
        depends_on: []
        deliverables:
          - ".runners/2026-04-23-project-simplification/baseline.md"
          - "基线统计至少覆盖 desktop 搜索路径、context no-op 字段、活跃 runtime 死模块、web 初始加载 fanout、root 质量门禁覆盖差异。"
        acceptance:
          - "每个 P0/P1 热点都有可复查的代码证据和计数。"
          - "后续 phase 的成功指标都能对照这份基线。"
        evidence_to_capture:
          - "关键 rg 输出、文件路径、调用链说明。"
          - "一份 before 状态表格。"
        verify_commands:
          - "test -f .runners/2026-04-23-project-simplification/baseline.md"
          - "rg -n \"desktop_search_paths|noop_context_fields|dead_runtime_modules|web_load_fanout|root_quality_gate_surface\" .runners/2026-04-23-project-simplification/baseline.md"
        files_to_touch:
          - ".runners/2026-04-23-project-simplification/baseline.md"
        prompt_context:
          - "不要只写原则，必须引用真实文件路径和调用链。"
      - id: "00-02-support-matrix"
        title: "Write Support Matrix And Guardrails"
        kind: "docs"
        execution: "codex"
        goal: "明确哪些 app/package 处于 supported，哪些处于 experimental，以及共享抽象的准入规则。"
        depends_on:
          - "00-01-baseline-evidence"
        deliverables:
          - ".docs/simplification-guardrails.md"
          - "文档中写清 web、desktop、mobile、domain、app-shell、database、ui-native、editor-bridge 的当前状态和准入标准。"
        acceptance:
          - "后续代码 batch 可以直接引用该文档判断是否保留或删除某层抽象。"
          - "文档明确写出‘没有两个活跃支持表面，不新增共享抽象’。"
        evidence_to_capture:
          - "支持表面列表。"
          - "实验表面列表。"
          - "共享抽象准入标准。"
        verify_commands:
          - "test -f .docs/simplification-guardrails.md"
          - "rg -n \"supported surfaces|experimental surfaces|shared abstraction|no compatibility shim\" .docs/simplification-guardrails.md"
        files_to_touch:
          - ".docs/simplification-guardrails.md"
        prompt_context:
          - "这里先写规则，不要提前实现大规模代码改动。"

  - id: "01-stop-bleeding"
    title: "Stop The Worst Path Inflation"
    goal: "先收掉最明显的双路径和空转状态，立刻降低调试成本。"
    depends_on:
      - "00-baseline"
    summary: "优先处理 desktop 搜索双实现和无行为状态。"
    entry_criteria:
      - "00-baseline 完成，支持矩阵已固定。"
    exit_criteria:
      - "desktop 搜索只剩一条主路径。"
      - "明显的无行为 desktop 状态被删除或下沉为局部状态。"
    risks:
      - "如果 desktop 占位导航其实被产品视为即将上线功能，需要先确认是删除而不是补实现。"
    batches:
      - id: "01-01-desktop-search-collapse"
        title: "Collapse Desktop Search To One Path"
        kind: "code"
        execution: "codex"
        goal: "删除 desktop searchSlice 中未被 UI 消费的搜索状态和 repo 搜索路径，统一为单一实现。"
        depends_on: []
        deliverables:
          - "desktop 搜索不再同时存在 searchSlice 状态和 provider 搜索路径。"
          - "搜索查询执行统一直连 AppService.searchNotes 或等价的单一路径。"
        acceptance:
          - "desktop 搜索只有一条可解释的数据流。"
          - "SearchDialog 仍可正常搜索和选中结果。"
          - "useDesktopStore 不再保留未消费的 searchQuery、searchResults、isSearching、search 方法。"
        evidence_to_capture:
          - "删除字段和调用链前后的对照。"
          - "前端搜索路径数量从 2 降到 1 的说明。"
        verify_commands:
          - "pnpm --filter @nicenote/desktop build:frontend"
          - "! rg -n \"searchResults:|isSearching:|searchQuery:|search: async\" apps/desktop/frontend/src/store/slices/searchSlice.ts"
        files_to_touch:
          - "apps/desktop/frontend/src/App.tsx"
          - "apps/desktop/frontend/src/providers/AppShellProvider.tsx"
          - "apps/desktop/frontend/src/store/slices/searchSlice.ts"
          - "apps/desktop/frontend/src/store/useDesktopStore.ts"
        prompt_context:
          - "不要新增新的 search service 或 helper。"
      - id: "01-02-remove-phantom-desktop-state"
        title: "Remove Phantom Desktop View State"
        kind: "code"
        execution: "codex"
        goal: "删除当前没有真实行为承载的 desktop 导航扩展状态，并把标签筛选状态收回更接近 UI 的位置。"
        depends_on:
          - "01-01-desktop-search-collapse"
        deliverables:
          - "无行为的 currentView、selectedTag、extraNavItems、noteListItemSlots 被删除或转为显式局部 props。"
          - "NotesSidebar 内部不再依赖全局 selectedTag 影子状态。"
        acceptance:
          - "desktop 不再维护只有高亮效果但没有真实功能的视图状态。"
          - "标签筛选的状态所有权可直接从使用点看懂。"
        evidence_to_capture:
          - "被删除的 dead state 列表。"
          - "sidebar 过滤状态归属说明。"
        verify_commands:
          - "pnpm --filter @nicenote/desktop build:frontend"
          - "! rg -n \"currentView|selectedTag|extraNavItems|noteListItemSlots\" apps/desktop/frontend/src packages/app-shell/src/components/NotesSidebar.tsx packages/app-shell/src/context.ts"
        files_to_touch:
          - "apps/desktop/frontend/src/providers/AppShellProvider.tsx"
          - "apps/desktop/frontend/src/store/slices/settingsSlice.ts"
          - "packages/app-shell/src/components/NotesSidebar.tsx"
          - "packages/app-shell/src/context.ts"
          - "packages/app-shell/src/types.ts"
        prompt_context:
          - "默认策略是删除占位功能，不是补全 favorites 或 folder-tree 页面。"

  - id: "02-mobile-boundary-reset"
    title: "Reset Mobile To Experimental Boundary"
    goal: "把 mobile 从假统一架构里拆出来，恢复为清晰的实验性表面。"
    depends_on:
      - "01-stop-bleeding"
    summary: "先把未落地的 runtime 架构退出主路径，再谈未来是否重建共享。"
    entry_criteria:
      - "shared shell 的 P0 噪音已经开始收缩。"
    exit_criteria:
      - "mobile 不再依赖无真实收益的 shared shell runtime。"
      - "mobile 相关死 provider/store/package 有明确去留。"
    risks:
      - "如果后续马上要做 mobile 正式功能，删除过多中间层会让短期 diff 变大。"
    batches:
      - id: "02-01-detach-mobile-runtime-shell"
        title: "Detach Mobile Runtime From App Shell"
        kind: "code"
        execution: "codex"
        goal: "移除 MobileAppShellProvider 和 repository-provider 对当前 mobile 运行时的包裹，保留最小可运行入口。"
        depends_on: []
        deliverables:
          - "apps/mobile/src/App.tsx 不再包裹 MobileAppShellProvider。"
          - "未被 screen 使用的 mobile repository-provider 从运行时主路径退出。"
        acceptance:
          - "当前 mobile app 仍能以最小导航壳运行。"
          - "不再为了还没落地的共享 UI 维持 provider 树。"
        evidence_to_capture:
          - "删除的 provider 和调用入口。"
          - "mobile 运行时依赖图收缩说明。"
        verify_commands:
          - "pnpm --filter @nicenote/mobile exec tsc --noEmit -p tsconfig.json"
          - "! rg -n \"MobileAppShellProvider|initRepository\\(|getRepository\\(\" apps/mobile/src/App.tsx apps/mobile/src"
        files_to_touch:
          - "apps/mobile/src/App.tsx"
          - "apps/mobile/src/providers/MobileAppShellProvider.tsx"
          - "apps/mobile/src/adapters/repository-provider.ts"
        prompt_context:
          - "不要为了过渡重新引入一个更小的 mobile shell provider。"
      - id: "02-02-prune-mobile-dead-structure"
        title: "Prune Mobile Dead Stores And Experimental Surface"
        kind: "code"
        execution: "codex"
        goal: "删除当前 mobile 中没有 screen 消费的 store 和导出，明确 experimental 边界。"
        depends_on:
          - "02-01-detach-mobile-runtime-shell"
        deliverables:
          - "未被 screen 使用的 mobile store、provider、index re-export 被删除或移出活跃表面。"
          - "root tsconfig 和支持矩阵与 mobile experimental 状态保持一致。"
        acceptance:
          - "mobile 代码树只保留当前 screen 真正会走到的结构。"
          - "根质量门禁对 mobile 的覆盖策略有明确结论并已文档化。"
        evidence_to_capture:
          - "删除的死 store/module 列表。"
          - "supported 与 experimental 的最终矩阵。"
        verify_commands:
          - "pnpm --filter @nicenote/mobile exec tsc --noEmit -p tsconfig.json"
          - "rg -n \"experimental\" .docs/simplification-guardrails.md"
        files_to_touch:
          - "apps/mobile/src/store/**"
          - "apps/mobile/src/providers/**"
          - "apps/mobile/src/navigation/**"
          - "tsconfig.json"
          - ".docs/simplification-guardrails.md"
        prompt_context:
          - "如果某个 mobile store 只是为未来功能预留且当前 screen 不消费，优先删除。"

  - id: "03-app-shell-contraction"
    title: "Contract The Shared Shell"
    goal: "把 app-shell 收缩回真正的共享展示层，不再承载超大 context 和伪统一模型。"
    depends_on:
      - "02-mobile-boundary-reset"
    summary: "shared shell 只保留 web 和 desktop 的真实公共交集。"
    entry_criteria:
      - "mobile 已退出 shared shell 主路径。"
    exit_criteria:
      - "shared context 没有 no-op 字段。"
      - "platform-only 扩展点不再隐藏在全局 context。"
      - "壳层专用 App* 模型层被移除或显著收缩。"
    risks:
      - "web 和 desktop provider 会出现一轮签名调整，需要谨慎分批。"
    batches:
      - id: "03-01-minimize-shared-context"
        title: "Minimize Shared Context Surface"
        kind: "code"
        execution: "codex"
        goal: "删除 AppShellContext 中不属于 web 和 desktop 共同核心的字段，把平台专属扩展改成显式 props。"
        depends_on: []
        deliverables:
          - "AppShellContextValue 只保留共享展示组件真正必需的字段。"
          - "desktop 专属扩展通过组件 props 传递，而不是挂在全局 context 上。"
          - "支持表面中不再出现 no-op context 实现。"
        acceptance:
          - "web 和 desktop provider 都不需要空函数占位。"
          - "NotesSidebar、TagInput、SettingsDropdown 等共享组件的依赖边界更直观。"
        evidence_to_capture:
          - "context 字段 before/after 对照。"
          - "被改为显式 props 的 desktop 扩展点清单。"
        verify_commands:
          - "pnpm --filter @nicenote/app-shell build"
          - "pnpm --filter @nicenote/web build"
          - "pnpm --filter @nicenote/desktop build:frontend"
          - "! rg -n \"setSelectedTag: \\(\\) => \\{\\}|addTag: \\(\\) => \\{\\}|removeTag: \\(\\) => \\{\\}\" apps/web/src apps/desktop/frontend/src packages/app-shell/src"
        files_to_touch:
          - "packages/app-shell/src/context.ts"
          - "packages/app-shell/src/types.ts"
          - "packages/app-shell/src/components/**"
          - "apps/web/src/providers/AppShellProvider.tsx"
          - "apps/desktop/frontend/src/providers/AppShellProvider.tsx"
        prompt_context:
          - "显式 props 优先于 platform extension slot。"
      - id: "03-02-remove-appshell-model-layer"
        title: "Remove App Shell Model Layer"
        kind: "code"
        execution: "codex"
        goal: "移除 app-shell 专有的 AppNoteItem、AppNoteDetail、AppSearchResult 映射层，改用 shared 类型或最小局部视图模型。"
        depends_on:
          - "03-01-minimize-shared-context"
        deliverables:
          - "App* note model 类型被删除或只剩最小必要差异。"
          - "web 和 desktop provider 不再各自维护一套大映射函数。"
          - "mapToAppSearchResults 等仅服务壳层模型的 helper 被删除或并回使用点。"
        acceptance:
          - "共享 UI 的数据形状更贴近真实源类型。"
          - "相同字段不再在 shared 和 app-shell 之间反复搬运。"
        evidence_to_capture:
          - "删除的映射函数列表。"
          - "provider 复杂度收缩说明。"
        verify_commands:
          - "pnpm --filter @nicenote/app-shell build"
          - "pnpm --filter @nicenote/web build"
          - "pnpm --filter @nicenote/desktop build:frontend"
        files_to_touch:
          - "packages/app-shell/src/types.ts"
          - "packages/app-shell/src/lib/search-utils.ts"
          - "apps/web/src/providers/AppShellProvider.tsx"
          - "apps/desktop/frontend/src/providers/AppShellProvider.tsx"
        prompt_context:
          - "如果某个共享组件只需要 title、summary、updatedAt，就直接面向该最小 shape，不要再造全局 view model。"
      - id: "03-03-remove-repository-provider-factory"
        title: "Remove Repository Provider Factory"
        kind: "code"
        execution: "codex"
        goal: "删除 createRepositoryProvider 和相关壳层导出，避免 app-shell 继续承载 service 生命周期职责。"
        depends_on:
          - "03-02-remove-appshell-model-layer"
        deliverables:
          - "packages/app-shell 中不再存在 createRepositoryProvider。"
          - "web、desktop、mobile 中不再有 repository-provider 调用链。"
        acceptance:
          - "app-shell 只保留 UI、轻量 store 工厂和必要 DOM helper。"
          - "不再通过共享壳层管理平台数据实例生命周期。"
        evidence_to_capture:
          - "被删除的 provider 工厂及调用点。"
        verify_commands:
          - "pnpm --filter @nicenote/app-shell build"
          - "! rg -n \"createRepositoryProvider|repository-provider\" apps packages"
        files_to_touch:
          - "packages/app-shell/src/lib/create-repository-provider.ts"
          - "packages/app-shell/src/index.ts"
          - "apps/**/src/adapters/repository-provider.ts"
        prompt_context:
          - "允许直接用模块级单例或局部实例，但不要再包一层 set/get/reset 工厂。"

  - id: "04-platform-path-shortening"
    title: "Shorten Web And Desktop Data Paths"
    goal: "收短 web 和 desktop 的真实修改路径，让单个需求触达更少文件和层级。"
    depends_on:
      - "03-app-shell-contraction"
    summary: "平台层各自直达自己的主数据路径，不再伪统一。"
    entry_criteria:
      - "shared shell 已经收缩。"
    exit_criteria:
      - "web 初始加载没有 N+1。"
      - "desktop 前端只保留 AppService 一条 I/O 边界。"
      - "desktop store 结构比当前 slice 组合更直接。"
    risks:
      - "web 和 desktop 的 store 改动都较集中，需要保证行为不回退。"
    batches:
      - id: "04-01-web-direct-note-path"
        title: "Make Web Note Loading Direct"
        kind: "code"
        execution: "codex"
        goal: "删除 web 当前 list 加 N 次 get 的加载方式，改成单次直接加载，并清除已死的 web repository-provider。"
        depends_on: []
        deliverables:
          - "web useNoteStore 使用单次直接加载的本地数据路径。"
          - "apps/web/src/adapters/repository-provider.ts 被删除。"
          - "selectNoteList 这类无调用导出被顺手清理。"
        acceptance:
          - "web 初始加载不再有 N+1 fanout。"
          - "web 数据路径更接近 localStorage 实际实现。"
        evidence_to_capture:
          - "旧加载路径与新加载路径的对照。"
          - "删除的死文件或死导出列表。"
        verify_commands:
          - "pnpm --filter @nicenote/web build"
          - "pnpm --filter @nicenote/web test"
          - "! test -f apps/web/src/adapters/repository-provider.ts"
        files_to_touch:
          - "apps/web/src/store/useNoteStore.ts"
          - "apps/web/src/adapters/local-storage-note-repository.ts"
          - "apps/web/src/adapters/repository-provider.ts"
        prompt_context:
          - "优先减少读取层数，其次再考虑是否完全删除 repository 类。"
      - id: "04-02-desktop-remove-repository-layer"
        title: "Remove Desktop Repository Layer"
        kind: "code"
        execution: "codex"
        goal: "在 desktop 前端彻底取消 TauriNoteRepository 和 repository-provider，统一直连 AppService。"
        depends_on:
          - "04-01-web-direct-note-path"
        deliverables:
          - "desktop 前端搜索和笔记操作不再依赖 TauriNoteRepository。"
          - "desktop repository-provider 文件被删除。"
          - "AppService 成为唯一前端 I/O 主路径。"
        acceptance:
          - "frontend 内不存在第二条桌面端数据边界。"
          - "搜索、打开、保存、重命名、删除都仍可工作。"
        evidence_to_capture:
          - "删除的 repository 文件和调用点。"
          - "desktop I/O 路径收敛说明。"
        verify_commands:
          - "pnpm --filter @nicenote/desktop build:frontend"
          - "! test -f apps/desktop/frontend/src/adapters/tauri-note-repository.ts"
          - "! test -f apps/desktop/frontend/src/adapters/repository-provider.ts"
        files_to_touch:
          - "apps/desktop/frontend/src/providers/AppShellProvider.tsx"
          - "apps/desktop/frontend/src/store/**"
          - "apps/desktop/frontend/src/adapters/tauri-note-repository.ts"
          - "apps/desktop/frontend/src/adapters/repository-provider.ts"
        prompt_context:
          - "不要用新的 search service 或 client 包替代旧 repository。"
      - id: "04-03-flatten-desktop-store"
        title: "Flatten Desktop Store Structure"
        kind: "code"
        execution: "codex"
        goal: "把 desktop 当前 slice 组合收缩成更直接的 store 结构，减少跨文件跳转。"
        depends_on:
          - "04-02-desktop-remove-repository-layer"
        deliverables:
          - "useDesktopStore 不再由五个 slice 机械拼装。"
          - "紧密相关的 note、folder、watcher、settings 逻辑合并到更少文件中。"
        acceptance:
          - "常见 desktop 需求不再需要跨多个 slice 理解流程。"
          - "store 文件数和跳转数显著下降。"
        evidence_to_capture:
          - "slice 数量 before/after。"
          - "重命名、保存、打开文件夹三条路径涉及文件数 before/after。"
        verify_commands:
          - "pnpm --filter @nicenote/desktop build:frontend"
        files_to_touch:
          - "apps/desktop/frontend/src/store/useDesktopStore.ts"
          - "apps/desktop/frontend/src/store/slices/**"
        prompt_context:
          - "这是合并，不是引入新的 store 工厂或层级。"

  - id: "05-package-pruning"
    title: "Prune Unused Packages And Runtime Contracts"
    goal: "把不再有真实收益的 domain 和 draft package 彻底收掉。"
    depends_on:
      - "04-platform-path-shortening"
    summary: "只保留被活跃表面真实消费的共享边界。"
    entry_criteria:
      - "web 和 desktop 主路径已经缩短。"
    exit_criteria:
      - "@nicenote/domain 不再承担伪 runtime 边界。"
      - "database draft adapter 和其他死代码被删除。"
      - "包图更贴近真实支持表面。"
    risks:
      - "如果 repo 外部还有未识别的包消费者，直接删 domain exports 可能带来兼容性问题。"
    batches:
      - id: "05-01-prune-domain-runtime"
        title: "Prune Domain Runtime Abstractions"
        kind: "code"
        execution: "codex"
        goal: "把 Theme、Language 等值类型收回 shared，并删除没有真实消费者的 domain 接口和契约测试导出。"
        depends_on: []
        deliverables:
          - "不再要求 app 通过 @nicenote/domain 引入纯值类型。"
          - "NoteRepository、SettingsRepository、SearchIndex 及其契约测试被删除或明确冻结为非 runtime 表面。"
        acceptance:
          - "domain 不再作为当前产品主路径的伪多态边界。"
          - "调用方导入关系更直接。"
        evidence_to_capture:
          - "domain 删除或收缩前后的导出对照。"
          - "受影响调用点清单。"
        verify_commands:
          - "pnpm typecheck"
          - "pnpm --filter @nicenote/shared typecheck"
        files_to_touch:
          - "packages/domain/src/**"
          - "packages/shared/src/**"
          - "apps/**/src/**"
          - "packages/app-shell/src/**"
        prompt_context:
          - "优先删除没有真实消费者的接口，不要把它们迁到另一个共享包继续保留。"
      - id: "05-02-delete-draft-adapters-and-dead-packages"
        title: "Delete Draft Adapters And Dead Package Surface"
        kind: "code"
        execution: "codex"
        goal: "删除 packages/database 中未实现的 adapter 抽象，并清理未被活跃表面消费的 dead exports 和依赖。"
        depends_on:
          - "05-01-prune-domain-runtime"
        deliverables:
          - "packages/database/src/adapter.ts 被删除。"
          - "packages/database/src/adapters/op-sqlite.ts 被删除。"
          - "未使用的 package exports、依赖、根引用和实验包入口被同步清理或标明 experimental。"
        acceptance:
          - "仓库不再保留明确未实现但看起来像正式架构的 adapter 壳。"
          - "活跃支持表面和 package 边界一致。"
        evidence_to_capture:
          - "被删除的 draft surface 列表。"
          - "包图收缩说明。"
        verify_commands:
          - "pnpm --filter @nicenote/database typecheck"
          - "test ! -f packages/database/src/adapter.ts"
          - "test ! -f packages/database/src/adapters/op-sqlite.ts"
        files_to_touch:
          - "packages/database/src/**"
          - "packages/*/package.json"
          - "tsconfig.json"
        prompt_context:
          - "删除优先于保留 TODO 壳；如果某个实验包保留，必须在文档和 tsconfig 中明确其实验状态。"

  - id: "99-verification"
    title: "Verify And Lock In"
    goal: "确认简化真的降低维护成本，并把结果固定成可持续的工程规则。"
    depends_on:
      - "05-package-pruning"
    summary: "先跑全量支持表面验证，再补齐 before/after 证据。"
    entry_criteria:
      - "所有结构收缩 batch 已完成。"
    exit_criteria:
      - "支持表面验证通过。"
      - "before/after 指标已落档。"
      - "剩余 experimental 表面已经列清。"
    risks:
      - "如果验证只看编译不看路径收缩，很容易‘功能没坏但复杂度没降’。"
    batches:
      - id: "99-01-supported-surface-regression"
        title: "Run Supported Surface Regression"
        kind: "verification"
        execution: "codex"
        goal: "对当前 supported 表面执行完整回归验证，确认减法没有引入回归。"
        depends_on: []
        deliverables:
          - "web、desktop、shared packages 的回归验证结果。"
          - "失败项和修复结果清单。"
        acceptance:
          - "支持表面的 lint、typecheck、test、build 都通过。"
          - "不再依赖 experimental 表面的隐藏前提。"
        evidence_to_capture:
          - "验证命令输出摘要。"
          - "若有补修，记录补修批次。"
        verify_commands:
          - "pnpm lint"
          - "pnpm typecheck"
          - "pnpm test"
          - "pnpm build"
        files_to_touch:
          - "apps/web/**"
          - "apps/desktop/**"
          - "packages/**"
        prompt_context:
          - "不要在这个 batch 顺手做新重构；只修复回归。"
      - id: "99-02-capture-post-rollout-evidence"
        title: "Capture Post-Rollout Evidence"
        kind: "docs"
        execution: "codex"
        goal: "把 before/after 指标、剩余风险和后续 experimental 路线固定成最终证据文档。"
        depends_on:
          - "99-01-supported-surface-regression"
        deliverables:
          - ".runners/2026-04-23-project-simplification/verification.md"
          - "文档中包含路径缩短结果、已删除结构、剩余 experimental 表面、后续不做事项。"
        acceptance:
          - "可以直接回答‘这轮减法到底减少了什么’。"
          - "后续团队不需要重新做一次同样的诊断。"
        evidence_to_capture:
          - "before/after 指标表。"
          - "剩余风险与后续非目标清单。"
        verify_commands:
          - "test -f .runners/2026-04-23-project-simplification/verification.md"
          - "rg -n \"desktop_search_paths|noop_context_fields|web_load_fanout|supported_surface|experimental_surface\" .runners/2026-04-23-project-simplification/verification.md"
        files_to_touch:
          - ".runners/2026-04-23-project-simplification/verification.md"
        prompt_context:
          - "这份文档是交付证明，不是新的大 spec。"
```
<!-- rollout-plan:end -->

## Manual Checkpoints

这些事项暂时不要放进 runner：

- 在 `01-02-remove-phantom-desktop-state` 之前，确认 desktop 当前的 `favorites` / `folder-tree` 占位导航是否直接删除，而不是转成待实现功能。
- 在 `05-01-prune-domain-runtime` 之前，确认没有 repo 外部消费者依赖 `@nicenote/domain` 的当前导出。
- 在尝试连续执行后续 phase 之前，先完成 `00-baseline`，并确认 mobile 的最终策略是“继续 experimental”还是“进入 supported”。

## Why This Phase Shape

### 00-baseline

- 先固定证据和边界，避免后续简化工作重新滑回“也许以后会复用”的论证。

### 01-stop-bleeding

- 先砍掉最明显的双路径和死状态，立刻降低改动和调试成本。

### 02-mobile-boundary-reset

- 先把 mobile 从伪统一运行时里拆出来，后面收缩 `app-shell` 才不会被实验表面牵制。

### 03-app-shell-contraction

- 把共享层收回到展示复用，而不是继续充当全局数据壳。

### 04-platform-path-shortening

- web 和 desktop 各自回到自己的最短业务路径，不再为了统一而叠层。

### 05-package-pruning

- 当前主路径稳定后，再删掉 `domain` 和 draft package 表面的伪架构，风险更低。

### 99-verification

- 最后必须用 before/after 证据证明“复杂度真的降了”，而不是只证明“还能跑”。

## Runner Decision

当前状态：`rollout.py` 已生成，位置为 `.runners/2026-04-23-project-simplification/rollout.py`。

runner 只覆盖仓库内可自动执行的 batch；以下条件仍然建议在开始连续执行后续 phase 之前满足：

- `00-baseline` 已落地，且基线指标稳定。
- desktop 占位导航的删除策略已确认。
- mobile 的 supported / experimental 结论不再摇摆。
- `05-package-pruning` 之前的批次已经把主要结构风险清掉。
