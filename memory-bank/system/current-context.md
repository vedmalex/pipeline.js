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
- `Pipeline` rollout policy is now guarded by plan mode:
  - fully `compiled-static` plans run on the compiled path by default (`auto` mode)
  - `compiled-hybrid` plans stay opt-in unless forced
  - env: `PIPELINE_USE_COMPILED=1` forces compiled path, `PIPELINE_USE_COMPILED=0` forces legacy path
  - test helper: `__setCompiledPipelineEnabledForTests(true|false|undefined)`

This means the compiled executor is now active by default for the safest phase-1 subset: fully static `Pipeline` graphs without fallback wrappers.

---

## Validation Status

- `bun test` -> **327/327 pass**
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
- `benchmark/compiled-hybrid-profile.bench.ts`

Latest benchmark split by plan mode (10+ stage linear fit):

- compiled-static: legacy ~`0.562 µs/stage`, runtime-compiled ~`0.304 µs/stage`, direct-compiled ~`0.100 µs/stage`
- compiled-hybrid: legacy ~`1.813 µs/stage`, runtime-compiled ~`1.137 µs/stage`, direct-compiled ~`3.430 µs/stage`
- nested `Pipeline` runtime-compiled spot checks still show strong wins: `10` stages `18.60 -> 5.55 µs`, `50` stages `62.74 -> 12.18 µs`, `100` stages `325.83 -> 23.29 µs`

Hybrid fallback profiling result:

- single fallback stages (`Wrap`, `IfElse`, `Timeout`) are not individually slower on direct compiled execution than on runtime-compiled execution;
- the large regression appears when many fallback ops are chained in one hybrid plan, which points more to repeated executor suspend/resume + fallback boundary overhead than to raw wrapper-stage cost alone.

Most recent optimization in this phase:

- removed O(N) full-plan cache validation from the runtime-compiled `Pipeline` path;
- parent-propagated invalidation now bumps graph version transitively for nested `Pipeline` mutations;
- cache hit validation is O(1) on the hot path;
- preclassified `RUN_STAGE_FN` signatures at compile time and specialized direct execution for common `fn0`/`fn1`/`fn2`/`fn3` forms;
- benchmark now reports compiled-static and compiled-hybrid lanes separately;
- added `benchmark/compiled-hybrid-profile.bench.ts` to isolate single-fallback costs;
- new parity tests cover cached plan reuse, parent invalidation, zero-arg sync/async stages, `err+ctx` / `err+ctx+done` signatures, and mixed wrapper-heavy hybrid graphs;
- guarded default-on is now enabled only for fully `compiled-static` `Pipeline` plans;
- TypeScript build info was moved to `.cache/tsconfig.tsbuildinfo` so `npx tsc --noEmit` no longer churns the tracked repo root.

Fast regression depths remain in default test suite so `bun test` stays quick and stable.

---

## Rollout Decision in IMPLEMENT

Guarded default-on is now enabled for fully compiled-static `Pipeline` plans only.

Hybrid and wrapper-heavy graphs remain opt-in because:

1. phase 1 still compiles only `Pipeline` and relies on hybrid fallback for wrappers;
2. compiled-hybrid plans still improve under runtime-compiled mode but direct-compiled fallback-heavy graphs are measurably worse than legacy in the latest profile window;
3. hybrid fallback cost needs a dedicated optimization pass before broader default enablement.

---

## Next Recommended Action

Continue IMPLEMENT with hybrid-hardening + semantics work:

1. reduce repeated suspend/resume and fallback-dispatch overhead in hybrid compiled plans
2. audit error propagation semantics across compiled function ops, fallback stage ops, and `Stage.rescue()` boundaries
3. keep hybrid/wrapper-heavy graphs on the opt-in path until fallback overhead and error-flow parity are verified
