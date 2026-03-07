# TASK-020 Plan - Parallel Trailing Drain Timeout MVP

## Goal

Add a timeout-bound to `trailing: 'drain-active'` for early-success parallel joins:

- `trailingTimeout?: number`

This keeps the library cancellation-free while still letting callers avoid waiting indefinitely for already-active branches.

## Why This Slice

- `TASK-019` introduced `trailing: 'drain-active'`.
- The next smallest useful extension is a bounded wait for those already-active trailing branches.
- This avoids the much larger design jump to true cancellation signals.

## Public API

Extend `ParallelConfig<T, R>` with:

- `trailingTimeout?: number`

Normalization:

- missing / invalid / non-positive values -> `undefined`
- applies only when `trailing: 'drain-active'`

## Semantics

- when early-success threshold is reached and `trailing: 'drain-active'` is active:
  - stop launching queued branches
  - start a drain timer if `trailingTimeout` is defined
  - if already-active branches finish before the timer expires, succeed with all successful active children gathered by then
  - if the timer expires first, succeed immediately with the successful children collected so far
- no cancellation: active branches may still complete later, but they are ignored after settlement

## Out Of Scope

- true cancellation / abort signaling
- timeout errors for trailing drain exhaustion
- per-branch drain budgets
- timeout-aware failure shortcuts for impossible quorum

## QA Matrix

- legacy `join:any` + `trailing: 'drain-active'` + `trailingTimeout` settles before slow active branches finish
- compiled parity for the same behavior
- plan dump includes `trailingTimeout=<n>`
- earlier `ignore` and indefinite `drain-active` semantics remain unchanged

## Exit Gate

`TASK-020` is complete when `trailingTimeout` behaves the same in legacy and compiled paths and previous Parallel semantics remain stable.
