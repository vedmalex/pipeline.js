# ISSUES.md — pipeline.js Knowledge Base

**Updated:** 2026-03-06

---

## Resolved Issues (Lessons Learned)

### ISSUE-001: ES5 instanceof incompatibility
**Discovered:** 2025-06-17
**Symptom:** `TypeError: _this.captureTrace is not a function` in production ES5 environments.
**Root Cause:** `this.captureTrace()` method binding fails in ES5 constructor pattern. Additionally, `instanceof` checks break when crossing JS realm boundaries in ES5.
**Resolution:** Inline ES5-compatible implementation for trace capture. Created `TypeDetectors` utility to replace all 47 `instanceof` usages.
**Pattern:** Use `TypeDetectors.isError()`, `isPromise()`, `isFunction()` instead of `instanceof`.
**Files affected:** 15 source files, `src/utils/TypeDetectors.ts` (new).

### ISSUE-002: Context circular reference crash
**Discovered:** 2025-06-17
**Symptom:** `Converting circular structure to JSON` crash in production when passing Socket/Express objects through Context.
**Root Cause:** `Context.toJSON()` used plain `JSON.stringify()` which cannot handle circular refs.
**Resolution:** CyclicJSON library integrated. `toJSON()` has try-catch fallback to `CyclicJSON.stringify()`.
**Pattern:** Always use `toJSONSafe()` when context may contain socket/request objects.

### ISSUE-003: Context.toObject() infinite recursion
**Discovered:** 2025-06-17
**Symptom:** Stack overflow when parent-child Context had circular references.
**Root Cause:** `toObject()` called parent's `toObject()` without cycle detection.
**Resolution:** Added `visited: Set<Context<any>>` parameter with early return `{__circularRef: true}`.
**Pattern:** Any recursive tree traversal over Context must carry a `visited` Set.

### ISSUE-004: CyclicJSON parse algorithm bug
**Discovered:** 2025-06-17
**Symptom:** `$ref` markers not resolved after parse; Buffer objects not restored.
**Root Cause:** Single-pass resolve algorithm failed for back-references; Buffer handled after toJSON().
**Resolution:** Rewrote to two-pass algorithm with in-place object mutation. Buffer processed before toJSON().

### ISSUE-005: Context `id` field conflict
**Discovered:** 2025-06-17
**Symptom:** User data `id` field shadowed by internal Context ID.
**Resolution:** Internal ID renamed to `__id`, added to RESERVED map. User `id` field now freely usable.

---

## Open Issues (from mb3-critic audit 2026-03-06)

### ISSUE-006: Promise.withResolvers / Promise.try — TypeScript type lib mismatch [LOW] ✏️ REVISED
**Discovered:** 2026-03-06 (audit) | **Revised:** 2026-03-06
**Files:** stage.ts + 10 others (11 files)
**Clarification:** `target: "es5"` controls emitted *syntax* (no classes, no arrow functions), NOT available runtime APIs. The library targets Node.js/Bun which natively supports `Promise.withResolvers` and `Promise.try`. Applications embedding pipeline.js in ES5-syntax environments still run in a modern Node/Bun. This is correct design.
**Actual problem:** TypeScript's type declarations (`lib: ["ESNext"]`) don't yet include these APIs → TS2339 type errors at compile time even though runtime works.
**Action:** Add a `.d.ts` type shim extending `PromiseConstructor` with `withResolvers` and `try`. No code change needed.
**Note:** `erasableSyntaxOnly: true` in tsconfig is intentional — restricts to Node-runnable TypeScript syntax. Not a bug.

### ISSUE-007: TypeScript compilation — 29 errors [HIGH]
**Discovered:** 2026-03-06 (audit)
**Problem:** `tsc --noEmit` fails with 29 errors. Bun test passes (permissive transpiler). Published types may be broken.
**Key groups:** Promise API errors (11), implicit any (6), TS2723 null invoke (3), PromiseSettledResult narrowing (2), _config undefined (2), unknown tsconfig option (1), other (4).
**Action:** Fix in priority groups. Start with ISSUE-006 (fixes 11 errors).

### ISSUE-008: TypeDetectors incomplete API [HIGH]
**Discovered:** 2026-03-06 (audit)
**Problem:** `isDate()`, `isTypeError()`, `isBuffer()` missing from TypeDetectors. Live code in `src/JSON.ts` and `src/context.ts` still uses `instanceof` for Date and TypeError.
**Action:** Add 3 functions to TypeDetectors, update JSON.ts and context.ts.

### ISSUE-009: Orphan draft files in src/ [MEDIUM]
**Discovered:** 2026-03-06 (audit)
**Files:** `context copy.ts`, `context copy 2.ts`, `context.old.ts`, `context.new.ts`, `pipeline_new.ts`
**Problem:** Included in tsc glob, contribute to compile errors, create confusion. `context.old.ts` / `context copy.ts` have `instanceof` violations and `debugger` statement.
**Action:** Delete `context copy*.ts`, `context.old.ts`. Evaluate `context.new.ts` and `pipeline_new.ts` — either wire up or delete.

### ISSUE-010: PromiseSettledResult narrowing [MEDIUM]
**Discovered:** 2026-03-06 (audit)
**Files:** `src/multiwayswitch.ts`, `src/parallel.ts`
**Problem:** `.reason` accessed on `PromiseSettledResult<T>` without narrowing to `PromiseRejectedResult`. TypeScript error TS2339.
**Fix:** `if (result.status === 'rejected') { use result.reason }`

### ISSUE-011: console.error in library code [MEDIUM]
**Discovered:** 2026-03-06 (audit)
**File:** `src/utils/async/retryAfter.ts`
**Problem:** Production library pollutes consumer logs. No opt-out mechanism.
**Action:** Remove or replace with configurable callback.

---

## Open Technical Debt

### DEBT-001: ES5 target reconsideration
**Priority:** Medium
**Description:** ES5 target prevents native async/await, modern class fields. With TypeDetectors in place, the main ES5 blocker (instanceof) is resolved. Should evaluate upgrading to ES2017+ target.
**Effort:** Medium — would require testing in legacy environments.

### DEBT-002: ZOD integration (planned)
**Priority:** High (post-compatibility)
**Description:** Replace AJV validation with ZOD for better TypeScript inference and simpler schemas.
**Effort:** Large — affects public API.

### DEBT-003: Context API modernization (planned)
**Priority:** High
**Description:** All internal stage execution to go through Context only. No raw parameter passing.
**Effort:** Large — architectural change.

### DEBT-004: Fluent API (planned)
**Priority:** Medium
**Description:** Chainable API similar to tRPC for better DX and TypeScript inference.
**Effort:** Large.

### DEBT-005: Missing linter
**Priority:** Low
**Description:** No ESLint/Biome configured. Code style inconsistencies possible.
**Effort:** Small.

---

## Coding Rules

- **CR-001:** Never use `instanceof` directly — use `TypeDetectors` functions.
- **CR-002:** All Context recursive traversals must carry a `visited: Set<Context>`.
- **CR-003:** Error creation: use `createError()` factory, not `new CleanError()` directly in stage code.
- **CR-004:** ES5-safe patterns: avoid arrow functions in constructors, avoid `class` fields, use `function` keyword for methods that must be ES5-safe.
- **CR-005:** Tests must pass in `bun test` — do not add Node.js-only test dependencies.
- **CR-006:** `Promise.withResolvers()` and `Promise.try()` are allowed — they run correctly on Node.js/Bun. Ensure type shim is in place so `tsc` doesn't error.
- **CR-007:** `tsc --noEmit` must pass with 0 errors before any release. Bun test alone is not sufficient for type validation.
- **CR-008:** No `console.log`/`console.error` in library source code — errors must propagate via the pipeline error system.
