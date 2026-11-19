# agent-qa-knowledge

The committed knowledge root for this project's QA agent. Everything the agent
learns and everything you author for it lives under this one directory.

## Two shelves

- **Learned shelf** (`memory/`, created by the first record write): durable
  records the agent distills from runs — facts, cautions, selectors, flows.
  Each record is a self-sufficient bundle directory: the fact, its evidence,
  and its provenance travel together.
- **Authored shelf** (`policies/` now; `skills/` arrives with its feature):
  content people write — QA rules, agent skills.

Only `policies/` exists after init; the other directories are created on
first use.

## How to read a knowledge change

- `record.md` is the fact: what the agent now believes, in plain prose.
- `evidence/outcomes.jsonl` is the evidence: the append-only outcome log the
  belief rests on.
- Trust is derived by code from the outcome log.

## Changing knowledge

Never edit the learned shelf by hand — not the fact, the evidence, trust
counters or status fields. Learned knowledge changes only through agent-qa: a
run mark, or `agent_qa_change_knowledge` to accept, reject or forget a
record. Each change applies at once and shows up here. Wrong knowledge is
corrected by new feedback (a run mark) or by forgetting the record. The one
shelf people write by hand is `policies/` (below).

## Committed vs. gitignored

`git diff` shows exactly what the agent learned. The `.gitignore` in this
directory enforces the split:

- `memory/index/` — derived search index; rebuildable from records, never committed.
- `memory/queue/`, `.lease`, `.epoch` — machine-local curation runtime state.
- `.writer-authority.sqlite*` — the local writer-authority database and its -wal/-shm/-journal files.
- `memory/*/bundles/.staging/` — a bundle being published; present only if a publish was interrupted.
- `**/artifacts/` — binary blobs (screenshots, DOM snapshots, HAR). Excluded
  from git by default; artifact *inventories* are text, live outside
  `artifacts/`, and are committed.
- `skills/.staging/` — machine-local scratch space for skill writes, never committed.

Everything else — every `*.md` and `*.json`/`*.jsonl` of distilled or
authored text — is committed, so `git diff` and `git log` show it.

## How to write policies

QA rules live in `policies/` as plain markdown — one rule per line, in
imperative English. Start with `policies/global.md` (its header comment
teaches the format); add `policies/<product>.md` siblings for product-scoped
rules. Policies are sovereign: served to the agent verbatim on every run.

## Reading knowledge

`AGENTS.md` in this directory lists the agent-qa commands and MCP tools that
answer questions about runs and records. Answer from them rather than from a raw
`record.md`: trust, validity and supersession are worked out when you ask.
