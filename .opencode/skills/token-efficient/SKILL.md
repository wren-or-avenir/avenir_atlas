---
name: token-efficient
description: Use when starting any task in this repo. Cuts token usage and speeds up work: batch parallel tool calls, search before reading, avoid re-reading, delegate broad searches to the explore subagent, minimize output. Trigger keywords: token, efficient, 省token, save tokens.
---

# Token-efficient workflow

Hard rules. Apply every turn.

1. Batch independent tool calls into one message. Never wait for one result before issuing another when they don't depend.
2. Search first, read second. Use grep/glob to locate; read only matching files and needed lines. Count matches with `rg` directly.
3. Never re-read a file already read this session — trust context.
4. Read in big windows (2000 lines default). No tiny repeated slices.
5. Delegate broad/open-ended codebase searches to the `explore` subagent (quick thoroughness); it returns a compact summary and keeps main-thread context lean.
6. Minimal output: one line if it suffices. No preamble, no recap, no code explanation unless asked.
7. Prefer `edit` with the smallest diff; never rewrite whole files for small changes.
8. Use todowrite only for 3+ step tasks.
9. Don't start dev server, build, or heavy commands unless the task requires them.
10. Verify with the smallest command that proves correctness; skip unrelated checks.
