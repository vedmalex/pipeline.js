<!-- Template for llm-wiki-* family. Authored under TASK-357. Substituted by skills/llm-wiki-init/scripts/init-node.ts. -->
---
node: /Users/vedmalex/work/pipeline.js_2_13/.llm-wiki
last-check: 2026-06-11T08:51:06.824Z
---

# Health — .llm-wiki

Updated by llm-wiki-maintain. Reflects current node health state.

## Last Check

- Date: 2026-06-11T08:51:06.824Z
- Status: uninitialized

## Open Issues

| Issue | Severity | Detected | File |
|---|---|---|---|
| (none at init) | — | — | — |

## Hierarchy Signals

Mechanically-stored counters evaluated by llm-wiki-maintain on each run.

| Counter | Value | Threshold | Action when crossed |
|---|---|---|---|
| index_lines | 0 | >=80 | Split node by topic |
| entity_mentions | 0 | >=3 | Create entity page |
| recurring_lint_findings | 0 | >=3 | Create concept page from finding domain |
| sources_entries | 0 | >=15 | Add provenance summary section |
| open_questions | 0 | >=10 | Review question clusters |

## Findings Seen

Tracks lint finding fingerprints across maintain runs.
Fingerprint = first 12 hex chars of SHA-256(`<rule-id>:<file-path>:<message-template>`).
Updated by `llm-wiki-maintain` on each run: increment Count if fingerprint exists; insert new row if absent.
The `recurring_lint_findings` counter = rows where Count >= 3.

| Fingerprint | First seen | Last seen | Count |
|---|---|---|---|
| (none yet) | — | — | 0 |

## Maintenance History

See [log.md](./log.md) for detailed operation history.
