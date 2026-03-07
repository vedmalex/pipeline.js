# TASK-015 Plan - Compile-Native Parallel MVP

## Goal

Make `Parallel` execute natively in the compiled executor for its current legacy semantics, removing fallback dispatch for the common `split -> fan-out -> combine` form.

This task is the first concrete slice of Phase 3 from `memory-bank/docs/compiled-executor-roadmap.md`.

## Current State

- `src/parallel.ts` implements legacy `Parallel` by splitting child contexts, running all children concurrently via `run_or_execute`, waiting with `Promise.allSettled`, then either:
  - returning `combine(initialCtx, children)` on success; or
  - returning `createError(errors)` with the original parent context on failure.
- `src/compiled/plan.ts` already reserves `FrameKind = 'PARALLEL'`, but the compiled IR has no `RUN_PARALLEL` opcode and the executor still treats `PUSH_FRAME/PARALLEL` as unimplemented.
- `src/compiled/compiler.ts` does not detect `Parallel`, so compiled plans fall back to `RUN_FALLBACK_STAGE`.

## Legacy Semantics To Preserve

1. `split(ctx)` may return `null`, `undefined`, or `[]`; all behave like an empty fan-out and return the parent context unchanged.
2. If `config.stage` is missing, `Parallel` behaves like a no-op.
3. All children are started before the stage settles; errors are aggregated after all children settle.
4. Child failures are wrapped as `Error('parallel - error', { cause: { stage, index, err, ctx } })` and then normalized through `createError(errors)`.
5. On failure, the returned context is the original parent context.
6. On success, `combine(ctx, children)` receives the split child array, matching current legacy behavior.

## MVP Scope

### In scope

- Add compile-native lowering for `Parallel` without stage-boundary features on the outer `Parallel` stage.
- Add explicit `RUN_PARALLEL` IR opcode and `ParallelPlanData`.
- Add executor-managed `PARALLEL` frame state for fan-out/join bookkeeping.
- Preserve current all-settled semantics (`all` join only).
- Preserve legacy error aggregation and parent-context return-on-error.
- Keep inner child stage lowering compatible with existing compiled subplans / fallback islands via `createCompiledRunnerInfo`.

### Out of scope

- Bounded concurrency.
- `any` / `quorum` join strategies.
- Cancellation / abort-on-first-error.
- Reusable `CALL_SUBPLAN` op.
- Semantic changes to `Parallel.combine()` or child result replacement rules.

## Proposed IR Shape

- New plan constant payload:
  - `kind: 'PARALLEL'`
  - `reportName`
  - `stage`
  - `stageFnId`
  - `split(ctx)`
  - `combine(ctx, children)`
- New opcode:
  - `RUN_PARALLEL { data }`
- New executor frame state:
  - `kind: 'PARALLEL'`
  - `data`
  - `originalCtx`
  - `children`
  - `pending`
  - `errors`
  - `settled`

## Compiler Rules

Compile-native `Parallel` is allowed when the outer stage does not use `ensure`, `validate`, `schema`, `rescue`, `run`, `compile`, or `precompile`.

The child stage may still compile as:

- direct stage fn,
- compiled subplan, or
- fallback island,

through the existing `createCompiledRunnerInfo()` path.

## Executor Rules

1. Resolve the child list from `split(ctx)`.
2. If there is no inner stage or the child list is empty, continue with the parent context.
3. Launch every child through `invokeStageFn(...)` immediately.
4. Collect wrapped child errors but do not fail early.
5. When all children settle:
   - if any errors exist, return aggregated `createError(errors)` with `originalCtx`;
   - otherwise run `combine(originalCtx, children)` and continue.

## QA Matrix

- compile emits `RUN_PARALLEL` with no `RUN_FALLBACK_STAGE` for supported forms
- success parity vs legacy execution
- empty split parity (`[]`)
- null split parity (`null`)
- aggregated error parity when multiple children fail
- async child completion parity / order-independent fan-out
- plan dump includes `RUN_PARALLEL`

## Exit Gate

`TASK-015` MVP is complete when `Parallel` gains compile-native parity for current `all-settled` semantics and no supported `Parallel` form requires outer fallback execution.
