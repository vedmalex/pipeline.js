# Compiled Executor Roadmap

## Source

Analysis based on:
- `memory-bank/docs/flow-control-primitives-adaptation-conclusion.md` — external design research adaptation
- `memory-bank/docs/task-009-field-usage-research.md` — field usage evidence
- Current IR/executor state in `src/compiled/` (TASK-008 + TASK-009 implementation)

## Current State (post TASK-008 + TASK-009)

### What's implemented

| Component | Status |
|---|---|
| `RUN_STAGE_FN` (8 signature kinds) | Implemented, specialized dispatch |
| `RUN_STAGE_INSTANCE` | Implemented, delegates to `run_or_execute` |
| `RUN_FALLBACK_STAGE` | Implemented, same as INSTANCE |
| `SET_CTX_FROM_RESULT` | Implemented |
| `JUMP` | Implemented |
| `RETURN` | Implemented |
| Flat Pipeline flattening | Implemented |
| Dependency signature + cache | Implemented |
| Auto-mode: both static + hybrid | Implemented (TASK-009) |
| Compile-time gating (zero per-call overhead) | Implemented (TASK-009) |

### What's reserved but NOT implemented

| Component | Reserved in | What's missing |
|---|---|---|
| `JUMP_IF_TRUE` opcode | `plan.ts` | Executor handler, compiler emission |
| `PUSH_FRAME` / `POP_FRAME` opcodes | `plan.ts` | Executor handlers |
| `WRAP` frame | `plan.ts` | Compiler emission, executor finalize logic |
| `RETRY` frame | `plan.ts` | Compiler emission, executor retry loop |
| `LOOP` frame | `plan.ts` | Compiler emission, executor iteration |
| `PARALLEL` frame | `plan.ts` | Compiler emission, executor fan-out/join |
| `predicates` table | `plan.ts` | Empty, no consumers |
| `transforms` table | `plan.ts` | Empty, no consumers |
| `combiners` table | `plan.ts` | Empty, no consumers |
| `constants` table | `plan.ts` | Empty, no consumers |

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

**Roadmap clarification:** TASK-012 cannot be considered complete without TASK-010's error-model contract, even if some mechanical loop-frame work can begin earlier.

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

**Goal**: Make loops, retries, and error recovery compiled-native.

### 2a. Compile-native RetryOnError

- `RETRY` frame: `retriesLeft` counter, `retryTarget` (pc to re-enter), optional backup/restore transforms
- Compiler detects RetryOnError, emits frame push + inner ops + retry-on-error check
- Executor: on error, check frame → if retries left, decrement and jump to retryTarget
- `backup`/`restore` → transforms table entries

### 2b. Compile-native DoWhile

- `LOOP` frame: `loopHead` (pc), `iteration` counter, `reachEnd` predicate
- Compiler emits frame push + inner ops + predicate check + conditional jump back
- `split` function → per-iteration context derivation
- Executor: after inner ops, evaluate reachEnd predicate → continue or exit

### 2c. Compile-native Sequential

- Already planned as TASK-009 P1
- `LOOP_SEQUENTIAL` op: split → iterate (using LOOP frame) → combine
- split/combine → transforms/combiners table entries
- Inner stage compiled as subplan

### 2d. Timeout boundary semantics

- Timer registration as executor-level concern (not frame)
- On timeout → cancel pending stage, route to error/fallback
- Cleanup on normal completion
- Most complex item in Phase 2 due to timer lifecycle management

### 2e. Error boundary model (TASK-010 overlap)

- Explicit error routing: catch / retry / fallback boundary ops
- `rescue` handler as compiled boundary (not per-stage callback override)
- CleanError preservation of original error as primary signal
- Error codes for stable diagnostic taxonomy

**Dependency**: TASK-010 should define the error model first, then Phase 2 implements it in the compiled executor.

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

---

## Phase 3 — Parallel and Composition (future)

- `PARALLEL` frame: fan-out N children, join strategy (all/any/quorum)
- Bounded concurrency for data-parallel split workloads
- Optional `CALL_SUBPLAN` for reusable compiled fragments
- Map-reduce pattern support

---

## Phase 4 — Future-Forward (architecture-ready, not planned)

- Delay / backoff primitive
- Outcome channels (success/error/timeout/fallback routing)
- Quorum / partial-completion joins
- Resumable executor state / checkpoints

---

## Task Mapping

| Order | Phase | Task | Depends on | Primary gate |
|---|---|---|---|---|
| 1 | Stabilization | TASK-010: CleanError + Error Taxonomy | TASK-008 (done) | explicit error contract + public-safe error code taxonomy |
| 2 | Phase 1 | TASK-011: Compile-native IfElse + Wrap | TASK-009 (done) | remove wrapper fallback for compile-supported forms without hybrid regression |
| 3 | Phase 2 | TASK-013: Compile-native Sequential | TASK-011 | cluster-D parity + median improvement on real sequential workloads |
| 4 | Phase 2 | TASK-012: Compile-native DoWhile + RetryOnError | TASK-010 + TASK-011 | loop/retry frames with error-model parity |
| 5 | Phase 2 | TASK-014: Timeout boundary + error boundaries | TASK-010 + TASK-012 | explicit compiled catch/retry/fallback semantics |
| 6 | Phase 3 | TASK-015+: Parallel frame + composition | TASK-014 | structured parallel/join semantics |

## Recommended Task Progression

Follow the tasks in this order:

1. close TASK-010 design first so later control-flow work has a stable error contract
2. implement TASK-011 to remove the biggest hybrid fallback islands (`IfElse`, `Wrap`)
3. implement TASK-013 next because field evidence says `Sequential` is high-value and mostly independent of timeout/error-boundary design
4. implement TASK-012 after TASK-010 is settled, so `RetryOnError` does not guess at future error semantics
5. implement TASK-014 last in Phase 2, because it depends on both the error model and local frame infrastructure

This order keeps the biggest performance wins early while preventing semantic rework later.

---

*Created: 2026-03-07*
*Based on: flow-control-primitives-adaptation-conclusion.md + field research + TASK-008/009 implementation*
