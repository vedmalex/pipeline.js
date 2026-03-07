# TASK-017 Plan - Parallel Join Any MVP

## Goal

Add the first richer join strategy to `Parallel` with a minimal public contract:

- `join: 'all' | 'any'`

This task intentionally stops before quorum / N-of-M semantics.

## Why This Slice

- `TASK-015` established compile-native `RUN_PARALLEL`.
- `TASK-016` established bounded concurrency.
- The smallest next semantic extension is `join: 'any'`, which exercises early-success settlement without requiring the more complex API and accounting that quorum joins need.

## Public API

Extend `ParallelConfig<T, R>` with:

- `join?: 'all' | 'any'`

Normalization:

- missing / invalid value -> `'all'`

## Semantics

### `join: 'all'`

- unchanged existing behavior
- wait for every child to settle
- aggregate errors if any child fails
- call `combine(ctx, children)` on success

### `join: 'any'`

- settle successfully on the first successful child
- pass the winning child as a one-element array to `combine(ctx, children)`
- if every child fails, aggregate the wrapped `parallel - error` errors and fail with the original parent context
- after success, trailing child completions are ignored; there is no cancellation in this slice

## Out Of Scope

- quorum / N-of-M joins
- first-error-fast cancellation
- bounded wait for trailing branches
- cancellation signals for child work

## QA Matrix

- legacy `join: 'any'` resolves on first success
- legacy `join: 'any'` fails if all children fail
- compiled parity for first-success behavior
- compiled parity for all-fail aggregation
- plan dump includes `join=any`

## Exit Gate

`TASK-017` is complete when `join: 'any'` behaves the same in legacy and compiled paths and the default `join: 'all'` behavior remains unchanged.
