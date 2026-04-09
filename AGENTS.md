<!-- BEGIN:nextjs-agent-rules -->

# Next.js: ALWAYS read docs before coding

Before any Next.js work, find and read the relevant doc under `node_modules/` in the Next.js docs directory (`next/dist/docs/`). With pnpm, the path is nested under `node_modules/.pnpm/next@*/node_modules/next/dist/docs/` — use a glob like `**/next/dist/docs/**/*.md` to locate it regardless of package manager. Your training data is outdated — the docs are the source of truth.

<!-- END:nextjs-agent-rules -->
