# MultiWaySwitch (MWS) Semantic Specification

**Status**: DRAFT  
**Track**: 1.4 — Semantic Contract Stabilization  
**Date**: 2026-03-08

## Design Intent (per author)

MWS is designed for **parallel case execution where ideally only one case matches**. If multiple cases modify context, they work on a shared mutable object so mutations merge naturally. If multiple cases produce separate child contexts without explicit `combine`, that should be an error. This is currently **not enforced**.

## Current Behavior Analysis

### Case evaluation
- **Static cases** (`evaluate: true` or omitted): always execute
- **Dynamic cases** (`evaluate: function`): execute only if predicate returns truthy

### Context flow
1. `splitCase(caseItem, ctx)` — by default returns `ctx` itself (same reference)
2. Each case runs with the split result as input
3. `combineCase(caseItem, initialCtx, retCtx)` — by default returns `ctx` (ignoring `retCtx`)
4. `resultContext` is **overwritten** on each successful case completion (line 294)

### Race condition
Cases execute in parallel via `Promise.allSettled`. When multiple cases complete, `resultContext = this.combineCase(...)` is called for each. The **last to complete** sets the final `resultContext`. With the default `combine` (which returns `ctx` unchanged), this is harmless because all cases share the same mutable reference. But with custom `combine` functions, the last-writer-wins behavior is a **silent correctness hole**.

### Error handling
- Any case error → the case's promise is rejected
- After `allSettled`, all rejected results are collected into `createError(errors)`
- If errors exist, `done(error, initialCtx)` — original context returned
- If no errors, `done(undefined, resultContext ?? initialCtx)`

## Specified Semantic Modes

### Mode A: Shared Mutable Context (default)

When no `split` and no `combine` are configured:
- All cases receive the **same** context reference
- Cases mutate the shared context directly
- No merge logic needed — mutations accumulate on the same object
- `resultContext` is set but points to the same object as `initialCtx`
- **Correctness relies on**: cases mutating non-overlapping keys, or being idempotent on overlapping keys
- **Race safety**: mutations to the same key from concurrent cases produce non-deterministic results (inherent to shared mutable state + parallelism)

### Mode B: Split/Combine Context

When `split` and/or `combine` are configured:
- `split` produces a derived context per case (may be a subset, projection, or fork)
- `combine` merges the case result back into the parent context
- **Current problem**: `resultContext` is overwritten per case, not accumulated
- **Fix needed**: combine should be applied incrementally (fold), not as last-writer-wins

## Correctness Rules to Enforce

### Rule 1: Multi-match combine-order warning (implemented)
If more than one case matches and explicit `combine` logic is present, emit a one-time runtime warning:
```
[pipeline.js] MultiWaySwitch: multiple matching cases with combine functions are folded in async completion order.
Make combine commutative or use Sequential if order matters.
```

This is a **warning**, not an error, because completion-order folding is still valid when combine is commutative/idempotent.

### Rule 2: Combine accumulation (fix)
When `combine` is provided, the combine results should be folded, not overwritten:

**Current** (line 294):
```ts
resultContext = this.combineCase(stg, initialCtx, retCtx)  // overwrites
```

**Target**:
```ts
resultContext = this.combineCase(stg, resultContext ?? initialCtx, retCtx)
```

This way each combine sees the accumulated result from previous combines, not the original context.

**Note**: Because cases run in parallel, the order of combine calls is non-deterministic. This is inherent to the MWS design — if ordering matters, use Sequential instead.

### Rule 3: No implicit fork
MWS does **NOT** implicitly call `ctx.fork()`. If a user wants isolated contexts per case, they provide a `split` function that forks explicitly. This aligns with the Context explicitness principle (Track 1.3).

## Compiler Support (Track 2)

MWS currently has **no compile-native path** — it falls through to `RUN_FALLBACK_STAGE` at `compiler.ts:1054`. A compile-native MWS would:

1. Evaluate predicates inline
2. Execute matching cases via `RUN_PARALLEL`-like concurrent dispatch
3. Apply combine fold in completion handler

This is deferred to Track 2.

## Implementation Checklist

1. [x] Fix combine accumulation: `resultContext ?? initialCtx` instead of `initialCtx` in `combineCase` call
2. [x] Add runtime warning for multi-match with explicit combine and non-deterministic completion order
3. [ ] Add test: multiple cases with custom combine produce accumulated result
4. [ ] Add test: shared mutable mode with multiple cases produces correct merged mutations
