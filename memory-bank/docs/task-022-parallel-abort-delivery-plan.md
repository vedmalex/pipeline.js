# TASK-022 Plan - Parallel Abort Signal Delivery

## Goal

Reuse the public `AbortSignal` contract from `TASK-021` to deliver real abort notifications into already-active `Parallel` branches when the parent stage settles early.

## Why This Slice

- `TASK-021` created the public signal contract and wired it through `Timeout`.
- `Parallel` now has multiple early-settlement modes (`any`, `quorum`, `drain-active`, `trailingTimeout`).
- The smallest next cancellation slice is to abort already-active child branches when the parent no longer waits for them.

## Scope

Abort delivery is added for:

- `join: 'any'` / `join: 'quorum'` with immediate early success (`trailing: 'ignore'`)
- `join: 'any'` / `join: 'quorum'` after `trailingTimeout` settles a `drain-active` wait
- legacy `src/parallel.ts`
- compiled `RUN_PARALLEL`

## Semantics

- when `Parallel` settles early and there are still active children, abort their execution signals with reason `ERR_STAGE_ABORTED`
- queued children still never start
- if user code ignores the signal, the parent result still remains stable and late callbacks are ignored as before

## Out Of Scope

- forced termination of ignored child work
- abort delivery for plain `join: 'all'`
- propagating abort upward to parent pipelines
- new join modes or new timeout policies

## QA Matrix

- legacy `join:any` early success aborts active branch signals
- legacy `join:any` + `trailingTimeout` aborts still-active branches on timeout settlement
- compiled parity for both scenarios

## Exit Gate

`TASK-022` is complete when signal-aware `Parallel` child stages observe early-settlement aborts with parity in legacy and compiled paths and existing result semantics remain unchanged.
