# Roadmap: Compiled Executor Evolution

**ID:** `RM-001`
**Status:** in_progress
**Created:** 2026-03-08
**Progress:** 3/4 phases completed
**Source:** `memory-bank/docs/compiled-executor-roadmap.md`

---

## Phase 1: Core Executor Foundation — completed
- **ID:** `RMP-001`
- **Goal:** Build the compiled executor core, error model, native control-flow lowering, and default fast-path policy.
- **Tasks:**
  - [x] `TASK-008` — Compiled Iterative Executor
  - [x] `TASK-009` — Performance Research + Default Fast Path
  - [x] `TASK-010` — CleanError + Error Taxonomy
  - [x] `TASK-011` — Compile-native IfElse + Wrap
  - [x] `TASK-012` — Compile-native DoWhile + RetryOnError
  - [x] `TASK-013` — Compile-native Sequential
  - [x] `TASK-014` — Timeout Boundary + Compiled Error Boundaries
- **Dependencies:** none

## Phase 2: Parallel and Cancellation Extensions — completed
- **ID:** `RMP-002`
- **Goal:** Extend the executor with parallel joins, abort delivery, and public execute-level signals.
- **Tasks:**
  - [x] `TASK-015` — Compile-native Parallel MVP
  - [x] `TASK-016` — Parallel Bounded Concurrency
  - [x] `TASK-017` — Parallel Join Any MVP
  - [x] `TASK-018` — Parallel Quorum MVP
  - [x] `TASK-019` — Parallel Trailing Drain MVP
  - [x] `TASK-020` — Parallel Trailing Drain Timeout MVP
  - [x] `TASK-021` — Abort Signal Contract + Timeout Delivery
  - [x] `TASK-022` — Parallel Abort Delivery
  - [x] `TASK-023` — Public Execute AbortSignal API
- **Dependencies:** `RMP-001`

## Phase 3: Semantic Stabilization and Blind-Spot Cleanup — completed
- **ID:** `RMP-003`
- **Goal:** Stabilize semantics first, then remove the remaining low-risk compiler blind spots.
- **Tasks:**
  - [x] `TASK-024` — Semantic Contract Stabilization
  - [x] `TASK-025` — Compile-native Empty Lowering
  - [x] `TASK-026` — Compile-native MultiWaySwitch
  - [x] `TASK-027` — Devirtualize Plain Stage Instances
- **Dependencies:** `RMP-002`

## Phase 4: Future Composition and Profiling — in_progress
- **ID:** `RMP-004`
- **Goal:** Decide the next move from fresh benchmark medians instead of continuing blind opcode growth, and only pursue nested compiled subplans if they beat simpler alternatives on the right workloads.
- **Tasks:**
  - [x] `TASK-029` — Benchmark-Guided Roadmap Review
  - [~] `TASK-030` — Nested Compiled Subplans / `CALL_SUBPLAN` Investigation
- **Dependencies:** `RMP-003`
