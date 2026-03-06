# mb3-critic Devil's Advocate Report — Pass 2
**Date**: 2026-03-06  
**Baseline**: tsc 0 errors, bun test 246/246 pass  
**Framework**: CAR (Challenge / Alternative / Risk)

---

## Finding P2-001: `ErrorList.old.ts` — Dead Code with `debugger` in Production Glob

**Challenge**: `src/utils/ErrorList.old.ts` (65 lines) is included in TypeScript's `src/**/*` glob.  
It contains:
- `debugger` statement at line 55 inside `ComplexError` constructor — will pause any debugger unconditionally
- `@ts-ignore` at line 62 — suppresses a real type error (returning `payload[0]` from a constructor)
- Reimplements `CreateError` / `ComplexError` — superseded by `src/utils/ErrorList.ts`  
- Not imported anywhere in production or test code (zero references outside itself)

**Alternative**: None — this file has no purpose.  
**Risk**: `debugger` in a file compiled by tsc will not cause a runtime problem normally, but any future debugging session will hit it unexpectedly. Adds noise and confusion.  
**Verdict**: **BLOCK — delete immediately**

---

## Finding P2-002: `debugger` Statements in Test Files

**Challenge**: Found `debugger` in 4 test files:
- `stage_old.test.ts`: lines 107, 272, 289
- `retryonerror.test.ts`: lines 60, 63, 69, 76, 88
- `pipeline.test.ts`: line 311
- `mutiwayswitch.test.ts`: line 225

Test-time debuggers are expected during development but committed leftovers slow down CI and create confusion.

**Alternative**: Remove them; any developer can re-add with their editor during debugging.  
**Risk**: Low — tests pass regardless. Minor CI/CD noise.  
**Verdict**: **REVISE — remove `debugger` from all test files**

---

## Finding P2-003: `Promise.try(fn, arg1, arg2)` Non-Standard Signature

**Challenge**: `src/utils/empty_run.ts:9` calls  
```ts
Promise.try((err, context) => done(err, context), err, context)
```
The TC39 `Promise.try` spec (stage-4) only defines `Promise.try(fn)`.  
Passing extra args as `fn, ...args` is a Bluebird-era pattern, not in the spec.

**Investigation result**: Tested in Bun runtime — `Promise.try((a,b)=>a+b, 1, 2)` returns `3`. Bun's implementation accepts extra args and passes them to the callback. The type shim at `src/types/promise-extensions.d.ts:29` already declares `...args: any[]`.

**Alternative**: Rewrite as `Promise.try(() => done(err, context))` — closes over variables, no reliance on non-standard arg-passing.  
**Risk**: Low for now (Bun-specific behaviour works). Medium-term: if the codebase ever runs on Node.js where `Promise.try` follows the spec strictly, this will silently pass `undefined` for `err` and `context`. The closure-based alternative is safer.  
**Verdict**: **REVISE — rewrite to closure form**

---

## Finding P2-004: `src/utils/types.ts` — God Object (619 lines)

**Challenge**: Single file contains:
1. Primitive types (`StageObject`, `Possible<T>`, `CallbackFunction`, etc.)
2. Function-arity type guards (`is_func0` … `is_func3`, `is_async`, etc.)
3. Config interface definitions for all 10 stage types
4. Config factory functions for all 10 stage types (`getStageConfig`, `getPipelinConfig`, `getParallelConfig`, `getTimeoutConfig`, `getIfElseConfig`, `getWrapConfig`, `getEmptyConfig`)
5. AJV schema validation integration (lines 364–373)
6. `AnyStage` union type importing all 10 stage classes (circular-ish coupling)

**Alternative**: Split into:
- `src/utils/primitives.ts` — base types
- `src/utils/type-guards.ts` — arity/async guards
- `src/utils/config-factories.ts` — per-stage config factories
- Keep `src/utils/types.ts` as re-export barrel

**Risk**: Large refactor. Circular imports between stages and types already exist; splitting may expose them. Breaking change for any external consumer importing directly from `types.ts` (unlikely given package.json `exports` field, but possible).  
**Verdict**: **PROCEED with caution — track as TECH-DEBT, not urgent**

---

## Finding P2-005: Dual Type-Guard Systems

**Challenge**: Two parallel type-detection systems co-exist:
- `src/utils/TypeDetectors.ts` — `isError`, `isCleanError`, `isFunction`, `isDate`, `isTypeError`, `isBuffer`, `isThenable`, `isStage`
- `src/utils/types.ts` — `is_thenable`, `is_async_function`, `is_func0` … `is_func3`, `is_async`

Naming conventions differ (`isX` vs `is_x`). `is_thenable` and `isThenable` do the same thing with slightly different implementations (`'then' in inp` vs duck-type check on constructor name).

**Alternative**: Consolidate all type guards in `TypeDetectors.ts`, rename to consistent `isX` pattern, deprecate `types.ts` internal guards.  
**Risk**: Medium refactor. `types.ts` guards are used throughout `types.ts` itself for config factory logic. Safe path: add `isAsyncFunction`, `isFunc0`…`isFunc3` to TypeDetectors and gradually migrate.  
**Verdict**: **PROCEED — track as TECH-DEBT, prioritize after God Object split**

---

## Finding P2-006: AJV in Production Dependencies

**Challenge**: 4 AJV packages (`ajv`, `ajv-errors`, `ajv-formats`, `ajv-keywords`) are `dependencies` (not `devDependencies`). They are only used in `getStageConfig()` when a `schema` field is provided — an optional feature. Adding AJV to users' `node_modules` for an optional validation feature adds ~500KB to the production bundle.

**Alternative**: Lazy-require AJV at runtime (dynamic `import()`), or move to `peerDependencies` with explicit opt-in.  
**Risk**: Breaking change for users who rely on the `schema` field. Lazy import adds async complexity to a sync code path.  
**Verdict**: **PROCEED with caution — TECH-DEBT, not urgent**

---

## Finding P2-007: `stage_old.test.ts` — Value of This File

**Challenge**: `stage_old.test.ts` (360 lines) covers `Stage` behaviour with the old callback-style API. `stage.test.ts` also tests `Stage`. Are these duplicates?

**Investigation**: `stage_old.test.ts` tests the 3-argument `run(err, ctx, done)` callback pattern, `this`-binding of stage instance, `ensureContext`, reenterability, and `Context.ensure`. These scenarios are NOT present in `stage.test.ts` which focuses on the newer API. The file has value. However, it contains 3 `debugger` statements (see P2-002).

**Verdict**: **PROCEED — keep file, remove debugger statements only**

---

## Summary Table

| Finding | Severity | Verdict | Action |
|---------|----------|---------|--------|
| P2-001: `ErrorList.old.ts` dead code + debugger | HIGH | BLOCK | Delete file |
| P2-002: `debugger` in test files | LOW | REVISE | Strip debugger |
| P2-003: `Promise.try` non-standard args | MEDIUM | REVISE | Rewrite to closure |
| P2-004: `types.ts` God Object | MEDIUM | PROCEED | Track as TECH-DEBT |
| P2-005: Dual type-guard systems | MEDIUM | PROCEED | Track as TECH-DEBT |
| P2-006: AJV as hard prod dependency | LOW | PROCEED | Track as TECH-DEBT |
| P2-007: `stage_old.test.ts` duplication | LOW | PROCEED | Keep, strip debugger |

**Actionable now**: P2-001, P2-002, P2-003  
**Deferred**: P2-004, P2-005, P2-006
