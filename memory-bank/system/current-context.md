# Current Context — TASK-009 IMPLEMENT Hardening

**Task:** Performance Research + Default Fast Path Documentation
**Phase:** IMPLEMENT
**Profile:** creative-first (T4:standard, qaLevel=MAX, INTERACTIVE=false)
**Date:** 2026-03-07
**Branch:** master | Active task pointer: `memory-bank/system/current-task.txt` -> `TASK-009`

---

## Current Status

TASK-009 implementation already moved the project to compile-time execution-mode selection and enabled compiled auto mode for both static and hybrid plans.

Recent field-research and benchmark work produced:

- four cluster-specific performance benchmarks
- README performance documentation
- `memory-bank/docs/compiled-executor-roadmap.md`
- `memory-bank/docs/flow-control-primitives-adaptation-conclusion.md`
- follow-up tasks `TASK-010` through `TASK-014`

After DA review, the roadmap is being hardened before the next implementation task starts.

---

## What Is Already Landed

- compiled-static and compiled-hybrid plans are selected at compile time rather than per call
- auto mode is active by default, with `PIPELINE_USE_COMPILED=0` as the escape hatch
- field evidence says most high-value production graphs are construction-time static or hybrid wrapper-heavy
- cluster benchmarks show real gains on batch, HTTP-like, and CLI/codegen-style workloads
- synthetic direct-compiled hybrid benchmarks still reveal fallback-boundary overhead in wrapper-heavy chains

---

## DA Gaps Now Explicitly Closed in Docs

### 1. Hybrid performance gate

The roadmap now treats hybrid direct-path performance as a required gate, not a nice-to-have.

- removing fallback ops is not enough by itself
- `TASK-011` must show benchmark improvement on the real target cluster and avoid material regression on the synthetic wrapper-heavy lane

### 2. Current error contract

The current compiled executor contract is now explicit:

- phase-1 compiled execution guarantees sequential success/error short-circuit
- `Stage.execute()` still owns `ensure`, `validate`, `rescue`, and current timeout semantics
- future compiled boundaries must preserve that observable behavior

### 3. Mandatory fallback-boundary test matrix

Future work must test:

- sync throw
- async rejection
- callback error
- double-callback / callback-after-throw
- rescue-modified context
- ensure / validate failure across fallback boundaries

### 4. Benchmark variance policy

Roadmap decisions now require multi-run medians and visible variance.

- improvement claim threshold: median gain >= 10%
- regression guard: median slowdown <= 15% unless explicitly accepted as temporary

### 5. Task dependency clarification

The next tasks are no longer treated as independent.

- `TASK-010` must establish the error contract first
- `TASK-011` removes the largest hybrid fallback islands next
- `TASK-013` can follow after `TASK-011`
- `TASK-012` depends on both `TASK-010` and `TASK-011`
- `TASK-014` depends on `TASK-010` and `TASK-012`

---

## Task Progression Plan

Follow this order:

1. `TASK-010` — define `CleanError` contract, primary-cause preservation, and public-safe error-code taxonomy
2. `TASK-011` — compile-native `IfElse` + `Wrap`, with hybrid-regression gate
3. `TASK-013` — compile-native `Sequential`, validated on cluster-D workloads
4. `TASK-012` — compile-native `DoWhile` + `RetryOnError`, using the settled error model
5. `TASK-014` — timeout boundary + explicit compiled catch/retry/fallback semantics

This order keeps performance wins early while reducing semantic churn.

---

## Immediate Next Action

Start `TASK-010` planning and define the explicit error-propagation contract before the next boundary-aware executor features are implemented.
