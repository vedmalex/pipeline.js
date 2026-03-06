# mb3-critic DA Report — pipeline.js Full Audit
**Date:** 2026-03-06
**Task:** TASK-001 (MB3 Migration + Full Project Audit)
**Mode:** INTERACTIVE=false, auto_resolved=true
**Verdict:** REVISE

---

## Executive Summary

| Category | Findings | Max Severity |
|----------|----------|--------------|
| TypeScript compilation | 29 errors across 10 files | HIGH |
| Orphan/dead source files | 5 unreferenced files in `src/` | MEDIUM |
| `instanceof` violations | 3 remaining in live code | HIGH |
| `Promise.withResolvers`/`Promise.try` | Used in 11 files, not in ES5 *type* lib | LOW |
| `console.error` in production code | 1 instance | MEDIUM |
| Dependency bloat | `fte.js`, `js-schema` unused externally | LOW |
| Test coverage gap | No tests for `wrap.ts`, `timeout.ts`, `sequential.ts` explicitly | MEDIUM |

**Overall verdict: REVISE** — 2 HIGH severity findings (tsc errors, incomplete TypeDetectors). See FINDING-001 revision note.

---

## FINDING-001: Promise.withResolvers / Promise.try — TypeScript lib mismatch [LOW] ✏️ REVISED

### Revision Note (2026-03-06)
Initial severity was CRITICAL — **incorrect**. The actual compatibility model is:
- The library targets **Node.js / Bun** as its runtime (not raw ES5 browsers).
- `target: "es5"` controls the **syntax** emitted by TypeScript (no classes, no arrow functions in output), NOT which runtime APIs are available.
- Applications that embed pipeline.js in ES5 **syntax** (no inheritance/classes) still run in a modern Node.js/Bun that natively supports `Promise.withResolvers` and `Promise.try`.
- `erasableSyntaxOnly: true` was intentionally added to restrict to Node-runnable TypeScript syntax — not a bug, a policy.

### Actual Problem
The TypeScript type declarations (`lib: ["ESNext"]`) do not include `Promise.withResolvers` and `Promise.try` because these are not yet in ESNext lib. This causes **TS2339 type errors** at compile time even though the code runs correctly at runtime.

### Evidence
```
src/stage.ts(172,52): error TS2339: Property 'withResolvers' does not exist on type 'PromiseConstructor'
src/utils/async/retryAfter.ts(10,28): error TS2339: Property 'try' does not exist on type 'PromiseConstructor'
```

### Alternative
- **Option A (recommended):** Extend the `PromiseConstructor` interface in a `.d.ts` shim file:
  ```typescript
  // src/types/promise-extensions.d.ts
  interface PromiseConstructor {
    withResolvers<T>(): { promise: Promise<T>; resolve: (v: T) => void; reject: (r?: any) => void }
    try<T>(fn: () => T | Promise<T>): Promise<T>
  }
  ```
- **Option B:** Add `"ES2024"` to `lib` array in tsconfig.json (covers `withResolvers`; `Promise.try` still needs shim).

### Risk
**Severity: LOW** — Runtime works correctly. Pure TypeScript type annotation issue. No impact on consumers.

---

## FINDING-002: TypeScript Compilation — 29 Errors [HIGH]

### Challenge
Running `tsc --noEmit` against `tsconfig.json` produces 29 errors. The project does not compile cleanly with its own configuration. This means:
- `npm run lib` / `npm run build` will fail or produce corrupt output.
- `types/` declarations will not be generated correctly.
- `prepublish` hook will fail on next `npm publish`.

**Key error groups:**

| Error | Files | Count |
|-------|-------|-------|
| `Promise.withResolvers` not in PromiseConstructor | stage, pipeline, sequential, parallel, multiwayswitch, retryonerror, dowhile, withTimeout, retryAfter | 9 |
| `Promise.try` not in PromiseConstructor | retryAfter, empty_run | 2 |
| `Promise.reason` type mismatch (PromiseSettledResult) | multiwayswitch, parallel | 2 |
| `_config` possibly undefined | dowhile | 2 |
| `err`/`ret` implicit any | pipeline, pipeline_new, retryonerror, sequential, empty_run | 6 |
| `erasableSyntaxOnly` unknown option | tsconfig.json | 1 |
| `TS2723` cannot invoke possibly null/undefined | stage | 3 |
| Other | various | 4 |

**Note:** Tests run fine via `bun test` because Bun uses its own TypeScript transpiler which is more permissive. The 246 passing tests do NOT validate `tsc` compilation.

### Risk
**Severity: HIGH** — Published package may have broken type declarations.

---

## FINDING-003: Remaining `instanceof` Violations [HIGH]

### Challenge
The TypeDetectors system was created specifically to eliminate `instanceof`. Three violations remain in live production code:

1. **`src/context.ts:338`** — `error instanceof TypeError`
   - Not covered by TypeDetectors (no `isTypeError()` function).
   - Runs in ES5 environment. `TypeError` instanceof check should work within same realm, but is inconsistent with project policy.

2. **`src/JSON.ts:30`** — `value instanceof Error`
   - CyclicJSON serializer. Should use `TypeDetectors.isError()`.
   - This is production serialization code, not test code.

3. **`src/JSON.ts:47`** — `value instanceof Date`
   - Same file. No `isDate()` in TypeDetectors.
   - TypeDetectors is missing Date and TypeError detection functions.

Additionally, `src/context copy.ts` has 3 violations — but this is an orphan file (see FINDING-004).

### Risk
**Severity: HIGH** — Violates CR-001 (Coding Rule). Incomplete migration from the ES5 Instanceof Refactoring task. TypeDetectors lacks `isDate()` and `isTypeError()`.

---

## FINDING-004: Orphan/Draft Source Files [MEDIUM]

### Challenge
Five files exist in `src/` that are not imported by any live code and are not exported via `src/index.ts`:

| File | Status | Risk |
|------|--------|------|
| `src/context copy.ts` | Copy of old context with `instanceof` violations + TODO | Confusion, included in tsc glob |
| `src/context copy 2.ts` | Another context copy with TODO | Same |
| `src/context.old.ts` | Old implementation | Included in tsc glob, adds compile surface |
| `src/context.new.ts` | New context draft with TODO | Not wired up |
| `src/pipeline_new.ts` | New pipeline draft using `Promise.withResolvers` | Not exported from index.ts, but adds 4 TS errors |

These files **are included in TypeScript compilation** (`"include": ["src/**/*"]`) and contribute to the 29 compile errors. They also create confusion about which implementation is canonical.

**Note:** `src/utils/ErrorList.old.ts` contains `debugger` statement (ISSUE already noted).

### Risk
**Severity: MEDIUM** — Not runtime risk, but actively contributes to compile errors and creates maintenance confusion.

---

## FINDING-005: `console.error` in Production Code [MEDIUM]

### Challenge
`src/utils/async/retryAfter.ts` contains:
```typescript
console.error(`error occurred: ${err} retrying after ${timeout}ms. Attempt ${attempts}/${maxAttempts}`);
```
This is a production utility function. Console output in library code:
- Pollutes user application logs.
- Cannot be silenced by consumer without monkey-patching.
- Violates CR-003 spirit (error information should flow through the error system, not console).

### Alternative
Replace with configurable logging or remove entirely — errors will propagate via throw if max attempts reached.

### Risk
**Severity: MEDIUM** — DX issue, not a correctness bug.

---

## FINDING-006: `erasableSyntaxOnly` Unknown Compiler Option [LOW]

### Challenge
`tsconfig.json` contains `"erasableSyntaxOnly": true` which produces:
```
tsconfig.json(34,5): error TS5023: Unknown compiler option 'erasableSyntaxOnly'.
```
This option was introduced in TypeScript 5.5. The project uses `"typescript": "next"` but apparently the installed version doesn't have this option, OR the option name is incorrect.

### Risk
**Severity: LOW** — Causes 1 compile error. Easy fix: remove or add version guard.

---

## FINDING-007: `Promise.reason` Type Access Pattern [MEDIUM]

### Challenge
`src/multiwayswitch.ts` and `src/parallel.ts` access `.reason` on `PromiseSettledResult<T>` without narrowing to `PromiseRejectedResult`:
```typescript
// Error: Property 'reason' does not exist on type 'PromiseFulfilledResult<void>'
```
TypeScript correctly rejects this — `.reason` only exists on `PromiseRejectedResult`. Fix requires type narrowing: `if (result.status === 'rejected') { result.reason }`.

### Risk
**Severity: MEDIUM** — Compile error only, but indicates incorrect type assumption in async result handling.

---

## FINDING-008: Dependency Review [LOW]

### Challenge
Production dependencies include:
- `fte.js` (3.0.0-rc.4) — template engine. Used in `src/utils/template.ts`. But `template.ts` is not exported in `src/index.ts`. It IS imported by some stage config utilities. RC version in production is a risk.
- `js-schema` (1.0.1) — last published 2014. Not found in any `rg` search of src/ (likely transitive or vestigial).
- `lodash` — used in `context.ts` for `defaultsDeep`. Could be replaced with a lighter utility given the rest of the codebase.
- `ajv` stack (4 packages) — used only in `src/utils/types.ts` for schema validation. Heavy for what it does.

### Risk
**Severity: LOW** — No immediate breakage, but `fte.js@rc` and `js-schema@2014` are maintenance concerns.

---

## FINDING-009: Missing TypeDetectors Functions [HIGH]

### Challenge
TypeDetectors (`src/utils/TypeDetectors.ts`) is the canonical type-checking utility. It is missing:
- `isDate(value)` — needed by `src/JSON.ts:47`
- `isTypeError(value)` — needed by `src/context.ts:338`
- `isBuffer(value)` — `Buffer.isBuffer()` is used in legacy context copies; TypeDetectors has no buffer check

Without these, the "100% instanceof elimination" claim from TASK-000-E is incomplete.

### Risk
**Severity: HIGH** — Incomplete implementation of a completed task. Risk of regression if someone adds code that needs date/TypeError detection and bypasses TypeDetectors.

---

## Prioritized Remediation Backlog (REVISED)

| Priority | Finding | Action | Effort |
|----------|---------|--------|--------|
| P1-HIGH | FINDING-002 | Fix 29 tsc errors: add `Promise.withResolvers`/`try` type shim (.d.ts), fix narrowing, fix implicit any | S |
| P1-HIGH | FINDING-003 + 009 | Add `isDate()`, `isTypeError()` to TypeDetectors; fix JSON.ts + context.ts | S |
| P2-MEDIUM | FINDING-004 | Delete orphan files (context copy*.ts, context.old.ts) or move to `_drafts/` | XS |
| P2-MEDIUM | FINDING-007 | Fix PromiseSettledResult narrowing in multiwayswitch + parallel | XS |
| P2-MEDIUM | FINDING-005 | Remove console.error from retryAfter.ts | XS |
| P3-LOW | FINDING-001 | Add Promise type shim for `withResolvers`/`try` to remove TS2339 errors | XS |
| P3-LOW | FINDING-008 | Audit js-schema dependency, evaluate lodash replacement | L |

**Effort:** XS=<30min, S=<2h, M=<1day, L=multi-day

---

## DA Verdict: REVISE (updated)

**Blocking issues (must fix before `npm publish`):**
1. TypeScript compilation fails with 29 errors — published `.d.ts` types will be wrong (HIGH)
2. TypeDetectors incomplete — `isDate()`, `isTypeError()` missing, 3 `instanceof` remain in live code (HIGH)

**Non-blocking but worth fixing:**
- Orphan files creating compile noise (MEDIUM)
- Type narrowing bugs in async result handling (MEDIUM)
- `console.error` in library code (MEDIUM)

**Not a problem (revised from initial assessment):**
- `Promise.withResolvers`/`Promise.try` — runtime works, needs only a type shim (.d.ts), not code change
- `erasableSyntaxOnly` — intentional policy for Node-runnable TypeScript, not a bug

**Project health summary:**
- Test suite: ✅ 246/246 passing (Bun runtime)
- `tsc --noEmit`: ❌ 29 errors (fixable in ~2h with type shim + narrowing fixes)
- Runtime ES5-syntax compatibility: ✅ Correct — syntax compiles to ES5, modern APIs available via Node/Bun
- Public API: ✅ Stable
- Architecture: ✅ Good (TypeDetectors, CyclicJSON, Context isolation)
- Knowledge preservation: ✅ 5 tasks archived, ISSUES.md populated
