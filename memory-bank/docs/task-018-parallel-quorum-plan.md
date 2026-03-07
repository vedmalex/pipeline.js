# TASK-018 Plan - Parallel Quorum MVP

## Goal

Add the smallest N-of-M join extension to `Parallel`:

- `join: 'quorum'`
- `quorum?: number`

This builds on `TASK-017` (`join: 'any'`) without introducing cancellation or bounded trailing waits.

## Why This Slice

- `TASK-015` established compile-native `RUN_PARALLEL`.
- `TASK-016` established bounded concurrency.
- `TASK-017` established early-success settlement via `join: 'any'`.
- The smallest next step is a configurable success threshold, still within the same frame/scheduler model.

## Public API

Extend `ParallelConfig<T, R>` with:

- `join?: 'all' | 'any' | 'quorum'`
- `quorum?: number`

Normalization:

- missing / invalid `join` -> `'all'`
- `join: 'quorum'` with missing / invalid `quorum` -> effective threshold equals child count (behaves like `all`)
- finite `quorum` is floored to an integer and clamped to `[1, childCount]`

## Semantics

### `join: 'quorum'`

- succeed as soon as `quorum` successful children complete
- pass successful children collected so far to `combine(ctx, children)` in original split order
- if the quorum is never reached by the time all children settle, fail with aggregated wrapped `parallel - error` errors and return the original parent context
- no cancellation: trailing children after success are ignored when they eventually settle

## Out Of Scope

- cancellation of in-flight children after quorum success
- early failure when quorum becomes impossible before all children settle
- majority shortcuts / symbolic quorum modes
- bounded wait for trailing branches

## QA Matrix

- legacy `join: 'quorum'` reaches success at threshold
- legacy `join: 'quorum'` fails when threshold is not reached
- bounded concurrency still works with quorum
- compiled parity for quorum success
- compiled parity for quorum failure aggregation
- plan dump includes `join=quorum`

## Exit Gate

`TASK-018` is complete when `join: 'quorum'` works with parity in both legacy and compiled paths and earlier `all` / `any` semantics remain unchanged.
