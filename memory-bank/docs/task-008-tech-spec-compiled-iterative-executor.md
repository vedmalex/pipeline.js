# TASK-008 — TECH_SPEC: Compiled Iterative Executor

## Status

- **Task:** `TASK-008`
- **Phase:** `TECH_SPEC`
- **Depends on:** `TASK-007`
- **Primary goal:** replace recursive declarative-stage dispatch with a compiled iterative executor while preserving current public API semantics.

---

## 1. Problem Statement

The current runtime executes declarative stage graphs through nested `Stage -> Stage` dispatch. This has two costs:

1. **Flat cost problem** — even for simple static `Pipeline(N)`, every stage pays callback/Promise dispatch overhead.
2. **Deep nesting problem** — nested declarative graphs (`Pipeline`, `Wrap`, `IfElse`, `Timeout`) create recursive runtime structure and require a trampoline guard to avoid stack overflow.

TASK-007 mitigated the second issue tactically via `src/utils/run_or_execute.ts`, but did not remove the recursive architecture itself.

This spec defines the strategic replacement.

---

## 2. Design Goals

### Functional

- Preserve existing external authoring model (`new Pipeline([...])`, `new Wrap(...)`, etc.).
- Preserve current semantics of:
  - context mutation ordering
  - branch selection
  - rescue / ensure / validate behavior
  - callback-vs-promise compatibility
  - timeout overdue precedence

### Non-Functional

- Eliminate stack growth for deep declarative nesting.
- Reduce flat-pipeline graph-dispatch cost.
- Keep unsupported dynamic/user cases on a safe fallback path.
- Make compiled plans inspectable and invalidatable.

---

## 3. Scope of Phase 1

### In scope

- Internal IR (`CompiledPlan`)
- Iterative executor loop
- Compiler for static `Pipeline`
- Compile-time flattening of nested `Pipeline`
- Hybrid fallback hook for unsupported nodes
- Differential tests between legacy and compiled runtime for `Pipeline`

### Explicitly out of scope for first implementation slice

- Full compilation of `Wrap`, `IfElse`, `Timeout`, `RetryOnError`, `DoWhile`, `Sequential`, `Parallel`, `MultiWaySwitch`
- JS source-code generation
- Public plan serialization API
- Removal of the current trampoline

---

## 4. High-Level Architecture

The new model has 3 layers:

1. **Graph layer** — existing declarative stage objects (`Pipeline`, `Wrap`, ...)
2. **Compiler layer** — converts static graph fragments into `CompiledPlan`
3. **Executor layer** — iterative runtime that executes `CompiledPlan` with explicit frames and suspension/resume state

### Execution Modes

Every compiled root will be classified into one of:

- `compiled-static` — fully compiled and fully iterative
- `compiled-hybrid` — compiled shell with fallback runtime ops for dynamic parts
- `legacy-runtime` — existing recursive runtime only

This mode is internal metadata, not public API.

Phase-1 guarantee boundary:

- `compiled-static`: stack-safety and iterative execution are guaranteed for the compiled region.
- `compiled-hybrid`: correctness is guaranteed end-to-end, but stack-safety is guaranteed only for the compiled region; fallback islands may still use legacy runtime semantics internally.
- `legacy-runtime`: unchanged current behavior.

---

## 5. Core Types

### 5.1 `CompiledPlan`

```ts
export type CompiledPlan = {
  version: 1
  mode: 'compiled-static' | 'compiled-hybrid'
  entry: number
  errorExit: number
  ops: PlanOp[]
  tables: PlanTables
  metadata: PlanMetadata
}
```

### 5.2 `PlanTables`

```ts
export type PlanTables = {
  stageFns: Array<RunPipelineFunction<any>>
  stageInstances: Array<AnyStage<any>>
  predicates: Array<(ctx: any, err?: CleanError | null) => boolean | Promise<boolean>>
  transforms: Array<(ctx: any, retCtx?: any) => any>
  combiners: Array<(...args: any[]) => any>
  constants: any[]
}
```

Side tables keep closures and instances out of the instruction objects and make plan dumps smaller.

### 5.3 `PlanMetadata`

```ts
export type PlanMetadata = {
  rootKind: string
  flattenedStages: number
  fallbackOps: number
  containsAsyncOps: boolean
  containsParallelOps: boolean
  maxStaticDepthBeforeFlatten: number
  sourceVersion: number
}
```

### 5.4 `PlanOp`

Initial opcode set (phase 1 keeps a minimal subset):

```ts
export type PlanOp =
  | { op: 'RUN_STAGE_FN'; stageFnId: number }
  | { op: 'RUN_STAGE_INSTANCE'; stageId: number }
  | { op: 'RUN_FALLBACK_STAGE'; stageId: number }
  | { op: 'SET_CTX_FROM_RESULT' }
  | { op: 'JUMP'; target: number }
  | { op: 'JUMP_IF_TRUE'; predicateId: number; target: number }
  | { op: 'PUSH_FRAME'; frameKind: FrameKind; data?: number }
  | { op: 'POP_FRAME' }
  | { op: 'RETURN' }
```

Phase 1 only needs:

- `RUN_STAGE_FN`
- `RUN_STAGE_INSTANCE`
- `SET_CTX_FROM_RESULT`
- `RETURN`

The rest are reserved for wrappers/control-flow expansion.

---

## 6. Executor Runtime Model

### 6.1 `ExecutionState`

```ts
export type ExecutionState<T> = {
  plan: CompiledPlan
  pc: number
  ctx: T
  err: CleanError | null | undefined
  result: T | undefined
  frameStack: Frame[]
  suspended: boolean
  completed: boolean
  done: CallbackFunction<T>
  yielded: number
}
```

### 6.2 `Frame`

```ts
export type Frame =
  | { kind: 'ROOT' }
  | { kind: 'WRAP'; finalizeId: number; originalCtx: any }
  | { kind: 'RETRY'; retriesLeft: number; retryTarget: number }
  | { kind: 'LOOP'; loopHead: number; iteration: number }
  | { kind: 'PARALLEL'; joinTarget: number; pending: number; errors: Error[]; results: any[] }
```

Phase 1 only needs `ROOT`, but the executor is designed so new frame kinds can be added without changing the core loop structure.

### 6.3 Async Suspension Contract

The iterative executor must not recurse through nested declarative structures. However, it still needs to cross async user stages.

Contract:

- when the executor hits a synchronous op, it continues in the same loop tick;
- when it hits an async boundary, it marks `suspended = true`, registers a continuation callback, and returns control to the JS event loop;
- when the callback/promise resolves, the executor resumes from the saved `pc`.

This keeps stack depth bounded while preserving async semantics.

### 6.4 Terminal Completion Guard

The executor owns final completion, independently of helper-level callback guards.

Contract:

- `state.completed === false` when execution begins.
- the first terminal path (`RETURN`, fatal error path, or explicit abort path) sets `state.completed = true` before invoking `state.done(...)`.
- any later resume/callback into a completed state is ignored.

This prevents double-finalization even if a helper or fallback path resumes incorrectly.

---

## 7. Executor Loop — Normative Pseudocode

```ts
function executePlan<T>(state: ExecutionState<T>): void {
  while (!state.suspended) {
    const op = state.plan.ops[state.pc]

    switch (op.op) {
      case 'RUN_STAGE_FN': {
        state.suspended = true
        runFunctionStage(state, op.stageFnId)
        return
      }

      case 'RUN_STAGE_INSTANCE': {
        state.suspended = true
        runStageInstance(state, op.stageId)
        return
      }

      case 'RUN_FALLBACK_STAGE': {
        state.suspended = true
        runLegacyFallback(state, op.stageId)
        return
      }

      case 'SET_CTX_FROM_RESULT': {
        if (!state.err && state.result !== undefined) {
          state.ctx = state.result as T
        }
        state.result = undefined
        state.pc += 1
        continue
      }

      case 'JUMP': {
        state.pc = op.target
        continue
      }

      case 'JUMP_IF_TRUE': {
        state.suspended = true
        evalPredicateAndResume(state, op.predicateId, op.target)
        return
      }

      case 'PUSH_FRAME': {
        state.frameStack.push(materializeFrame(op, state))
        state.pc += 1
        continue
      }

      case 'POP_FRAME': {
        state.frameStack.pop()
        state.pc += 1
        continue
      }

      case 'RETURN': {
        if (state.completed) return
        state.completed = true
        state.done(state.err, state.ctx)
        return
      }
    }
  }
}
```

### Resume rules

Each async helper must:

1. set `state.result` and/or `state.err`
2. set `state.suspended = false`
3. advance or modify `state.pc`
4. call `executePlan(state)` again

This is re-entry, not recursion across graph depth.

### 7.1 Normative Transition Rules for Phase-1 Ops

For the initial opcode subset, the following transitions are mandatory.

#### `RUN_STAGE_FN`

- **On success**: helper stores returned/resolved ctx into `state.result`, clears `state.err`, sets `state.pc += 1`, sets `state.suspended = false`, re-enters executor.
- **On callback/thrown error**: helper stores normalized error into `state.err`, clears `state.result`, sets `state.pc = state.plan.errorExit`, sets `state.suspended = false`, re-enters executor.

#### `RUN_STAGE_INSTANCE`

- **On success**: same transition rules as `RUN_STAGE_FN`.
- **On callback/thrown error**: same transition rules as `RUN_STAGE_FN`.

#### `RUN_FALLBACK_STAGE`

- **On success**: helper stores ctx into `state.result`, clears `state.err`, sets `state.pc += 1`, sets `state.suspended = false`, re-enters executor.
- **On callback/thrown error**: helper stores normalized error into `state.err`, clears `state.result`, sets `state.pc = state.plan.errorExit`, sets `state.suspended = false`, re-enters executor.

#### `SET_CTX_FROM_RESULT`

- **If `state.err` is unset and `state.result !== undefined`**: `state.ctx = state.result`.
- **If `state.err` is set**: `state.ctx` is not overwritten.
- Then clear `state.result` and advance `pc`.

#### `RETURN`

- If `state.completed` is already `true`, do nothing.
- Otherwise set `state.completed = true` and invoke `state.done(state.err, state.ctx)` exactly once.

These transition rules are normative for phase 1 and must be mirrored in differential tests.

---

## 8. Compiler Rules for Phase 1 (`Pipeline` only)

### 8.1 Supported input forms

- `Pipeline([fn, fn, Stage, Pipeline])`
- `Pipeline({ stages: [...] })`
- nested `Pipeline` inside `Pipeline`

### 8.2 Flattening rule

When compiling a `Pipeline`, recursively inline child `Pipeline` stages into the parent plan iff:

- child has no custom runtime-only semantics that require preservation as a boundary;
- child is declarative and compile-supported;
- child compile mode is not `legacy-runtime`.

Flattening also records transitive child-version dependency (see section 9.2) so a mutated child invalidates every parent plan that inlined it.

Example:

```ts
Pipeline([
  fnA,
  Pipeline([fnB, fnC]),
  StageD,
])
```

becomes:

```ts
RUN_STAGE_FN(fnA)
SET_CTX_FROM_RESULT
RUN_STAGE_FN(fnB)
SET_CTX_FROM_RESULT
RUN_STAGE_FN(fnC)
SET_CTX_FROM_RESULT
RUN_STAGE_INSTANCE(StageD)
SET_CTX_FROM_RESULT
RETURN
```

### 8.3 Hybrid fallback rule

If a child cannot be compiled, emit:

```ts
RUN_FALLBACK_STAGE(stageId)
SET_CTX_FROM_RESULT
```

This preserves correctness and enables incremental migration.

---

## 9. API Integration Strategy

### 9.1 `compile()`

Current `compile()` returns `StageRun<T>`.

New internal flow:

1. subclass `compile()` may choose to build a `CompiledPlan`
2. executor wrapper converts plan into a `StageRun<T>` adapter
3. unsupported graphs keep existing runtime path

This preserves public API while allowing internal compiled execution.

### 9.2 `Stage` caching

Each compile-capable root stage gets:

```ts
protected compiledPlan?: CompiledPlan
protected compiledPlanVersion?: number
protected graphVersion?: number
protected compiledDependencySignature?: string
```

Mutation rules:

- `addStage()` increments `graphVersion`
- explicit structure-changing APIs increment `graphVersion`
- `compile(true)` forces rebuild regardless of version

Phase-1 supported invalidation boundary:

- guaranteed tracked mutations:
  - `Pipeline.addStage()`
  - `compile(true)`
  - future explicit setter-style structure APIs added for compiled nodes
- unsupported for cache-stable mutation:
  - direct ad-hoc mutation of internal config objects/arrays by external callers

If the runtime cannot prove a structural mutation was tracked, it must conservatively rebuild or fall back instead of trusting the cache.

Transitive invalidation rules:

- every compile-capable node exposes a local structural version (`graphVersion`);
- compiler computes a `compiledDependencySignature` from the root version plus all flattened child versions/signatures in traversal order;
- cache is valid only if both:
  - `compiledPlanVersion === graphVersion`, and
  - `compiledDependencySignature` matches the freshly recomputed dependency signature.

Implication:

- if a nested child `Pipeline` mutates after being flattened into a parent plan, the parent cache is invalidated automatically even if the parent itself did not mutate.

This is the minimum required rule to avoid stale flattened plans.

---

## 10. Error Semantics

The compiled executor must preserve current error behavior.

Required invariants:

- sync throw from a stage becomes `CleanError` as today
- callback-reported errors preserve original primary cause
- context fallback behavior remains unchanged
- `done(err, ctx)` is invoked exactly once

Phase 1 simplification:

- executor itself does not reinterpret error semantics;
- it delegates stage invocation to the same helper semantics used today and only manages control flow.

Additional phase-1 invariant:

- any op that sets `state.err` short-circuits the remaining sequential stage ops unless and until a later phase introduces an explicit compiled rescue frame.

---

## 11. Timeout / Rescue / Ensure / Validate Compatibility

Phase 1 does **not** compile these behaviors away.

Instead:

- `Stage.execute()` remains the boundary for ensure/validate/rescue/timeout semantics;
- compiled `Pipeline` only removes recursive child-graph dispatch between stages;
- each individual stage still executes through its existing lifecycle.

This keeps the first slice low risk.

Implication:

- phase 1 solves recursive graph dispatch and nested-pipeline flattening, but not all per-stage lifecycle overhead inside `Stage.execute()`.

Performance expectation for phase 1 is therefore intentionally narrow:

- **guaranteed target**: lower flat-pipeline graph-dispatch slope for static `Pipeline` graphs vs legacy runtime;
- **not guaranteed in phase 1**: major reductions in the intrinsic lifecycle cost of each individual stage.

That trade-off is intentional.

---

## 12. Files to Introduce

### New files

- `src/compiled/plan.ts`
- `src/compiled/compiler.ts`
- `src/compiled/executor.ts`
- `src/compiled/debug.ts`

### Expected touched files

- `src/pipeline.ts`
- `src/stage.ts`
- `src/utils/run_or_execute.ts` (only if fallback integration needs adjustment)
- `src/tests/compiled-executor.test.ts`
- `src/tests/compiled-stack-safety.test.ts`
- `benchmark/compiled-executor.bench.ts`

---

## 13. Test Plan

### 13.1 Unit tests — compiler

- compiles flat `Pipeline([A,B,C])`
- flattens nested `Pipeline([A, Pipeline([B,C]), D])`
- emits fallback ops for unsupported child nodes
- invalidates/rebuilds after `addStage()`

### 13.2 Differential runtime tests

For each scenario:

- run legacy path
- run compiled path
- compare final ctx, error, and observable ordering

Scenarios:

- sync function stages
- async function stages
- `Stage` instances
- mixed flat/nested pipelines
- error in stage 1/2/N
- callback-style stage

### 13.3 Stack-safety tests

- nested `Pipeline` depth `20_000`
- bounded stack depth assertion
- no overflow under compiled path

### 13.4 Benchmark tests

- `Pipeline(N)` for `N in [1,2,5,10,20,50,100]`
- compute median runtime per `N`
- fit linear model `total = intercept + slope * N`

Success threshold for phase 1:

- compiled slope < current legacy slope for static `Pipeline`
- no claim is made that compiled phase-1 beats legacy on every single-stage micro-benchmark, because `Stage.execute()` lifecycle semantics remain intact.

### 13.5 Stress suite placement

Keep heavy `10k–20k` checks in either:

- a dedicated stress test file, or
- a benchmark/stress script outside default `bun test`

Reason: regular suite must stay fast and deterministic.

---

## 14. Rollout Strategy

### Step 1

Add internal feature flag:

```ts
const USE_COMPILED_PIPELINE = false
```

or equivalent config guard.

Phase 1 default policy:

- compiled path starts opt-in / guarded during development;
- enable by default only after parity + benchmark confidence is established.

### Step 2

Compile `Pipeline` only when:

- graph is compile-supported;
- no explicit disable flag is set.

### Step 3

If compile fails or unsupported node encountered:

- log/debug metadata (optional)
- fall back to legacy runtime

### Step 4

After parity confidence is high, expand to wrappers.

---

## 15. Acceptance Criteria for TECH_SPEC

This TECH_SPEC is complete when it defines:

- exact executor state model
- exact phase-1 opcode subset
- resume/suspend contract
- compiler flattening rules for `Pipeline`
- cache invalidation rules
- parity + benchmark + stack-safety verification plan

All of those are now defined in this document.

---

## 16. Recommended Next Implementation Slice

Implement in this order:

1. `src/compiled/plan.ts`
2. `src/compiled/executor.ts` with minimal opcode subset
3. `src/compiled/compiler.ts` for `Pipeline`
4. integrate compiled path into `src/pipeline.ts`
5. add parity tests and benchmark comparison

This is the smallest slice that proves the architecture without entangling wrappers or fan-out semantics yet.
