# TASK-023 — Public Execute AbortSignal Plan

## Goal

Expose cancellation at the public `Stage.execute(...)` / `Pipeline.execute(...)` boundary with a narrow API:

- add `ExecutionOptions` with `signal?: AbortSignal`
- support promise and callback execute forms
- preserve legacy vs compiled parity
- keep internal timeout/parallel signal delivery semantics intact

## Why this slice

- `TASK-021` established the internal signal contract
- `TASK-022` proved signal delivery is useful for early-settlement `Parallel`
- the missing piece is a root-level public API so callers can cancel whole executions without depending on wrapper stages

## Scope

1. Extend execute overloads to accept `ExecutionOptions`
2. Bind the supplied signal to the root execution context
3. Reject/callback with `ERR_STAGE_ABORTED` when the public execute signal aborts
4. Propagate the current execution signal through legacy and compiled child dispatch
5. Link timeout/parallel child controllers to the current parent execution signal
6. Add API + parity tests for legacy and compiled `Pipeline.execute`

## Non-goals

- no forced termination of non-cooperative user code
- no serialized/portable plan changes
- no broader cancellation routing beyond public execute + existing timeout/parallel internals

## Key compatibility rules

- existing `execute(err, ctx, callback)` internal forms must keep working
- internal timeout/parallel abort delivery must not be upgraded into a new hard failure at nested stage boundaries
- default abort result stays `ERR_STAGE_ABORTED` even when platform abort reasons differ

## QA

- `bun x tsc -p tsconfig.json --noEmit`
- `bun test src/tests/stage.test.ts src/tests/timeout.test.ts src/tests/compiled-executor.test.ts`
- `bun test`
