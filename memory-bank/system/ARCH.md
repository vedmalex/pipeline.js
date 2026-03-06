# Architecture: pipeline.js

**Version:** 2.0.33
**Updated:** 2026-03-06

---

## Class Hierarchy

```
Stage (base class)
├── Pipeline       — sequential stage composition
├── IfElse         — conditional branching
├── MultiWaySwitch — multiple branch selection
├── Parallel       — concurrent stage execution
├── Sequential     — explicit sequential execution
├── DoWhile        — looping stage
├── Timeout        — execution with timeout
├── RetryOnError   — automatic retry on failure
├── Wrap           — context transformation wrapper
└── Empty          — no-op stage
```

---

## Core Modules

### `src/stage.ts` (~420 lines)
Base class for all stages. Handles lifecycle: run, error, rescue, ensure.

### `src/context.ts`
Context object that threads through pipeline. Proxy-based. Supports:
- Parent-child hierarchy via `fork()`
- CyclicJSON-safe serialization (`toJSON()`, `toJSONSafe()`)
- Cycle protection via `visited: Set<Context>` in `toObject()`

### `src/utils/ErrorList.ts`
Error management: `CleanError`, `ErrorList`, `createError()`.
ES5-compatible inline trace capture (no `this.captureTrace()`).

### `src/utils/TypeDetectors.ts`
Centralized ES5-compatible type detection system (introduced 2025-06-17).
- `isError()`, `isCleanError()`, `isPromise()`, `isThenable()`
- `isFunction()`, `isAsyncFunction()`, `isObject()`, `isPlainObject()`
- `isStage()`, `detectType()`, `validateType()`, `hasProperty()`, `hasMethod()`

### `src/JSON.ts`
CyclicJSON library — handles circular references via `$ref` pattern.
Two-pass parse algorithm. Handles Error, Date, Buffer objects.

---

## Key Architectural Decisions

### AD-001: TypeDetectors over instanceof
**Decision:** Replace all `instanceof` checks with `TypeDetectors` utility functions.
**Rationale:** `instanceof` fails in ES5 environments when crossing realm boundaries.
**Status:** Implemented (2025-06-17), 47 replacements across 15 files.

### AD-002: CyclicJSON for Context serialization
**Decision:** Use CyclicJSON in `Context.toJSON()` as fallback when circular refs detected.
**Rationale:** Production crash when passing Socket/Express objects through Context.
**Status:** Implemented (2025-06-17).

### AD-003: ES5 compile target
**Decision:** Maintain ES5 as TypeScript compilation target.
**Rationale:** Legacy browser and Node.js compatibility.
**Trade-off:** Cannot use native async/await, Proxy (polyfilled), class fields.
**Future:** Candidate for re-evaluation after ZOD integration.

### AD-004: Proxy-based Context
**Decision:** Context implements Proxy for transparent property access.
**Rationale:** Allows ctx.myProp instead of ctx.get('myProp').
**Constraint:** RESERVED fields (prefixed `__`) protected from user data.

---

## Test Architecture

- **Framework:** Bun test
- **Count:** 246 tests across 17 files (as of 2026-03-06)
- **TypeDetectors:** 55 dedicated unit tests
- **CyclicJSON:** 22 tests
- **Context cyclic:** 27 tests (14 real-world + 13 integration)
- **Snapshots:** 13 snapshot assertions

---

## Build Output

- `dist/` — ES5 compiled output (esbuild)
- `types/` — TypeScript declaration files
- `lib/` — CommonJS entry point
