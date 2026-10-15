# Migration Policy Specification

**Status**: IMPLEMENTED through Phase 2  
**Track**: 1.5 — Semantic Contract Stabilization  
**Date**: 2026-03-08

## Scope

This document defines how the Context explicitness change (Track 1.3) and MWS semantics fix (Track 1.4) are rolled out without breaking existing consumers.

## Phased Rollout

### Phase 0: Correctness Fixes Only (done)

**Changes already applied** (no breaking changes):
- `compiler.ts`: nested Pipeline with boundary features no longer flattened (was silently dropping features)
- `retryonerror.ts`: plain carrier now gets a deep snapshot instead of no backup
- `multiwayswitch.ts`: combine accumulation uses `resultContext ?? initialCtx` instead of `initialCtx`
- `multiwayswitch.ts`: one-time warning added when multiple matching cases use explicit combine logic, because fold order follows async completion order

These are all **bug fixes** — no API change, no behavioral change for correctly-written code.

**Acceptance gate**: satisfied.

### Phase 1: Context Auto-Wrap Deprecation Warning (done)

**Change**: `Stage.execute()` emits a one-time console warning when wrapping a plain object:

```
[pipeline.js] Context.ensure() auto-wrap is deprecated for plain objects.
If you need fork/getParent/getRoot, call Context.ensure(ctx) before execute().
Plain objects will be passed through without wrapping in a future version.
```

**Implementation**:
```ts
// In Stage.execute(), before Context.ensure():
if (!Context.isContext(not_ensured_context)) {
  warnOnce('context-auto-wrap',
    '[pipeline.js] Context.ensure() auto-wrap is deprecated...')
}
```

**Control**: `Pipeline.setContextMode('legacy' | 'warn' | 'explicit')`
- `'legacy'` — compatibility behavior, no warnings
- `'warn'` — wrap + emit warning
- `'explicit'` — skip wrapping for plain objects (Phase 2 behavior)

**Acceptance gate**:
- `Pipeline.setContextMode()` API implemented
- `warnOnce()` utility implemented
- tests validate `'warn'`, `'legacy'`, and `'explicit'` behavior

### Phase 2: Explicit Context Default (done)

**Change**: `Pipeline.setContextMode('explicit')` is now the default. `Stage.execute()` no longer calls `Context.ensure()` on plain objects unless mode is switched back to `'legacy'` or `'warn'`.

**Who is affected**:
- Code that passes plain `{}` and then calls `ctx.fork()` somewhere downstream → gets `TypeError: ctx.fork is not a function`
- Code that passes plain `{}` and never uses rich Context APIs → works faster (no Proxy overhead)

**Migration path for affected code**:
```ts
// Before:
pipeline.execute({ data: 1 })

// After (if you need fork/getParent):
pipeline.execute(Context.ensure({ data: 1 }))
```

**Acceptance gate**:
- hotpath benchmark shows strong reduction in per-stage overhead under explicit mode
- compiled executor tests pass with explicit mode behavior
- preview validation against key suites in explicit mode passed; production usage audit still indicates low ecosystem risk

### Phase 3: Remove Legacy Mode (deferred)

**Change**: Remove `'legacy'` and `'warn'` modes. `'explicit'` is the only behavior.

**Timeline**: next major version (semver breaking change).

## Risk Analysis

### Low risk
- Phase 0: pure bug fixes, no API change
- `RetryOnError` plain carrier backup: behavior is now **more correct** than before

### Medium risk
- Phase 1 warning: may cause noise for existing consumers who don't need rich Context
- MWS combine accumulation: if someone depends on last-writer-wins order, their code will produce different results with fold accumulation

### Mitigation
- compatibility escape hatches (`legacy` / `warn`) remain available
- `setContextMode()` API gives full control
- Warning is one-time (not per-call), minimizing noise
- only legacy-mode removal is deferred to a future major version

## Backward Compatibility Matrix

| Feature | Phase 0 | Phase 1 | Phase 2 (current) | Phase 3 |
|---|---|---|---|---|
| Plain `{}` → auto-wrap | Yes | Yes + warn | No by default (`legacy`/`warn` opt-in) | No |
| `Context.ensure({})` → wrap | Yes | Yes | Yes | Yes |
| `ctx.fork()` on plain obj | Error* | Error* | Error | Error |
| RetryOnError plain backup | Clone | Clone | Deep clone | Deep clone |
| MWS combine fold | Yes | Yes | Yes | Yes |
| Pipeline boundary safety | Yes | Yes | Yes | Yes |

*Error: `ctx.fork()` on a plain object was always a runtime error (`fork is not a function`), but it was masked because `Stage.execute()` auto-wrapped before reaching user code.

## Implementation Checklist

### Phase 0 (done)
- [x] Fix nested Pipeline flattening boundary safety
- [x] Fix RetryOnError.backupContext() plain carrier
- [x] Fix MWS combine accumulation
- [x] Add MWS combine-order warning
- [x] Tests for all fixes

### Phase 1 (done)
- [x] Add `Pipeline.setContextMode()` API
- [x] Add `warnOnce()` utility
- [x] Add deprecation warning in `Stage.execute()`
- [x] Tests for warn mode
- [x] Tests for explicit mode (preview)

### Phase 2 (done)
- [x] Change default to `'explicit'`
- [x] Benchmark Cluster A validation
- [x] Update documentation

### Phase 3
- [ ] Remove legacy/warn modes
- [ ] Major version bump
