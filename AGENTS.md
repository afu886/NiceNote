# AGENTS.md

## Project Positioning

NiceNote is a cross-platform note-taking app targeting Web, Desktop, and Mobile. The primary implemented surfaces today are Web and Desktop; Mobile is still an experimental React Native shell, so do not assume it is wired to the shared data layer or editor bridge.

The most important product invariant: **user note content is persisted only as Markdown**. Tiptap / ProseMirror is the rich-text model used while editing; do not save ProseMirror JSON as note content.

Technical baseline: pnpm 10.28.2 + Turborepo, strict TypeScript, React 19, Vite 7, TailwindCSS v4, Zustand, Tiptap v3, Tauri v2 / Rust, and Vitest. CI currently uses Node 20.

## Current Repository Map

```text
apps/
  web/                  # React + Vite Web host; src/host bootstraps the runtime; src/runtime + src/adapters hold the localStorage repositories
  desktop/
    frontend/           # React + Vite Tauri host; src/host bootstraps the runtime; src/runtime holds Tauri repositories; IPC goes through src/bindings/tauri.ts
    src-tauri/          # Rust commands/services/db; filesystem .md files are Desktop's note source of truth
  mobile/               # React Native 0.79; minimal navigation shell only, not wired to the shared runtime

packages/
  core/                 # Shared business core: NoteId/TagId brand types, repository ports, usecases, capability model, Markdown rules, i18n catalog, reusable contract-test suites (no React/Tauri/localStorage)
  app-dom/              # Web/Desktop shared React DOM product UI + unified Zustand view state; consumes an AppRuntime
  editor/               # Tiptap editor; Markdown read/write helpers and toolbar (UI primitives from @topicly-ui/react)
  ui/                   # Radix web UI primitives, hooks, cn() — still consumed by app-dom; being migrated to @topicly-ui
  tokens/               # Design token sources and generated-tokens.css generator — still consumed by Web/Desktop; being migrated to @topicly-ui/tokens
  shared/               # Slim platform/business-agnostic utilities and lightweight types
  editor-bridge/        # Experimental native WebView editor bridge
```

The unified domain model lives in `packages/core` (there is no separate `packages/domain`). Platform repository implementations live in each app's `src/runtime/`, never in shared packages. `packages/app-shell` was dismantled into `core` + `app-dom`; the experimental `database` / `ui-native` packages were removed.

## Agent Working Rules

- Read the relevant files before editing. Act on the real code, not on filenames or stale docs alone.
- Prefer the shortest correct path; reuse existing capabilities from `packages/core`, `packages/app-dom`, `packages/shared`, `packages/ui`, and `packages/editor`.
- When changing shared code under `packages/`, check the Web, Desktop, and Mobile/experimental native consumers. Even if Mobile is not wired yet, avoid breaking package boundaries.
- Remove replaced obsolete code; do not keep compatibility layers with no callers.
- New internal package dependencies must use `workspace:*`.
- Shared package public APIs should be exported through `src/index.ts` or `src/index.tsx`; `packages/editor` also explicitly exports `./styles/editor.css`.
- Code comments should be written in Chinese, and only add comments when they clarify complex logic.
- TypeScript changes must account for `strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, and `noUnused*`.
- ESLint checks import ordering, React hooks, a complexity limit of 25, and Tailwind class ordering. Tailwind arbitrary values are forbidden in Web/editor/ui; prefer tokens, CSS variables, or existing utilities.

## Data and Persistence Boundaries

- Editor: use Markdown paths such as `readEditorMarkdown()` / `writeEditorMarkdown()` or `editor.storage.markdown.getMarkdown()`; do not persist `editor.getJSON()`.
- Desktop: `.md` files are the source of truth for notes. SQLite is only for cache/settings-like data such as settings, recent folders, favorites, and tag colors; do not write note body content to SQLite.
- Desktop note I/O changes should start in `apps/desktop/src-tauri/src/services/note_io.rs`; frontmatter logic should start in `services/frontmatter.rs`.
- Web: current data lives in `apps/web/src/adapters/local-storage-note-repository.ts` (tags use dedicated localStorage keys), wrapped to the `core` repository contracts via `apps/web/src/runtime/*.adapter.ts`. Do not reintroduce the removed remote API layer.
- Mobile: `apps/mobile` is a minimal navigation shell, not wired to the shared `core` runtime or `@nicenote/editor-bridge`. The experimental `@nicenote/database` / `@nicenote/ui-native` packages were removed; a Mobile data layer would be implemented under `apps/mobile/src/runtime`. Confirm the current state before designing Mobile wiring.

## Desktop IPC Change Path

Desktop frontend UI / store code must not call Tauri `invoke` directly. The only approved centralized location for `invoke` calls is `AppService` in `apps/desktop/frontend/src/bindings/tauri.ts`.

When adding or changing IPC, check this path in order:

1. Rust command: `apps/desktop/src-tauri/src/commands/*.rs`; Tauri commands return `Result<T, String>`.
2. Rust service: `apps/desktop/src-tauri/src/services/*.rs`; internal logic uses `anyhow::Result<T>`.
3. Convert errors at the command boundary with `map_err(|e| e.to_string())` or an equivalent approach.
4. Register the command in `tauri::generate_handler![]` in `apps/desktop/src-tauri/src/lib.rs`.
5. Add or update types and the `AppService` method in `apps/desktop/frontend/src/bindings/tauri.ts`.
6. UI/store code should call only `AppService`, not scatter command strings through components.

Web and Desktop now share one unified Zustand view-state store in `packages/app-dom/src/state/` (built on `core` usecases over the injected `AppRuntime`); the old `apps/desktop/frontend/src/store/useDesktopStore.ts` and `apps/web/src/store/*` were removed. Coordinate cross-state behavior in `app-dom` state or at the component/Hook layer, and inspect the existing pattern before splitting it.

## Frontend and UI Conventions

- Web and Desktop frontend both import design tokens from `@nicenote/tokens/generated-tokens.css`, `token-utilities.css`, and `token-base.css`. Do not hand-edit generated output; change `packages/tokens/src` and run the generator.
- Prefer Web UI components from `@nicenote/ui`; compose styles with `cn()` from `packages/ui/src/lib/utils.ts`.
- Prefer `lucide-react` for icons; prefer the existing Radix-based primitives for interactive controls.
- Theme and language application logic lives in `@nicenote/app-dom` helpers such as `applyThemeToDOM` and `applyLanguageToDOM` (internal to the package). When changing theme or language behavior, check the Web and Desktop providers/state.
- Do not use blocking interactions such as `window.prompt` for editor link editing; use non-blocking UI such as Popover or Modal.

## Common Commands

From the repository root:

```bash
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test -- --coverage
```

Prefer smaller validation commands based on the change surface:

```bash
pnpm --filter @nicenote/web test
pnpm --filter @nicenote/web build
pnpm --filter @nicenote/desktop build:frontend
pnpm --filter @nicenote/editor test
pnpm --filter @nicenote/core test
pnpm --filter @nicenote/app-dom test
pnpm --filter @nicenote/shared test
pnpm --filter @nicenote/editor-bridge typecheck
pnpm --filter @nicenote/editor-bridge build:template
```

Desktop/Tauri:

```bash
cd apps/desktop && cargo tauri dev
cd apps/desktop && cargo tauri build
cd apps/desktop/src-tauri && cargo check
```

Mobile:

```bash
pnpm --filter @nicenote/mobile start
pnpm --filter @nicenote/mobile ios
pnpm --filter @nicenote/mobile android
```

## Before Finishing

- Choose the smallest validation set that matches the change surface; expand validation for high-impact changes such as shared packages, editor serialization, and Desktop IPC.
- Tokens changes: run `pnpm --filter @nicenote/tokens build` or the relevant `generate:css`, and confirm Web/Desktop CSS imports still resolve.
- Editor changes: cover Markdown round-trip, source mode, and toolbar/link behavior; at minimum run `pnpm --filter @nicenote/editor test`.
- Desktop IPC changes: verify Rust command registration, frontend bindings, caller types, and `cargo check`.
- Web import/export changes: confirm `.md` / `.markdown` files still use Markdown text and do not introduce JSON body formats.
- Before committing, when time allows, run checks in CI order: `pnpm generate:css`, `pnpm lint`, `pnpm typecheck`, `pnpm test -- --coverage`, `pnpm build`.
