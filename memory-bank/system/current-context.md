# Current Context — TASK-023 QA Public Execute AbortSignal API

**Task:** Public execute-level abort signal API
**Phase:** QA
**Date:** 2026-03-08
**Branch:** master | Base commit: `901853d` | Working tree includes uncommitted `TASK-015` + `TASK-016` + `TASK-017` + `TASK-018` + `TASK-019` + `TASK-020` + `TASK-021` + `TASK-022` + `TASK-023`

---

## Just Completed

- `TASK-021` established the internal execution-signal contract and timeout-driven abort delivery
- `TASK-022` added `Parallel` abort delivery for active branches on early settlement
- `TASK-023` now exposes that contract at the public `Stage.execute(...)` / `Pipeline.execute(...)` boundary

Planning artifact:

- `memory-bank/docs/task-023-execute-abort-signal-plan.md`

---

## Current Technical State

- public `ExecutionOptions` now supports `signal?: AbortSignal`
- `Stage.execute(...)` accepts execute options in promise and callback forms while preserving existing internal positional forms
- public execute aborts normalize to `ERR_STAGE_ABORTED`
- root execution signals are bound onto the current context and propagated through legacy + compiled child dispatch
- timeout/parallel child controllers are now linked to the current execution signal, but nested internal abort delivery still does not become a new hard failure at child stage boundaries
- `run_or_execute(...)` and compiled stage-fn invocation inherit the current execution signal automatically when present on the context
- post-critic fixes narrowed overload parsing so two-arg `execute(err, context)` is no longer misread as `(context, options)` when the context is empty or signal-shaped
- post-critic fixes also split public abort normalization from internal linked-controller reasons, so user-supplied abort reasons no longer leak timeout codes through public execute failures
- second-pass QA hardening now covers the 3-arg err-first promise form with execute options and callback-mode late-abort parity for legacy vs compiled `Pipeline.execute(...)`
- callback abort QA now explicitly checks single-callback behavior after late abort, not only pre-aborted signal handling
- third-pass hardening removes self-recursive public overload parsing from the promise path via `executeResolved(...)` and normalizes internal stage-dispatch errors before calling `Stage.execute(...)`
- err-first parser QA now also asserts that signal-shaped err-first calls still forward the original error into rescue handling instead of only preserving context shape
- fourth-pass hardening restores inbound err delivery to err-fixable `run` handlers when `Stage.execute(err, ctx)` has no ensure/validate boundary, so error-capable run functions no longer receive `undefined`
- compiled QA now also covers `RUN_STAGE_INSTANCE` err-forwarding parity against direct `Stage.execute(err, ctx)` behavior
- final overload QA now directly covers the 4-arg callback form `execute(err, context, callback, { signal })`, including signal-shaped context plus separate execution signal parsing

---

## Validation Snapshot

- `bun x tsc -p tsconfig.json --noEmit` -> clean
- `bun test src/tests/stage.test.ts src/tests/timeout.test.ts src/tests/compiled-executor.test.ts` -> 92 pass
- `bun test` -> 421 pass

---

## Next Action

Decide the next cancellation follow-up slice. The current public API is in place; likely next work is either stronger parent-to-child signal linking across remaining primitives or explicit documentation/examples for the new execute options.
