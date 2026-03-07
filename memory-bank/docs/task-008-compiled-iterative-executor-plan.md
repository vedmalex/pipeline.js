# TASK-008 — Compiled Iterative Executor Plan

## Goal

Replace recursive declarative-stage dispatch with a compiled iterative executor so that:

- deeply nested declarative graphs do not grow the JS call stack;
- flat pipelines pay a predictable linear per-stage cost;
- compile-time flattening removes wrapper overhead where structure is static;
- existing public API (`Stage`, `Pipeline`, `Wrap`, `IfElse`, `Timeout`, etc.) remains source-compatible.

## Why This Task Exists

TASK-007 proved two things:

1. Flat `Pipeline` cost is mostly dispatch overhead, not user work.
2. Deeply nested stage graphs (`Pipeline -> Wrap -> IfElse -> Timeout -> ...`) can still create recursive dispatch pressure unless guarded by a trampoline.

The current trampoline in `src/utils/run_or_execute.ts` is a tactical fix. It prevents stack overflow, but it is still a reactive runtime guard layered on top of a recursive architecture.

This task proposes a strategic redesign:

- compile declarative stage graphs into a linear execution plan (IR);
- run that plan via an explicit interpreter loop and frame stack;
- keep direct fallback for dynamic/user-defined function stages.

## Non-Goals

- No JS source-string code generation in phase 1.
- No change to external stage authoring style.
- No attempt to fully compile arbitrary user callbacks.
- No semantic changes to rescue/ensure/validate behavior.

## Target Architecture

### 1. `CompiledPlan`

Introduce a compact internal representation for declarative stage graphs.

Proposed shape:

```ts
type PlanOp =
  | { op: 'RUN_STAGE_FN'; stageId: number }
  | { op: 'RUN_STAGE_INSTANCE'; stageId: number }
  | { op: 'JUMP'; target: number }
  | { op: 'JUMP_IF_TRUE'; predicateId: number; target: number }
  | { op: 'PUSH_FRAME'; frame: FrameKind; data?: any }
  | { op: 'POP_FRAME' }
  | { op: 'FORK_PARALLEL'; planIds: number[] }
  | { op: 'JOIN_PARALLEL'; joinId: number }
  | { op: 'RETRY'; retryId: number }
  | { op: 'LOOP'; loopId: number }
  | { op: 'RETURN' }

type CompiledPlan = {
  version: 1
  entry: number
  ops: PlanOp[]
  metadata: {
    flattenedStages: number
    containsDynamicBranches: boolean
    containsParallel: boolean
  }
}
```

Notes:

- IR does not need to be public.
- IDs point into side tables with closures / Stage instances / predicates / combine functions.
- The plan must be serializable enough for debugging/inspection, even if side tables are runtime-only.

### 2. Explicit Executor

Add an iterative executor that operates on:

- `pc` — program counter
- `context`
- `error`
- explicit `frameStack`
- optional `taskQueue` / `microtaskYieldCounter`

Core contract:

- no recursive `Stage -> Stage` calls for compiled declarative segments;
- recursion is replaced by `while (pc < ops.length)` and frame transitions;
- when a dynamic async boundary is hit, the executor suspends and resumes with saved state.

### 3. Compile-Time Flattening

The compiler should flatten static declarative structures before execution.

Safe early targets:

- nested `Pipeline`
- `Wrap` with static `prepare/finalize`
- `IfElse` with boolean `condition`
- `Timeout` wrappers
- `Empty`

Expected result:

- `Pipeline([Pipeline([A,B]), Pipeline([C])])` -> `[A,B,C]`
- `IfElse({ condition: true, success: A, failed: B })` -> `[A]`
- wrapper stacks become metadata/frame ops instead of nested runtime dispatch.

### 4. Hybrid Fallback Model

Not every stage can be fully compiled.

Use three execution modes:

1. `compiled-static` — fully linear plan
2. `compiled-hybrid` — linear shell with dynamic callback/function ops inside
3. `legacy-runtime` — existing dispatch path for unsupported constructs

This enables gradual rollout without breaking semantics.

## Proposed Implementation Phases

### Phase A — Scaffolding

- Add `CompiledPlan` types and side tables.
- Add executor skeleton with explicit frame stack.
- Add debug dump helper: `planToString(plan)`.
- Add feature flag / internal switch so old and new runtimes can coexist during migration.

### Phase B — Flat Pipeline Compiler

- Compile `Pipeline` into a linear list of `RUN_*` ops.
- Keep function stages as side-table entries.
- Execute pipeline without recursive `run_or_execute` between child stages.
- Benchmark slope on `Pipeline(N)` before/after.

### Phase C — Wrapper Flattening

- Add compile support for `Wrap`, `IfElse`, `Timeout`, `Empty`.
- Convert nested wrappers into frame ops / jumps.
- Remove need for trampoline in these compiled paths.

### Phase D — Control Flow Nodes

- Add `RetryOnError`, `DoWhile`, `Sequential` using explicit loop/retry frames.
- Ensure current optimized hot paths from TASK-007 are preserved or improved.

### Phase E — Fan-out Nodes

- Add `Parallel` and `MultiWaySwitch` support.
- Parallel remains async/fan-out, but parent executor stays iterative.
- Join behavior must preserve current error aggregation semantics.

### Phase F — Rollout + Cleanup

- Turn compiled executor on by default for supported graphs.
- Keep legacy fallback for unsupported/dynamic edge cases.
- Revisit trampoline usage: retain only as emergency safety net or remove from compiled paths.

## Technical Risks

### Risk 1 — Semantic Drift

Compile-time flattening can accidentally change:

- context mutation ordering;
- rescue propagation;
- boolean branch behavior;
- timeout overdue precedence;
- callback-vs-promise timing.

Mitigation: differential tests against the current runtime.

### Risk 2 — Cache Invalidation

Plans become stale if a stage graph mutates after compile.

Mitigation:

- invalidate plan on `addStage`, config mutation, or `compile(true)`;
- version compiled plans and cache only immutable snapshots.

### Risk 3 — Debuggability

Linear IR can be faster but harder to inspect.

Mitigation:

- plan dump formatter;
- metadata counters (`flattenedStages`, `yieldCount`, `fallbackOps`);
- optional trace mode for executor steps.

## Test Strategy

### 1. Differential Semantics Tests

For every supported stage type, run the same input through:

- legacy runtime
- compiled executor

and assert identical:

- final context
- error shape / message / primary cause
- callback order
- branch selection

Coverage matrix:

- `Pipeline`
- `Wrap`
- `IfElse`
- `Timeout`
- `RetryOnError`
- `DoWhile`
- `Sequential`
- `Parallel`
- `MultiWaySwitch`

### 2. Deep Nesting Stack-Safety Tests

Automated regression targets:

- nested `Pipeline` depth `20_000`
- nested `Wrap` depth `10_000`
- nested `IfElse` depth `10_000`
- nested `Timeout` depth `10_000`
- mixed wrapper nesting depth `20_000`

Assertions:

- no `Maximum call stack size exceeded`
- terminal stage executes
- captured stack depth remains bounded (threshold-based)

Note: keep the heaviest `10k–20k` checks in dedicated stress suite if regular `bun test` becomes too slow.

### 3. Flat Scaling Tests

Benchmark and assert on scaling behavior, not single noisy samples.

For `Pipeline(N)` with `N in [1,2,5,10,20,50,100]`:

- run median of multiple samples
- fit linear model `total = intercept + slope * N`
- compare slope before/after

Acceptance target:

- compiled flat-pipeline slope strictly below current runtime slope for static pipelines.

### 4. Property-Based / Generated Graph Tests

Generate random small declarative graphs from a restricted grammar:

- `Pipeline`
- `Wrap`
- `IfElse(bool)`
- `Timeout(0)`
- terminal mutating stages

For each graph:

- compile + execute
- legacy execute
- compare outputs and errors

This is the best guard against optimizer bugs in flattening.

### 5. Plan Integrity Tests

Compiler-level tests should assert:

- nested pipelines flatten into a single linear plan;
- constant branches remove dead paths;
- plan invalidates after graph mutation;
- unsupported dynamic nodes mark the plan as hybrid/fallback.

### 6. Performance Regression Tests

Track these benchmark groups:

- `Stage.execute`
- `Pipeline(1/5/10/50/100)`
- deep-nesting stack-safe execution
- `DoWhile` / `Sequential` / `RetryOnError`

Do not assert absolute microseconds in unit tests; keep them in benchmark/stress scripts.

## Suggested File/Module Breakdown

- `src/compiled/plan.ts` — IR types
- `src/compiled/compiler.ts` — graph -> plan
- `src/compiled/executor.ts` — iterative runtime
- `src/compiled/builder.ts` — flattening helpers
- `src/compiled/debug.ts` — plan formatter / trace helpers
- `src/tests/compiled-executor.test.ts` — semantics parity
- `src/tests/compiled-stack-safety.test.ts` — deep nesting stress tests
- `benchmark/compiled-executor.bench.ts` — slope comparison legacy vs compiled

## Acceptance Criteria

- compiled executor runs flat declarative pipelines without recursive child dispatch;
- nested declarative graphs up to `20k` depth complete without stack overflow;
- semantic parity confirmed against legacy runtime on covered graph classes;
- benchmark slope for static flat `Pipeline(N)` improves vs current runtime;
- legacy fallback remains available for unsupported dynamic cases.

## Recommended First Slice

Implement the smallest valuable vertical slice first:

1. `CompiledPlan` + executor skeleton
2. `Pipeline` compiler only
3. flatten nested `Pipeline`
4. semantics parity tests for flat/nested `Pipeline`
5. slope benchmark legacy vs compiled

This de-risks the architecture before touching wrappers, loops, or fan-out nodes.
