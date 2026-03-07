# Current Context — TASK-008 IMPLEMENT

**Task:** Compiled Iterative Executor — replace recursive declarative dispatch
**Phase:** IMPLEMENT
**Profile:** creative-first (T4:standard, qaLevel=MAX, INTERACTIVE=false)
**Date:** 2026-03-07
**Branch:** master | Active task pointer: `memory-bank/system/current-task.txt` -> `TASK-008`

---

## Current Status

TECH_SPEC passed the second `mb3-critic` pass with **PROCEED**.

The task has now entered IMPLEMENT with a phase-1 compiled skeleton in place.

---

## Implemented So Far

### New internal modules

- `src/compiled/plan.ts`
- `src/compiled/compiler.ts`
- `src/compiled/executor.ts`
- `src/compiled/debug.ts`

### Current phase-1 behavior

- `compilePipelinePlan()` builds a linear `CompiledPlan` for static/nested `Pipeline`
- nested `Pipeline` nodes are flattened into one plan
- unsupported wrapper stages become `RUN_FALLBACK_STAGE`
- `executeCompiledPlan()` runs the phase-1 opcode subset iteratively
- `Pipeline` is wired to the compiled path behind a controlled internal switch:
  - env: `PIPELINE_USE_COMPILED=1`
  - test helper: `__setCompiledPipelineEnabledForTests(true|false|undefined)`

This means the compiled executor exists and is testable, but is not yet active by default in production runtime.

---

## Validation Status

- `bun test` -> **323/323 pass**
- `npx tsc --noEmit` -> **0 errors**
- dedicated deep stress script -> pass:
  - `Pipeline` depth `20k`
  - `Wrap` depth `10k`
  - `IfElse` depth `10k`
  - `Timeout` depth `10k`
  - mixed nesting depth `10k`

Heavy `10k–20k` stack checks now live in:

- `benchmark/compiled-stack-safety.stress.ts`

Compiled executor comparison now exists in:

- `benchmark/compiled-executor.bench.ts`

Recent post-specialization benchmark window (two passes, 10+ stage linear fit):

- flat `Pipeline` legacy slope: ~`0.288-0.301 µs/stage`
- flat runtime-compiled slope: ~`0.053-0.058 µs/stage`
- flat direct-compiled slope: ~`0.011-0.038 µs/stage`
- nested `Pipeline` runtime-compiled spot checks remain materially faster, though larger nested cases still show some run-to-run variance.

Most recent optimization in this phase:

- removed O(N) full-plan cache validation from the runtime-compiled `Pipeline` path;
- parent-propagated invalidation now bumps graph version transitively for nested `Pipeline` mutations;
- cache hit validation is O(1) on the hot path;
- preclassified `RUN_STAGE_FN` signatures at compile time and specialized direct execution for common `fn0`/`fn1`/`fn2`/`fn3` forms;
- new parity tests cover cached plan reuse, parent invalidation, zero-arg sync/async stages, and `err+ctx` / `err+ctx+done` signatures.

Fast regression depths remain in default test suite so `bun test` stays quick and stable.

---

## Rollout Decision in IMPLEMENT

Keep the compiled path opt-in for one more slice.

The new executor numbers are strong enough to justify a broader targeted rollout for compile-supported `Pipeline` graphs, but not a global default-on switch yet because:

1. phase 1 still compiles only `Pipeline` and relies on hybrid fallback for wrappers;
2. larger nested benchmarks still show visible run-to-run variance;
3. wrapper-heavy and mixed fallback graphs need one more parity/benchmark pass before default enablement.

---

## Next Recommended Action

Continue IMPLEMENT with a controlled rollout-hardening slice:

1. expand parity coverage for mixed hybrid graphs (`Pipeline` + wrapper fallback combinations)
2. measure compiled-static vs compiled-hybrid plans separately in `benchmark/compiled-executor.bench.ts`
3. consider default-on only for fully compiled-static `Pipeline` plans after one more stable benchmark window
