# Project rules

Read `CLAUDE.md`, `docs/MVP_SCOPE.md`, and `docs/ARCHITECTURE.md` before changing behavior.

- Preserve the boundary between observation, recommendation, and confirmed purchase.
- Model output never writes storage directly; writes go through validated tools.
- Price claims must name their evidence source and confidence.
- Keep the local repository working without external services.
- Do not add product scope without a real usage observation in `docs/BUILD_LOG.md`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
