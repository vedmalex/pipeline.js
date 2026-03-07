# TASK-016 Plan - Parallel Bounded Concurrency

## Goal

Add bounded concurrency to `Parallel` while preserving the current `all-settled` join semantics in both legacy and compiled execution paths.

This is the next narrow slice after `TASK-015` and keeps richer join strategies (`any`, `quorum`) out of scope.

## Why This Slice

- `TASK-015` already introduced `RUN_PARALLEL` and executor-managed fan-out/join state.
- The next smallest useful extension is limiting how many child branches run at once.
- This improves data-parallel workloads without forcing new error-routing or partial-completion semantics.

## Public API Shape

Extend `ParallelConfig<T, R>` with:

- `concurrency?: number`

Semantics:

- missing `concurrency` = unbounded fan-out (current behavior)
- `concurrency <= 1` = serialized child execution
- `concurrency > 1` = at most that many in-flight children at once

Normalization for MVP:

- values are floored to integers
- non-finite / missing values are treated as unbounded
- values below `1` are clamped to `1`

## Semantics To Preserve

1. Join strategy stays `all-settled`.
2. Errors are still collected after all launched children complete.
3. Returned error still uses the same `parallel - error` wrapping and `createError(errors)` aggregation.
4. Parent context is still returned on failure.
5. `combine(ctx, children)` still receives the split child array.
6. Empty/null split still behaves like passthrough.

## Legacy Runtime Changes

- Replace the current fully unbounded `Promise.allSettled(promises)` orchestration in `src/parallel.ts` with a worker-pool style scheduler.
- Scheduler launches up to `concurrency` workers and drains the child queue until all children settle.
- Default path remains semantically identical to today's behavior when `concurrency` is unset.

## Compiled Runtime Changes

- Extend `ParallelPlanData` with normalized concurrency metadata.
- Extend executor `PARALLEL` frame with queue progress state (`nextIndex`, `active`, `pending`).
- `RUN_PARALLEL` should top up in-flight work until the concurrency limit is reached, then continue draining as callbacks settle.
- If concurrency is effectively unbounded, behavior matches the existing `TASK-015` implementation.

## QA Matrix

- legacy `Parallel` respects `concurrency: 1`
- legacy `Parallel` respects `concurrency: 2`
- compiled `RUN_PARALLEL` respects the same limits
- legacy vs compiled parity for bounded-concurrency success
- legacy vs compiled parity for bounded-concurrency aggregated errors
- unbounded default remains unchanged
- plan dump / plan data visibly include concurrency info

## Out Of Scope

- `any` / `quorum` / first-success joins
- cancellation / aborting in-flight children
- timeout-aware branch draining
- branch prioritization / weighted scheduling

## Exit Gate

`TASK-016` is complete when bounded concurrency is available and parity-verified in both legacy and compiled paths, while the default unbounded mode remains backward-compatible.
