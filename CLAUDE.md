# Claude Instructions

<!-- LLM_WIKI_MANAGED_START -->
## LLM-Wiki

This project contains an LLM-Wiki at `.llm-wiki`. See [AGENTS.md](./AGENTS.md) section "LLM-Wiki" or the wiki node's own [AGENTS.md](.llm-wiki/AGENTS.md) for operating instructions.

For any wiki operation, invoke the `llm-wiki-router` skill — do not call internal llm-wiki-* specialists directly. Scripts refuse to run (exit 1) unless invoked via the router (which sets `LLM_WIKI_VIA_ROUTER=1`) or with `--allow-direct-invocation` flag (debug/CI only).

<!-- LLM_WIKI_MANAGED_END -->

<!-- MB3_MANAGED_START -->
## MB3 Workflow

This repository must be operated through the MB3 workflow.
- Start MB3 work through `mb3` and keep meaningful changes task-backed.
- Use canonical MB3 phases (`VAN -> CREATIVE -> PLAN -> TECH_SPEC -> IMPLEMENT -> QA -> CODE_REVIEW -> REFLECT -> ARCHIVE`) unless the active tier intentionally skips some phases.
- Treat `mb3-critic` as the authoritative Devil's Advocate gate for DA-reviewed phase exits.

### Core MB3 Skills

- `mb3` — unified router and intake entrypoint
- `mb3-phases` — phase execution and exit criteria
- `mb3-critic` — authoritative DA gate and adversarial review
- `mb3-commit` — commit/backlog integration for MB3 tasks

### Common MB3 Commands

**`mb3` is usually NOT on PATH — prefer the MCP twin.** Every verb below has an MCP equivalent, and the MCP tools are the surface a consumer provably has. Reach for the CLI only when you need a daemon-independent path (e.g. the MCP daemon is down).

CLI resolution order: (1) `mb3`, if `command -v mb3` succeeds; (2) `<projectDir>/plugins/bin/mb3` — the location the installer rewrites `${CLAUDE_PLUGIN_ROOT}` to, and the same file as the repo dev wrapper; (3) otherwise use the MCP tool. Note that a literal `$CLAUDE_PLUGIN_ROOT/bin/mb3` resolves ONLY after that installer rewrite — there is no `bin/` inside the plugin directory itself.

- `mb3 create \"Task name\"` — MCP: `mb3_task` action `create`
- `mb3 status` — MCP: `mb3_task` action `status`
- `mb3 phase check-exit` — MCP: `mb3_phase` action `check_exit`
- `mb3 task advance` — MCP: `mb3_task` action `advance`

### Specialist Routing Hints

- `mb3-orchestration-intake` — use when roadmap-backed startup must be shaped and no valid `orchestration_packet` exists yet
- `mb3-smart-executor` — use when a valid `orchestration_packet` already exists and downstream roadmap execution should continue
- `mb3-critic` — use for DA / critic review at gated phase exits or when you want adversarial review

### Model Routing Policy

Axes priority for anything that ships: intelligence > taste > cost (cost is a tie-breaker only). Defaults, not limits — STANDING PERMISSION to escalate (a smarter model / raised effort) when output misses the bar; judge the output, not the price tag.
- mb3-critic (DA gates) ladder: sonnet (default — the CD-39 example's model="sonnet" IS this default rung) → opus + raised effort for T3+ re-gates / write-surface diffs / repeated REVISE → fable for T4+/CREATIVE/architecture-critical gates. CD-39 (main-session-only spawn) and CD-40 (verdict matrix) are UNCHANGED by this policy.
- mb3-implementer: sonnet default; opus for cross-cutting changes; the orchestrator ALWAYS verifies the diff + test teeth (a green report is necessary-not-sufficient).
- Research / causal analysis: sonnet MINIMUM — NEVER haiku for root-cause/causal/review/coverage conclusions.
- Haiku = MECHANICAL-ONLY (locate/enumerate/format).
- User-facing output (docs, CLI/error texts, API design, copy): taste >= 7 → opus/fable.
- External agents (opencode/agy/pi via the ai-connect ACP integration): ADVISORY perspective / bulk-mechanical lane ONLY — NEVER DA-gate-clearing. Codex/gpt-5.5: not used (no subscription).
- Orchestration planning: when a plan spans multiple work-units, decompose into sequential/parallel groups by file/subsystem independence (disjoint-file units run in parallel; shared-file units are sequenced or isolated in separate worktrees); default to the CD-41 orchestrator-fans-out model (1 main + N edit-only subagents on DIFFERENT tasks — no opt-in; parallel DA critics for DIFFERENT (task,phase) gates are safe post-TASK-489, same-gate sequential + main-session-only stay mandatory per CD-39); use Workflow (heavy multi-agent) ONLY where the environment supports it AND on explicit user opt-in (CD-66 E); assign each unit a model + effort by its complexity/tier per this ladder. The plan states the groups, the per-unit model+effort, and which gates are sequenced.
- Availability fallback: fable is reserved for the top rung (extreme-complexity / architecture-critical / T4+ CREATIVE). If fable is UNAVAILABLE (not reachable / not enabled in the environment), AUTO-fall-back to opus + raised effort WITHOUT asking — never a silent downgrade to a weaker tier, never skip the work, never an external model for gate-clearing work (external agents stay advisory-only per CD-39; codex excluded). Top-rung chain: fable → opus.

### DA Gate Emission Policy

- Authoritative DA clearance MUST come from `Agent(subagent_type="mb3-critic")` captured by the post-tool hook.
- Never emit `da_reviewed`, `da_verdict`, `critic_verdict`, or `tier_change` via CLI `event emit` or MCP `mb3_event`. The runtime rejects these paths as RUNTIME_OWNED.
- Advisory `da_review` event remains open for non-authoritative notes; use it for advisory verdicts that do NOT clear gates.
- If the hook silently fails to persist a legitimate critic review, diagnose with `MB3_HOOK_TRACE=1`; do not fabricate a replacement emit.
- Phase state MUST be read from `tasks-registry.jsonl` / `mb3_task(action=\"status\")` — session.jsonl is checkpoint-only (zero `phase_change` events); never read it for phase state.
- The runtime AUTO-captures a da_finding ISS from each `mb3-critic` envelope finding — do NOT manually record envelope findings via `mb3_issue(action=\"note\")`; reserve manual notes for NON-envelope (orchestrator-verify) findings.

### DA Prompt Requirements (mb3-critic spawns)

When spawning `Agent(subagent_type=\"mb3-critic\")`, require: SINGLE-PASS per dispatch (read → judge → emit → RETURN; the REVISE loop is orchestrator-owned across dispatches, never an in-dispatch re-Read/re-emit loop); git-state claims ANCHORED to a review-start `git rev-parse HEAD` SHA and RE-CONFIRMED at verdict emission (report both SHAs); and an iteration count DERIVED from persisted `da_review`/`da_reviewed` events for the (task, phase) pair (a fresh gate with no persisted prior verdict is iteration 1). This is the reliable always-on injection path — the lens-gated `critic-extension-bridge.ts` injection is a no-op on standard gates with no custom lens.
- CD-39 attribution narrowing: concurrent DIFFERENT-task critics are WRITE-atomic (TASK-489) but NOT attribution-safe (a drifted critic's envelope `task_id` is trusted at capture; TASK-530 adds only an advisory signal, not a hard reject) — prefer SEQUENTIAL dispatch when task-attribution certainty matters, until dispatch-context task_id plumbing exists.
- Meta-cognition guard (TASK-544 D3/UR-004): a repeated REVISE is LEGITIMATE design feedback, NOT evidence the gate is broken; a `missing_envelope` / capture-oscillation is an ORTHOGONAL runtime capture-mechanism bug — do NOT conflate them or treat repeated REVISE as a defect that waives the findings.
- Prompt-discipline (TASK-544 D7.2/UR-004): instruct the critic to emit ONLY the clean v2 envelope; free-form CAR analysis goes ABOVE the envelope as PROSE, NEVER as an extra top-level envelope field (`report_markdown` / `rendered_markdown` / `date` / `report` / `summary`). The fenced envelope MUST be the ABSOLUTE FINAL element of the critic's output.
- Custom-lens consumption mandate (TASK-614 / REQ-043): when a gate's `lens_ids` resolve to a plugin-declared `critic.extensions[].lens_file` extension (see `plugin-loader/types.ts` `CriticExtensionDeclaration.lens_file`), the orchestrator MUST call `buildCustomLensInjection(snapshot, lensIds)` (critic-extension-bridge.ts) and include the returned block in the critic prompt, OR give the critic the explicit absolute lens-file path as a self-Read fallback. The critic is `Read`/`Glob`/`Grep`-only with no MCP — without this injection (or path) it cannot see the plugin's lens content at all. Orchestration-discipline only (no runtime spawn-time auto-injector — CD-39); same pattern as the CD-65 inject-requests.md / inject-rendered-evidence rules.
- Scoped re-gate framing (CD-70 (i) / TASK-641): on a re-dispatch after REVISE/BLOCK, the brief MUST present prior remediation as CLAIMS TO VERIFY ("here is what changed — verify it and issue a verdict"), NEVER as settled state ("here is what is already closed") — a fresh spawn drifts into ack-mode from the FRAMING alone, not only from a `SendMessage`-resume. The brief MUST also state that a dispatch emitting no envelope has NOT performed the review (the runtime records `da_extraction_failed` and the verdict is LOST), and that a sound remediation is answered with a PROCEED ENVELOPE, not prose saying so. Full text via `mb3 cd get CD-70`.

### MB3 Interaction Discipline (live-requirement capture)

When MB3 is active, follow-up requirements, agent-found defects, and offered choices MUST be surfaced — never absorbed silently:
- (A) CAPTURE: a user message that adds/changes/extends a requirement MUST be recorded into the canonical surface before (or as) acting, never absorbed silently — ACTIVE task → `mb3_artifact append_ur` (UR); recently-CLOSED task → the USER PICKS which fits: EITHER a FIRST-CLASS `mb3 task reopen` (an auditable RUNTIME_OWNED `reopened` event + a `phase_change` re-entering the phase-at-close so the FRESHNESS ANCHOR MOVES — a stale pre-reopen PROCEED does NOT clear the re-gate; use when the SAME task's scope legitimately reopens) + its UR, OR a continuation task (`continuedFromTaskId`) + its UR (use when it is genuinely NEW downstream work); SYSTEM / cross-task → `mb3_issue request` (REQ) or FT/ISS. Each distinct ask = its OWN UR/REQ.
- (B) VISIBILITY: ALSO surface captured follow-ups AND agent-found defects into the harness-visible todo (TaskCreate / TaskUpdate) for live user observability — dual-tracking: canonical UR/REQ = gate-honesty SoT, visible todo = live status (no numeric priority — reprioritize by which you mark in_progress; dependencies via addBlockedBy / addBlocks; independent by default).
- (C) INTERACTIVE CHOICES: when offering a genuine CHOICE / decision / option-set, present it as an INTERACTIVE DIALOGUE ELEMENT (single/multi-select; use multi-select when several are valid), NOT a plain-text option list. Open-ended / conversational turns stay prose.
- (D) CAPTURE-AND-VERIFY: a captured requirement/fix that touches REAL CODE MUST be implemented THROUGH the tier-appropriate MB3 verification (phases + DA gates), NOT an unverified in-the-flow quick fix — capturing a UR WITHOUT verifying its implementation is fake coverage. Tier-scaled (never bypass, never over-gate): an ACTIVE-task UR → that task's IMPLEMENT/QA gates RE-RUN on the full scope (re-gate when scope grows); a post-CLOSE follow-up → a continuation task with its own tier phases + gates; a small system / cross-task fix → at minimum a T1/T2 patch with IMPLEMENT + the relevant DA gate. Scale rigor to the edit size, but the verification floor is NON-ZERO.
- (E) PARALLELISM-BY-DEFAULT: for parallelizable work, PREFER delegating across subagents (the CD-41 orchestrator-fans-out model) or a Workflow when AVAILABLE, over serial single-threaded execution. Default available-subagent delegation needs NO opt-in; Workflow / heavy multi-agent fan-out is ENVIRONMENT-GATED on an explicit user opt-in (e.g. the Workflow explicit-opt-in / `ultracode` rule) — when opt-in is required and not yet given, OBTAIN it via an interactive AskUserQuestion (per (C)) and confirm by the answer, not a plain-text aside.
- (F) VERIFY-INSTALLED: an interaction/policy rule is NOT done when merely authored — VERIFY it is installed (its managed block reaches the live `CLAUDE.md` via `mb3_project init` / `mb3_trace repair`, and the runtime nudge is confirmed live). Closing a rule task without verifying installation is a gate-honesty violation (extends (D) to the rule's OWN deployment).
- BOUNDARY: do NOT spam requirements — record only genuine added/changed requirements; use interactive elements for genuine discrete choices only.
- Rationale: gate-honesty (the canonical artifact reflects the real scope the gates read) + observability + better UX.

### Orchestration Model-Routing (runtime)

When planning multi-unit work, apply the model-routing policy through the runtime surface — do NOT eyeball model/effort per unit:
- RUN `mb3 model-routing plan --task-ids <id,...>` (or MCP `mb3_model_routing` action `plan`) to get the grouping (parallel vs sequential by disjoint scope), the per-unit `{model, effort}`, the per-group execution vehicle (`fanout` default / `workflow` only on availability + opt-in), and the `sequencedGates` list. It is daemon-independent (works when the MCP daemon is down).
- For a single unit, RUN `mb3 model-routing resolve --role <r> --tier <n> [--phase <p>] [--signals a,b] [--fable-reachable true|false]` (or MCP `resolve`) — it applies the ladder AND the fable→opus availability fallback (`--fable-reachable false` → opus + raised effort, `downgraded:true`; never a silent-weaker tier).
- HONOR the override / external-lane rules: an explicit `override` wins over the selector, but an EXTERNAL model may NEVER run on a gate-clearing unit (e.g. mb3-critic) — external agents are advisory-only (CD-39). The surface REJECTS an external override on a gate-clearing unit.
- This surface is a CALLABLE library the orchestrator consumes, NOT a spawn-time auto-router: you still make the actual `Agent(...)` spawn with the returned model+effort (same no-auto-injector discipline as CD-40 / CD-62 / CD-65).

### Coding Discipline (shared CDs)

Portable coding-discipline rules distributed from the central CD registry. Fetch the full rationale on demand with `mb3 cd get <id>` (CLI, daemon-independent) or the `mb3_cd` MCP tool. These apply in every MB3-managed repo:

- **CD-39** — DA Orchestration: only main session may spawn mb3-critic (TASK-272 verification 2026-05-02)
- **CD-40** — S3 verdict matrix: LOW = advisory carry-forward + WIB enforcement (TASK-378 / S3 alignment 2026-06-09)
- **CD-41** — Main session is orchestrator only: delegate substantial work to subagents (directive 2026-05-02)
- **CD-63** — DST coverage is mandatory for simulatable behavior changes (user directive 2026-06-22)
- **CD-65** — Graceful recovery over rigid reject (flexibility-by-default, stakes-calibrated)
- **CD-66** — MB3 Interaction Discipline: live-requirement CAPTURE, VISIBILITY, INTERACTIVE choices, and CAPTURE-AND-VERIFY (user directive 2026-06-29, TASK-507)
- **CD-68** — Human-in-the-loop authoritative DA gate (user-approval authority, TASK-578)
- **CD-69** — Living-task develop-as-you-go mode (opt-in resident workflow, TASK-579)
- **CD-70** — Incremental (scoped) DA re-review: iteration-1 full, scoped re-dispatch after REVISE under the inductive-coverage contract (TASK-603, REQ-052)
<!-- MB3_MANAGED_END -->
