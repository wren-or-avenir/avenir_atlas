# Avenir Atlas

Astro 7 + TypeScript personal site. Keep repository instructions project-specific; do not duplicate general agent policy here.

## Working agreement

- Infer intent and carry requested work through implementation and proportionate verification.
- Decide low-risk, reversible details autonomously. Ask only when a choice can materially change the result, requires new authority, or is destructive or difficult to reverse.
- While waiting for an answer, continue any useful work that does not depend on it.
- User instructions override repository skills and conventions. If instructions conflict, follow the higher-priority instruction and mention only conflicts that affect the outcome.
- Inspect the current implementation and relevant callers before editing. Preserve unrelated user changes.
- Prefer the smallest complete change, existing patterns, platform features, and installed dependencies. Do not add speculative abstractions or dependencies.
- Use subagents only when the environment permits them and two or more substantial, independent tasks can run in parallel. Keep small or tightly coupled work in the primary agent.

## Project sources of truth

Read only the documents relevant to the task:

- Architecture and dependency boundaries: `docs/design/structure.md`
- Visual behavior: `docs/design/visual_design.md`
- Content and product intent: `docs/design/content.md` and `docs/design/design_concept.md`
- Current work: `docs/todo/current.md`; deferred work: `docs/todo/backlog.md`
- Local and production operation: `docs/startup/debug.md` and `docs/startup/production.md`
- Development workflow: `docs/design/development_bible.md`

For routing, Astro components, framework components, content collections, styling, or internationalization, consult the matching guide at https://docs.astro.build when local code and documentation do not settle the question.

## Development

- Follow the architecture in `docs/design/structure.md`; update that document only when the architecture changes.
- Fix root causes at the shared boundary after checking all callers.
- Add or update tests for meaningful behavior changes. Do not add tests that only mirror a trivial implementation.
- Run the narrowest relevant check first. Broaden verification only when risk, failures, or project-wide changes justify it.

```powershell
npm test
npm run typecheck
npm run build
```

Start Astro only in background mode:

```powershell
npx astro dev --background
npx astro dev status
npx astro dev logs
npx astro dev stop
```

## Communication

Lead with the outcome. Use concise plain language and the user's language. Report changed files, checks run, and any unresolved issue; use lists only when they improve clarity.
