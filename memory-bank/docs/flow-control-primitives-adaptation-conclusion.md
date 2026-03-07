# Flow Control Primitives Adaptation Conclusion

## Purpose

This document captures what `pipeline.js` should adopt from the external design research in:

- `/Users/vedmalex/work/agent-skills/repos/pi-team/docs/plans/TASK-013-flow-control-primitives-design.md`

The source document is aimed at a nondeterministic agent workflow engine with an editor-first model.
`pipeline.js` is different: it is a deterministic declarative execution library where graph shape is often known at construction time.

Because of that, the useful ideas are not the editor/UI patterns themselves, but the engine patterns that can be lowered into an efficient compiled runtime.

## Core Conclusion

The right adaptation rule for `pipeline.js` is:

- prefer engine-first, compile-first primitives over runtime emulation
- compile deterministic control flow into IR/opcodes/frames whenever semantics are known ahead of execution
- keep fallback boundaries only for cases that are not yet safely compilable
- choose the fastest safe default automatically from graph shape, because this is a declarative library

In short: we should not copy the workflow-editor design literally. We should extract the control-flow semantics and implement them as native compiled primitives.

## What Is Worth Adopting

| External primitive | `pipeline.js` analog | Priority | Why it matters | How to add |
| --- | --- | --- | --- | --- |
| Self-contained Loop | `DoWhile`, `RetryOnError` | P0 | Removes recursive re-entry and makes retry/iteration compile-native | Add real `LOOP` / `RETRY` frames, counters, exit predicates, and local re-entry targets |
| Native Switch | `IfElse`, simple `MultiWaySwitch` | P0 | Branching should be zero-cost and should not require wrapper fallback | Compile conditions into predicate tables plus `JUMP_IF_TRUE` / case dispatch |
| Error Boundary | `rescue`, timeout fallback, retry policies | P0 | Current phase-1 model mostly short-circuits to `errorExit`; this is not enough for full parity | Add boundary-aware error routing with explicit `fail`, `catch`, `retry`, `fallback` semantics |
| Wrap / Transform | `Wrap` | P1 | `prepare` / `finalize` are deterministic transforms and should not stay legacy-only forever | Compile `prepare` and `finalize` into transform tables and wrap frames |
| Timeout as control primitive | `Timeout` | P1 | Timeout is flow control, not just a wrapper concern | Add timer/deadline semantics and native timeout action handling |
| Sub-workflow / composition | nested `Pipeline` | P1 | Flattening is useful, but not every composed graph should require full inlining | Add reusable subplans or explicit `CALL_SUBPLAN`-style execution later if needed |
| Parallel split/join | `Parallel` | P2 | Deterministic fan-out/fan-in can be made explicit and cheaper | Add `PARALLEL` frame, join bookkeeping, and structured child result handling |
| Map-reduce | `Parallel` + `split/combine` | P2 | Useful for data-parallel workloads | Add bounded concurrency + aggregation strategies |
| Quorum join | future `Parallel` variants | P3 | Valuable, but not a current hotspot | Add `all` / `any` / `quorum` join strategies after baseline parallel compilation |
| Named ports | success/error/timeout/fallback channels | P3 | Useful mainly as an internal outcome model, not as a public visual construct | Introduce outcome channels only if they help branching/debug semantics |
| Delay / wait | future retry/backoff/rate-limiting primitive | P3 | Small primitive, but strategically useful for backoff, throttling, and scheduled execution | Add a lightweight delay op/frame without routing through legacy wrappers |
| Stateful subplans / resumable regions | future long-running deterministic flows | P3 | Not needed for the current core, but worth keeping in mind when evolving frames/checkpoints | Keep frame/state model serializable enough for future resume/checkpoint work |

## What Should Not Be Copied Directly

These parts of the external document are mostly editor concerns and should not drive the engine roadmap directly:

- visual bars for fork/join
- sticky notes / annotations
- editor serialization tricks that emulate primitives through other node kinds
- agent-router based branching patterns used only to avoid changing the engine

For `pipeline.js`, if a primitive is important, it should become a native compiled semantic instead of a clever runtime workaround.

## Future-Forward Things We Should Keep Now

Some ideas are not immediate implementation priorities, but they are important enough that the architecture should not block them.

### 1. Delay / backoff as a native primitive

Even if it is not a current hotspot, a native delay primitive is strategically valuable because it composes naturally with:

- retry backoff
- rate limiting
- cooldown windows
- scheduled deterministic waits

This should eventually be a lightweight executor primitive, not a heavy wrapper fallback.

### 2. Outcome channels / named ports as an internal model

The editor-oriented "named ports" idea is still useful for the engine if we reinterpret it as outcome channels:

- `success`
- `error`
- `timeout`
- `fallback`
- `default`

This could later simplify:

- error routing
- timeout routing
- branch tracing
- plan inspection / debugging

It does not need to be a public visual concept to be useful.

### 3. Subplan reuse instead of flatten-everything

Today flattening is a strong optimization, but future growth may benefit from explicit reusable subplans:

- compile once, execute many times
- preserve a semantic boundary where inlining is not ideal
- improve cache locality for repeated declarative fragments

That means future IR design should leave room for a `CALL_SUBPLAN`-style primitive or equivalent nested compiled execution.

### 4. Map-reduce and bounded concurrency

Data-parallel deterministic workloads are a natural fit for `pipeline.js`.
Even if not phase-1 critical, the runtime should evolve in a direction that can support:

- `split`
- bounded fan-out
- structured aggregation
- controlled error collection

without falling back to ad hoc Promise orchestration.

### 5. Quorum / partial-completion joins

`all` is not always the best semantic model.
Future parallel control flow may need:

- first-success wins
- N-of-M completion
- bounded wait for trailing branches

This is not a priority today, but the `PARALLEL` frame design should not assume `all` forever.

### 6. Resumable executor state

The current compiled runtime is in-memory and immediate, which is fine.
But the frame-driven architecture will be stronger long-term if state stays conceptually serializable enough for future:

- checkpoints
- pausable long-running flows
- resumable retries/timeouts
- richer debugging and trace replay

This should influence how much opaque mutable state gets hidden inside callbacks versus explicit executor state.

## Recommended Design Principle for `pipeline.js`

### 1. Compile when semantics are known

If a stage graph is construction-time static, the runtime should preclassify it and select the most efficient safe execution path once.

This especially applies to:

- flat `Pipeline`
- nested static `Pipeline`
- `IfElse` with deterministic predicates
- `Wrap` with deterministic `prepare` / `finalize`
- bounded retry / loop policies

### 2. Keep control flow local

The strongest idea from the external design is self-contained control flow.

That is a very good fit for `pipeline.js`:

- loops should live inside a frame, not as graph back-edges
- retries should be modeled as local executor state, not external recursion
- error recovery should be modeled as boundaries around specific compiled regions

### 3. Separate correctness boundaries from performance boundaries

Compiled fallback islands are acceptable as an incremental migration strategy, but they should be treated as temporary semantic boundaries, not the final architecture.

The compiled runtime should progressively absorb:

- branching
- wrapping/transforms
- retries/loops
- timeout behavior
- parallel join semantics

## Concrete Additions Recommended for the Engine

## A. Extend the IR intentionally

Current IR already reserves some future shapes in `src/compiled/plan.ts`.
The next meaningful additions should be:

- loop/retry frame materialization for `DoWhile` and `RetryOnError`
- predicate-based branch ops for `IfElse` and simple `MultiWaySwitch`
- wrap/finalize transform ops for `Wrap`
- error-boundary metadata for catch/retry/fallback semantics
- timeout/deadline op or boundary state
- parallel frame/join strategy support for `Parallel`

Suggested direction:

- keep opcodes small and deterministic
- keep heavy closures in side tables
- prefer frame-driven executor behavior over nested callback orchestration

## B. Make default execution policy data-driven

The project should continue moving toward this rule:

- if graph shape is known and compile-safe, default to the most efficient compiled path automatically
- do not require users to discover or remember tuning flags for normal declarative usage
- keep an escape hatch only for compatibility and debugging

This fits `TASK-009` directly.

## C. Turn error handling into explicit control flow

The current phase-1 compiled executor is still mostly sequential success/error short-circuiting.
To reach full parity and improve diagnosability, error flow should become explicit.

That means:

- preserve the original thrown/callback error as the primary signal
- carry only minimal safe metadata in `CleanError`
- support explicit compiled catch/retry/fallback boundaries
- avoid leaking internal runtime details through public-facing error messages
- introduce stable public-safe error codes where that improves diagnosis

This fits `TASK-010` directly.

## D. Prefer native branching over wrapper fallback

From the completed performance work so far, the next high-value step is not exotic control flow. It is removing avoidable hybrid fallback overhead.

The first candidates are:

1. `IfElse`
2. simple `MultiWaySwitch`
3. `Wrap`

These give the best leverage because they are deterministic and structurally close to op/transform execution.

## Proposed Adoption Order

### Phase 1 - High leverage, low semantic risk

1. compile-native `IfElse`
2. compile-native simple `MultiWaySwitch`
3. compile-native `Wrap`

Expected result:

- fewer hybrid fallback islands
- lower suspend/resume overhead
- better default performance for wrapper-heavy graphs

### Phase 2 - Local control flow primitives

4. compile-native `RetryOnError`
5. compile-native `DoWhile`
6. timeout boundary semantics

Expected result:

- less recursive behavior
- more predictable retry/loop performance
- explicit error and timeout recovery paths

### Phase 3 - Parallel and composition semantics

7. `Parallel` frame + join strategies
8. optional subplan reuse / call semantics
9. data-parallel map/reduce features if justified by real workloads

### Phase 4 - Future-forward primitives we should be ready for

10. native delay / backoff primitive
11. outcome-channel model for success/error/timeout/fallback routing
12. quorum joins and partial-completion strategies
13. resumable/checkpoint-friendly executor state where justified

## Impact on Existing Tasks

### TASK-009 - Performance Research + Default Fast Path

This conclusion supports the following direction:

- default runtime policy should prefer the fastest safe compiled mode automatically
- hybrid fallback cost should be reduced by compiling deterministic wrappers/branches first
- performance documentation should explain that declarative graph shape is used to choose the execution path

### TASK-010 - CleanError Semantics + Error Code Taxonomy

This conclusion supports the following direction:

- error handling should become an explicit boundary concept in the executor
- `CleanError` should preserve the original failure as primary cause
- error codes should be stable, minimal, public-safe, and not tied to engine internals
- compiled and legacy paths should share the same observable error semantics

## Final Recommendation

The most valuable takeaway from the external workflow design is not the editor vocabulary but the control-flow discipline:

- local loops instead of graph cycles
- native branching instead of expensive dynamic routing
- explicit error boundaries instead of implicit global failure propagation
- structured join semantics instead of ad hoc fan-in behavior

And the future-oriented takeaway is also important:

- keep room for delay/backoff
- keep room for reusable subplans
- keep room for outcome-channel routing
- keep room for quorum/partial completion
- keep room for resumable executor state

For `pipeline.js`, these ideas should be implemented as compiled engine primitives, not as visual/editor abstractions.

That gives the best combination of:

- semantic clarity
- deterministic behavior
- lower runtime overhead
- safer default execution policy
- a cleaner long-term path for `CleanError` and error-code design
