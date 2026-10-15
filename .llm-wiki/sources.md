<!-- Template for llm-wiki-* family. Authored under TASK-357. Substituted by skills/llm-wiki-init/scripts/init-node.ts. -->
---
node: /Users/vedmalex/work/pipeline.js_2_13/.llm-wiki
updated: 2026-06-11T08:51:06.824Z
---

# Sources — .llm-wiki

Source/provenance registry. One row per ingested source. Append-only.

link_mode values: `symlink` | `move` | `copy`
Extractor values: `none` or extractor script name relative to `.extractors/` or `extractors/`.
Source ID: stable slug derived from basename + ingest date (e.g., `task-001-2026-05-18`).
Source hash: SHA-256 first 12 hex chars of file content (or recursive hash for dirs).
Original path: absolute pre-ingest location (preserved after move for audit/recovery).

Optional git columns (UR-040, tech-spec §24.19): when the source resolves inside a
git repository at ingest time, link-source.ts appends three trailing columns
to the row — `git_head_sha`, `git_branch`, `git_last_commit_date` — used by
re-ingest drift detection and the `code.*` lint rules. Rows without these
columns remain valid (backward-compatible).

Freshness columns (TASK-358 §3): six trailing columns added by change-detector.ts:
`last_checked_at`, `freshness_status`, `last_change_detected_at`, `source_mtime`,
`http_last_modified`, `http_etag`. Rows with 7, 11, or 17 columns are all valid.
See `skills/llm-wiki-maintain/references/sources-md-schema.md` for full schema reference.

| Source ID | Type | Path in raw/ | Original path | link_mode | Source hash | Ingested | Extractor (if any) | git_head_sha (opt) | git_branch (opt) | git_last_commit_date (opt) | last_checked_at | freshness_status | last_change_detected_at | source_mtime | http_last_modified | http_etag |
|-----------|------|--------------|---------------|-----------|-------------|----------|--------------------|--------------------|------------------|----------------------------|-----------------|------------------|-------------------------|--------------|--------------------|-----------|
| (empty — populated by llm-wiki-ingest) | — | — | — | — | — | — | — | — | — | — |  |  |  |  |  |  |
| roadmap-rm001 | file | raw/roadmap-rm001 | /Users/vedmalex/work/pipeline.js_2_13/memory-bank/system/roadmap.md | symlink | 7254e83db45a | 2026-06-11T08:52:06.577Z |  | 770d891596ebc065f19bf8808cc83772bff6890f | master | 2026-03-06T19:02:55+03:00 |   |  |  |  |  |  |
| compiled-executor-roadmap | file | raw/compiled-executor-roadmap | /Users/vedmalex/work/pipeline.js_2_13/memory-bank/docs/compiled-executor-roadmap.md | symlink | f2b4981a5ac7 | 2026-06-11T08:52:06.654Z |  | 770d891596ebc065f19bf8808cc83772bff6890f | master | 2026-03-07T22:59:07+03:00 |   |  |  |  |  |  |
| flow-control-adoption | file | raw/flow-control-adoption | /Users/vedmalex/work/pipeline.js_2_13/memory-bank/docs/flow-control-primitives-adaptation-conclusion.md | symlink | 5416b28dd244 | 2026-06-11T08:52:06.697Z |  | 770d891596ebc065f19bf8808cc83772bff6890f | master | 2026-03-07T16:52:55+03:00 |   |  |  |  |  |  |
| context-contract-spec | file | raw/context-contract-spec | /Users/vedmalex/work/pipeline.js_2_13/memory-bank/docs/context-contract-spec.md | symlink | 681f9b476ed3 | 2026-06-11T08:52:06.741Z |  | 770d891596ebc065f19bf8808cc83772bff6890f | master | 2026-03-07T22:59:07+03:00 |   |  |  |  |  |  |
| mws-semantic-spec | file | raw/mws-semantic-spec | /Users/vedmalex/work/pipeline.js_2_13/memory-bank/docs/mws-semantic-spec.md | symlink | bfcb71b9d243 | 2026-06-11T08:52:06.790Z |  | 770d891596ebc065f19bf8808cc83772bff6890f | master | 2026-03-07T22:59:07+03:00 |   |  |  |  |  |  |
| migration-policy-spec | file | raw/migration-policy-spec | /Users/vedmalex/work/pipeline.js_2_13/memory-bank/docs/migration-policy-spec.md | symlink | 14a5b7cea811 | 2026-06-11T08:52:06.842Z |  | 770d891596ebc065f19bf8808cc83772bff6890f | master | 2026-03-07T22:59:07+03:00 |   |  |  |  |  |  |
