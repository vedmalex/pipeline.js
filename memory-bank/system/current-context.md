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

- `bun test` -> **319/319 pass**
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

Current benchmark snapshot:

- flat `Pipeline` legacy slope: ~`0.475 µs/stage`
- flat runtime-compiled slope: ~`0.426 µs/stage`
- flat direct-compiled slope: ~`0.124 µs/stage`
- nested `Pipeline(100)` runtime path: `115.8 µs -> 71.4 µs`

Fast regression depths remain in default test suite so `bun test` stays quick and stable.

---

## Primary Open Question in IMPLEMENT

Should the next slice:

1. keep the compiled path opt-in and expand parity/fallback coverage further, or
2. harden and selectively broaden the runtime-compiled `Pipeline` path before enabling it by default?

---

## Next Recommended Action

Continue IMPLEMENT with the first real runtime slice:

1. add parity tests comparing legacy vs compiled execution for more `Pipeline` scenarios
2. use `benchmark/compiled-executor.bench.ts` to track slope changes while expanding support
3. decide whether to keep `Pipeline` opt-in for one more slice or begin a controlled default-on rollout
