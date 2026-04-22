#!/usr/bin/env python3
# 用法:
#   python3 rollout.py --list
#   python3 rollout.py [--from-phase PHASE_ID | --from-batch BATCH_ID | --only-phase PHASE_ID [PHASE_ID ...] | --only-batch BATCH_ID [BATCH_ID ...]]
#                      [--force] [--dry-run] [--commit-per-batch] [--codex-cmd CMD] [--model MODEL]
#                      [--reset-batch BATCH_ID] [--max-fix-attempts N] [--allow-dirty]
# 参数说明:
#   --list                  列出所有 phase 和 batch 的当前状态，不执行 rollout。
#   --from-phase PHASE_ID   从指定 phase 开始执行，并包含其后的所有 phase。
#   --from-batch BATCH_ID   从指定 batch 开始执行，并包含其后的所有 batch。
#   --only-phase ...        只执行这些 phase，并自动补齐它们依赖的 phase。
#   --only-batch ...        只执行这些 batch。
#   --force                 即使 batch 已经完成，也强制重新执行。
#   --dry-run               只生成 prompt 和日志路径，不调用 Codex CLI。
#   --commit-per-batch      每个 batch 成功后自动提交一次 git commit。
#   --codex-cmd CMD         覆盖默认的 Codex CLI 命令模板。
#   --model MODEL           覆盖 rollout 计划里的模型配置。
#   --reset-batch BATCH_ID  将指定 batch 的状态重置为 pending。
#   --max-fix-attempts N    覆盖计划里的最大自动修复重试次数。
#   --allow-dirty           允许在 git 脏工作区里执行。
from __future__ import annotations

import argparse
import dataclasses
import json
import shlex
import shutil
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path


PLAN_JSON = "{\"rollout\": {\"name\": \"nicenote-project-simplification\", \"repo_root\": \"/home/afu/dev/NiceNote\", \"workdir\": \".runners/2026-04-23-project-simplification\", \"codex_cmd\": null, \"model\": null, \"max_fix_attempts\": 1, \"allow_dirty\": false, \"commit_per_batch\": false, \"sources_of_truth\": [\"AGENTS.md\", \".docs/PLAN-desktop-tauri.md\", \".docs/PRD-desktop.md\"], \"planning_notes\": [\"\u672c\u6b21\u5de5\u4f5c\u4f18\u5148\u505a\u51cf\u6cd5\uff0c\u4e0d\u4fdd\u7559\u4f4e\u4ef7\u503c\u517c\u5bb9\u5c42\u3002\", \"web \u548c desktop \u662f\u5f53\u524d\u6d3b\u8dc3\u652f\u6301\u8868\u9762\uff1bmobile \u4ecd\u662f\u5b9e\u9a8c\u6027\u8868\u9762\uff0c\u9664\u975e\u67d0\u4e2a batch \u660e\u786e\u63d0\u5347\u5176\u72b6\u6001\u3002\", \"\u5171\u4eab\u62bd\u8c61\u5fc5\u987b\u7531\u5f53\u524d\u771f\u5b9e\u8c03\u7528\u5012\u903c\u4ea7\u751f\uff0c\u800c\u4e0d\u662f\u4e3a\u672a\u6765\u53ef\u80fd\u6027\u9884\u57cb\u3002\"], \"success_metrics\": [\"desktop \u641c\u7d22\u524d\u7aef\u5b9e\u73b0\u8def\u5f84\u4ece\u4e24\u6761\u6536\u7f29\u4e3a\u4e00\u6761\u3002\", \"\u652f\u6301\u8868\u9762\u4e2d\u7684\u5171\u4eab context \u4e0d\u518d\u5305\u542b no-op \u5b57\u6bb5\u3002\", \"web \u521d\u59cb\u7b14\u8bb0\u52a0\u8f7d\u4e0d\u518d\u6267\u884c list \u52a0\u6bcf\u6761\u7b14\u8bb0\u7684\u4e8c\u6b21\u8bfb\u53d6\u3002\", \"root typecheck \u548c\u6b63\u5f0f\u652f\u6301\u7684 app/package \u8868\u9762\u4e00\u81f4\u3002\"], \"global_context\": [\"NiceNote \u662f pnpm monorepo\uff0c\u5f53\u524d\u4e3b\u8981\u6d3b\u8dc3\u8868\u9762\u4e3a web \u548c Tauri desktop\u3002\", \"desktop \u524d\u7aef\u5e94\u4ee5 AppService \u4f5c\u4e3a\u552f\u4e00\u524d\u7aef I/O \u8fb9\u754c\uff0c\u4e0d\u518d\u989d\u5916\u53e0\u52a0 repository provider\u3002\", \"\u6ce8\u91ca\u4fdd\u6301\u4e2d\u6587\uff0cdesktop \u7aef\u4ecd\u575a\u6301\u6587\u4ef6\u7cfb\u7edf\u662f\u7b14\u8bb0\u552f\u4e00\u6570\u636e\u6e90\uff0cMarkdown \u662f\u552f\u4e00\u5b58\u50a8\u683c\u5f0f\u3002\", \"\u5171\u4eab\u5305\u7684\u76ee\u6807\u662f\u51cf\u5c11\u771f\u5b9e\u91cd\u590d\uff0c\u4e0d\u662f\u5236\u9020\u989d\u5916\u7684\u7edf\u4e00\u5c42\u3002\"], \"hard_rules\": [\"\u4f18\u5148\u5220\u9664\u3001\u5408\u5e76\u3001\u5185\u8054\uff0c\u4e0d\u8981\u4e3a\u4fdd\u7559\u65e7\u7ed3\u6784\u65b0\u589e facade\u3001adapter\u3001manager \u6216\u517c\u5bb9\u5c42\u3002\", \"\u6ca1\u6709\u4e24\u4e2a\u6d3b\u8dc3\u652f\u6301\u8868\u9762\u540c\u65f6\u9700\u8981\u7684\u62bd\u8c61\uff0c\u4e0d\u8981\u4e0a\u5171\u4eab\u5c42\u3002\", \"desktop \u524d\u7aef\u4e0d\u5f97\u91cd\u65b0\u5f15\u5165 AppService \u4e4b\u5916\u7684\u7b2c\u4e8c\u6761 I/O \u4e3b\u8def\u5f84\u3002\", \"mobile \u76f8\u5173\u6539\u52a8\u5fc5\u987b\u660e\u786e\u6807\u6ce8\u4e3a experimental \u6216 supported\uff0c\u4e0d\u80fd\u7ef4\u6301\u6a21\u7cca\u4e2d\u95f4\u6001\u3002\", \"\u6bcf\u4e2a batch \u53ea\u5b8c\u6210\u5f53\u524d\u76ee\u6807\u548c\u901a\u8fc7\u9a8c\u6536\u6240\u5fc5\u9700\u7684\u6539\u52a8\u3002\", \"\u6267\u884c batch \u524d\u540e\u90fd\u8981\u8fd0\u884c\u5217\u51fa\u7684\u9a8c\u8bc1\u547d\u4ee4\u3002\"], \"batch_prompt_suffix\": [\"\u53ea\u5b8c\u6210\u5f53\u524d batch \u548c\u8ba9\u5b83\u901a\u8fc7\u9a8c\u8bc1\u6240\u5fc5\u9700\u7684\u6700\u5c0f\u6539\u52a8\u3002\"]}, \"phases\": [{\"id\": \"00-baseline\", \"title\": \"Baseline And Guardrails\", \"goal\": \"\u628a\u5f53\u524d\u590d\u6742\u5ea6\u8bc1\u636e\u3001\u652f\u6301\u8fb9\u754c\u548c\u51cf\u6cd5\u89c4\u5219\u56fa\u5b9a\u4e0b\u6765\uff0c\u907f\u514d\u540e\u7eed\u8fb9\u6539\u8fb9\u6f02\u79fb\u3002\", \"depends_on\": [], \"summary\": \"\u5148\u56fa\u5316\u8bc1\u636e\u548c\u7ea6\u675f\uff0c\u518d\u5f00\u59cb\u5220\u9664\u7ed3\u6784\u3002\", \"entry_criteria\": [\"\u73b0\u6709\u5ba1\u67e5\u7ed3\u8bba\u5df2\u7ecf\u660e\u786e P0 \u548c P1 \u70ed\u70b9\u3002\"], \"exit_criteria\": [\"\u6709\u53ef\u5bf9\u6bd4\u7684\u57fa\u7ebf\u8bc1\u636e\u3002\", \"\u652f\u6301\u8868\u9762\u548c\u5b9e\u9a8c\u8868\u9762\u5df2\u7ecf\u5199\u6e05\u3002\", \"\u56e2\u961f\u540e\u7eed batch \u6709\u7edf\u4e00\u51cf\u6cd5\u89c4\u5219\u53ef\u9075\u5faa\u3002\"], \"risks\": [\"\u5982\u679c\u652f\u6301\u8fb9\u754c\u4e0d\u5148\u5199\u6e05\uff0c\u540e\u7eed\u6bcf\u4e2a batch \u90fd\u4f1a\u4e89\u8bba\u662f\u5426\u8981\u7ee7\u7eed\u517c\u5bb9 mobile \u6216 domain \u62bd\u8c61\u3002\"], \"batches\": [{\"id\": \"00-01-baseline-evidence\", \"title\": \"Capture Baseline Evidence\", \"kind\": \"analysis\", \"execution\": \"codex\", \"goal\": \"\u628a\u5f53\u524d\u8fc7\u5ea6\u8bbe\u8ba1\u7684\u53ef\u91cf\u5316\u8bc1\u636e\u843d\u6210\u6587\u6863\uff0c\u4f5c\u4e3a\u540e\u7eed\u9a8c\u8bc1\u57fa\u7ebf\u3002\", \"depends_on\": [], \"deliverables\": [\".runners/2026-04-23-project-simplification/baseline.md\", \"\u57fa\u7ebf\u7edf\u8ba1\u81f3\u5c11\u8986\u76d6 desktop \u641c\u7d22\u8def\u5f84\u3001context no-op \u5b57\u6bb5\u3001\u6d3b\u8dc3 runtime \u6b7b\u6a21\u5757\u3001web \u521d\u59cb\u52a0\u8f7d fanout\u3001root \u8d28\u91cf\u95e8\u7981\u8986\u76d6\u5dee\u5f02\u3002\"], \"acceptance\": [\"\u6bcf\u4e2a P0/P1 \u70ed\u70b9\u90fd\u6709\u53ef\u590d\u67e5\u7684\u4ee3\u7801\u8bc1\u636e\u548c\u8ba1\u6570\u3002\", \"\u540e\u7eed phase \u7684\u6210\u529f\u6307\u6807\u90fd\u80fd\u5bf9\u7167\u8fd9\u4efd\u57fa\u7ebf\u3002\"], \"evidence_to_capture\": [\"\u5173\u952e rg \u8f93\u51fa\u3001\u6587\u4ef6\u8def\u5f84\u3001\u8c03\u7528\u94fe\u8bf4\u660e\u3002\", \"\u4e00\u4efd before \u72b6\u6001\u8868\u683c\u3002\"], \"verify_commands\": [\"test -f .runners/2026-04-23-project-simplification/baseline.md\", \"rg -n \\\"desktop_search_paths|noop_context_fields|dead_runtime_modules|web_load_fanout|root_quality_gate_surface\\\" .runners/2026-04-23-project-simplification/baseline.md\"], \"files_to_touch\": [\".runners/2026-04-23-project-simplification/baseline.md\"], \"prompt_context\": [\"\u4e0d\u8981\u53ea\u5199\u539f\u5219\uff0c\u5fc5\u987b\u5f15\u7528\u771f\u5b9e\u6587\u4ef6\u8def\u5f84\u548c\u8c03\u7528\u94fe\u3002\"]}, {\"id\": \"00-02-support-matrix\", \"title\": \"Write Support Matrix And Guardrails\", \"kind\": \"docs\", \"execution\": \"codex\", \"goal\": \"\u660e\u786e\u54ea\u4e9b app/package \u5904\u4e8e supported\uff0c\u54ea\u4e9b\u5904\u4e8e experimental\uff0c\u4ee5\u53ca\u5171\u4eab\u62bd\u8c61\u7684\u51c6\u5165\u89c4\u5219\u3002\", \"depends_on\": [\"00-01-baseline-evidence\"], \"deliverables\": [\".docs/simplification-guardrails.md\", \"\u6587\u6863\u4e2d\u5199\u6e05 web\u3001desktop\u3001mobile\u3001domain\u3001app-shell\u3001database\u3001ui-native\u3001editor-bridge \u7684\u5f53\u524d\u72b6\u6001\u548c\u51c6\u5165\u6807\u51c6\u3002\"], \"acceptance\": [\"\u540e\u7eed\u4ee3\u7801 batch \u53ef\u4ee5\u76f4\u63a5\u5f15\u7528\u8be5\u6587\u6863\u5224\u65ad\u662f\u5426\u4fdd\u7559\u6216\u5220\u9664\u67d0\u5c42\u62bd\u8c61\u3002\", \"\u6587\u6863\u660e\u786e\u5199\u51fa\u2018\u6ca1\u6709\u4e24\u4e2a\u6d3b\u8dc3\u652f\u6301\u8868\u9762\uff0c\u4e0d\u65b0\u589e\u5171\u4eab\u62bd\u8c61\u2019\u3002\"], \"evidence_to_capture\": [\"\u652f\u6301\u8868\u9762\u5217\u8868\u3002\", \"\u5b9e\u9a8c\u8868\u9762\u5217\u8868\u3002\", \"\u5171\u4eab\u62bd\u8c61\u51c6\u5165\u6807\u51c6\u3002\"], \"verify_commands\": [\"test -f .docs/simplification-guardrails.md\", \"rg -n \\\"supported surfaces|experimental surfaces|shared abstraction|no compatibility shim\\\" .docs/simplification-guardrails.md\"], \"files_to_touch\": [\".docs/simplification-guardrails.md\"], \"prompt_context\": [\"\u8fd9\u91cc\u5148\u5199\u89c4\u5219\uff0c\u4e0d\u8981\u63d0\u524d\u5b9e\u73b0\u5927\u89c4\u6a21\u4ee3\u7801\u6539\u52a8\u3002\"]}]}, {\"id\": \"01-stop-bleeding\", \"title\": \"Stop The Worst Path Inflation\", \"goal\": \"\u5148\u6536\u6389\u6700\u660e\u663e\u7684\u53cc\u8def\u5f84\u548c\u7a7a\u8f6c\u72b6\u6001\uff0c\u7acb\u523b\u964d\u4f4e\u8c03\u8bd5\u6210\u672c\u3002\", \"depends_on\": [\"00-baseline\"], \"summary\": \"\u4f18\u5148\u5904\u7406 desktop \u641c\u7d22\u53cc\u5b9e\u73b0\u548c\u65e0\u884c\u4e3a\u72b6\u6001\u3002\", \"entry_criteria\": [\"00-baseline \u5b8c\u6210\uff0c\u652f\u6301\u77e9\u9635\u5df2\u56fa\u5b9a\u3002\"], \"exit_criteria\": [\"desktop \u641c\u7d22\u53ea\u5269\u4e00\u6761\u4e3b\u8def\u5f84\u3002\", \"\u660e\u663e\u7684\u65e0\u884c\u4e3a desktop \u72b6\u6001\u88ab\u5220\u9664\u6216\u4e0b\u6c89\u4e3a\u5c40\u90e8\u72b6\u6001\u3002\"], \"risks\": [\"\u5982\u679c desktop \u5360\u4f4d\u5bfc\u822a\u5176\u5b9e\u88ab\u4ea7\u54c1\u89c6\u4e3a\u5373\u5c06\u4e0a\u7ebf\u529f\u80fd\uff0c\u9700\u8981\u5148\u786e\u8ba4\u662f\u5220\u9664\u800c\u4e0d\u662f\u8865\u5b9e\u73b0\u3002\"], \"batches\": [{\"id\": \"01-01-desktop-search-collapse\", \"title\": \"Collapse Desktop Search To One Path\", \"kind\": \"code\", \"execution\": \"codex\", \"goal\": \"\u5220\u9664 desktop searchSlice \u4e2d\u672a\u88ab UI \u6d88\u8d39\u7684\u641c\u7d22\u72b6\u6001\u548c repo \u641c\u7d22\u8def\u5f84\uff0c\u7edf\u4e00\u4e3a\u5355\u4e00\u5b9e\u73b0\u3002\", \"depends_on\": [], \"deliverables\": [\"desktop \u641c\u7d22\u4e0d\u518d\u540c\u65f6\u5b58\u5728 searchSlice \u72b6\u6001\u548c provider \u641c\u7d22\u8def\u5f84\u3002\", \"\u641c\u7d22\u67e5\u8be2\u6267\u884c\u7edf\u4e00\u76f4\u8fde AppService.searchNotes \u6216\u7b49\u4ef7\u7684\u5355\u4e00\u8def\u5f84\u3002\"], \"acceptance\": [\"desktop \u641c\u7d22\u53ea\u6709\u4e00\u6761\u53ef\u89e3\u91ca\u7684\u6570\u636e\u6d41\u3002\", \"SearchDialog \u4ecd\u53ef\u6b63\u5e38\u641c\u7d22\u548c\u9009\u4e2d\u7ed3\u679c\u3002\", \"useDesktopStore \u4e0d\u518d\u4fdd\u7559\u672a\u6d88\u8d39\u7684 searchQuery\u3001searchResults\u3001isSearching\u3001search \u65b9\u6cd5\u3002\"], \"evidence_to_capture\": [\"\u5220\u9664\u5b57\u6bb5\u548c\u8c03\u7528\u94fe\u524d\u540e\u7684\u5bf9\u7167\u3002\", \"\u524d\u7aef\u641c\u7d22\u8def\u5f84\u6570\u91cf\u4ece 2 \u964d\u5230 1 \u7684\u8bf4\u660e\u3002\"], \"verify_commands\": [\"pnpm --filter @nicenote/desktop build:frontend\", \"! rg -n \\\"searchResults:|isSearching:|searchQuery:|search: async\\\" apps/desktop/frontend/src/store/slices/searchSlice.ts\"], \"files_to_touch\": [\"apps/desktop/frontend/src/App.tsx\", \"apps/desktop/frontend/src/providers/AppShellProvider.tsx\", \"apps/desktop/frontend/src/store/slices/searchSlice.ts\", \"apps/desktop/frontend/src/store/useDesktopStore.ts\"], \"prompt_context\": [\"\u4e0d\u8981\u65b0\u589e\u65b0\u7684 search service \u6216 helper\u3002\"]}, {\"id\": \"01-02-remove-phantom-desktop-state\", \"title\": \"Remove Phantom Desktop View State\", \"kind\": \"code\", \"execution\": \"codex\", \"goal\": \"\u5220\u9664\u5f53\u524d\u6ca1\u6709\u771f\u5b9e\u884c\u4e3a\u627f\u8f7d\u7684 desktop \u5bfc\u822a\u6269\u5c55\u72b6\u6001\uff0c\u5e76\u628a\u6807\u7b7e\u7b5b\u9009\u72b6\u6001\u6536\u56de\u66f4\u63a5\u8fd1 UI \u7684\u4f4d\u7f6e\u3002\", \"depends_on\": [\"01-01-desktop-search-collapse\"], \"deliverables\": [\"\u65e0\u884c\u4e3a\u7684 currentView\u3001selectedTag\u3001extraNavItems\u3001noteListItemSlots \u88ab\u5220\u9664\u6216\u8f6c\u4e3a\u663e\u5f0f\u5c40\u90e8 props\u3002\", \"NotesSidebar \u5185\u90e8\u4e0d\u518d\u4f9d\u8d56\u5168\u5c40 selectedTag \u5f71\u5b50\u72b6\u6001\u3002\"], \"acceptance\": [\"desktop \u4e0d\u518d\u7ef4\u62a4\u53ea\u6709\u9ad8\u4eae\u6548\u679c\u4f46\u6ca1\u6709\u771f\u5b9e\u529f\u80fd\u7684\u89c6\u56fe\u72b6\u6001\u3002\", \"\u6807\u7b7e\u7b5b\u9009\u7684\u72b6\u6001\u6240\u6709\u6743\u53ef\u76f4\u63a5\u4ece\u4f7f\u7528\u70b9\u770b\u61c2\u3002\"], \"evidence_to_capture\": [\"\u88ab\u5220\u9664\u7684 dead state \u5217\u8868\u3002\", \"sidebar \u8fc7\u6ee4\u72b6\u6001\u5f52\u5c5e\u8bf4\u660e\u3002\"], \"verify_commands\": [\"pnpm --filter @nicenote/desktop build:frontend\", \"! rg -n \\\"currentView|selectedTag|extraNavItems|noteListItemSlots\\\" apps/desktop/frontend/src packages/app-shell/src/components/NotesSidebar.tsx packages/app-shell/src/context.ts\"], \"files_to_touch\": [\"apps/desktop/frontend/src/providers/AppShellProvider.tsx\", \"apps/desktop/frontend/src/store/slices/settingsSlice.ts\", \"packages/app-shell/src/components/NotesSidebar.tsx\", \"packages/app-shell/src/context.ts\", \"packages/app-shell/src/types.ts\"], \"prompt_context\": [\"\u9ed8\u8ba4\u7b56\u7565\u662f\u5220\u9664\u5360\u4f4d\u529f\u80fd\uff0c\u4e0d\u662f\u8865\u5168 favorites \u6216 folder-tree \u9875\u9762\u3002\"]}]}, {\"id\": \"02-mobile-boundary-reset\", \"title\": \"Reset Mobile To Experimental Boundary\", \"goal\": \"\u628a mobile \u4ece\u5047\u7edf\u4e00\u67b6\u6784\u91cc\u62c6\u51fa\u6765\uff0c\u6062\u590d\u4e3a\u6e05\u6670\u7684\u5b9e\u9a8c\u6027\u8868\u9762\u3002\", \"depends_on\": [\"01-stop-bleeding\"], \"summary\": \"\u5148\u628a\u672a\u843d\u5730\u7684 runtime \u67b6\u6784\u9000\u51fa\u4e3b\u8def\u5f84\uff0c\u518d\u8c08\u672a\u6765\u662f\u5426\u91cd\u5efa\u5171\u4eab\u3002\", \"entry_criteria\": [\"shared shell \u7684 P0 \u566a\u97f3\u5df2\u7ecf\u5f00\u59cb\u6536\u7f29\u3002\"], \"exit_criteria\": [\"mobile \u4e0d\u518d\u4f9d\u8d56\u65e0\u771f\u5b9e\u6536\u76ca\u7684 shared shell runtime\u3002\", \"mobile \u76f8\u5173\u6b7b provider/store/package \u6709\u660e\u786e\u53bb\u7559\u3002\"], \"risks\": [\"\u5982\u679c\u540e\u7eed\u9a6c\u4e0a\u8981\u505a mobile \u6b63\u5f0f\u529f\u80fd\uff0c\u5220\u9664\u8fc7\u591a\u4e2d\u95f4\u5c42\u4f1a\u8ba9\u77ed\u671f diff \u53d8\u5927\u3002\"], \"batches\": [{\"id\": \"02-01-detach-mobile-runtime-shell\", \"title\": \"Detach Mobile Runtime From App Shell\", \"kind\": \"code\", \"execution\": \"codex\", \"goal\": \"\u79fb\u9664 MobileAppShellProvider \u548c repository-provider \u5bf9\u5f53\u524d mobile \u8fd0\u884c\u65f6\u7684\u5305\u88f9\uff0c\u4fdd\u7559\u6700\u5c0f\u53ef\u8fd0\u884c\u5165\u53e3\u3002\", \"depends_on\": [], \"deliverables\": [\"apps/mobile/src/App.tsx \u4e0d\u518d\u5305\u88f9 MobileAppShellProvider\u3002\", \"\u672a\u88ab screen \u4f7f\u7528\u7684 mobile repository-provider \u4ece\u8fd0\u884c\u65f6\u4e3b\u8def\u5f84\u9000\u51fa\u3002\"], \"acceptance\": [\"\u5f53\u524d mobile app \u4ecd\u80fd\u4ee5\u6700\u5c0f\u5bfc\u822a\u58f3\u8fd0\u884c\u3002\", \"\u4e0d\u518d\u4e3a\u4e86\u8fd8\u6ca1\u843d\u5730\u7684\u5171\u4eab UI \u7ef4\u6301 provider \u6811\u3002\"], \"evidence_to_capture\": [\"\u5220\u9664\u7684 provider \u548c\u8c03\u7528\u5165\u53e3\u3002\", \"mobile \u8fd0\u884c\u65f6\u4f9d\u8d56\u56fe\u6536\u7f29\u8bf4\u660e\u3002\"], \"verify_commands\": [\"pnpm --filter @nicenote/mobile exec tsc --noEmit -p tsconfig.json\", \"! rg -n \\\"MobileAppShellProvider|initRepository\\\\(|getRepository\\\\(\\\" apps/mobile/src/App.tsx apps/mobile/src\"], \"files_to_touch\": [\"apps/mobile/src/App.tsx\", \"apps/mobile/src/providers/MobileAppShellProvider.tsx\", \"apps/mobile/src/adapters/repository-provider.ts\"], \"prompt_context\": [\"\u4e0d\u8981\u4e3a\u4e86\u8fc7\u6e21\u91cd\u65b0\u5f15\u5165\u4e00\u4e2a\u66f4\u5c0f\u7684 mobile shell provider\u3002\"]}, {\"id\": \"02-02-prune-mobile-dead-structure\", \"title\": \"Prune Mobile Dead Stores And Experimental Surface\", \"kind\": \"code\", \"execution\": \"codex\", \"goal\": \"\u5220\u9664\u5f53\u524d mobile \u4e2d\u6ca1\u6709 screen \u6d88\u8d39\u7684 store \u548c\u5bfc\u51fa\uff0c\u660e\u786e experimental \u8fb9\u754c\u3002\", \"depends_on\": [\"02-01-detach-mobile-runtime-shell\"], \"deliverables\": [\"\u672a\u88ab screen \u4f7f\u7528\u7684 mobile store\u3001provider\u3001index re-export \u88ab\u5220\u9664\u6216\u79fb\u51fa\u6d3b\u8dc3\u8868\u9762\u3002\", \"root tsconfig \u548c\u652f\u6301\u77e9\u9635\u4e0e mobile experimental \u72b6\u6001\u4fdd\u6301\u4e00\u81f4\u3002\"], \"acceptance\": [\"mobile \u4ee3\u7801\u6811\u53ea\u4fdd\u7559\u5f53\u524d screen \u771f\u6b63\u4f1a\u8d70\u5230\u7684\u7ed3\u6784\u3002\", \"\u6839\u8d28\u91cf\u95e8\u7981\u5bf9 mobile \u7684\u8986\u76d6\u7b56\u7565\u6709\u660e\u786e\u7ed3\u8bba\u5e76\u5df2\u6587\u6863\u5316\u3002\"], \"evidence_to_capture\": [\"\u5220\u9664\u7684\u6b7b store/module \u5217\u8868\u3002\", \"supported \u4e0e experimental \u7684\u6700\u7ec8\u77e9\u9635\u3002\"], \"verify_commands\": [\"pnpm --filter @nicenote/mobile exec tsc --noEmit -p tsconfig.json\", \"rg -n \\\"experimental\\\" .docs/simplification-guardrails.md\"], \"files_to_touch\": [\"apps/mobile/src/store/**\", \"apps/mobile/src/providers/**\", \"apps/mobile/src/navigation/**\", \"tsconfig.json\", \".docs/simplification-guardrails.md\"], \"prompt_context\": [\"\u5982\u679c\u67d0\u4e2a mobile store \u53ea\u662f\u4e3a\u672a\u6765\u529f\u80fd\u9884\u7559\u4e14\u5f53\u524d screen \u4e0d\u6d88\u8d39\uff0c\u4f18\u5148\u5220\u9664\u3002\"]}]}, {\"id\": \"03-app-shell-contraction\", \"title\": \"Contract The Shared Shell\", \"goal\": \"\u628a app-shell \u6536\u7f29\u56de\u771f\u6b63\u7684\u5171\u4eab\u5c55\u793a\u5c42\uff0c\u4e0d\u518d\u627f\u8f7d\u8d85\u5927 context \u548c\u4f2a\u7edf\u4e00\u6a21\u578b\u3002\", \"depends_on\": [\"02-mobile-boundary-reset\"], \"summary\": \"shared shell \u53ea\u4fdd\u7559 web \u548c desktop \u7684\u771f\u5b9e\u516c\u5171\u4ea4\u96c6\u3002\", \"entry_criteria\": [\"mobile \u5df2\u9000\u51fa shared shell \u4e3b\u8def\u5f84\u3002\"], \"exit_criteria\": [\"shared context \u6ca1\u6709 no-op \u5b57\u6bb5\u3002\", \"platform-only \u6269\u5c55\u70b9\u4e0d\u518d\u9690\u85cf\u5728\u5168\u5c40 context\u3002\", \"\u58f3\u5c42\u4e13\u7528 App* \u6a21\u578b\u5c42\u88ab\u79fb\u9664\u6216\u663e\u8457\u6536\u7f29\u3002\"], \"risks\": [\"web \u548c desktop provider \u4f1a\u51fa\u73b0\u4e00\u8f6e\u7b7e\u540d\u8c03\u6574\uff0c\u9700\u8981\u8c28\u614e\u5206\u6279\u3002\"], \"batches\": [{\"id\": \"03-01-minimize-shared-context\", \"title\": \"Minimize Shared Context Surface\", \"kind\": \"code\", \"execution\": \"codex\", \"goal\": \"\u5220\u9664 AppShellContext \u4e2d\u4e0d\u5c5e\u4e8e web \u548c desktop \u5171\u540c\u6838\u5fc3\u7684\u5b57\u6bb5\uff0c\u628a\u5e73\u53f0\u4e13\u5c5e\u6269\u5c55\u6539\u6210\u663e\u5f0f props\u3002\", \"depends_on\": [], \"deliverables\": [\"AppShellContextValue \u53ea\u4fdd\u7559\u5171\u4eab\u5c55\u793a\u7ec4\u4ef6\u771f\u6b63\u5fc5\u9700\u7684\u5b57\u6bb5\u3002\", \"desktop \u4e13\u5c5e\u6269\u5c55\u901a\u8fc7\u7ec4\u4ef6 props \u4f20\u9012\uff0c\u800c\u4e0d\u662f\u6302\u5728\u5168\u5c40 context \u4e0a\u3002\", \"\u652f\u6301\u8868\u9762\u4e2d\u4e0d\u518d\u51fa\u73b0 no-op context \u5b9e\u73b0\u3002\"], \"acceptance\": [\"web \u548c desktop provider \u90fd\u4e0d\u9700\u8981\u7a7a\u51fd\u6570\u5360\u4f4d\u3002\", \"NotesSidebar\u3001TagInput\u3001SettingsDropdown \u7b49\u5171\u4eab\u7ec4\u4ef6\u7684\u4f9d\u8d56\u8fb9\u754c\u66f4\u76f4\u89c2\u3002\"], \"evidence_to_capture\": [\"context \u5b57\u6bb5 before/after \u5bf9\u7167\u3002\", \"\u88ab\u6539\u4e3a\u663e\u5f0f props \u7684 desktop \u6269\u5c55\u70b9\u6e05\u5355\u3002\"], \"verify_commands\": [\"pnpm --filter @nicenote/app-shell build\", \"pnpm --filter @nicenote/web build\", \"pnpm --filter @nicenote/desktop build:frontend\", \"! rg -n \\\"setSelectedTag: \\\\(\\\\) => \\\\{\\\\}|addTag: \\\\(\\\\) => \\\\{\\\\}|removeTag: \\\\(\\\\) => \\\\{\\\\}\\\" apps/web/src apps/desktop/frontend/src packages/app-shell/src\"], \"files_to_touch\": [\"packages/app-shell/src/context.ts\", \"packages/app-shell/src/types.ts\", \"packages/app-shell/src/components/**\", \"apps/web/src/providers/AppShellProvider.tsx\", \"apps/desktop/frontend/src/providers/AppShellProvider.tsx\"], \"prompt_context\": [\"\u663e\u5f0f props \u4f18\u5148\u4e8e platform extension slot\u3002\"]}, {\"id\": \"03-02-remove-appshell-model-layer\", \"title\": \"Remove App Shell Model Layer\", \"kind\": \"code\", \"execution\": \"codex\", \"goal\": \"\u79fb\u9664 app-shell \u4e13\u6709\u7684 AppNoteItem\u3001AppNoteDetail\u3001AppSearchResult \u6620\u5c04\u5c42\uff0c\u6539\u7528 shared \u7c7b\u578b\u6216\u6700\u5c0f\u5c40\u90e8\u89c6\u56fe\u6a21\u578b\u3002\", \"depends_on\": [\"03-01-minimize-shared-context\"], \"deliverables\": [\"App* note model \u7c7b\u578b\u88ab\u5220\u9664\u6216\u53ea\u5269\u6700\u5c0f\u5fc5\u8981\u5dee\u5f02\u3002\", \"web \u548c desktop provider \u4e0d\u518d\u5404\u81ea\u7ef4\u62a4\u4e00\u5957\u5927\u6620\u5c04\u51fd\u6570\u3002\", \"mapToAppSearchResults \u7b49\u4ec5\u670d\u52a1\u58f3\u5c42\u6a21\u578b\u7684 helper \u88ab\u5220\u9664\u6216\u5e76\u56de\u4f7f\u7528\u70b9\u3002\"], \"acceptance\": [\"\u5171\u4eab UI \u7684\u6570\u636e\u5f62\u72b6\u66f4\u8d34\u8fd1\u771f\u5b9e\u6e90\u7c7b\u578b\u3002\", \"\u76f8\u540c\u5b57\u6bb5\u4e0d\u518d\u5728 shared \u548c app-shell \u4e4b\u95f4\u53cd\u590d\u642c\u8fd0\u3002\"], \"evidence_to_capture\": [\"\u5220\u9664\u7684\u6620\u5c04\u51fd\u6570\u5217\u8868\u3002\", \"provider \u590d\u6742\u5ea6\u6536\u7f29\u8bf4\u660e\u3002\"], \"verify_commands\": [\"pnpm --filter @nicenote/app-shell build\", \"pnpm --filter @nicenote/web build\", \"pnpm --filter @nicenote/desktop build:frontend\"], \"files_to_touch\": [\"packages/app-shell/src/types.ts\", \"packages/app-shell/src/lib/search-utils.ts\", \"apps/web/src/providers/AppShellProvider.tsx\", \"apps/desktop/frontend/src/providers/AppShellProvider.tsx\"], \"prompt_context\": [\"\u5982\u679c\u67d0\u4e2a\u5171\u4eab\u7ec4\u4ef6\u53ea\u9700\u8981 title\u3001summary\u3001updatedAt\uff0c\u5c31\u76f4\u63a5\u9762\u5411\u8be5\u6700\u5c0f shape\uff0c\u4e0d\u8981\u518d\u9020\u5168\u5c40 view model\u3002\"]}, {\"id\": \"03-03-remove-repository-provider-factory\", \"title\": \"Remove Repository Provider Factory\", \"kind\": \"code\", \"execution\": \"codex\", \"goal\": \"\u5220\u9664 createRepositoryProvider \u548c\u76f8\u5173\u58f3\u5c42\u5bfc\u51fa\uff0c\u907f\u514d app-shell \u7ee7\u7eed\u627f\u8f7d service \u751f\u547d\u5468\u671f\u804c\u8d23\u3002\", \"depends_on\": [\"03-02-remove-appshell-model-layer\"], \"deliverables\": [\"packages/app-shell \u4e2d\u4e0d\u518d\u5b58\u5728 createRepositoryProvider\u3002\", \"web\u3001desktop\u3001mobile \u4e2d\u4e0d\u518d\u6709 repository-provider \u8c03\u7528\u94fe\u3002\"], \"acceptance\": [\"app-shell \u53ea\u4fdd\u7559 UI\u3001\u8f7b\u91cf store \u5de5\u5382\u548c\u5fc5\u8981 DOM helper\u3002\", \"\u4e0d\u518d\u901a\u8fc7\u5171\u4eab\u58f3\u5c42\u7ba1\u7406\u5e73\u53f0\u6570\u636e\u5b9e\u4f8b\u751f\u547d\u5468\u671f\u3002\"], \"evidence_to_capture\": [\"\u88ab\u5220\u9664\u7684 provider \u5de5\u5382\u53ca\u8c03\u7528\u70b9\u3002\"], \"verify_commands\": [\"pnpm --filter @nicenote/app-shell build\", \"! rg -n \\\"createRepositoryProvider|repository-provider\\\" apps packages\"], \"files_to_touch\": [\"packages/app-shell/src/lib/create-repository-provider.ts\", \"packages/app-shell/src/index.ts\", \"apps/**/src/adapters/repository-provider.ts\"], \"prompt_context\": [\"\u5141\u8bb8\u76f4\u63a5\u7528\u6a21\u5757\u7ea7\u5355\u4f8b\u6216\u5c40\u90e8\u5b9e\u4f8b\uff0c\u4f46\u4e0d\u8981\u518d\u5305\u4e00\u5c42 set/get/reset \u5de5\u5382\u3002\"]}]}, {\"id\": \"04-platform-path-shortening\", \"title\": \"Shorten Web And Desktop Data Paths\", \"goal\": \"\u6536\u77ed web \u548c desktop \u7684\u771f\u5b9e\u4fee\u6539\u8def\u5f84\uff0c\u8ba9\u5355\u4e2a\u9700\u6c42\u89e6\u8fbe\u66f4\u5c11\u6587\u4ef6\u548c\u5c42\u7ea7\u3002\", \"depends_on\": [\"03-app-shell-contraction\"], \"summary\": \"\u5e73\u53f0\u5c42\u5404\u81ea\u76f4\u8fbe\u81ea\u5df1\u7684\u4e3b\u6570\u636e\u8def\u5f84\uff0c\u4e0d\u518d\u4f2a\u7edf\u4e00\u3002\", \"entry_criteria\": [\"shared shell \u5df2\u7ecf\u6536\u7f29\u3002\"], \"exit_criteria\": [\"web \u521d\u59cb\u52a0\u8f7d\u6ca1\u6709 N+1\u3002\", \"desktop \u524d\u7aef\u53ea\u4fdd\u7559 AppService \u4e00\u6761 I/O \u8fb9\u754c\u3002\", \"desktop store \u7ed3\u6784\u6bd4\u5f53\u524d slice \u7ec4\u5408\u66f4\u76f4\u63a5\u3002\"], \"risks\": [\"web \u548c desktop \u7684 store \u6539\u52a8\u90fd\u8f83\u96c6\u4e2d\uff0c\u9700\u8981\u4fdd\u8bc1\u884c\u4e3a\u4e0d\u56de\u9000\u3002\"], \"batches\": [{\"id\": \"04-01-web-direct-note-path\", \"title\": \"Make Web Note Loading Direct\", \"kind\": \"code\", \"execution\": \"codex\", \"goal\": \"\u5220\u9664 web \u5f53\u524d list \u52a0 N \u6b21 get \u7684\u52a0\u8f7d\u65b9\u5f0f\uff0c\u6539\u6210\u5355\u6b21\u76f4\u63a5\u52a0\u8f7d\uff0c\u5e76\u6e05\u9664\u5df2\u6b7b\u7684 web repository-provider\u3002\", \"depends_on\": [], \"deliverables\": [\"web useNoteStore \u4f7f\u7528\u5355\u6b21\u76f4\u63a5\u52a0\u8f7d\u7684\u672c\u5730\u6570\u636e\u8def\u5f84\u3002\", \"apps/web/src/adapters/repository-provider.ts \u88ab\u5220\u9664\u3002\", \"selectNoteList \u8fd9\u7c7b\u65e0\u8c03\u7528\u5bfc\u51fa\u88ab\u987a\u624b\u6e05\u7406\u3002\"], \"acceptance\": [\"web \u521d\u59cb\u52a0\u8f7d\u4e0d\u518d\u6709 N+1 fanout\u3002\", \"web \u6570\u636e\u8def\u5f84\u66f4\u63a5\u8fd1 localStorage \u5b9e\u9645\u5b9e\u73b0\u3002\"], \"evidence_to_capture\": [\"\u65e7\u52a0\u8f7d\u8def\u5f84\u4e0e\u65b0\u52a0\u8f7d\u8def\u5f84\u7684\u5bf9\u7167\u3002\", \"\u5220\u9664\u7684\u6b7b\u6587\u4ef6\u6216\u6b7b\u5bfc\u51fa\u5217\u8868\u3002\"], \"verify_commands\": [\"pnpm --filter @nicenote/web build\", \"pnpm --filter @nicenote/web test\", \"! test -f apps/web/src/adapters/repository-provider.ts\"], \"files_to_touch\": [\"apps/web/src/store/useNoteStore.ts\", \"apps/web/src/adapters/local-storage-note-repository.ts\", \"apps/web/src/adapters/repository-provider.ts\"], \"prompt_context\": [\"\u4f18\u5148\u51cf\u5c11\u8bfb\u53d6\u5c42\u6570\uff0c\u5176\u6b21\u518d\u8003\u8651\u662f\u5426\u5b8c\u5168\u5220\u9664 repository \u7c7b\u3002\"]}, {\"id\": \"04-02-desktop-remove-repository-layer\", \"title\": \"Remove Desktop Repository Layer\", \"kind\": \"code\", \"execution\": \"codex\", \"goal\": \"\u5728 desktop \u524d\u7aef\u5f7b\u5e95\u53d6\u6d88 TauriNoteRepository \u548c repository-provider\uff0c\u7edf\u4e00\u76f4\u8fde AppService\u3002\", \"depends_on\": [\"04-01-web-direct-note-path\"], \"deliverables\": [\"desktop \u524d\u7aef\u641c\u7d22\u548c\u7b14\u8bb0\u64cd\u4f5c\u4e0d\u518d\u4f9d\u8d56 TauriNoteRepository\u3002\", \"desktop repository-provider \u6587\u4ef6\u88ab\u5220\u9664\u3002\", \"AppService \u6210\u4e3a\u552f\u4e00\u524d\u7aef I/O \u4e3b\u8def\u5f84\u3002\"], \"acceptance\": [\"frontend \u5185\u4e0d\u5b58\u5728\u7b2c\u4e8c\u6761\u684c\u9762\u7aef\u6570\u636e\u8fb9\u754c\u3002\", \"\u641c\u7d22\u3001\u6253\u5f00\u3001\u4fdd\u5b58\u3001\u91cd\u547d\u540d\u3001\u5220\u9664\u90fd\u4ecd\u53ef\u5de5\u4f5c\u3002\"], \"evidence_to_capture\": [\"\u5220\u9664\u7684 repository \u6587\u4ef6\u548c\u8c03\u7528\u70b9\u3002\", \"desktop I/O \u8def\u5f84\u6536\u655b\u8bf4\u660e\u3002\"], \"verify_commands\": [\"pnpm --filter @nicenote/desktop build:frontend\", \"! test -f apps/desktop/frontend/src/adapters/tauri-note-repository.ts\", \"! test -f apps/desktop/frontend/src/adapters/repository-provider.ts\"], \"files_to_touch\": [\"apps/desktop/frontend/src/providers/AppShellProvider.tsx\", \"apps/desktop/frontend/src/store/**\", \"apps/desktop/frontend/src/adapters/tauri-note-repository.ts\", \"apps/desktop/frontend/src/adapters/repository-provider.ts\"], \"prompt_context\": [\"\u4e0d\u8981\u7528\u65b0\u7684 search service \u6216 client \u5305\u66ff\u4ee3\u65e7 repository\u3002\"]}, {\"id\": \"04-03-flatten-desktop-store\", \"title\": \"Flatten Desktop Store Structure\", \"kind\": \"code\", \"execution\": \"codex\", \"goal\": \"\u628a desktop \u5f53\u524d slice \u7ec4\u5408\u6536\u7f29\u6210\u66f4\u76f4\u63a5\u7684 store \u7ed3\u6784\uff0c\u51cf\u5c11\u8de8\u6587\u4ef6\u8df3\u8f6c\u3002\", \"depends_on\": [\"04-02-desktop-remove-repository-layer\"], \"deliverables\": [\"useDesktopStore \u4e0d\u518d\u7531\u4e94\u4e2a slice \u673a\u68b0\u62fc\u88c5\u3002\", \"\u7d27\u5bc6\u76f8\u5173\u7684 note\u3001folder\u3001watcher\u3001settings \u903b\u8f91\u5408\u5e76\u5230\u66f4\u5c11\u6587\u4ef6\u4e2d\u3002\"], \"acceptance\": [\"\u5e38\u89c1 desktop \u9700\u6c42\u4e0d\u518d\u9700\u8981\u8de8\u591a\u4e2a slice \u7406\u89e3\u6d41\u7a0b\u3002\", \"store \u6587\u4ef6\u6570\u548c\u8df3\u8f6c\u6570\u663e\u8457\u4e0b\u964d\u3002\"], \"evidence_to_capture\": [\"slice \u6570\u91cf before/after\u3002\", \"\u91cd\u547d\u540d\u3001\u4fdd\u5b58\u3001\u6253\u5f00\u6587\u4ef6\u5939\u4e09\u6761\u8def\u5f84\u6d89\u53ca\u6587\u4ef6\u6570 before/after\u3002\"], \"verify_commands\": [\"pnpm --filter @nicenote/desktop build:frontend\"], \"files_to_touch\": [\"apps/desktop/frontend/src/store/useDesktopStore.ts\", \"apps/desktop/frontend/src/store/slices/**\"], \"prompt_context\": [\"\u8fd9\u662f\u5408\u5e76\uff0c\u4e0d\u662f\u5f15\u5165\u65b0\u7684 store \u5de5\u5382\u6216\u5c42\u7ea7\u3002\"]}]}, {\"id\": \"05-package-pruning\", \"title\": \"Prune Unused Packages And Runtime Contracts\", \"goal\": \"\u628a\u4e0d\u518d\u6709\u771f\u5b9e\u6536\u76ca\u7684 domain \u548c draft package \u5f7b\u5e95\u6536\u6389\u3002\", \"depends_on\": [\"04-platform-path-shortening\"], \"summary\": \"\u53ea\u4fdd\u7559\u88ab\u6d3b\u8dc3\u8868\u9762\u771f\u5b9e\u6d88\u8d39\u7684\u5171\u4eab\u8fb9\u754c\u3002\", \"entry_criteria\": [\"web \u548c desktop \u4e3b\u8def\u5f84\u5df2\u7ecf\u7f29\u77ed\u3002\"], \"exit_criteria\": [\"@nicenote/domain \u4e0d\u518d\u627f\u62c5\u4f2a runtime \u8fb9\u754c\u3002\", \"database draft adapter \u548c\u5176\u4ed6\u6b7b\u4ee3\u7801\u88ab\u5220\u9664\u3002\", \"\u5305\u56fe\u66f4\u8d34\u8fd1\u771f\u5b9e\u652f\u6301\u8868\u9762\u3002\"], \"risks\": [\"\u5982\u679c repo \u5916\u90e8\u8fd8\u6709\u672a\u8bc6\u522b\u7684\u5305\u6d88\u8d39\u8005\uff0c\u76f4\u63a5\u5220 domain exports \u53ef\u80fd\u5e26\u6765\u517c\u5bb9\u6027\u95ee\u9898\u3002\"], \"batches\": [{\"id\": \"05-01-prune-domain-runtime\", \"title\": \"Prune Domain Runtime Abstractions\", \"kind\": \"code\", \"execution\": \"codex\", \"goal\": \"\u628a Theme\u3001Language \u7b49\u503c\u7c7b\u578b\u6536\u56de shared\uff0c\u5e76\u5220\u9664\u6ca1\u6709\u771f\u5b9e\u6d88\u8d39\u8005\u7684 domain \u63a5\u53e3\u548c\u5951\u7ea6\u6d4b\u8bd5\u5bfc\u51fa\u3002\", \"depends_on\": [], \"deliverables\": [\"\u4e0d\u518d\u8981\u6c42 app \u901a\u8fc7 @nicenote/domain \u5f15\u5165\u7eaf\u503c\u7c7b\u578b\u3002\", \"NoteRepository\u3001SettingsRepository\u3001SearchIndex \u53ca\u5176\u5951\u7ea6\u6d4b\u8bd5\u88ab\u5220\u9664\u6216\u660e\u786e\u51bb\u7ed3\u4e3a\u975e runtime \u8868\u9762\u3002\"], \"acceptance\": [\"domain \u4e0d\u518d\u4f5c\u4e3a\u5f53\u524d\u4ea7\u54c1\u4e3b\u8def\u5f84\u7684\u4f2a\u591a\u6001\u8fb9\u754c\u3002\", \"\u8c03\u7528\u65b9\u5bfc\u5165\u5173\u7cfb\u66f4\u76f4\u63a5\u3002\"], \"evidence_to_capture\": [\"domain \u5220\u9664\u6216\u6536\u7f29\u524d\u540e\u7684\u5bfc\u51fa\u5bf9\u7167\u3002\", \"\u53d7\u5f71\u54cd\u8c03\u7528\u70b9\u6e05\u5355\u3002\"], \"verify_commands\": [\"pnpm typecheck\", \"pnpm --filter @nicenote/shared typecheck\"], \"files_to_touch\": [\"packages/domain/src/**\", \"packages/shared/src/**\", \"apps/**/src/**\", \"packages/app-shell/src/**\"], \"prompt_context\": [\"\u4f18\u5148\u5220\u9664\u6ca1\u6709\u771f\u5b9e\u6d88\u8d39\u8005\u7684\u63a5\u53e3\uff0c\u4e0d\u8981\u628a\u5b83\u4eec\u8fc1\u5230\u53e6\u4e00\u4e2a\u5171\u4eab\u5305\u7ee7\u7eed\u4fdd\u7559\u3002\"]}, {\"id\": \"05-02-delete-draft-adapters-and-dead-packages\", \"title\": \"Delete Draft Adapters And Dead Package Surface\", \"kind\": \"code\", \"execution\": \"codex\", \"goal\": \"\u5220\u9664 packages/database \u4e2d\u672a\u5b9e\u73b0\u7684 adapter \u62bd\u8c61\uff0c\u5e76\u6e05\u7406\u672a\u88ab\u6d3b\u8dc3\u8868\u9762\u6d88\u8d39\u7684 dead exports \u548c\u4f9d\u8d56\u3002\", \"depends_on\": [\"05-01-prune-domain-runtime\"], \"deliverables\": [\"packages/database/src/adapter.ts \u88ab\u5220\u9664\u3002\", \"packages/database/src/adapters/op-sqlite.ts \u88ab\u5220\u9664\u3002\", \"\u672a\u4f7f\u7528\u7684 package exports\u3001\u4f9d\u8d56\u3001\u6839\u5f15\u7528\u548c\u5b9e\u9a8c\u5305\u5165\u53e3\u88ab\u540c\u6b65\u6e05\u7406\u6216\u6807\u660e experimental\u3002\"], \"acceptance\": [\"\u4ed3\u5e93\u4e0d\u518d\u4fdd\u7559\u660e\u786e\u672a\u5b9e\u73b0\u4f46\u770b\u8d77\u6765\u50cf\u6b63\u5f0f\u67b6\u6784\u7684 adapter \u58f3\u3002\", \"\u6d3b\u8dc3\u652f\u6301\u8868\u9762\u548c package \u8fb9\u754c\u4e00\u81f4\u3002\"], \"evidence_to_capture\": [\"\u88ab\u5220\u9664\u7684 draft surface \u5217\u8868\u3002\", \"\u5305\u56fe\u6536\u7f29\u8bf4\u660e\u3002\"], \"verify_commands\": [\"pnpm --filter @nicenote/database typecheck\", \"test ! -f packages/database/src/adapter.ts\", \"test ! -f packages/database/src/adapters/op-sqlite.ts\"], \"files_to_touch\": [\"packages/database/src/**\", \"packages/*/package.json\", \"tsconfig.json\"], \"prompt_context\": [\"\u5220\u9664\u4f18\u5148\u4e8e\u4fdd\u7559 TODO \u58f3\uff1b\u5982\u679c\u67d0\u4e2a\u5b9e\u9a8c\u5305\u4fdd\u7559\uff0c\u5fc5\u987b\u5728\u6587\u6863\u548c tsconfig \u4e2d\u660e\u786e\u5176\u5b9e\u9a8c\u72b6\u6001\u3002\"]}]}, {\"id\": \"99-verification\", \"title\": \"Verify And Lock In\", \"goal\": \"\u786e\u8ba4\u7b80\u5316\u771f\u7684\u964d\u4f4e\u7ef4\u62a4\u6210\u672c\uff0c\u5e76\u628a\u7ed3\u679c\u56fa\u5b9a\u6210\u53ef\u6301\u7eed\u7684\u5de5\u7a0b\u89c4\u5219\u3002\", \"depends_on\": [\"05-package-pruning\"], \"summary\": \"\u5148\u8dd1\u5168\u91cf\u652f\u6301\u8868\u9762\u9a8c\u8bc1\uff0c\u518d\u8865\u9f50 before/after \u8bc1\u636e\u3002\", \"entry_criteria\": [\"\u6240\u6709\u7ed3\u6784\u6536\u7f29 batch \u5df2\u5b8c\u6210\u3002\"], \"exit_criteria\": [\"\u652f\u6301\u8868\u9762\u9a8c\u8bc1\u901a\u8fc7\u3002\", \"before/after \u6307\u6807\u5df2\u843d\u6863\u3002\", \"\u5269\u4f59 experimental \u8868\u9762\u5df2\u7ecf\u5217\u6e05\u3002\"], \"risks\": [\"\u5982\u679c\u9a8c\u8bc1\u53ea\u770b\u7f16\u8bd1\u4e0d\u770b\u8def\u5f84\u6536\u7f29\uff0c\u5f88\u5bb9\u6613\u2018\u529f\u80fd\u6ca1\u574f\u4f46\u590d\u6742\u5ea6\u6ca1\u964d\u2019\u3002\"], \"batches\": [{\"id\": \"99-01-supported-surface-regression\", \"title\": \"Run Supported Surface Regression\", \"kind\": \"verification\", \"execution\": \"codex\", \"goal\": \"\u5bf9\u5f53\u524d supported \u8868\u9762\u6267\u884c\u5b8c\u6574\u56de\u5f52\u9a8c\u8bc1\uff0c\u786e\u8ba4\u51cf\u6cd5\u6ca1\u6709\u5f15\u5165\u56de\u5f52\u3002\", \"depends_on\": [], \"deliverables\": [\"web\u3001desktop\u3001shared packages \u7684\u56de\u5f52\u9a8c\u8bc1\u7ed3\u679c\u3002\", \"\u5931\u8d25\u9879\u548c\u4fee\u590d\u7ed3\u679c\u6e05\u5355\u3002\"], \"acceptance\": [\"\u652f\u6301\u8868\u9762\u7684 lint\u3001typecheck\u3001test\u3001build \u90fd\u901a\u8fc7\u3002\", \"\u4e0d\u518d\u4f9d\u8d56 experimental \u8868\u9762\u7684\u9690\u85cf\u524d\u63d0\u3002\"], \"evidence_to_capture\": [\"\u9a8c\u8bc1\u547d\u4ee4\u8f93\u51fa\u6458\u8981\u3002\", \"\u82e5\u6709\u8865\u4fee\uff0c\u8bb0\u5f55\u8865\u4fee\u6279\u6b21\u3002\"], \"verify_commands\": [\"pnpm lint\", \"pnpm typecheck\", \"pnpm test\", \"pnpm build\"], \"files_to_touch\": [\"apps/web/**\", \"apps/desktop/**\", \"packages/**\"], \"prompt_context\": [\"\u4e0d\u8981\u5728\u8fd9\u4e2a batch \u987a\u624b\u505a\u65b0\u91cd\u6784\uff1b\u53ea\u4fee\u590d\u56de\u5f52\u3002\"]}, {\"id\": \"99-02-capture-post-rollout-evidence\", \"title\": \"Capture Post-Rollout Evidence\", \"kind\": \"docs\", \"execution\": \"codex\", \"goal\": \"\u628a before/after \u6307\u6807\u3001\u5269\u4f59\u98ce\u9669\u548c\u540e\u7eed experimental \u8def\u7ebf\u56fa\u5b9a\u6210\u6700\u7ec8\u8bc1\u636e\u6587\u6863\u3002\", \"depends_on\": [\"99-01-supported-surface-regression\"], \"deliverables\": [\".runners/2026-04-23-project-simplification/verification.md\", \"\u6587\u6863\u4e2d\u5305\u542b\u8def\u5f84\u7f29\u77ed\u7ed3\u679c\u3001\u5df2\u5220\u9664\u7ed3\u6784\u3001\u5269\u4f59 experimental \u8868\u9762\u3001\u540e\u7eed\u4e0d\u505a\u4e8b\u9879\u3002\"], \"acceptance\": [\"\u53ef\u4ee5\u76f4\u63a5\u56de\u7b54\u2018\u8fd9\u8f6e\u51cf\u6cd5\u5230\u5e95\u51cf\u5c11\u4e86\u4ec0\u4e48\u2019\u3002\", \"\u540e\u7eed\u56e2\u961f\u4e0d\u9700\u8981\u91cd\u65b0\u505a\u4e00\u6b21\u540c\u6837\u7684\u8bca\u65ad\u3002\"], \"evidence_to_capture\": [\"before/after \u6307\u6807\u8868\u3002\", \"\u5269\u4f59\u98ce\u9669\u4e0e\u540e\u7eed\u975e\u76ee\u6807\u6e05\u5355\u3002\"], \"verify_commands\": [\"test -f .runners/2026-04-23-project-simplification/verification.md\", \"rg -n \\\"desktop_search_paths|noop_context_fields|web_load_fanout|supported_surface|experimental_surface\\\" .runners/2026-04-23-project-simplification/verification.md\"], \"files_to_touch\": [\".runners/2026-04-23-project-simplification/verification.md\"], \"prompt_context\": [\"\u8fd9\u4efd\u6587\u6863\u662f\u4ea4\u4ed8\u8bc1\u660e\uff0c\u4e0d\u662f\u65b0\u7684\u5927 spec\u3002\"]}]}]}"
PLAN = json.loads(PLAN_JSON)
MAX_VERIFY_OUTPUT_CHARS = 12000
DEFAULT_CODEX_CMD = "codex exec --dangerously-bypass-approvals-and-sandbox --cd {repo} -"


@dataclasses.dataclass
class Batch:
    id: str
    title: str
    kind: str
    execution: str
    goal: str
    depends_on: list[str]
    deliverables: list[str]
    acceptance: list[str]
    evidence_to_capture: list[str]
    verify_commands: list[str]
    files_to_touch: list[str]
    prompt_context: list[str]


@dataclasses.dataclass
class Phase:
    id: str
    title: str
    goal: str
    summary: str
    depends_on: list[str]
    entry_criteria: list[str]
    exit_criteria: list[str]
    risks: list[str]
    batches: list[Batch]


@dataclasses.dataclass
class VerifyFailure:
    cmd: str
    exit_code: int
    output: str


@dataclasses.dataclass
class CodexFailure:
    exit_code: int
    output: str


@dataclasses.dataclass
class VerifyResult:
    ok: bool
    failures: list[VerifyFailure] = dataclasses.field(default_factory=list)


class Colors:
    RESET = "\033[0m"
    BOLD = "\033[1m"
    DIM = "\033[2m"
    RED = "\033[31m"
    GREEN = "\033[32m"
    YELLOW = "\033[33m"
    BLUE = "\033[34m"
    CYAN = "\033[36m"


def c(text: str, *styles: str) -> str:
    if not sys.stdout.isatty():
        return text
    return "".join(styles) + text + Colors.RESET


def require(condition: bool, message: str) -> None:
    if condition:
        return
    print(c(f"! {message}", Colors.RED))
    sys.exit(2)


def build_phase_graph() -> list[Phase]:
    raw_phases = PLAN["phases"]
    phases: list[Phase] = []
    seen_phase_ids: set[str] = set()
    seen_batch_ids: set[str] = set()

    for index, raw_phase in enumerate(raw_phases):
        phase_id = raw_phase["id"]
        require(phase_id not in seen_phase_ids, f"Duplicate phase id: {phase_id}")
        seen_phase_ids.add(phase_id)

        depends_on = list(raw_phase.get("depends_on") or ([] if index == 0 else [raw_phases[index - 1]["id"]]))
        batches: list[Batch] = []
        for raw_batch in raw_phase["batches"]:
            batch_id = raw_batch["id"]
            require(batch_id not in seen_batch_ids, f"Duplicate batch id: {batch_id}")
            seen_batch_ids.add(batch_id)
            batches.append(
                Batch(
                    id=batch_id,
                    title=raw_batch["title"],
                    kind=raw_batch.get("kind") or "code",
                    execution=raw_batch.get("execution") or "codex",
                    goal=raw_batch["goal"],
                    depends_on=list(raw_batch.get("depends_on") or []),
                    deliverables=list(raw_batch.get("deliverables") or []),
                    acceptance=list(raw_batch.get("acceptance") or []),
                    evidence_to_capture=list(raw_batch.get("evidence_to_capture") or []),
                    verify_commands=list(raw_batch.get("verify_commands") or []),
                    files_to_touch=list(raw_batch.get("files_to_touch") or []),
                    prompt_context=list(raw_batch.get("prompt_context") or []),
                )
            )

        phases.append(
            Phase(
                id=phase_id,
                title=raw_phase["title"],
                goal=raw_phase["goal"],
                summary=raw_phase.get("summary") or "",
                depends_on=depends_on,
                entry_criteria=list(raw_phase.get("entry_criteria") or []),
                exit_criteria=list(raw_phase.get("exit_criteria") or []),
                risks=list(raw_phase.get("risks") or []),
                batches=batches,
            )
        )

    phase_ids = {phase.id for phase in phases}
    missing = sorted(
        dependency
        for phase in phases
        for dependency in phase.depends_on
        if dependency not in phase_ids
    )
    require(not missing, f"Unknown phase dependencies: {', '.join(missing)}")
    return phases


ROLLOUT = PLAN["rollout"]
REPO = Path(ROLLOUT["repo_root"]).resolve()
RAW_WORKDIR = Path(ROLLOUT.get("workdir") or ".codex-rollout")
WORKDIR = RAW_WORKDIR if RAW_WORKDIR.is_absolute() else REPO / RAW_WORKDIR
STATE = WORKDIR / "state.json"
PROMPTS_DIR = WORKDIR / "prompts"
LOGS_DIR = WORKDIR / "logs"

PHASES = build_phase_graph()
PHASE_BY_ID = {phase.id: phase for phase in PHASES}
BATCH_BY_ID = {batch.id: batch for phase in PHASES for batch in phase.batches}
PHASE_BY_BATCH_ID = {batch.id: phase for phase in PHASES for batch in phase.batches}
ALL_BATCH_IDS = [batch.id for phase in PHASES for batch in phase.batches]


def validate_batch_dependencies() -> None:
    missing = sorted(
        dependency
        for batch in BATCH_BY_ID.values()
        for dependency in batch.depends_on
        if dependency not in BATCH_BY_ID
    )
    require(not missing, f"Unknown batch dependencies: {', '.join(missing)}")

    self_refs = sorted(batch.id for batch in BATCH_BY_ID.values() if batch.id in batch.depends_on)
    require(not self_refs, f"Batch cannot depend on itself: {', '.join(self_refs)}")


validate_batch_dependencies()


def display_path(path: Path) -> str:
    try:
        return str(path.relative_to(REPO))
    except ValueError:
        return str(path)


def truncate_output(text: str, limit: int = MAX_VERIFY_OUTPUT_CHARS) -> str:
    text = text.strip()
    if len(text) <= limit:
        return text
    return text[: limit - 16].rstrip() + "\n...[truncated]"


def load_state() -> dict:
    if not STATE.exists():
        return {"batches": {}}
    return json.loads(STATE.read_text())


def save_state(state: dict) -> None:
    STATE.parent.mkdir(parents=True, exist_ok=True)
    STATE.write_text(json.dumps(state, indent=2, ensure_ascii=False))


def mark_batch(state: dict, batch_id: str, status: str, **extra) -> None:
    state["batches"][batch_id] = {
        "status": status,
        "ts": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        **extra,
    }
    save_state(state)


def ensure_dirs() -> None:
    for directory in (WORKDIR, PROMPTS_DIR, LOGS_DIR):
        directory.mkdir(parents=True, exist_ok=True)


def append_log(log_path: Path, text: str) -> None:
    log_path.parent.mkdir(parents=True, exist_ok=True)
    with log_path.open("ab") as handle:
        handle.write(text.encode())


def render_bullets(values: list[str], formatter) -> list[str]:
    if not values:
        return ["- None"]
    return [formatter(value) for value in values]


def render_prompt(phase: Phase, batch: Batch, extra_notes: str | None = None) -> str:
    sources = list(ROLLOUT.get("sources_of_truth") or [])
    planning_notes = list(ROLLOUT.get("planning_notes") or [])
    success_metrics = list(ROLLOUT.get("success_metrics") or [])
    global_context = list(ROLLOUT.get("global_context") or [])
    hard_rules = list(ROLLOUT.get("hard_rules") or [])
    suffix = list(ROLLOUT.get("batch_prompt_suffix") or [])

    parts = [
        f"# Batch {batch.id}: {batch.title}",
        "",
        f"You are implementing the rollout `{ROLLOUT['name']}` in the repository rooted at `{REPO}`.",
        "",
        "## Phase",
        f"- `{phase.id}` — {phase.title}",
        f"- Goal: {phase.goal}",
    ]
    if phase.summary:
        parts.append(f"- Context: {phase.summary}")
    if phase.entry_criteria:
        parts.extend(
            [
                "",
                "## Phase Entry Criteria",
                *render_bullets(phase.entry_criteria, lambda value: f"- {value}"),
            ]
        )
    if phase.exit_criteria:
        parts.extend(
            [
                "",
                "## Phase Exit Criteria",
                *render_bullets(phase.exit_criteria, lambda value: f"- {value}"),
            ]
        )
    if phase.risks:
        parts.extend(
            [
                "",
                "## Phase Risks",
                *render_bullets(phase.risks, lambda value: f"- {value}"),
            ]
        )

    parts.extend(
        [
            "",
            "## Batch Shape",
            f"- Kind: `{batch.kind}`",
            f"- Execution: `{batch.execution}`",
            "",
            "## Batch Goal",
            batch.goal,
            "",
            "## Depends On",
            *render_bullets(batch.depends_on, lambda value: f"- `{value}`"),
            "",
            "## Deliverables",
            *render_bullets(batch.deliverables, lambda value: f"- {value}"),
            "",
            "## Acceptance",
            *render_bullets(batch.acceptance, lambda value: f"- {value}"),
            "",
            "## Evidence To Capture",
            *render_bullets(batch.evidence_to_capture, lambda value: f"- {value}"),
            "",
            "## Verification Commands (must pass before declaring success)",
            *render_bullets(batch.verify_commands, lambda value: f"- `{value}`"),
        ]
    )

    if batch.files_to_touch:
        parts.extend(
            [
                "",
                "## Likely Files",
                *[f"- `{value}`" for value in batch.files_to_touch],
            ]
        )

    parts.extend(
        [
            "",
            "## Sources Of Truth",
            *render_bullets(sources, lambda value: f"- `{value}`"),
            "",
            "## Planning Notes",
            *render_bullets(planning_notes, lambda value: f"- {value}"),
            "",
            "## Success Metrics",
            *render_bullets(success_metrics, lambda value: f"- {value}"),
            "",
            "## Global Context",
            *render_bullets(global_context, lambda value: f"- {value}"),
            "",
            "## Hard Rules",
            *render_bullets(hard_rules, lambda value: f"- {value}"),
        ]
    )

    if batch.prompt_context:
        parts.extend(
            [
                "",
                "## Batch Context",
                *[f"- {value}" for value in batch.prompt_context],
            ]
        )

    if suffix:
        parts.extend(
            [
                "",
                "## Working Agreement",
                *[f"- {value}" for value in suffix],
            ]
        )

    if extra_notes:
        parts.extend(
            [
                "",
                "## Retry Context",
                extra_notes.rstrip(),
            ]
        )

    parts.append("")
    return "\n".join(parts)


def write_prompt(phase: Phase, batch: Batch, attempt: int, extra_notes: str | None) -> Path:
    suffix = "" if attempt == 0 else f".retry{attempt}"
    path = PROMPTS_DIR / f"{batch.id}{suffix}.md"
    path.write_text(render_prompt(phase, batch, extra_notes=extra_notes))
    return path


def run_shell(cmd: str, cwd: Path = REPO, check: bool = True, *, capture_output: bool = False) -> subprocess.CompletedProcess:
    print(c(f"$ {cmd}", Colors.DIM))
    return subprocess.run(
        cmd,
        shell=True,
        cwd=cwd,
        check=check,
        capture_output=capture_output,
        text=capture_output,
    )


def invoke_codex(
    phase: Phase,
    batch: Batch,
    codex_cmd: list[str],
    log_path: Path,
    dry_run: bool,
    *,
    attempt: int = 0,
    extra_notes: str | None = None,
) -> tuple[int, Path, str]:
    prompt_path = write_prompt(phase, batch, attempt=attempt, extra_notes=extra_notes)
    print(c(f"→ prompt: {display_path(prompt_path)}", Colors.DIM))
    print(c(f"→ log:    {display_path(log_path)}", Colors.DIM))

    if dry_run:
        print(c("  (dry-run, skipping codex invocation)", Colors.YELLOW))
        return 0, prompt_path, ""

    mode = "wb" if attempt == 0 else "ab"
    with prompt_path.open("rb") as stdin, log_path.open(mode) as log:
        if attempt > 0:
            log.write(b"\n")
        log.write(f"# codex invocation {attempt + 1} for {batch.id}\n".encode())
        log.write(f"# cmd: {shlex.join(codex_cmd)}\n".encode())
        log.write(f"# ts:  {datetime.now(timezone.utc).isoformat()}\n\n".encode())
        log.flush()
        proc = subprocess.Popen(
            codex_cmd,
            cwd=REPO,
            stdin=stdin,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
        )
        assert proc.stdout is not None
        output = bytearray()
        for line in proc.stdout:
            sys.stdout.buffer.write(line)
            sys.stdout.buffer.flush()
            log.write(line)
            output.extend(line)
        return proc.wait(), prompt_path, output.decode("utf-8", errors="replace").rstrip()


def verify_batch(batch: Batch, log_path: Path) -> VerifyResult:
    if not batch.verify_commands:
        return VerifyResult(ok=True)

    print(c(f"▶ verifying {batch.id}", Colors.CYAN))
    append_log(log_path, f"\n# verification for {batch.id}\n")

    for cmd in batch.verify_commands:
        append_log(log_path, f"\n$ {cmd}\n")
        proc = run_shell(cmd, check=False, capture_output=True)
        output = ((proc.stdout or "") + (proc.stderr or "")).rstrip()
        if output:
            print(output)
            append_log(log_path, output + "\n")
        append_log(log_path, f"[exit {proc.returncode}]\n")
        if proc.returncode != 0:
            print(c(f"✗ verify failed: {cmd} (exit {proc.returncode})", Colors.RED))
            return VerifyResult(
                ok=False,
                failures=[
                    VerifyFailure(
                        cmd=cmd,
                        exit_code=proc.returncode,
                        output=truncate_output(output or "(no output)"),
                    )
                ],
            )
    return VerifyResult(ok=True)


def git_is_clean() -> bool:
    result = subprocess.run(
        "git status --porcelain",
        shell=True,
        cwd=REPO,
        capture_output=True,
        text=True,
    )
    return result.stdout.strip() == ""


def build_codex_retry_notes(batch: Batch, codex_failure: CodexFailure, retry_number: int) -> str:
    return "\n".join(
        [
            f"The previous Codex CLI attempt for batch `{batch.id}` exited with a non-zero status.",
            f"Retry number: {retry_number}",
            "",
            "Inspect the error output below, keep any useful in-progress changes, and continue fixing the batch.",
            "Before you finish, rerun the verification commands yourself and confirm they are green.",
            "",
            "### Codex CLI Failure",
            f"Exit code: `{codex_failure.exit_code}`",
            "Output:",
            "```text",
            codex_failure.output,
            "```",
            "",
        ]
    )


def build_verify_retry_notes(batch: Batch, verify_result: VerifyResult, retry_number: int) -> str:
    parts = [
        f"The previous attempt for batch `{batch.id}` failed verification.",
        f"Retry number: {retry_number}",
        "",
        "Fix the implementation so that every verification command passes.",
        "Before you finish, rerun the verification commands yourself and confirm they are green.",
        "",
    ]
    for index, failure in enumerate(verify_result.failures, start=1):
        parts.extend(
            [
                f"### Failed Check {index}",
                f"Command: `{failure.cmd}`",
                f"Exit code: `{failure.exit_code}`",
                "Output:",
                "```text",
                failure.output,
                "```",
                "",
            ]
        )
    return "\n".join(parts)


def git_commit_batch(batch: Batch) -> None:
    run_shell("git add -A", check=False)
    if git_is_clean():
        print(c("  (no changes to commit)", Colors.DIM))
        return
    message = f"rollout({batch.id}): {batch.title}\n\nAutomated commit by generated rollout.py"
    run_shell(f"git commit -m {shlex.quote(message)}")


def resolve_codex_cmd(user_cmd: str | None, model: str | None) -> list[str]:
    template = user_cmd or ROLLOUT.get("codex_cmd") or DEFAULT_CODEX_CMD
    rendered = template.format(repo=str(REPO))
    cmd = shlex.split(rendered)
    require(bool(cmd), "Codex command is empty.")
    if shutil.which(cmd[0]) is None:
        print(c(f"! 未找到命令 `{cmd[0]}`。请安装 Codex CLI，或使用 --codex-cmd 覆盖。", Colors.RED))
        sys.exit(2)
    if model and "--model" not in cmd:
        if "-" in cmd:
            index = cmd.index("-")
            cmd[index:index] = ["--model", model]
        else:
            cmd.extend(["--model", model])
    if "-" not in cmd:
        cmd.append("-")
    return cmd


def ordered_unique(items: list[str]) -> list[str]:
    seen: set[str] = set()
    ordered: list[str] = []
    for item in items:
        if item in seen:
            continue
        seen.add(item)
        ordered.append(item)
    return ordered


def phase_dependency_ids(phase_id: str) -> list[str]:
    ordered: list[str] = []
    visited: set[str] = set()

    def visit(target_id: str) -> None:
        for dependency in PHASE_BY_ID[target_id].depends_on:
            if dependency in visited:
                continue
            visit(dependency)
            visited.add(dependency)
            ordered.append(dependency)

    visit(phase_id)
    return ordered


def batch_prerequisites(batch_id: str) -> list[str]:
    batch = BATCH_BY_ID[batch_id]
    phase = PHASE_BY_BATCH_ID[batch_id]
    phase_dependency_set = set(phase_dependency_ids(phase.id))
    prerequisites: list[str] = []

    for candidate_phase in PHASES:
        if candidate_phase.id in phase_dependency_set:
            prerequisites.extend(batch.id for batch in candidate_phase.batches)

    for candidate_batch in phase.batches:
        if candidate_batch.id == batch_id:
            break
        prerequisites.append(candidate_batch.id)

    prerequisites.extend(batch.depends_on)
    return ordered_unique(prerequisites)


def require_known_phase_ids(flag: str, phase_ids: list[str]) -> None:
    unknown = [phase_id for phase_id in phase_ids if phase_id not in PHASE_BY_ID]
    require(not unknown, f"{flag} contains unknown phase ids: {', '.join(unknown)}")


def require_known_batch_ids(flag: str, batch_ids: list[str]) -> None:
    unknown = [batch_id for batch_id in batch_ids if batch_id not in BATCH_BY_ID]
    require(not unknown, f"{flag} contains unknown batch ids: {', '.join(unknown)}")


def expand_phase_ids_with_dependencies(phase_ids: list[str]) -> list[str]:
    ordered: list[str] = []
    visited: set[str] = set()
    visiting: set[str] = set()

    def visit(phase_id: str) -> None:
        if phase_id in visited:
            return
        require(phase_id not in visiting, f"Cyclic phase dependency detected at {phase_id}")
        visiting.add(phase_id)
        for dependency in PHASE_BY_ID[phase_id].depends_on:
            visit(dependency)
        visiting.remove(phase_id)
        visited.add(phase_id)
        ordered.append(phase_id)

    for phase_id in phase_ids:
        visit(phase_id)
    return ordered


def batch_ids_for_phases(phase_ids: list[str]) -> list[str]:
    phase_set = set(phase_ids)
    return [batch.id for phase in PHASES if phase.id in phase_set for batch in phase.batches]


def select_batch_ids(args, state: dict) -> list[str]:
    if args.only_phase:
        require_known_phase_ids("--only-phase", args.only_phase)
        phase_ids = expand_phase_ids_with_dependencies(ordered_unique(args.only_phase))
        selected = batch_ids_for_phases(phase_ids)
    elif args.only_batch:
        require_known_batch_ids("--only-batch", args.only_batch)
        target_set = set(args.only_batch)
        selected = [batch_id for batch_id in ALL_BATCH_IDS if batch_id in target_set]
    elif args.from_phase:
        require_known_phase_ids("--from-phase", [args.from_phase])
        start_index = next(index for index, phase in enumerate(PHASES) if phase.id == args.from_phase)
        selected = [batch.id for phase in PHASES[start_index:] for batch in phase.batches]
    elif args.from_batch:
        require_known_batch_ids("--from-batch", [args.from_batch])
        start_index = ALL_BATCH_IDS.index(args.from_batch)
        selected = ALL_BATCH_IDS[start_index:]
    else:
        selected = list(ALL_BATCH_IDS)

    if args.force:
        return selected

    done = {
        batch_id
        for batch_id, info in state.get("batches", {}).items()
        if info.get("status") == "done"
    }
    return [batch_id for batch_id in selected if batch_id not in done]


def ensure_selection_ready(selected_batch_ids: list[str], state: dict) -> None:
    completed = {
        batch_id
        for batch_id, info in state.get("batches", {}).items()
        if info.get("status") == "done"
    }
    planned_now: set[str] = set()

    for batch_id in selected_batch_ids:
        missing = [
            dependency
            for dependency in batch_prerequisites(batch_id)
            if dependency not in completed and dependency not in planned_now
        ]
        require(
            not missing,
            f"Batch `{batch_id}` is blocked by unfinished prerequisites: {', '.join(missing)}. "
            "Run an earlier phase or batch first, or rerun with a broader selection.",
        )
        planned_now.add(batch_id)


def batch_status(state: dict, batch_id: str) -> str:
    return state.get("batches", {}).get(batch_id, {}).get("status", "pending")


def phase_status(phase: Phase, state: dict) -> tuple[str, int, int]:
    statuses = [batch_status(state, batch.id) for batch in phase.batches]
    done_count = sum(status == "done" for status in statuses)
    total = len(statuses)
    if done_count == total:
        return "done", done_count, total
    if "failed" in statuses:
        return "failed", done_count, total
    if "running" in statuses:
        return "running", done_count, total
    if done_count:
        return "partial", done_count, total
    return "pending", done_count, total


def list_plan(state: dict) -> None:
    print(c(f"Rollout: {ROLLOUT['name']}", Colors.BOLD))
    for phase in PHASES:
        status, done_count, total = phase_status(phase, state)
        print(f"  {phase.id}  {phase.title}  [{status} {done_count}/{total}]")
        for batch in phase.batches:
            print(
                f"    - {batch.id}  {batch.title}  "
                f"[{batch_status(state, batch.id)}; {batch.execution}/{batch.kind}]"
            )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=f"Run rollout plan: {ROLLOUT['name']}",
    )
    parser.add_argument("--list", action="store_true", help="List phases and batch status")

    selection = parser.add_mutually_exclusive_group()
    selection.add_argument("--from-phase", dest="from_phase", metavar="PHASE_ID", help="Start from this phase")
    selection.add_argument("--from-batch", dest="from_batch", metavar="BATCH_ID", help="Start from this batch")
    selection.add_argument("--only-phase", nargs="+", metavar="PHASE_ID", help="Run only these phases")
    selection.add_argument("--only-batch", nargs="+", metavar="BATCH_ID", help="Run only these batches")

    parser.add_argument("--force", action="store_true", help="Rerun selected batches even if already done")
    parser.add_argument("--dry-run", action="store_true", help="Write prompts only, do not invoke Codex")
    parser.add_argument("--commit-per-batch", action="store_true", help="Commit after each successful batch")
    parser.add_argument("--codex-cmd", help="Override the Codex command template")
    parser.add_argument("--model", help="Override the Codex model")
    parser.add_argument("--reset-batch", metavar="BATCH_ID", help="Reset one batch to pending state")
    parser.add_argument(
        "--max-fix-attempts",
        type=int,
        default=None,
        help="Retries after Codex or verification failures; defaults to the plan value",
    )
    parser.add_argument("--allow-dirty", action="store_true", help="Allow a dirty git worktree")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    state = load_state()

    if args.list:
        list_plan(state)
        return 0

    if args.reset_batch:
        require_known_batch_ids("--reset-batch", [args.reset_batch])
        state.setdefault("batches", {}).pop(args.reset_batch, None)
        save_state(state)
        print(c(f"Reset batch `{args.reset_batch}` to pending.", Colors.GREEN))
        return 0

    require(REPO.exists(), f"Repository root does not exist: {REPO}")

    max_fix_attempts = (
        ROLLOUT.get("max_fix_attempts", 1)
        if args.max_fix_attempts is None
        else args.max_fix_attempts
    )
    require(max_fix_attempts >= 0, "--max-fix-attempts cannot be negative.")

    allow_dirty = bool(ROLLOUT.get("allow_dirty", False) or args.allow_dirty)
    commit_per_batch = bool(ROLLOUT.get("commit_per_batch", False) or args.commit_per_batch)
    require(not (commit_per_batch and allow_dirty), "`--commit-per-batch` cannot be combined with `--allow-dirty`.")

    if not allow_dirty and not git_is_clean():
        print(c("! Working tree is dirty. Commit first or pass --allow-dirty.", Colors.RED))
        return 2

    ensure_dirs()
    model = args.model or ROLLOUT.get("model")
    if args.dry_run:
        codex_cmd = ["codex", "exec", "-"]
    else:
        codex_cmd = resolve_codex_cmd(args.codex_cmd, model)
        print(c(f"codex cmd: {shlex.join(codex_cmd)}", Colors.DIM))

    selected_batch_ids = select_batch_ids(args, state)
    if not selected_batch_ids:
        print(c("All selected batches are already complete.", Colors.GREEN))
        return 0

    ensure_selection_ready(selected_batch_ids, state)

    print(c(f"Running {len(selected_batch_ids)} batch(es):", Colors.BOLD))
    for batch_id in selected_batch_ids:
        phase = PHASE_BY_BATCH_ID[batch_id]
        batch = BATCH_BY_ID[batch_id]
        print(f"  - {batch.id}  {batch.title}  ({phase.id})")

    for batch_id in selected_batch_ids:
        phase = PHASE_BY_BATCH_ID[batch_id]
        batch = BATCH_BY_ID[batch_id]
        banner = f"═══ {phase.id} / {batch.id} · {batch.title} ═══"
        print("\n" + c(banner, Colors.BOLD, Colors.BLUE))

        log_path = LOGS_DIR / f"{batch.id}.log"
        t0 = time.time()
        extra_notes: str | None = None
        attempt = 0

        if not args.dry_run:
            mark_batch(state, batch.id, "running")

        while True:
            rc, prompt_path, codex_output = invoke_codex(
                phase,
                batch,
                codex_cmd,
                log_path,
                args.dry_run,
                attempt=attempt,
                extra_notes=extra_notes,
            )
            elapsed = time.time() - t0

            if rc != 0:
                codex_failure = CodexFailure(
                    exit_code=rc,
                    output=truncate_output(codex_output or "(no output)"),
                )
                if attempt < max_fix_attempts:
                    attempt += 1
                    extra_notes = build_codex_retry_notes(batch, codex_failure, attempt)
                    print(c(f"↺ {batch.id} codex exited with {rc}, retrying ({attempt})", Colors.YELLOW))
                    continue
                if not args.dry_run:
                    mark_batch(
                        state,
                        batch.id,
                        "failed",
                        exit_code=rc,
                        reason="codex_failed",
                        log=display_path(log_path),
                        prompt=display_path(prompt_path),
                        codex_failure={
                            "exit_code": codex_failure.exit_code,
                            "output": codex_failure.output,
                        },
                    )
                print(c(f"✗ {batch.id} codex exited with {rc} ({elapsed:.0f}s)", Colors.RED))
                return rc

            if args.dry_run:
                print(c(f"◌ {batch.id} prompt generated ({elapsed:.0f}s)", Colors.CYAN))
                break

            verify_result = verify_batch(batch, log_path)
            if verify_result.ok:
                mark_batch(
                    state,
                    batch.id,
                    "done",
                    duration_sec=round(elapsed, 1),
                    log=display_path(log_path),
                    prompt=display_path(prompt_path),
                )
                print(c(f"✔ {batch.id} complete ({elapsed:.0f}s)", Colors.GREEN))
                if commit_per_batch:
                    git_commit_batch(batch)
                break

            if attempt >= max_fix_attempts:
                mark_batch(
                    state,
                    batch.id,
                    "failed",
                    reason="verify_failed",
                    log=display_path(log_path),
                    prompt=display_path(prompt_path),
                    verify_failures=[
                        {
                            "cmd": failure.cmd,
                            "exit_code": failure.exit_code,
                            "output": failure.output,
                        }
                        for failure in verify_result.failures
                    ],
                )
                print(c(f"✗ {batch.id} failed verification", Colors.RED))
                return 1

            attempt += 1
            extra_notes = build_verify_retry_notes(batch, verify_result, attempt)
            print(c(f"↺ {batch.id} verification failed, retrying ({attempt})", Colors.YELLOW))

    print("\n" + c("All selected batches completed.", Colors.BOLD, Colors.GREEN))
    return 0


if __name__ == "__main__":
    sys.exit(main())
