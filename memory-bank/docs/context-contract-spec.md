# Context Contract Specification

**Status**: IMPLEMENTED (legacy/warn escape hatches retained)  
**Track**: 1.3 — Semantic Contract Stabilization  
**Date**: 2026-03-08

## Problem Statement

`Stage.execute()` unconditionally calls `Context.ensure()` on every input, wrapping plain objects into a `Proxy`-backed Context with `WeakRef` + `FinalizationRegistry`. This costs ~8-10 µs per call and is the dominant bottleneck in the compiled executor path (Cluster A failure root cause).

Most production usage (e.g., `apps/sharan`) passes plain `{}` objects and never uses `fork()`, `getParent()`, or `getRoot()`. The wrapping is wasted overhead.

## Design Principle

> Context is **mutable by design**. Developers should **explicitly opt into rich Context semantics** (`fork/getParent/getRoot`) rather than having magic auto-wrapping.

If a developer calls `ctx.fork()` on a plain object without explicit `new Context()` or `Context.ensure()`, they should get a **clear error**, not silent magic.

## Two Context Modes

### Mode 1: Plain Mutable Carrier (default)

- Input: any `StageObject` (plain `{}`, class instance, etc.)
- Behavior: passed through as-is, no wrapping
- Available APIs: direct property mutation (`ctx.x = 1`)
- NOT available: `fork()`, `getParent()`, `getRoot()`, parent-chain property lookup
- Cost: ~0 µs overhead

### Mode 2: Rich Context (explicit opt-in)

- Input: `Context.ensure(obj)` or `new Context(obj)` called by the user before `pipeline.execute()`
- Behavior: full Proxy-backed Context with parent chain, fork, root tracking
- Available APIs: all of Mode 1 + `fork()`, `getParent()`, `getRoot()`, parent-chain get
- Cost: ~8-10 µs (current)

## Detection Contract

`Context.isContext(obj)` remains the canonical check. Returns `true` only for Proxy-wrapped Context instances (those created via `new Context()` or `Context.ensure()`).

## Built-in Primitive Behavior by Mode

### Stage.execute() — `src/stage.ts:226-227`

**Current**:
```ts
const input_is_context = Context.isContext(not_ensured_context)
let context = Context.ensure<T>(not_ensured_context)  // ALWAYS wraps
```

**Implemented**:
```ts
const input_is_context = Context.isContext(not_ensured_context)
let context = input_is_context
  ? not_ensured_context                    // already wrapped, pass through
  : not_ensured_context as T               // plain carrier, no wrapping
```

The `OriginalObject` flag and output unwrap logic (`ctx.original`) remain unchanged — they only activate when `input_is_context` is true.

### RetryOnError.backupContext() — `src/retryonerror.ts:86-95`

**Current**:
```ts
if (Context.isContext(ctx)) {
  return ctx.fork({})      // rich Context: fork creates snapshot
} else {
  return ctx               // plain carrier: NO snapshot (BUG!)
}
```

**Applied fix for plain carrier**: When no custom `backup` function is provided and the input is a plain carrier, use the existing deep snapshot utility from `context_snapshot.ts` to create a proper backup:

```ts
if (Context.isContext(ctx)) {
  return ctx.fork({})
} else {
  return createIsolatedStageContext(ctx)
}
```

This is a **deep** snapshot, so nested objects/arrays/Map/Set values are restored correctly between retries.

### RetryOnError.restoreContext() — `src/retryonerror.ts:98-112`

**Current behavior is correct for both modes**: copies keys from backup into ctx. No change needed.

### context_snapshot.ts — `src/utils/context_snapshot.ts`

All `Context.isContext()` checks degrade gracefully for plain carriers. No change needed.

### MultiWaySwitch — `src/multiwayswitch.ts`

No direct Context dependency in `split()`/`combine()` defaults — they just return the same reference. Context semantics for MWS are a separate spec (Track 1.4).

## Compiled Executor Impact

The compiled executor's `executeCompiledPlan()` in `src/compiled/executor.ts` receives context directly. It never calls `Context.ensure()` itself — that happens in `Stage.execute()` before delegation.

When `Stage.execute()` stops wrapping plain carriers, the compiled executor will receive plain objects and work correctly because:
1. All `RUN_STAGE_FN` ops just call functions with the context — no Context API needed
2. `RUN_STAGE_INSTANCE` delegates to the stage's own `execute()` — wrapping happens there if needed
3. `RUN_FALLBACK_STAGE` delegates to the stage's own `execute()` — same as above
4. Retry ops delegate to `stage.backupContext()` / `stage.restoreContext()` — Context-aware

## Output Contract

| Input Type | `input_is_context` | Execute wraps? | Output returned to caller |
|---|---|---|---|
| Plain `{}` | `false` | **No** (new) | Same mutated object |
| `Context.ensure({})` | `true` | No (passthrough) | Same Context proxy |

## Error Contract

If a user calls `ctx.fork()` on a plain object (not a Context), they get:
```
TypeError: ctx.fork is not a function
```

This is the natural JavaScript error — no additional runtime wrapping or error messaging needed. The error is clear and actionable: use `Context.ensure()` if you need `fork()`.

## Migration Path

See Track 1.5 (migration policy) for rollout details. Current default is `explicit`; `legacy` and `warn` remain available as compatibility escape hatches.

## Implementation Checklist

1. [x] `Stage.execute()`: skip `Context.ensure()` when input is not already a Context (default `explicit`)
2. [x] `RetryOnError.backupContext()`: deep snapshot for plain carrier backup
3. [x] Add tests for plain carrier through RetryOnError (backup/restore cycle)
4. [x] Add tests for plain carrier through compiled Pipeline execution paths
5. [x] Benchmark: measure Cluster A improvement with plain carrier fast path
