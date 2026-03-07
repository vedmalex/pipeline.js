# TASK-019 Plan - Parallel Drain Active Trailing Branches

## Goal

Add the smallest post-success trailing-branch control for early-success parallel joins:

- `trailing?: 'ignore' | 'drain-active'`

This works with `join: 'any'` and `join: 'quorum'` without requiring true cancellation support.

## Why This Slice

- `TASK-017` and `TASK-018` can settle early on success.
- Today, already-started branches are ignored after success.
- The next narrow extension is to optionally wait for already-active branches to finish, while still refusing to launch queued branches.

## Public API

Extend `ParallelConfig<T, R>` with:

- `trailing?: 'ignore' | 'drain-active'`

Normalization:

- default -> `'ignore'`
- for `join: 'all'`, trailing mode has no effect and normalizes to `'ignore'`

## Semantics

### `trailing: 'ignore'`

- current behavior
- settle immediately when `any` / `quorum` threshold is met
- already-active branches may continue running in the background and are ignored

### `trailing: 'drain-active'`

- once early-success threshold is met, stop launching queued branches
- wait for already-active branches to settle
- keep success status once the threshold has been reached
- pass successful children collected by the time active work drains to `combine(ctx, children)` in split order

## Out Of Scope

- true cancellation of active branches
- bounded timeouts for the trailing drain
- early failure when quorum becomes impossible
- draining queued-but-not-started branches

## QA Matrix

- legacy `join:any` with `trailing: 'drain-active'` waits for active branches and does not launch queued ones
- legacy `join:quorum` with `trailing: 'drain-active'` drains active branches only
- compiled parity for trailing drain behavior
- plan dump includes `trailing=drain-active`

## Exit Gate

`TASK-019` is complete when `trailing: 'drain-active'` behaves the same in legacy and compiled paths and earlier `ignore` semantics remain unchanged.
