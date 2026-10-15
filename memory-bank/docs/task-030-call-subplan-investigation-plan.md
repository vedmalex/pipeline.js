# TASK-030 Plan - Nested Compiled Subplans / CALL_SUBPLAN Investigation

## Goal

Decide whether nested compiled fragment reuse deserves a first-class `CALL_SUBPLAN`-style execution path, or whether the remaining overhead can be explained and addressed by simpler alternatives.

This is an investigation task first, not an implementation commitment.

## Core Question

Can reusable nested compiled fragment execution outperform the current synthetic-runner strategy enough, on the right workloads, to justify new IR and executor complexity?

## Current State

- `src/compiled/plan.ts` has no `CALL_SUBPLAN` op, no subplan table, and no dedicated frame kind for nested compiled fragments.
- `src/compiled/compiler.ts` currently handles nested compiled composition in two main ways:
  1. boundary-free nested `Pipeline` stages are flattened directly into the parent plan
  2. other compiled-capable nested children go through `createCompiledRunnerInfo(...)`, which builds a synthetic runner that calls `executeCompiledPlan(...)` on a compiled synthetic subplan
- This means current nested composition cost is a mix of:
  - flattening when safe
  - synthetic `RUN_STAGE_FN` wrappers around nested compiled plans when flattening is not the chosen path
- The benchmark review after `TASK-024`..`TASK-027` shows strong wins overall, so the burden of proof is now on `TASK-030`.

## Current Benchmark Coverage Attribution

- `benchmark/cluster-a-batch.bench.ts`
  - useful for repeated flat execution wins
  - does **not** specifically isolate synthetic subplan runners
- `benchmark/cluster-b-http.bench.ts`
  - useful for wrapper-heavy short pipelines
  - does **not** specifically isolate synthetic subplan runners
- `benchmark/cluster-c-cli.bench.ts`
  - useful for warm vs cold compile-cost separation
  - does **not** specifically isolate synthetic subplan runners
- `benchmark/cluster-d-codegen.bench.ts`
  - useful for `Sequential` stability
  - current child stage is a direct function, so it does **not** exercise the synthetic compiled-subplan runner path
- `benchmark/compiled-executor.bench.ts`
  - flat static and hybrid lanes are useful
  - the current nested-pipeline spot-check is mostly a **flattening** check, not a synthetic-subplan dispatch check, because boundary-free nested pipelines flatten into the parent plan
- `benchmark/compiled-hybrid-profile.bench.ts`
  - useful for hybrid variance and single-stage fallback costs
  - does **not** specifically isolate synthetic subplan runners

Therefore `TASK-030` needs a dedicated nested-fragment lane before it can attribute remaining cost to subplan dispatch.

## Initial Baseline Snapshot

After adding the dedicated nested-fragment lane to `benchmark/compiled-executor.bench.ts`, the current baseline is:

- a `Sequential` lane whose child is a nested `Pipeline` does exercise the current synthetic compiled-subplan runner path
- the old nested-pipeline spot-check remains useful, but only as a flattening benchmark
- on the new lane, compiled execution with a nested synthetic subplan is still materially slower than the compiled direct-child equivalent:
  - 1 item: about `+56%`
  - 5 items: about `+142%`
  - 10 items: about `+220%`
  - 20 items: about `+261%`
  - 50 items: about `+334%`
- the gap between runtime-compiled nested-subplan and direct compiled nested-subplan is much smaller, which suggests the dominant cost is not the root `Pipeline.execute(...)` wrapper but the nested fragment dispatch path itself

This is strong enough to justify continuing the investigation, but not yet strong enough to skip the simpler alternatives comparison.

## Accepted Baseline Optimizations

**Status: Accepted and formalized** (2026-03-09, addressing mb3-critic Finding 1)

The following two simpler optimizations were prototyped during the investigation phase and are now accepted as the permanent baseline. They are **not** part of the CALL_SUBPLAN question — they are independent wins that stay regardless of the CALL_SUBPLAN decision.

### B. Compile-time nested plan caching (accepted)

- Location: `src/compiled/compiler.ts` — `getNestedPipelinePlan()`
- Mechanism: reuses the nested child pipeline's own compiled-plan cache when the child is a boundary-free `Pipeline`
- Formalized access: `PipelineLike.getCompiledPlan` typed property (no more `(stage as any)` cast)
- Result:
  - first compile of a nested-subplan root is still much more expensive than the direct-child variant because the child plan must exist at least once
  - repeated root compilation of the same graph is no longer the problem; the warmed nested compile median is already in the same range as the direct-child control
  - current spot measurement:
    - first nested compile about `404 us` vs direct-child about `32 us`
    - warmed repeated nested compile median about `0.82 us` vs direct-child about `0.91 us`
- Tests: 87/87 in `compiled-executor.test.ts` (including existing nested pipeline cache invalidation tests)

### C. Runner reuse without new opcode (accepted)

- Location: `src/compiled/compiler.ts` — `createFusedSubplanRunnerInfo()`
- Mechanism: fuses simple compiled-static child subplans into a direct runner that iterates `RUN_STAGE_FN` + `SET_CTX_FROM_RESULT` pairs synchronously, instead of calling `executeCompiledPlan(...)` for every child invocation
- Result:
  - low/mid item counts improved versus the original nested-subplan baseline
  - the runtime-compiled nested-subplan path moved closer to the direct-compiled nested-subplan path
  - but a substantial residual gap remains versus controls
  - current dedicated-lane snapshot after runner fusion:
    - 1 item: about `+60%` vs honest multi-step control
    - 5 items: about `+103%` vs honest multi-step control
    - 10 items: about `+187%` vs honest multi-step control
    - 20 items: about `+178%` vs honest multi-step control
    - 50 items: about `+220%` vs honest multi-step control
- Tests: 7 dedicated parity tests added (success, error propagation sync/async, empty items, single item, many stages, async stage mix)

### Control-lane analysis (updated 2026-03-09)

Three controls are now available:

1. **direct-child** (lower-bound): single fn doing N increments inline — 1 dispatch per item
2. **multi-step-ctrl** (honest control): single fn calling N separate fns — N dispatches per item, no subplan boundary
3. **nested-subplan** (test subject): Pipeline(N stages) child — N dispatches per item through subplan boundary

Key finding: `direct-child` and `multi-step-ctrl` produce **nearly identical** median timings across all item counts (within measurement noise). This proves:
- The per-function call overhead of 3 separate dispatch calls vs 1 inline loop is negligible at this scale
- **The entire measured gap comes from the subplan boundary overhead**, not from dispatch count mismatch
- The previous worry that "3 inner stages vs 1 child stage is not a fair comparison" is resolved: it IS a fair comparison because the dispatch count difference contributes essentially zero cost

## Why This Slice Exists

- The roadmap still has an open future-composition question.
- `mb3-critic` correctly challenged the earlier assumption that the next obvious move is more executor IR.
- The new task must prove the bottleneck instead of assuming it.

## Investigation Hypotheses

### H1 - Nested composition is a real residual bottleneck

The current synthetic subplan runner path still leaves meaningful runtime overhead because each nested compiled fragment pays extra dispatch/state setup cost that a dedicated `CALL_SUBPLAN` path could avoid.

### H0 - Simpler explanations are sufficient

The remaining gap comes mostly from one of these instead:

1. compile-cost dominating cold one-shot paths
2. benchmark variance / outliers rather than stable nested overhead
3. simpler runtime improvements such as nested plan caching or runner reuse
4. the remaining overhead already being small enough that more IR complexity is not justified

If `H0` holds, `TASK-030` should end with a no-build or simpler-build recommendation.

## Required Decision Lanes

The task is not allowed to decide from a single synthetic benchmark.

### Promotion gates

1. `benchmark/compiled-executor.bench.ts`
   - add or use a lane that actually exercises nested compiled fragment dispatch rather than only flattened nested pipelines
2. `benchmark/cluster-c-cli.bench.ts`
   - warm path remains a promotion gate
3. `benchmark/cluster-d-codegen.bench.ts`
   - must stay stable or improve

### Informational lanes

1. `benchmark/cluster-c-cli.bench.ts`
   - cold path stays visible as compile-cost tracking, not as the main promotion gate
2. `benchmark/compiled-hybrid-profile.bench.ts`
   - used to inspect variance and outlier behavior in hybrid-style shapes

## Alternatives To Compare

The task must compare options in this order and stop early if a simpler direction is good enough.

### A. Keep the current strategy

- boundary-free flattening where already safe
- synthetic compiled runners for nested compiled children

### B. Simpler compile-time reuse

- reuse/deduplicate nested compiled plans or runner artifacts during root compilation where that lowers cost without changing IR

### C. Simpler runtime reuse without new opcodes

- improve compiled nested-runner dispatch using narrower specialized runner kinds or direct runner reuse before introducing a new opcode/frame model

### D. `CALL_SUBPLAN` / first-class nested fragment execution

- only consider this if A-C fail to deliver enough value on the real decision lanes

## Proposed Investigation Steps

1. Establish a true nested-fragment baseline
   - identify which current benchmark lanes really exercise synthetic subplan runners
   - add a dedicated nested-composition lane if the current nested pipeline lane is mostly flattened and therefore not representative

2. Attribute the bottleneck
   - separate compile-cost effects from steady-state execution effects
   - separate hybrid variance from nested-fragment cost
   - confirm whether the residual gap is warm-path runtime overhead, not just cold startup cost

3. Prototype the simplest alternatives first
   - evaluate compile-time nested plan dedupe / reuse
   - evaluate narrower runner-reuse paths without new IR

4. Only then sketch `CALL_SUBPLAN`
   - define the minimal IR surface needed
   - define executor-state implications
   - compare complexity cost against measured gain

5. Decide explicitly
   - proceed with implementation
   - choose a simpler alternative instead
   - or stop and archive with a "not justified" conclusion

## Falsifiable Exit Gates

`TASK-030` may recommend `CALL_SUBPLAN` only if all of the following are true:

1. **Attribution gate**
   - the measured residual gap is tied to nested compiled fragment dispatch rather than compile-cost or general variance

2. **Meaningful gain gate**
   - the chosen candidate shows at least a 10 percent median improvement on at least one true nested-composition lane relative to the current synthetic-runner baseline

3. **Safety gate**
   - no more than 15 percent median regression on:
     - Cluster C warm path
     - Cluster D
     - the hybrid variance lane

4. **Simplicity gate**
   - simpler alternatives do not reach materially the same benefit with lower complexity

5. **Honesty gate**
   - benchmark notes keep median plus min/max visible, and caution lanes show raw runs

If any gate fails, the task should recommend either a simpler optimization or no further executor expansion.

## Conditional CALL_SUBPLAN Sketch

If the simpler alternatives remain insufficient **and** the next benchmark slice proves that the residual gap comes from complex nested fragment dispatch rather than just repeated inner stage dispatch, the smallest plausible `CALL_SUBPLAN` design would be:

1. add a `subplans` table to the compiled plan metadata
2. add a `CALL_SUBPLAN { subplanId }` op instead of wrapping nested compiled fragments as synthetic `RUN_STAGE_FN` callbacks
3. add a lightweight executor frame only for returning from nested subplans to the parent program counter
4. preserve the current context / error contract; no new public semantics
5. allow the compiler to choose between:
   - flatten when already safe
   - fused runner for trivial static nested fragments
   - `CALL_SUBPLAN` only for the remaining complex nested fragments

### Current verdict on this sketch (updated 2026-03-09)

- technically plausible
- the previously blocking attribution step is now **resolved**: the honest multi-step control proves the entire gap is from subplan boundary overhead, not dispatch count mismatch
- the remaining question is whether the gap size (`+60%` to `+220%`) justifies the complexity of a new opcode/frame model, or whether it is acceptable as-is given that nested composition is already much faster than legacy
- **next decision point**: compare the compiled nested-subplan vs legacy nested-subplan to determine if the absolute improvement over legacy is already good enough to stop

## 2026-03-18 Attribution Refresh

The earlier nested-child evidence mixed together two materially different execution regimes:

1. **trivial fused child**
   - a boundary-free nested child plan that compiles into a flat `RUN_STAGE_FN` sequence
   - this still benefits from the existing fused fast-path
2. **real non-fusable subplan**
   - a nested child plan with internal control flow (for example predicate + scope + jump structure)
   - this cannot be reduced to a flat stage-fn sequence and therefore exercises the actual `subplans[]` + `SUBPLAN_RETURN` path

This distinction matters because the fused lane and the real subplan lane do **not** answer the same question.

### New evidence

- Trivial fused lane still has a real honest gap vs `multi-step-ctrl`, but it is more modest than the earlier blended interpretation and compiled execution remains clearly better than legacy.
- The new non-fusable subplan benchmark lane shows a much stronger result: runtime-compiled complex subplans are very close to direct compiled complex subplans, while both are dramatically slower than equivalent direct-child logic.

### Updated inference

This shifts the main hypothesis:

- for non-fusable child plans, the remaining cost is **not** dominated by root `Pipeline.execute()` wrapper overhead
- it is also no longer best framed as only parent -> subplan transfer overhead
- the dominant cost now appears to live **inside the child compiled control-flow plan** itself (predicate evaluation, frame push/pop, jump flow, and related executor-state churn)

### Consequence for the CALL_SUBPLAN decision

This makes a larger `CALL_SUBPLAN` expansion harder to justify:

- improving the parent -> child handoff alone is unlikely to deliver the next meaningful speed win on the newly measured non-fusable lane
- if speed work continues, the more defensible next slice is a narrow optimization of compiled control-flow inside child plans rather than a broader new opcode/frame model
- if that control-flow work is not worth the complexity, `TASK-030` should stop with the conclusion that the simpler fused baseline is already the right endpoint

## 2026-03-18 Sync-IfElse Predicate Slice

One narrow control-flow optimization was implemented after the attribution refresh:

- common sync `IfElse` predicate functions (`condition(ctx)`) no longer allocate an unconditional `Promise` wrapper inside the compiled predicate path
- this preserves the old async/callback fallback behavior for non-sync cases, but removes microtask overhead from the hottest measured branchy child-path case

### Result

The real non-fusable subplan lane improved measurably:

- `10` items: about `30.89 us` -> `24.34 us` (`-21.2%`)
- `20` items: about `52.17 us` -> `47.72 us` (`-8.5%`)
- `50` items: about `132.96 us` -> `116.70 us` (`-12.2%`)

This is enough to strengthen the revised hypothesis:

- child control-flow hot paths are worth targeting
- the direction is measurably productive
- broader `CALL_SUBPLAN` complexity still looks less justified than another narrow control-flow slice

### Coverage clarification

An explicit compile-coverage audit now exists in the test suite:

- boundary-free built-ins compile through native or native-ish fast paths
- boundary-bearing primitives and custom subclasses intentionally remain on slower semantic paths

So the current question is no longer "are built-ins compiled at all?" but rather "which remaining control-flow-heavy compiled paths still justify another round of optimization?"

## 2026-03-18 Second Child-Control-Flow Slice

The next narrow slice stayed inside the revised hypothesis instead of reopening `CALL_SUBPLAN` design work.

### Implemented changes

1. **err-blind `IfElse` no-scope lowering**
   - when `condition(ctx)` is sync and both branches are err-blind
   - compiled lowering now uses direct `JUMP_IF_TRUE` / `JUMP` control flow without `PUSH_FRAME SCOPE` / `POP_FRAME`
   - this removes frame bookkeeping from the hottest simple branch cases inside non-fusable child plans

2. **no-signal stage-fn dispatch fast path**
   - `invokeStageFn(...)` now skips execution-signal bind/cleanup work entirely when no effective `AbortSignal` is present
   - this reduces generic dispatch overhead inside control-flow-heavy child plans on the common path

### Validation

- `bun x tsc -p tsconfig.json --noEmit` -> PASS
- `bun test src/tests/compiled-executor.test.ts` -> PASS (`95/95`)
- `bun benchmark/cluster-c-cli.bench.ts` -> PASS (`+48.0%` warm, cold informational only)
- `bun benchmark/cluster-d-codegen.bench.ts` -> PASS (worst delta `-51.2%`)
- `bun benchmark/compiled-hybrid-profile.bench.ts` -> PASS
- full `bun test` still has the same unrelated dirty-worktree timeout in `src/tests/retryonerror.test.ts`

### Repeated benchmark evidence

Repeated `bun benchmark/compiled-executor.bench.ts` reruns now converge on the same non-fusable lane range:

- compiled complex-subplan: about `1.18-1.31 / 2.48-2.50 / 2.72-2.83 / 4.73-4.97 / 10.96-11.64 us`
- compiled direct-child: about `0.79-0.85 / 0.92-1.22 / 1.20-1.76 / 1.83-1.88 / 2.96-3.10 us`
- direct complex-subplan: about `0.79 / 1.30-1.35 / 2.31-2.46 / 4.35-4.50 / 9.01-9.61 us`
- counts above are `1 / 5 / 10 / 20 / 50`

Compared with the previous QA snapshot after the sync-predicate-only slice:

- `5` items: `11.84 us` -> `~2.49 us` (`~ -79%`)
- `10` items: `24.34 us` -> `~2.78 us` (`~ -89%`)
- `20` items: `47.72 us` -> `~4.85 us` (`~ -90%`)
- `50` items: `116.70 us` -> `~11.30 us` (`~ -90%`)

### Updated inference

- the highest-ROI win again came from narrower child-plan control-flow work rather than from any parent -> subplan transfer redesign
- `direct complex-subplan` remains close to runtime-compiled complex-subplan, so `CALL_SUBPLAN` handoff complexity still does not target the main measured cost
- a residual gap versus equivalent direct-child logic still exists, but the evidence now says to pursue only very selective further hot-path work, not a broad new opcode/frame model by default

### Decision impact

This strengthens the case for a **stop-or-only-narrower** outcome:

- if another slice happens, it should target a single measurable remaining child-control-flow hotspot
- if no such hotspot promises a clear benchmark-visible win, `TASK-030` should end by recording that narrow executor/compiler work beat `CALL_SUBPLAN` complexity on the real measured lane

## 2026-03-18 Split Branch Hot Paths

One more narrow slice was taken after the second child-control-flow pass.

### Implemented changes

1. **typed boolean predicate path**
   - `JUMP_IF_TRUE` now records `predicateKinds`
   - sync boolean predicates can bypass the extra result-object normalization layer

2. **tiny err-blind `IfElse` fusion**
   - when `condition(ctx)` is sync and both branches are simple sync handlers
   - the whole `IfElse` can collapse into a single fused `RUN_STAGE_FN`
   - branch throws still propagate; this is not a swallow-errors shortcut

3. **evidence split to stay honest**
   - this new fusion would have silently collapsed the old branchy synthetic lane
   - so the benchmark/test matrix was deliberately re-split:
     - tiny fused err-blind branch cases are measured separately
     - the real non-fusable lane now uses a callback-style predicate so it still exercises generic compiled control flow

### Validation

- `bun x tsc -p tsconfig.json --noEmit` -> PASS
- `bun test src/tests/compiled-executor.test.ts` -> PASS (`99/99`)
- `bun benchmark/cluster-c-cli.bench.ts` -> PASS (`+46.9%` warm, cold informational)
- `bun benchmark/cluster-d-codegen.bench.ts` -> PASS (worst delta `-55.0%`)
- `bun benchmark/compiled-hybrid-profile.bench.ts` -> PASS
- full `bun test` still only has the same unrelated timeout in `src/tests/retryonerror.test.ts`

### Updated benchmark picture

#### Honest real non-fusable lane

With the callback-style predicate keeping the lane truly non-fusable:

- compiled complex-subplan: about `1.24 / 2.69 / 4.77 / 8.86 / 21.07 us`
- compiled direct-child: about `0.79 / 1.21 / 1.70 / 1.83 / 2.97 us`
- direct complex-subplan: about `1.05 / 2.52 / 4.88 / 8.52 / 18.55 us`
- counts above are `1 / 5 / 10 / 20 / 50`

This preserves the key inference: the still-real remaining hotspot is generic predicate/control-flow work, not parent -> child handoff.

#### Tiny fused err-blind branch lane

Separate ad hoc measurement shows the new fused lowering is real:

- compiled tiny-branch nested: about `1.43 / 2.37 / 5.09 us`
- compiled direct-child: about `0.86 / 1.49 / 2.38 us`
- direct compiled tiny-branch nested: about `1.03 / 2.01 / 4.62 us`
- counts above are `10 / 20 / 50`

### Updated inference

- a previously branchy child-plan shape can now collapse into the existing fused-child machinery and gets materially faster
- the honest non-fusable lane still points at generic predicate/control-flow overhead as the next possible hotspot
- this makes `CALL_SUBPLAN` look even less attractive: another useful slice, if any, should target generic predicate / runner-backed control paths, not a broader handoff model

## Out Of Scope

- no semantic changes to stage behavior
- no cancellation redesign
- no portable serialized-plan format
- no broad cold-start optimization program beyond keeping compile-cost visible in measurements
- no implementation commitment before the evidence gates pass

## Deliverables

1. updated benchmark evidence for the required decision lanes
2. a short decision memo comparing A/B/C/D
3. either:
   - a narrow implementation plan for the winning direction, or
   - an explicit stop decision with rationale

## QA / Validation

- `npx tsc --noEmit`
- `npx vitest run --globals src/tests/compiled-executor.test.ts`
- rerun the decision benchmark suite with variance-visible output:
  - `bun benchmark/cluster-a-batch.bench.ts`
  - `bun benchmark/cluster-b-http.bench.ts`
  - `bun benchmark/cluster-c-cli.bench.ts`
  - `bun benchmark/cluster-d-codegen.bench.ts`
  - `bun benchmark/compiled-executor.bench.ts`
  - `bun benchmark/compiled-hybrid-profile.bench.ts`

## Gate Re-Check Results (2026-03-09)

Addressing mb3-critic Finding 3: explicit gate re-check after prototype changes.

### Promotion gates

| Gate | Status | Result |
|------|--------|--------|
| Cluster C warm | **PASS** | +44.4% improvement (0.90 vs 1.62 µs) |
| Cluster D | **PASS** | -47.8% to -52.6% improvement across all item counts |
| compiled-executor nested lane | **MEASURED** | honest gap confirmed at +60% to +220% vs multi-step control |

### Informational lanes

| Lane | Status | Result |
|------|--------|--------|
| Cluster C cold | **INFO** | -14.8% (compile cost expected, tracked) |
| compiled-hybrid-profile | **PASS** | all lanes show compiled outperforming legacy |

### Test coverage

| Check | Status | Result |
|-------|--------|--------|
| `npx tsc --noEmit` | **PASS** | clean |
| `npx vitest run --globals` | **PASS** | 87/87 (was 80/80, +7 fused-path parity tests) |

### mb3-critic findings resolution

| Finding | Status | Resolution |
|---------|--------|------------|
| F1: investigation drifted into implementation | **RESOLVED** | plan caching + fused runner formalized as accepted baseline, separated from CALL_SUBPLAN question |
| F2: control lane not a fair comparison | **RESOLVED** | added `multi-step-ctrl` (same dispatch volume, no subplan boundary); proved gap is entirely from subplan boundary |
| F3: gate re-checks not documented | **RESOLVED** | this section |
| F4: fused path has no dedicated tests | **RESOLVED** | 7 parity tests added covering success, error, async, empty, many-stages |
| F5: informal `(stage as any).getCompiledPlan` access | **RESOLVED** | `PipelineLike.getCompiledPlan` typed property added to compiler |

## 2026-03-18 Callback Predicate Fast Path

Follow-up slice under `UR-027`.

### What changed

- Added a callback-specific compiled predicate kind for `IfElse` validate callbacks.
- Compiler now stores callback predicates directly instead of wrapping them in `new Promise(...)`.
- Executor `JUMP_IF_TRUE` now dispatches callback predicates through `execute_validate(...)` directly in both:
  - inline control-flow runner
  - main compiled plan loop
- Added parity coverage for:
  - callback predicate lowering kind
  - callback predicate error forwarding to the failed branch
  - non-fusable nested child subplans carrying the callback-specific predicate kind

### Why this slice existed

After the split-branch work, the honest non-fusable lane still used callback predicates specifically to keep generic compiled control flow alive. That made it a good place to look for remaining wrapper cost.

The prior implementation still paid for:

- Promise allocation around callback predicates
- predicate-result object wrapping
- generic normalization path on every branch check

None of that changed user-visible semantics, so it was a good candidate for a narrow hot-path cut.

### Updated benchmark evidence

Immediate within-turn benchmark comparison on the honest non-fusable lane:

- pre-slice compiled complex-subplan: `5.75 / 6.86 / 5.71 / 13.49 / 27.99 us`
- post-slice compiled complex-subplan: `2.48 / 3.63 / 3.79 / 5.83 / 13.40 us`
- post-slice compiled direct-child: `1.28 / 1.55 / 2.04 / 1.82 / 3.13 us`
- post-slice direct complex-subplan: `1.31 / 2.16 / 3.48 / 5.47 / 11.72 us`
- counts above are `1 / 5 / 10 / 20 / 50`

Rough delta vs the immediate pre-slice baseline:

- `-57%` at `1`
- `-47%` at `5`
- `-34%` at `10`
- `-57%` at `20`
- `-52%` at `50`

### Updated inference

- callback-predicate wrapper cost was real and worth removing
- parent -> subplan transfer still does not look like the main remaining bottleneck
- `IfElse` coverage is now much stronger than `MultiWaySwitch` coverage
- if optimization continues, the next rational target is runner-backed primitive coverage or another benchmark-visible generic control-flow hotspot, not `CALL_SUBPLAN`

### Post-cleanup rerun

Final mainline rerun after a small executor cleanup pass kept the same conclusion. The executor now shares one predicate-dispatch helper for sync boolean, callback-validate, and generic predicate paths, and the main plan loop no longer pays an extra `normalizePredicateResult(...)` round on `GENERIC_CALLBACK`.

Latest rerun snapshot on the honest non-fusable lane:

- compiled complex-subplan: `1.30 / 2.45 / 3.24 / 5.73 / 13.25 us`
- compiled direct-child: `0.80 / 1.19 / 1.67 / 1.70 / 2.98 us`
- direct complex-subplan: `0.89 / 1.79 / 3.33 / 5.29 / 11.47 us`
- counts above are `1 / 5 / 10 / 20 / 50`

Safety reruns after that cleanup still pass:

- `cluster-c-cli` warm `+53.7%`, cold informational `-5.8%`
- `cluster-d-codegen` PASS, worst delta `-32.0%`
- `compiled-hybrid-profile` PASS

So the evidence did not move toward `CALL_SUBPLAN`. The clearest remaining ROI target is still runner-backed primitive coverage such as `MultiWaySwitch`.

## 2026-03-18 MultiWaySwitch Single-Case Fast Path

Follow-up slice under `UR-028`.

### What changed

- Added the first dedicated `MultiWaySwitch` benchmark lane to `benchmark/compiled-executor.bench.ts`.
- Narrowed the first safe MWS optimization to the case where exactly one branch matches at runtime.
- In that single-case path, the compiled runner now skips `Promise.allSettled(...)` fan-out and dispatches the matched child directly through callback-style execution.
- Added parity coverage for a single matched dynamic-case `MultiWaySwitch`.

### Why this slice existed

After the callback-predicate work, `MultiWaySwitch` was the clearest remaining runner-backed primitive gap, but it still lacked a dedicated benchmark lane. Before touching broader orchestration, the task needed a direct measurement and the smallest safe cut.

### Current benchmark evidence

Dedicated single-case dynamic lane:

- legacy MWS single-case: `2.50 / 6.16 / 11.38 / 23.93 / 60.34 us`
- compiled MWS single-case: `1.39 / 3.28 / 6.09 / 15.27 / 27.16 us`
- compiled direct-child control: `1.01 / 1.80 / 2.71 / 5.46 / 9.74 us`
- direct compiled MWS single-case: `0.92 / 2.96 / 6.07 / 10.78 / 25.02 us`
- counts above are `1 / 5 / 10 / 20 / 50`

### Updated inference

- the single matched-case overhead is now explicitly measured and partially reduced
- `MultiWaySwitch` still keeps a large residual gap vs equivalent direct-child logic
- that residual gap points to generic multi-case orchestration, not to `CALL_SUBPLAN`
- if work continues, the next rational slice should stay inside `MultiWaySwitch` and attack multi-case fan-out with parity tests for:
  - shared-context no-split behavior
  - aggregate-error preservation
  - combine-order warning behavior

## 2026-03-18 MultiWaySwitch Multi-Case Shared-Context Fast Path

Follow-up slice under `UR-029`.

### What changed

- Added a multi-case fast path inside `createMultiWaySwitchRunnerInfo(...)` for the case where all matched actual cases already normalize to “no custom `split` / `combine`”.
- In that path, the compiled runner now fans out directly across the matched child runners on `initialCtx`, skips split/combine scaffolding, and returns the shared context directly on success.
- Aggregate-error collection now uses indexed error slots, so the final `createError(errors)` preserves case order even when completions arrive out of order.
- Strengthened parity tests in `compiled-executor.test.ts` for:
  - split/combine aggregated MWS errors with out-of-order completion
  - shared-context aggregated MWS errors with out-of-order completion
- Extended `benchmark/compiled-executor.bench.ts` with a dedicated `mws-multi-shared` lane.

### Why this slice existed

After the single-case fast path landed, the next visible MWS gap was the generic multi-case path. The safest narrow cut was the shared-context regime where matched cases do not need per-case split/combine semantics at all.

### Current benchmark evidence

Dedicated shared-context multi-case lane:

- legacy MWS multi-shared: `2.99 / 8.64 / 15.31 / 29.61 / 72.22 us`
- compiled MWS multi-shared: `1.68 / 5.18 / 9.16 / 17.45 / 41.09 us`
- compiled direct-child control: `0.89 / 1.66 / 2.38 / 4.15 / 9.16 us`
- direct compiled MWS multi-shared: `1.15 / 4.46 / 8.61 / 16.96 / 40.75 us`
- counts above are `1 / 5 / 10 / 20 / 50`

### Updated inference

- the new shared-context multi-case path is measurably cheaper than legacy and parity-covered
- by `10+` items, `runtime-compiled` MWS is already very close to `direct compiled` MWS on this lane
- that means the root `Pipeline.execute()` wrapper is no longer the main cost for this MWS regime
- the remaining large gap is still between runner-backed `MultiWaySwitch` and equivalent direct-child logic
- so the next ROI, if work continues, is deeper MWS narrowing or native lowering for the remaining multi-case paths, not `CALL_SUBPLAN`

## 2026-03-18 MultiWaySwitch Single-Case Compile-Time Specialization

Follow-up slice under `UR-030`.

### What changed

- Added a compile-time effective single-case specialization to `createMultiWaySwitchRunnerInfo(...)`.
- If only one effective case remains after filtering out constant-false cases, the compiled runner now skips generic `actuals[]` orchestration and lowers straight onto a dedicated single-case path.
- This keeps single dynamic no-match behavior intact while avoiding generic multi-case setup on the hot path.

### Current benchmark evidence

Dedicated single-case dynamic lane:

- legacy MWS single-case: `2.46 / 6.56 / 10.91 / 20.62 / 49.11 us`
- compiled MWS single-case: `1.40 / 3.18 / 6.28 / 10.33 / 24.42 us`
- compiled direct-child control: `1.02 / 1.76 / 2.44 / 4.10 / 8.96 us`
- direct compiled MWS single-case: `0.94 / 2.88 / 5.18 / 9.83 / 23.95 us`
- counts above are `1 / 5 / 10 / 20 / 50`

### Updated inference

- the compile-time specialization is a real reduction on the single-case lane
- the root compiled wrapper is now much closer to direct compiled MWS on that shape
- the remaining gap is still the MWS primitive itself versus equivalent direct-child logic

## 2026-03-18 MultiWaySwitch Split/Combine Multi-Case Evidence + Lazy Bookkeeping

Same `UR-030` continuation.

### What changed

- Added a dedicated `mws-multi-combine` lane to `benchmark/compiled-executor.bench.ts` for the remaining multi-case MWS path with per-case `split` and stage-level `combine`.
- Reduced success-path bookkeeping churn in the compiled custom `split/combine` multi-case runner:
  - error storage is now lazy instead of preallocating `errorSlots` for every success-only execution
  - combine order and aggregate-error order semantics are unchanged

### Current benchmark evidence

Dedicated split/combine multi-case lane:

- legacy MWS multi-combine: `2.94 / 8.47 / 15.35 / 29.09 / 73.57 us`
- compiled MWS multi-combine: `2.07 / 4.59 / 8.78 / 16.93 / 40.54 us`
- compiled direct-child control: `0.87 / 1.56 / 2.48 / 4.25 / 9.57 us`
- direct compiled MWS multi-combine: `1.30 / 4.17 / 8.04 / 15.65 / 38.87 us`
- counts above are `1 / 5 / 10 / 20 / 50`

### Updated inference

- the remaining custom `split/combine` lane is now benchmark-visible instead of inferred
- on this lane too, `runtime-compiled` MWS is already close to `direct compiled` MWS at mid/high counts
- that means the root compiled wrapper is again no longer the main cost
- the next ROI remains inside MWS-native lowering or another bounded runner simplification, not `CALL_SUBPLAN`
