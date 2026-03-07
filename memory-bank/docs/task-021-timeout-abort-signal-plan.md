# TASK-021 Plan - Abort Signal Contract and Timeout Delivery

## Goal

Introduce the first real public cancellation contract for stage code without changing existing run-function arity rules:

- expose `AbortSignal` through a context helper
- deliver that signal from `Timeout` to the running inner stage

## Why This Slice

- `TASK-020` added bounded waiting for trailing branches, but still not real cancellation
- the smallest true contract is to let stage code observe an abort signal
- `Timeout` is the safest first producer of that signal because it already owns a clear abort event

## Public API

Add a public helper module exported from `src/index.ts`:

- `getExecutionSignal(ctx)`
- `isExecutionAborted(ctx)`
- `throwIfExecutionAborted(ctx)`

The signal is attached to the current execution context through a non-enumerable symbol.

## Initial Delivery Scope

This task wires abort delivery only for `Timeout` inner stages:

- legacy `src/timeout.ts`
- compiled `RUN_TIMEOUT`

Later tasks can reuse the same contract for `Parallel` early-success / timeout cases.

## Semantics

- when a timeout fires, abort the signal associated with the still-running inner stage
- the signal reason should represent timeout (`ERR_STAGE_TIMEOUT`)
- signal-aware user code may stop work early, but the framework does not yet require or enforce that
- if user code ignores the signal, existing timeout result isolation semantics still apply

## Out Of Scope

- changing function signatures to pass signal as an extra argument
- abort delivery from `Parallel` early success / quorum / trailing timeout
- rescue/ensure/validate-specific abort semantics
- forced termination of ignored async work

## QA Matrix

- legacy timeout exposes abort signal to inner stage code
- legacy timeout aborts the signal when timeout wins
- compiled timeout parity for the same behavior
- helper is exported from the public entrypoint

## Exit Gate

`TASK-021` is complete when signal-aware stage code can observe timeout-triggered aborts with parity in legacy and compiled execution paths, while existing timeout results remain unchanged.
