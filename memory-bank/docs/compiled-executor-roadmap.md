# Compiled Executor Roadmap

## Source

Analysis based on:
- `memory-bank/docs/flow-control-primitives-adaptation-conclusion.md` — external design research adaptation
- `memory-bank/docs/task-009-field-usage-research.md` — field usage evidence
- Current IR/executor state in `src/compiled/` (TASK-008 + TASK-009 implementation)

## Current State (post TASK-027)

### What's implemented

| Component | Status |
|---|---|
| `RUN_STAGE_FN` (8 signature kinds) | Implemented, specialized dispatch, also used by synthetic lowerings |
| `RUN_STAGE_INSTANCE` | Implemented, now mostly reserved for boundary-bearing `Stage` instances and subclasses |
| `RUN_FALLBACK_STAGE` | Implemented, used for semantic boundary islands / hybrid fallback |
| `SET_CTX_FROM_RESULT` | Implemented |
| `JUMP` | Implemented |
| `JUMP_IF_TRUE` | Implemented |
| `PUSH_FRAME` / `POP_FRAME` | Implemented |
| `RUN_SEQUENTIAL` | Implemented |
| `RUN_LOOP` | Implemented |
| `RUN_RETRY` | Implemented |
| `RUN_TIMEOUT` | Implemented |
| `RUN_PARALLEL` | Implemented |
| `RETURN` | Implemented |
| Flat Pipeline flattening | Implemented |
| `Empty` native no-op lowering | Implemented (TASK-025) |
| `MultiWaySwitch` synthetic-runner lowering | Implemented (TASK-026) |
| Direct plain `Stage` devirtualization | Implemented (TASK-027) |
| Dependency signature + cache | Implemented |
| Auto-mode: both static + hybrid | Implemented (TASK-009) |
| Compile-time gating (zero per-call overhead) | Implemented (TASK-009) |
| Timeout / Parallel abort delivery + public execute signal | Implemented (TASK-021..023) |

### What's still intentionally future work

| Component | Reserved in | What's missing |
|---|---|---|
| `CALL_SUBPLAN` / reusable compiled fragments | compiler + executor | Nested compiled subplans without synthetic wrapper runners |
| Portable serialized plans | plan/runtime contract | Current plan is still an in-memory runtime artifact |
| True forced cancellation of active work | timeout/parallel future | Only `AbortSignal` delivery exists today |
| `combiners` table | `plan.ts` | Reserved but still unused directly by the executor |
| Post-TASK-027 benchmark decision gate | process / benchmarks | Need fresh median-based profiling before adding more compiler complexity |

---

## Critic Gap Closure

The first DA pass over the compiled executor roadmap surfaced five planning gaps. They are now treated as explicit roadmap constraints rather than implicit assumptions.

### 1. Hybrid direct-path performance is a gated requirement

Current evidence is mixed:

- real workload clusters improved enough to justify compiled-hybrid auto mode in TASK-009
- synthetic fallback-heavy direct-compiled hybrids are still slower than legacy in the current executor

This means Phase 1 work must not claim victory only because wrapper stages become compile-native on paper.

**New rule:** a milestone that reduces hybrid fallback is done only if it also improves or at least avoids material regression on the synthetic wrapper-heavy benchmark lane.

### 2. Error propagation contract must be explicit before new boundary primitives

Before TASK-010 and TASK-014 extend error routing, the roadmap now fixes the current contract:

- phase-1 compiled executor guarantees sequential success/error short-circuit only
- `Stage.execute()` remains the semantic boundary for `ensure`, `validate`, `rescue`, and current timeout behavior
- compiled plans must preserve observable parity with that boundary, not replace it silently

### 3. Hybrid fallback boundary tests are mandatory, not optional

Every phase that still uses `RUN_FALLBACK_STAGE` must validate:

- sync throw in fallback stage
- async rejection in fallback stage
- callback error in fallback stage
- double-callback / callback-after-throw protection
- rescue-modified context through fallback boundary
- ensure/validate failures crossing the fallback boundary

### 4. Benchmark variance must be normalized

Single-run results are not enough for roadmap decisions.

**Roadmap policy:** use multi-run medians, keep min/max visible in benchmark notes, and treat a change as meaningful only when it clears the acceptance threshold for the target cluster or synthetic lane.

Default threshold for roadmap decisions:

- improvement claims: median gain >= 10%
- regression guard: median slowdown must stay <= 15% unless explicitly accepted for a temporary development slice

### 5. Task dependencies must reflect semantic blockers

`RetryOnError` and compiled error boundaries are semantically coupled.

**Roadmap clarification:** TASK-012 / TASK-014 mechanical compile-native work can land before TASK-010 is finalized, but the final catch/rescue/error-boundary contract still depends on TASK-010.

---

## Phase 1 — Compile-Native Branching + Wrapping (TASK-011)

**Goal**: Eliminate hybrid fallback for deterministic IfElse and Wrap stages.

### 1a. Compile-native IfElse

**What to do:**
- In compiler: detect IfElse child stages in a Pipeline
- Boolean condition → compile `success` or `failed` branch directly (no predicate needed)
- Function condition → add to `predicates` table, emit `JUMP_IF_TRUE` pointing to success ops, with failed ops as fallthrough
- Both `success` and `failed` can be fn/Stage/Pipeline → recursively compile them
- Async condition → emit predicate evaluation with suspend/resume

**IR changes:**
- Implement `JUMP_IF_TRUE` handler in executor: evaluate `predicates[predicateId]`, if truthy jump to `target`, else pc += 1
- Handle async predicates (suspend, resume on result)

**Expected result:**
- IfElse with boolean condition → zero overhead (dead branch eliminated at compile time)
- IfElse with sync fn condition → one predicate eval + jump
- IfElse with async fn condition → one async predicate eval + jump
- Plan mode stays `compiled-static` if inner branches are also compilable

**Test coverage needed:**
- Boolean true/false → correct branch selected
- Function condition → correct branch selected
- Missing branches → passthrough
- Error in condition → proper propagation
- Nested IfElse → flattened ops
- Parity with legacy execution for all existing IfElse tests

### 1b. Compile-native Wrap

**What to do:**
- In compiler: detect Wrap child stages in a Pipeline
- Emit `PUSH_FRAME(WRAP)` with `prepare` as transform, `finalize` as transform
- Emit inner stage ops (recursively compile `config.stage`)
- Emit `POP_FRAME` which applies finalize

**IR changes:**
- Implement `PUSH_FRAME` handler in executor: push frame to `frameStack`, apply prepare transform
- Implement `POP_FRAME` handler: pop frame, apply finalize transform, restore original context
- `WRAP` frame stores: `finalizeId` (index into transforms table), `originalCtx` (snapshot before prepare)

**Expected result:**
- prepare/finalize become indexed table lookups instead of closure dispatch
- Inner stage compiled natively if it's fn/Stage/Pipeline
- Plan mode stays `compiled-static` if inner stage is compilable

**Test coverage needed:**
- prepare + stage + finalize → correct transformation chain
- Missing finalize → original context returned
- Error in inner stage → context not finalized, error propagated
- prepare throws → proper error handling
- Parity with legacy execution for all existing Wrap tests
- Wrap around IfElse → both compiled natively (no fallback)

### Impact

| Metric | Before | After |
|---|---|---|
| Hybrid fallback plans (field estimate) | 15-30% of pipelines | <5% of pipelines |
| Cluster B (HTTP) benchmark | ~37% improvement via hybrid path | Expected ~60-80% as static |
| Fallback op overhead per wrapper stage | `run_or_execute` dispatch | Direct opcode execution |

### Exit gates for TASK-011

TASK-011 is complete only when all of the following are true:

1. `IfElse` and `Wrap` no longer require fallback execution for their compile-supported forms
2. legacy parity holds for existing `IfElse` / `Wrap` tests plus the fallback-boundary matrix listed above
3. Cluster B benchmark shows a meaningful median improvement over the current hybrid baseline
4. the synthetic wrapper-heavy lane is no worse than legacy by more than 15%, and the goal is to beat legacy outright
5. any remaining hybrid regression is traceable to still-uncompiled primitives (`Timeout`, `Sequential`, etc.) and documented explicitly

---

## Phase 2 — Local Control Flow Primitives (TASK-012)

**Goal**: Make loops, retries, and timeout recovery compiled-native under the current error contract, then layer TASK-010 boundary semantics on top.

### 2a. Compile-native RetryOnError

- Implemented as explicit `RUN_RETRY` op plus executor retry-state frame
- Retry policy, backup, and restore stay inspectable in plan constants instead of opaque `RUN_STAGE_FN` wrappers
- Inner stage executes through compiled child runner IDs, preserving native lowering for nested compiled forms

### 2b. Compile-native DoWhile

- Implemented as explicit `RUN_LOOP` op plus loop-state frame
- `split` and `reachEnd` remain visible in compiled plan metadata/constants
- Loop continuation now lives in executor state instead of opaque closure recursion

### 2c. Compile-native Sequential

- Implemented as explicit `RUN_SEQUENTIAL` op plus sequential frame state
- split → iterate → combine now runs in executor-managed state, without per-item fallback wrappers
- Current benchmark gate is closed with compiled-static plans and no material regression

### 2d. Timeout boundary semantics

- Implemented as explicit `RUN_TIMEOUT` op with executor-owned timeout frame
- Timeout now isolates the inner context so late post-timeout mutations do not leak back into the winning result
- On timeout, overdue execution runs against the original context; the late main-stage completion is ignored
- Supported timeout-snapshot domain is explicit: plain objects, arrays, `Map`, `Set`, `Buffer`, `ArrayBuffer` views, `Date`, `RegExp`, and custom instances with enumerable own state
- Unsupported snapshot objects such as `WeakMap`, `WeakSet`, `WeakRef`, `FinalizationRegistry`, and live promises fail fast instead of being cloned implicitly
- Timeout snapshots are intentionally a bounded runtime-container clone, not a universal JS deep-clone contract
- Current guarantee includes result isolation plus timeout-driven `AbortSignal` delivery for signal-aware stages; true forced cancellation of ignored work still remains future work
- Final TASK-010 follow-up is still needed for rich catch/rescue boundary routing, not for basic timeout isolation

### 2e. Error boundary model (TASK-010 overlap)

- Explicit error routing: catch / retry / fallback boundary ops
- `rescue` handler as compiled boundary (not per-stage callback override)
- CleanError preservation of original error as primary signal
- Error codes for stable diagnostic taxonomy

**Note on ensure/validate behavior**: Both legacy and compiled paths swallow `ensure` throws and `validate` rejections — the stage succeeds anyway. This applies to both static (native executor) and hybrid (fallback island) modes. This matches legacy runtime behavior and is the expected parity contract.

### Runtime plan note

- The compiled plan is currently an in-memory executor artifact, not a portable serialization format
- Primitive ops are explicit and inspectable, but their policy functions still live in runtime tables/constants

**Dependency**: TASK-010 still owns the final public error/boundary model; Phase 2 now provides the native executor mechanics that model will plug into.

### Shared QA gates for TASK-010 / TASK-012 / TASK-014

Before Phase 2 is considered stable, the following parity matrix must exist:

- stage throws sync error before callback
- stage rejects async promise
- stage calls callback with error
- stage throws after callback
- stage calls callback twice
- rescue returns modified context after error
- ensure throws after successful inner execution
- validate rejects after successful inner execution
- timeout error preserves original cause and routes consistently

The same observable behavior must hold in:

- legacy runtime
- compiled-static path
- compiled-hybrid path with fallback islands

Hybrid coverage is expected to include the callback/timer edge cases as real fallback-island tests, not only representative wrapper smoke tests.

---

## Phase 3 — Parallel and Composition

- `TASK-015` MVP is now implemented as explicit `RUN_PARALLEL` lowering with executor-managed fan-out/join state for the current `all-settled` `Parallel` semantics
- Supported MVP contract preserves legacy behavior: empty/null split -> passthrough, all children start before settlement, errors aggregate after all children settle, success combines against the split child array
- `TASK-016` bounded concurrency is now implemented in both legacy and compiled paths via `concurrency?: number` while keeping the same `all-settled` join behavior
- `TASK-017` adds the first richer join strategy via `join: 'all' | 'any'`; `any` settles on first success, while all-fail still aggregates `parallel - error` children
- `TASK-018` adds `join: 'quorum'` + `quorum?: number`; success now supports N-of-M thresholds while failed quorum still aggregates wrapped child errors after all children settle
- `TASK-019` adds `trailing: 'ignore' | 'drain-active'` for early-success joins; `drain-active` stops queue growth after success and waits only for already-active branches
- `TASK-020` adds `trailingTimeout?: number` for `drain-active`; early-success joins can now bound how long they wait for already-active branches before settling
- `TASK-021` introduces the first public cancellation contract through `getExecutionSignal(ctx)` and wires timeout-triggered abort delivery into both legacy and compiled runtimes
- `TASK-022` reuses that contract in `Parallel`: early-settlement paths now abort active child branch signals with `ERR_STAGE_ABORTED` while preserving stable parent results
- `TASK-023` exposes `signal?: AbortSignal` on public `Stage.execute(...)` / `Pipeline.execute(...)`, normalizes public aborts to `ERR_STAGE_ABORTED`, and propagates the current execution signal through legacy + compiled child dispatch
- Optional `CALL_SUBPLAN` for reusable compiled fragments remains future work
- True cancellation of active branches remains future work

---

## Phase 3.5 — Semantic Stabilization and Blind-Spot Cleanup

- `TASK-024` stabilized the semantic contract before more devirtualization work:
  - explicit context mode became the default
  - `RetryOnError` plain-carrier backup moved to deep snapshots
  - `MultiWaySwitch` combine folding now uses accumulated context
  - one-time warning documents non-deterministic async combine order for multi-match MWS
- `TASK-025` removed the `Empty` blind spot by lowering boundary-free `Empty` to a native no-op
- `TASK-026` removed the top-level fallback cost for boundary-free `MultiWaySwitch` via a synthetic `RUN_STAGE_FN` runner, preserving current case-selection and combine semantics
- `TASK-027` devirtualized direct boundary-free `Stage` instances into synthetic `RUN_STAGE_FN` runners while deliberately keeping boundary-bearing stages and subclasses on the old instance path

**Interpretation:** the executor is now materially closer to a "compile what is semantically safe, fallback only for real boundaries" model. The next meaningful step should be driven by fresh benchmark evidence, not by blind opcode growth.

---

## Post-TASK-027 Benchmark Review

Fresh median-based benchmark review was rerun after `TASK-024`..`TASK-027` across the real cluster benches plus the synthetic hybrid lane.

The review was then rerun again after `mb3-critic` feedback with variance-visible reporting (`median`, `min`, `max`, and explicit raw runs for caution lanes) before allowing `TASK-030` planning to continue.

### Result snapshot

- **Cluster A (batch / repeated execution):** compiled runtime improves by about **34.8%** at the representative batch=100 lane; direct compiled remains much faster still.
- **Cluster B (HTTP / wrapper-heavy short pipelines):** compiled runtime is now materially faster, not merely "non-regressing":
  - Timeout scenario: about **42.8% faster** than legacy
  - Wrap scenario: about **53.0% faster** than legacy
- **Cluster C (CLI / bootstrap):**
  - warm path improves materially (latest rerun about **37.7%**)
  - cold single-use path is still slower because compile cost dominates one-shot runs; this is now tracked as a **separate informational metric**, not mixed into the warm-path promotion gate
- **Synthetic compiled-executor lane:**
  - compiled-static slope improved to about **0.045 us/stage** vs legacy **0.118 us/stage**
  - compiled-hybrid slope improved to about **0.058 us/stage** vs legacy **0.331 us/stage**
  - nested pipeline spot-check is already strongly better than legacy even without reusable compiled subplans

### Caution

- The first review showed a suspicious `Cluster D` regression at 20 items, but the variance-visible rerun did **not** reproduce it; current visible runs favor compiled execution across the measured range.
- The more credible remaining caution has shifted to **variance / outlier behavior in hybrid synthetic lanes**, where some medians still win clearly but max values show occasional spikes.
- This means the remaining debt is no longer a broad "compiler blind spot" story; it is now closer to targeted executor optimization, nested-composition attribution, and workload-shape variance analysis.

### Decision

- The benchmark review does **not** justify blind continued opcode growth.
- It **does** justify opening the next roadmap task for nested compiled subplans / `CALL_SUBPLAN`, but as an evidence-driven investigation task rather than an assumed implementation slam-dunk.
- Any follow-up task should prove that reusable nested compiled fragments help a real remaining gap more than they increase executor complexity.

### TASK-030 investigation gates

Before `TASK-030` may claim that `CALL_SUBPLAN`-style lowering is the right next step, it must answer all of these:

1. **Bottleneck attribution** — show that the residual gap is really nested-composition overhead, not compile cost, measurement noise, or simpler executor optimization debt.
2. **Cluster coverage** — keep these decision lanes in scope together:
   - Cluster C warm path (promotion gate)
   - Cluster C cold path (informational compile-cost tracking)
   - Cluster D stability
   - compiled-executor nested pipeline lane
   - hybrid synthetic lane with visible variance
3. **Variance visibility** — benchmark notes must keep median + min/max visible, with raw runs printed for caution lanes.
4. **Alternative comparison** — compare `CALL_SUBPLAN` against simpler directions first (nested plan caching, runner reuse, or leaving current synthetic-runner lowering in place).

---

## Phase 4 — Future Composition and Profiling

- Delay / backoff primitive
- Outcome channels (success/error/timeout/fallback routing)
- Quorum / partial-completion joins
- Resumable executor state / checkpoints
- Abortable timeout contract for stages with cancellable external work, split into its own future task once stage-level cancellation exists
- Current active roadmap work inside this phase:
  - `TASK-029` completed the benchmark-guided review
  - `TASK-030` is now the open investigation task for nested compiled subplans / `CALL_SUBPLAN`, with critic-driven benchmark attribution gates

---

## Task Mapping

| Order | Phase | Task | Status | Notes |
|---|---|---|---|---|
| 1 | Foundation | TASK-008: Compiled Iterative Executor | Completed | Core IR, compiler, executor, cache invalidation |
| 2 | Foundation | TASK-009: Performance Research + Default Fast Path | Completed | Auto-mode for compiled-static + compiled-hybrid |
| 3 | Stabilization | TASK-010: CleanError + Error Taxonomy | Completed | Stable public-safe error contract |
| 4 | Phase 1 | TASK-011: Compile-native IfElse + Wrap | Completed | Removed major wrapper fallback islands |
| 5 | Phase 2 | TASK-012: Compile-native DoWhile + RetryOnError | Completed | Loop/retry frames landed |
| 6 | Phase 2 | TASK-013: Compile-native Sequential | Completed | Executor-managed split/iterate/combine |
| 7 | Phase 2 | TASK-014: Timeout boundary + error boundaries | Completed | Timeout frame + boundary parity hardening |
| 8 | Phase 3 | TASK-015: Compile-native Parallel MVP | Completed | `RUN_PARALLEL` fan-out/join core |
| 9 | Phase 3 | TASK-016: Parallel bounded concurrency | Completed | Worker-pool scheduling |
| 10 | Phase 3 | TASK-017: Parallel join-any | Completed | First-success settlement |
| 11 | Phase 3 | TASK-018: Parallel quorum MVP | Completed | N-of-M threshold settlement |
| 12 | Phase 3 | TASK-019: Parallel trailing drain | Completed | `drain-active` semantics |
| 13 | Phase 3 | TASK-020: Parallel trailing timeout | Completed | Bounded post-threshold drain |
| 14 | Phase 3 follow-up | TASK-021: Abort signal contract + timeout delivery | Completed | Public context-bound signal delivery |
| 15 | Phase 3 follow-up | TASK-022: Parallel abort delivery | Completed | Active-child abort notification |
| 16 | Phase 3 follow-up | TASK-023: Public execute AbortSignal API | Completed | `signal?: AbortSignal` on execute APIs |
| 17 | Phase 3.5 | TASK-024: Semantic contract stabilization | Completed | Explicit context mode + semantic hardening |
| 18 | Phase 3.5 | TASK-025: Compile-native Empty lowering | Completed | Native no-op for boundary-free `Empty` |
| 19 | Phase 3.5 | TASK-026: Compile-native MultiWaySwitch | Completed | Synthetic runner lowering |
| 20 | Phase 3.5 | TASK-027: Devirtualize plain Stage instances | Completed | Direct boundary-free `Stage` -> `RUN_STAGE_FN` |
| 21 | Phase 4 | TASK-029: Benchmark-guided roadmap review | Completed | Fresh medians recorded before opening the next compiler slice |
| 22 | Phase 4 | TASK-030: Nested compiled subplans / CALL_SUBPLAN investigation | Open | Evidence-first investigation, not implementation by assumption |

Abortable timeout cancellation still remains intentionally out of scope until the library grows a stronger stage-level cancellation contract than signal delivery.

## Recommended Next Progression

The old Phase 1-3 progression is fully executed, and the benchmark decision gate is now closed for the next step:

1. `TASK-029` already reran the benchmark medians after TASK-024..027
2. `TASK-030` is the next active task: investigate `CALL_SUBPLAN` / nested compiled subplan lowering only after passing the attribution + variance gates above
3. if `TASK-030` cannot show a meaningful benchmark win over simpler alternatives, stop further compiler growth and keep the remaining instance/fallback paths as intentional semantic boundaries
4. keep true cancellation as a separate future track; do not mix it into subplan work

---

*Created: 2026-03-07*
*Based on: flow-control-primitives-adaptation-conclusion.md + field research + TASK-008/009 implementation*
