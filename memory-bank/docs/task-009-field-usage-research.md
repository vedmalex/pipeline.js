# TASK-009 — Field Usage Research: pipeline.js in Production (grainjs-prod)

## Purpose

Empirical study of how pipeline.js is used in a real production codebase (`grainjs-prod`).
This research informs TASK-009 ("Performance Research + Default Fast Path") by revealing
which constructs, patterns, and execution shapes are actually deployed in the field — so that
default optimizations target the most common real-world workloads.

## Source Codebase

```
/Users/vedmalex/work/grainjs-prod/apps/grainjs/          — main app
/Users/vedmalex/work/grainjs-prod/apps/grainjs/schemaExport/  — heavy pipeline usage
/Users/vedmalex/work/grainjs-prod/packages/web/src/features/routing/  — TypeScript consumer
```

Exclusions: `*app.*/**`, `*applications*`, `*.d.ts`

## Summary

- **55+ files** importing from `pipeline.js`
- Imports via `require('pipeline.js')` (CJS) and `import ... from 'pipeline.js'` (ESM)
- Constructs used: **Pipeline, Stage, Context, Sequential, Parallel, Wrap, Timeout, IfElse, Config**

## Verification Notes (post-critic pass)

After the first DA pass, the research was re-checked against the main concerns.

### 1. Sampling beyond one repo

A broader workspace scan (excluding `node_modules`, `public`, `dist`, `build`, `app.gen`, etc.)
found `pipeline.js` imports in **16 repos/directories** under `/Users/vedmalex/work`, including:

- `grainjs` — 149 files
- `speedup_grainjs` — 136 files
- `new_grainjs` — 130 files
- `grainjs-prod` — 126 files
- `grainjs-proj` — 85 files
- `medtrix` — 79 files
- `disciples` — 25 files

There are also migration/temp/test copies, which confirm ecosystem repetition but should not be
treated as independent evidence.

**Conclusion:** the original report is still centered on `grainjs-prod`, but it is no longer fair to
call it a single-codebase observation with no external corroboration. The same family of patterns
repeats across multiple sibling repos.

### 2. Exclusion verification

- In the target tree `apps/grainjs`, there is **no source `applications/` directory** to analyze.
- The excluded `app.gen/**` tree does contain many generated files importing `pipeline.js`, but a
  focused grep over `app.gen/server/direct/Meta/*.js` shows imports of `pipeline.js` / `Context`
  without new declarative graph shapes (`new Pipeline`, `new Sequential`, `.execute(...)`, etc.).

**Conclusion:** the exclusions do remove volume, but they do **not** appear to hide materially new
pipeline graph patterns in this target repo. They mostly avoid generated boilerplate inflating the
 census.

### 3. Custom `compile()` override frequency

This concern was **confirmed** and is stronger than the initial doc suggested.

Within the target repo it appears in `packages/web/src/features/routing/registerController.ts`, but
the same `ControllerPipe.compile(rebuild)` override pattern also appears in sibling ecosystem repos:

- `new_grainjs/.../packages/web/src/controller/ControllerPipe.ts`
- `grainjs/packages/grainjs/web/lib/registerController.js`
- `grainjs/packages/grainjs/applications/framework/web/lib/registerController.js`
- migration/test/temp copies of the same routing layer

**Conclusion:** custom `compile()` + delayed `addStage()` mutation is not a one-off edge case. It is
an ecosystem-level compatibility constraint and should be treated as a real guardrail for TASK-009.

### 4. Priority matrix basis

The matrix below is based on four evidence sources:

- **Frequency** — construct/call-site counts from grep (`Sequential` 14, `Wrap` 4, `Parallel` 2 active)
- **Staticness** — whether graph shape is visible at construction/module-load time
- **Repeat volume** — whether the graph runs per process, per request, or per child item in loops
- **Risk** — semantic surface area (cache invalidation, rescue/timeout behavior, child aggregation)

This is still a decision matrix, not a benchmark table, but it is no longer just an ungrounded
qualitative estimate.

---

## Construct Usage Census

| Construct   | Files using it | Typical role                                                    |
| ----------- | -------------- | --------------------------------------------------------------- |
| `Pipeline`  | ~30            | Linear stage composition, reusable sub-pipelines                |
| `Stage`     | ~19            | Atomic reusable operation (read file, save, query, etc.)        |
| `Context`   | ~15            | Create execution context, fork for Sequential, bridge to Express|
| `Sequential`| ~10            | Iterate over split dataset with `split()` + `ctx.fork()`       |
| `Wrap`      | ~5             | Transform context via `prepare()` before inner stage            |
| `Timeout`   | 2              | Wrap stage with timeout/overdue/rescue                          |
| `IfElse`    | 1              | Conditional branching (single query vs array)                   |
| `Parallel`  | 1              | Concurrent DB saves with `exHandler`                            |
| `Config`    | 1              | Global `Config.timeout` for debug mode                          |

**Key finding:** Pipeline + Stage + Sequential dominate (~85% of usage). Wrap, Timeout, IfElse,
Parallel are niche. The default fast path should optimize for the Pipeline→Stage composition
pattern first.

---

## Workload Clusters

The field usage is not one uniform workload. It splits into four distinct runtime shapes:

### Cluster A — Batch schema import/export/generation

- `schemaExport/exportAll.js`
- `schemaExport/importAll.js`
- `schemaExport/preloadSchema.js`
- `schemaExport/dropSchema.js`

Characteristics:

- long-lived module-scope runners built once per process;
- repeated execution over many records / query groups / files;
- mostly static declarative graphs;
- nested `Sequential` loops amplify dispatch cost.

**Why it matters:** this cluster is the best target for compiled-static execution because compile
cost is amortized and the same graph shape repeats many times over large datasets.

### Cluster B — HTTP request handling

- `apps/grainjs/lib/directEntry.js`
- `packages/web/src/features/routing/registerController.ts`

Characteristics:

- request-latency sensitive;
- shallow but wrapper-heavy graphs (`Timeout`, `Sequential`, custom `Stage` adapters);
- stronger cleanup / rescue / response-side semantics;
- custom `Context` propagation in TypeScript routing.

**Why it matters:** default fast path must preserve strict semantics first. These flows benefit
from lower dispatch cost, but are more hybrid and less ideal as a phase-1 compiled target.

### Cluster C — CLI/bootstrap/orchestration

- `commands/*.js`
- `server.js`
- `registerCommand.js`

Characteristics:

- mostly flat pipelines;
- often module-scope runners;
- a mix of FS/DB I/O and orchestration-only stages;
- duplicated error-unwrapping boilerplate at the edge.

**Why it matters:** these are the cleanest proof points for a safe default-on compiled-static path.

### Cluster D — Codegen and filesystem walkers

- `genpack/ApplicationProfiles.js`
- `genpack/Meta.Thing.js`
- `pipe/stages/CreateMetaIndex.js`

Characteristics:

- split-heavy iteration over plain objects;
- many small stage executions around template generation;
- mixed use of `ctx.fork()` and raw object splits.

**Why it matters:** this cluster stresses `Sequential` child normalization and makes `Context.ensure`
or equivalent auto-wrapping semantics important on the hot path.

---

## Staticness and Compilability

The most important architectural observation is not just what constructs exist, but how often the
graph is knowable ahead of execution.

### Mostly static graphs (high compile value)

- `pipe/pipes/*.js` pipeline subclasses define stage lists in constructors.
- `schemaExport/*.js` top-level runners are created at module scope.
- `commands/updateCRC.js` assembles a deterministic pipeline from `Wrap` + known stages.
- `registerCommand.js` builds a reusable discovery pipeline at module scope.

These runners are good candidates for:

- compile-on-first-run;
- cached compiled plans per pipeline instance;
- default-on compiled-static mode.

### Semi-static graphs (compile with cache invalidation)

- `registerController.ts` uses `ControllerPipe.addStage()` to append delayed stages, then overrides
  `compile()` and resets `run = 0` to force rebuild.
- `wrapWorker()` injects dynamically wrapped stages during route registration.

These cases are still compile-friendly, but only if compiled caches honor explicit rebuilds and
custom subclasses that mutate stage lists after construction.

### Dynamic graphs (keep hybrid / fallback)

- `pipe/stages/RunQuery.js` constructs `IfElse` + `Sequential` inside `run()`.
- `pipe/stages/CreateMetaIndex.js` constructs `Sequential` inside `run()`.
- route handlers in `registerController.ts` bridge external user workers and response handlers.

These are poor candidates for aggressive static flattening. They should remain supported via the
hybrid path until there is clear benchmark evidence for compiling them.

### Net conclusion

The field code strongly favors **compile what is visible at construction time, hybrid-fallback for
runtime-built graphs**. This aligns directly with TASK-009's "fastest safe default" goal.

---

## Instantiation Density

Additional grep pass across `apps/grainjs` shows the approximate declarative density of the field
code:

- `Sequential`: **14** call sites
- `Wrap`: **4** call sites
- `Parallel`: **2 active** call sites + **1 commented validation candidate**
- deepest declarative nesting observed: **4 levels** in `schemaExport/exportAll.js`

Interpretation:

- `Sequential` is not an edge feature; it is the main high-level control-flow primitive after
  `Pipeline` itself.
- `Wrap` exists, but mostly as a narrow adapter layer around file-generation and checksum flows.
- `Parallel` exists, but is rare enough to stay out of the phase-1 default optimization path.

---

## Stage Run Signature Profile

Among reusable stage subclasses in `apps/grainjs/pipe/stages/`, the dominant `run()` shapes are:

- **6** stages with `run()` and no context parameter (init/cache/bootstrap style)
- **13** stages with `run(ctx)` or equivalent single-context signature
- **9** stages with `run(ctx, done)` callback style

Implications:

- callback-style custom stages are common enough that fn2 specialization matters;
- promise-returning subclass stages are not the dominant field pattern;
- optimizing direct dispatch for `fn0`, `fn1`, and `fn2` maps well to real production code.

This field profile validates the recent compiled-executor specialization work: the hot path should
prefer cheap dispatch for classic callback-era stage signatures, not only promise-based stages.

---

## Context and Child Materialization Semantics

The field code uses **two distinct child-shaping strategies** in `Sequential.split()`:

### 1. Forked child contexts

Typical top-level batch orchestration:

```js
split(context) {
  const ctx = context.fork()
  ctx.thingName = key
  ctx.query = thing
  return [ctx]
}
```

Seen in:

- `schemaExport/exportAll.js`
- `schemaExport/importAll.js`
- `schemaExport/preloadSchema.js`
- `schemaExport/dropSchema.js`
- `lib/directEntry.js`

### 2. Plain object children (auto-wrapped)

Typical generator-style inner loops:

```js
split(ctx) {
  return ctx.items.map(item => ({
    context: item,
    template: ctx.template,
    fileName: item.fileName,
  }))
}
```

Seen in:

- nested levels of `schemaExport/exportAll.js`
- `genpack/ApplicationProfiles.js`
- `registerCommand.js`

Implications:

- compiled `Sequential` must optimize both forked-child and plain-object child lanes;
- child normalization is a real hot path concern;
- preserving subclassed contexts matters in `registerController.ts`, where `addChild()` and
  `addSubtree()` are overridden to propagate `$options` and `dbPool`;
- `Context.ensure()` + `ctx.toObject()` are production features, not test-only utilities.

---

## Compatibility Constraints Revealed by Field Usage

The following semantics are actively relied on in production and must be preserved by any default
fast path:

1. **3-arg execute form** — `source.execute(null, context, callback)` is used in
   `packages/web/src/features/routing/registerController.ts`.
2. **Custom `compile()` override** — `ControllerPipe` rebuilds its effective stage list at compile
   time; compiled caches must not bypass this.
3. **Mutable context in place** — field code mutates `ctx` directly everywhere; the executor cannot
   assume functional/immutable stage semantics.
4. **Late stage injection** — route registration appends coworker/logger stages after pipeline
   construction.
5. **Error cause chain shape is inconsistent** — callers already compensate with `cause?.err || cause`.
6. **Child result aggregation via `combine()`** — this is central to `Sequential`, especially in
   `directEntry.js`, `RunQuery.js`, and `registerCommand.js`.

---

## Core Semantics Verified in `pipeline.js`

The post-critic verification also checked which behaviors are enforced by the current library core
and test suite, rather than inferred only from field code.

### Execute and compile lifecycle

- `Stage.execute()` supports **1-arg**, **2-arg**, and **3-arg** forms, including
  `execute(err, context, callback)` (`src/stage.ts:110`).
- `Stage.execute()` lazily calls `compile()` when `run` is missing (`src/stage.ts:152`).
- `precompile()` runs before `compile()` resolution (`src/stage.ts:321`, `src/tests/pipeline.test.ts:167`).

### Context normalization

- Non-context inputs are normalized through `Context.ensure()` (`src/stage.ts:164`).
- If a real `Context` instance is passed, `execute()` preserves the original object/identity path
  (`src/stage.ts:164`, `src/context.ts:223`, `src/context.ts:241`).
- `Context.get()` auto-wraps subtree objects into Context instances via `addSubtree()` (`src/context.ts:241`).

### Validation / ensure / rescue ordering

- `ensure` runs **before** `validate` when both are present (`src/stage.ts:252`).
- `rescue` is the final error-interception path for stage execution (`src/stage.ts:344`).
- Legacy tests explicitly cover `ensure` execution even when there is no `run` function
  (`src/tests/stage_old.test.ts:286`).

### Pipeline mutation and cache invalidation

- `Pipeline.addStage()` invalidates compiled cache immediately (`src/pipeline.ts:138`).
- nested child pipeline mutations invalidate parent compiled plans transitively
  (`src/pipeline.ts:122`, `src/tests/compiled-executor.test.ts:168`).

### Error and short-circuit behavior

- `Pipeline` execution stops on first stage error; later stages do not run
  (`src/tests/compiled-executor.test.ts:389`).
- compiled path preserves the same primary error message as legacy runtime
  (`src/tests/compiled-executor.test.ts:403`).

### Sequential / Parallel semantics

- empty `Sequential.split()` returns parent context and **does not call `combine()`**
  (`src/sequential.ts:86`, `src/tests/sequential.test.ts:87`).
- child mutations do not affect the parent unless combined explicitly
  (`src/tests/stages-coverage.test.ts:177`).
- `Parallel` actually runs children concurrently and combine is order-independent
  (`src/parallel.ts:87`, `src/tests/stages-coverage.test.ts:304`).

### Compiled default policy already encoded in core

- auto mode chooses compiled execution only for `compiled-static` plans
  (`src/pipeline.ts:185`, `src/tests/compiled-executor.test.ts:353`).
- `compiled-hybrid` plans stay on legacy runtime in auto mode by default
  (`src/tests/compiled-executor.test.ts:369`).

**Conclusion:** DA concern #5 was valid — the original compatibility section was incomplete. The
verified core constraints above should be treated as the stronger source of truth for TASK-009.

---

## 10 Identified Usage Patterns

### Pattern 1 — Pipeline as Linear Stage Composition (most common)

```js
const runner = new pipeline.Pipeline()
runner.addStage(new DeserializeMeta())
runner.addStage(new InitServerPool())
runner.addStage(function(ctx) { /* inline fn stage */ })
runner.addStage(new ReleaseServerPool())
runner.execute(new Context({...}), callback)
```

**Where:** all `pipe/pipes/*.js`, `commands/*.js`, `server.js`
**Implication:** Flat Pipeline of 3–10 stages is the bread-and-butter case. Direct compiled
execution of flat static pipelines should be the default.

### Pattern 2 — Sequential with Split/Fork

```js
new pipeline.Sequential({
  split(ctx) {
    return ctx.queries.map(q => ctx.fork({ query: q }))
  },
  stage: new ExecuteQuery()
})
```

**Where:** `exportAll.js`, `importAll.js`, `dropSchema.js`, `preloadSchema.js`, `directEntry.js`, `genpack/`
**Implication:** The dominant form is `split()` + `ctx.fork()`, but generator-style inner loops also
return plain objects and rely on auto-wrapping. The split→child-normalization→stage→(combine) flow
is the standard iteration pattern. Compiled Sequential should be a high-priority target after
Pipeline.

### Pattern 3 — Wrap with Prepare

```js
new pipeline.Wrap({
  prepare(ctx) {
    return { filename: ctx.outputPath, template: ctx.tpl }
  },
  stage: new pipeline.Pipeline({ stages: [...] })
})
```

**Where:** `exportAll.js` (nested), `updateCRC.js`
**Implication:** Wrap is a context-transform adapter. In compiled path, it can be inlined as a
"set context fields" opcode before the inner stage.

### Pattern 4 — Pipeline Subclassing

```js
class ExecuteQuery extends pipeline.Pipeline {
  constructor() {
    super()
    this.addStage(new LogStep())
    this.addStage(new BuildQueryModel())
    this.addStage(new ApplyDefaults())
    // ...
  }
  get validate() {
    return schema({ query: String })
  }
}
```

**Where:** `schemaExport/exportAll.js`, `importAll.js`, `dropSchema.js`, `preloadSchema.js`
**Implication:** Subclassed Pipelines are reusable recipes with `validate`. They are instantiated
once and used as inner stages of Sequential. The compiled plan should cache per-instance since
the stage list is stable after construction.

### Pattern 5 — Stage Subclassing

```js
class ReadFile extends base.Stage {
  get validate() { return schema({ filename: String }) }
  run(ctx, done) {
    fs.readFile(ctx.filename, 'utf8', (err, data) => {
      if (err) return done(err)
      ctx.fileContent = data
      done()
    })
  }
}
```

**Where:** all 19 files in `pipe/stages/`
**Implication:** Stages have `run(ctx)` (sync), `run(ctx, done)` (async callback), or no custom
run (rely on validate only). The compiled executor's fn-signature classification (fn0/fn1/fn2/fn3)
directly maps to these variants. Most stages use the 1-arg or 2-arg form.

### Pattern 6 — Timeout with Rescue

```js
new pipe.Timeout({
  timeout: Config.timeout || 30000,
  stage: new pipe.Sequential({
    split(ctx) { return ctx.calls.map(c => ctx.fork(c)) },
    combine(ctx, children) { ctx.results = children.map(c => c.result) },
    stage: workerPipeline
  }),
  overdue(ctx) { ctx.res.status(504).json({ error: 'timeout' }) },
  rescue(err, ctx) { ctx.res.status(500).json({ error: err.message }) }
})
```

**Where:** `lib/directEntry.js`, `packages/web/src/features/routing/registerController.ts`
**Implication:** Timeout wraps Sequential wraps Pipeline — 3 layers of nesting. This is the
Express middleware integration pattern. The hybrid fallback path handles this today; compiled
Timeout is a future optimization target but not priority.

### Pattern 7 — IfElse Branching

```js
new base.IfElse({
  condition(ctx) { return !Array.isArray(ctx.query) },
  success(ctx, done) { /* single query path */ done() },
  failure: new base.Sequential({
    split(ctx) { return ctx.query.map(q => ctx.fork({ query: q })) },
    stage: queryPipeline
  })
})
```

**Where:** `pipe/stages/RunQuery.js`
**Implication:** IfElse is used for single-vs-array dispatch. Only 1 file uses it. Low priority
for compiled path. Note: dynamically created inside a Stage's `run()` method.

### Pattern 8 — Parallel Execution

```js
new pipeline.Parallel({
  split(ctx) { return ctx.records },
  stage(err, record, done) {
    record.model.save(function(saveErr) { done(saveErr) })
  },
  exHandler(err) { console.error('Save failed:', err) }
})
```

**Where:** `schemaExport/importAll.js`
**Implication:** Parallel is used for concurrent DB saves only. Single usage in entire codebase.
The 3-arg stage signature `(err, record, done)` is unique to Parallel. Low priority for
compiled path.

### Pattern 9 — Context as Express Middleware Bridge

```js
// Entry point: HTTP request → pipeline execution
const ctx = new pipeline.Context({ req, res, next })
runner.execute(ctx, function(err) {
  if (err) {
    let rootError = err
    while (rootError.cause && rootError.cause !== rootError) {
      rootError = rootError.cause?.err || rootError.cause
    }
    console.error('Root cause:', rootError.message || rootError)
    res.status(500).json({ error: rootError.message })
  }
})
```

**Where:** `lib/directEntry.js`, `commands/*.js`, `server.js`, `registerController.ts`
**Implication:** The error-chain traversal pattern is **duplicated across 10+ files** — candidate
for extraction into a utility. The `cause?.err || cause` pattern reveals that pipeline errors
wrap original errors inconsistently (sometimes `{ cause: { err: Error } }`, sometimes
`{ cause: Error }`). This should be standardized → feeds into TASK-010 (CleanError).

### Pattern 10 — Deep Nested Composition (4 levels)

```js
// exportAll.js — the most complex pipeline in the codebase
new pipeline.Wrap({
  prepare(ctx) { return { folder: ctx.exportFolder } },
  stage: new pipeline.Sequential({
    split(ctx) { return ctx.types.map(t => ctx.fork({ type: t })) },
    stage: new pipeline.Wrap({
      prepare(ctx) { return { subfolder: ctx.type } },
      stage: new pipeline.Sequential({
        split(ctx) { return ctx.items.map(i => ctx.fork({ item: i })) },
        stage: new pipeline.Pipeline({
          stages: [new GenerateTemplate(), new FileSave()]
        })
      })
    })
  })
})
```

**Where:** `schemaExport/exportAll.js`
**Implication:** Wrap → Sequential → Wrap → Sequential → Pipeline (4 levels).
This is the stress case for the compiled executor. The graph is fully static and should benefit
the most from compile-time flattening. Today it runs through the hybrid fallback path.

---

## Non-trivial Findings

### 1. FindModels.js — Orphan import
`schemaExport/importPipes/FindModels.js` imports `pipeline.js` but does NOT extend Stage or
Pipeline. It's a standalone class using only `js_schema` for validation. Possible oversight or
leftover from a refactor.

### 2. Deprecated stages still present
`ConnectToDB.js` and `DisconnectFromDB.js` extend Stage but throw errors in their constructors.
They are deprecated stages left in the codebase.

### 3. Error chain traversal — duplicated 10+ times
The `while (rootError.cause && rootError.cause !== rootError)` pattern appears in virtually
every command file. This is a strong signal for TASK-010 to provide a standard utility.

### 4. Config.timeout — single usage point
Only `app.config.js` sets `Config.timeout`. The Config construct is barely used in the field.

### 5. registerController.ts — only TypeScript consumer
The only ESM/TypeScript file using pipeline.js. Demonstrates:
- `class ControllerContext extends Context<any>` — custom Context subclass with overridden `addChild()`/`addSubtree()`
- `class ControllerPipe extends Pipeline<any>` — custom Pipeline with overridden `compile()`
- `Context.ensure()` — static factory
- `ctx.toObject()` — context materialization
- 3-arg execute: `source.execute(null, context, callback)`

### 6. Pipeline drives server bootstrap
`server.js` uses Pipeline as the **application startup orchestrator** — the entire server
initialization is a pipeline execution: set runtime flags → deserialize meta → setup middleware
→ load routes.

### 7. Prometheus metrics integration
`directEntry.js` integrates Prometheus request duration tracking around pipeline execution.
Pipeline is the actual HTTP request processor in production.

---

## Recommendations for TASK-009 Default Fast Path

Based on this field research:

1. **Flat Pipeline (3–10 stages) should be compiled-static by default** — this is 80%+ of usage.
2. **Sequential with split/fork is the #2 target** — standard iteration pattern across all
   schema operations.
3. **Wrap can be inlined as context-transform** in the compiled plan.
4. **Timeout/IfElse/Parallel remain hybrid-fallback** — too rare to justify compiled support
   in phase 1.
5. **Error chain traversal needs a standard utility** — duplicated everywhere (→ TASK-010).
6. **Pipeline subclassing is common** — compiled plan cache must respect per-instance stage
    lists, which are stable after construction.
7. **Context.fork() is the universal split mechanism** — compiled Sequential should optimize
    this path.

### Priority Matrix

| Target                                    | Frequency | Staticness | Repeat volume | Risk  | Priority |
| ----------------------------------------- | --------- | ---------- | ------------- | ----- | -------- |
| Flat `Pipeline` of fn/stage steps         | Very high | High       | High          | Low   | P0       |
| `Sequential` child normalization + combine| High      | High       | Very high     | Medium| P1       |
| `Wrap.prepare()` inlining                 | Medium    | High       | Medium        | Low   | P1       |
| Custom subclass compile invalidation       | Low in target / repeated in ecosystem | Medium | High | High | P1 guard |
| `Timeout` wrappers                        | Low       | Medium     | High in HTTP  | High  | P2       |
| `IfElse`                                 | Very low  | Low        | Low           | Medium| P3       |
| `Parallel`                               | Very low  | Low        | Medium        | Medium| P3       |

### Safe Default Policy Suggested by the Field Data

1. **Default-on compiled-static for fully visible Pipeline graphs** created at construction time.
2. **Sequential is P1, not P0** — keep Sequential on hybrid path by default, with opt-in
   compiled-static mode for known-safe sequential patterns (flat stage list, forked children).
   This avoids premature optimization of the more complex child-normalization path.
3. **Keep wrapper-heavy and runtime-built graphs in hybrid mode by default**.
4. **Do not require user opt-in for flat static pipelines**; the field code makes this the safest
   high-ROI default.
5. **Treat custom subclass `compile()` overrides as cache-boundary events**.

---

## Validation Strategy for Ecosystem Compatibility

Before deploying compiled-static as default, validate against the ecosystem's real-world patterns:

### ControllerPipe Pattern Validation

The `ControllerPipe.compile(rebuild)` + late `addStage()` pattern appears across multiple repos:

- `grainjs-prod/packages/web/src/features/routing/registerController.ts`
- `new_grainjs/.../packages/web/src/controller/ControllerPipe.ts`
- `grainjs/packages/grainjs/web/lib/registerController.js`

**How to validate:**

1. **Cross-repo compile test**: Create a test suite that imports `pipeline.js`, constructs a
   `ControllerPipe` instance, calls `addStage()` after construction, then verifies that
   `compile()` produces correct stage order. Run against all three repo variants.
2. **Runtime rebuild detection**: Instrument the compiled cache to log when a pipeline
   rebuilds at runtime (via `addStage()` or explicit `compile(rebuild=true)`).
3. **HTTP handler integration test**: For `directEntry.js` and `registerController.ts` flows,
   verify that request handling still works after enabling compiled-static by default.

### Regression Test Scope

- Test with **all four workload clusters** (A, B, C, D) under both legacy and compiled modes.
- Verify error propagation parity for all six documented error scenarios.
- Confirm context mutation semantics are preserved (forked vs plain-object children).

---

## Benchmark Hypotheses

These are the expected performance improvements that TASK-009 implementation should validate:

| Cluster | Hypothesis | Expected improvement | Evidence basis |
|---------|------------|---------------------|----------------|
| **A: Batch schema export** | Flat Pipeline with 8+ stages runs 20-40% faster in compiled-static | Batch export repeats same graph 1000s of times; compile cost amortized | Module-scope runners, static stage list |
| **C: CLI/bootstrap** | Single-run pipelines see 10-20% improvement | Fewer stage dispatches, no closure overhead | Flat composition, no loops |
| **B: HTTP routing** | Minimal improvement expected; hybrid path may stay faster | Shallow graphs, wrapper-heavy (Timeout, rescue) | 2-3 stages max, heavy runtime semantics |
| **D: Codegen** | Variable; depends on Sequential inner loop complexity | May degrade if plain-object child normalization adds overhead | Split-heavy, mixed child types |

### Success Criteria

- Cluster A benchmark shows ≥15% improvement for 1000+ iteration runs.
- Cluster C benchmark shows ≥10% improvement for single-run CLI commands.
- Cluster B shows no regression (≤5% variance between legacy and compiled).
- All error scenarios from Compatibility Constraints section pass parity tests.

---

## Open Questions / Known Risks

1. **Plain-object child performance**: Unverified whether `Sequential` with plain-object children
   (vs `ctx.fork()`) actually incurs measurable overhead. May need profiling.
2. **Promise-returning stages**: Field code is dominated by callback style; promise-based stages
   may behave differently under compiled path.
3. **Deep nesting (4+ levels)**: The `exportAll.js` stress case runs through hybrid fallback;
   compiling this may yield large gains but requires careful testing.

---

## File Index

### schemaExport/ (4 files — heavy pipeline usage)

| File              | Constructs                      | Nesting depth | Stages |
| ----------------- | ------------------------------- | ------------- | ------ |
| `exportAll.js`    | Pipeline, Sequential, Wrap      | 4 levels      | 8+     |
| `importAll.js`    | Pipeline, Sequential, Parallel  | 2 levels      | 8+     |
| `dropSchema.js`   | Pipeline, Sequential            | 2 levels      | 5      |
| `preloadSchema.js`| Pipeline, Sequential            | 2 levels      | 6+     |

### pipe/stages/ (19 files — Stage subclasses)

| File                    | Sync/Async | Purpose                    |
| ----------------------- | ---------- | -------------------------- |
| `RunQuery.js`           | async      | Dynamic IfElse+Sequential  |
| `CreateMetaIndex.js`    | async      | Dynamic Sequential         |
| `ObjToStringCustom.js`  | sync       | Serialize to custom JS     |
| `RequireServerModel.js` | sync       | Require mongoose schemas   |
| `ReleaseServerPool.js`  | sync       | Release DB pool            |
| `StringToObj.js`        | sync       | JSON parse                 |
| `ObjToString.js`        | sync       | JSON stringify             |
| `MergeObjects.js`       | sync       | Deep smart merge           |
| `ReadFile.js`           | async      | Read file from disk        |
| `ReadDir.js`            | async      | Read directory listing     |
| `Minify.js`             | sync       | esbuild minification       |
| `InitServerPool.js`     | async      | Init DB pool               |
| `InitMetaDump.js`       | sync       | Copy metadata to context   |
| `GenerateTemplate.js`   | sync       | Run fte.js template        |
| `FileToConsole.js`      | sync       | Console output             |
| `FileSave.js`           | async      | Write file to disk         |
| `FileSaveMemFS.js`      | sync       | Write to memory FS         |
| `Prettify.js`           | sync       | Code formatting            |
| `EnsureTemplate.js`     | async      | Read template file         |

### pipe/pipes/ (10 files — Pipeline subclasses)

| File                      | Stages composed                                    |
| ------------------------- | -------------------------------------------------- |
| `SerializeMeta.js`        | InitMetaModel→InitGlobals→ObjToStringCustom→FileSave|
| `DeserializeMeta.js`      | ReadFile→StringToObj→InitMetaModel→InitGlobals     |
| `InitGlobals.js`          | 7+ stages (schema validation, process.exit on err) |
| `SerializeQuery.js`       | Nested Pipeline containing FileSave                |
| `InitMetaModel.js`        | EnsureMetaIndex→load schemas→InitLocationCache     |
| `UpdateSchemaCheckSum.js` | Calculate CRC→detect changes→write checksum        |
| `UpdatePublicCheckSum.js` | Calculate etag→write checksum                      |
| `GenerateToConsole.js`    | GenerateTemplate→FileToConsole                     |
| `GenerateAndSave.js`      | GenerateTemplate→FileSave                          |
| `EnsureMetaIndex.js`      | EnsureTemplate→CreateMetaIndex                     |

### commands/ (8 files — CLI entry points)

| File              | Pipeline constructs         | Pattern                     |
| ----------------- | --------------------------- | --------------------------- |
| `export.js`       | Context                     | Create ctx, execute runner  |
| `import.js`       | Context                     | Create ctx, execute runner  |
| `dropSchema.js`   | Context                     | Create ctx, execute runner  |
| `updateCRC.js`    | Pipeline, Wrap              | Wrap stages with prepare()  |
| `updateIndexes.js`| Pipeline                    | DeserializeMeta + processing|
| `listIndexes.js`  | Pipeline                    | Pure-fn stages for stats    |
| `module.js`       | Pipeline                    | DeserializeMeta + user module|
| `node.js`         | Pipeline                    | DeserializeMeta + user module|
| `lib/helpers.js`  | Context, Pipeline           | Template generation helper  |

### genpack/ (2 files — code generators)

| File                      | Constructs                | Note                       |
| ------------------------- | ------------------------- | -------------------------- |
| `ApplicationProfiles.js`  | Sequential, Pipeline, Context | Sequential over app configs|
| `Meta.Thing.js`           | Pipeline, Sequential      | 2589-line mega-generator   |

### lib/ (1 file — Express middleware)

| File              | Constructs                         | Note                         |
| ----------------- | ---------------------------------- | ---------------------------- |
| `directEntry.js`  | Pipeline, Context, Sequential, Timeout | Most advanced usage, HTTP handler |

### packages/web/src/features/routing/ (1 file — TypeScript)

| File                      | Constructs                      | Note                         |
| ------------------------- | ------------------------------- | ---------------------------- |
| `registerController.ts`   | Stage, Pipeline, Context, Timeout | Only TS consumer, custom subclasses |

### Root files (2 files)

| File              | Constructs     | Note                          |
| ----------------- | -------------- | ----------------------------- |
| `app.config.js`   | Config         | Sets Config.timeout           |
| `server.js`       | Pipeline, Context | Server bootstrap orchestrator |

---

---

## CREATIVE Phase — Default Fast Path Design

### Design Goal

Make the **fastest safe execution path the default** for pipeline.js without requiring user
opt-in, configuration, or environment variables. The compiled executor (TASK-008) proved
significant speedups for flat static pipelines. TASK-009 must:

1. Remove the `PIPELINE_USE_COMPILED` / `__setCompiledPipelineEnabledForTests` gating
   for the safe-by-default path.
2. Expand compiled coverage to Sequential (P1).
3. Provide benchmark evidence per workload cluster.
4. Document the performance characteristics for users.

### Architecture: Three-Tier Execution Model

```
┌──────────────────────────────────────────────────────────┐
│  Tier 1: Compiled-Static (DEFAULT for flat Pipeline)     │
│  ────────────────────────────────────────────────────────│
│  • All stages are fn or plain Stage → full plan          │
│  • No fallback ops → direct bytecode loop                │
│  • Cache keyed by _graphVersion                          │
│  • Auto-invalidated on addStage() / child mutation       │
│  • Expected: 60–85% of production Pipeline instances     │
├──────────────────────────────────────────────────────────┤
│  Tier 2: Compiled-Hybrid (DEFAULT for mixed Pipeline)    │
│  ────────────────────────────────────────────────────────│
│  • Contains Wrap/IfElse/Timeout → fallbackOps > 0        │
│  • Compiled plan with RUN_FALLBACK_STAGE dispatch         │
│  • Same cache/invalidation as Tier 1                      │
│  • Expected: 15–30% of production Pipeline instances      │
├──────────────────────────────────────────────────────────┤
│  Tier 3: Legacy (explicit opt-out only)                   │
│  ────────────────────────────────────────────────────────│
│  • User sets PIPELINE_USE_COMPILED=0 or calls             │
│    __setCompiledPipelineEnabledForTests(false)            │
│  • Full Stage.execute() lifecycle per stage               │
│  • Kept as safety net; no longer the default path         │
│  • Expected: <5% — only for debugging / compatibility     │
└──────────────────────────────────────────────────────────┘
```

### Decision 1: Default-On for Both Static AND Hybrid

**Current state (TASK-008):** compiled-static is default-on in `auto` mode; compiled-hybrid
requires `force` mode.

**Proposed change:** In `auto` mode, use compiled execution for **all** plan modes (static
and hybrid). The hybrid path already dispatches fallback stages through `run_or_execute`,
which preserves full Stage lifecycle semantics. The only reason hybrid was gated was
performance uncertainty — but correctness is already validated by 327 passing tests.

**Risk mitigation:** If hybrid compiled shows regression vs legacy in benchmarks, revert
to static-only default and keep hybrid opt-in.

### Decision 2: Sequential Compiled Path (P1)

Sequential is the #2 construct by usage. The current path uses `run_or_execute` per child
inside an async loop. A compiled Sequential would:

1. **Compile the inner stage** once (it's always a single stage reference).
2. **Inline the split → iterate → combine** loop into the compiled plan.
3. Use a new `LOOP_SEQUENTIAL` op that holds a reference to the split/combine functions
   and the inner stage's compiled sub-plan.

**Phasing:** This is P1, not P0. Ship the Pipeline default-on first, collect benchmark
evidence, then add Sequential compilation in a follow-up implementation step.

### Decision 3: Remove Test-Only Gating, Keep Env Escape Hatch

- **Remove** `__setCompiledPipelineEnabledForTests()` from production exports.
  Keep it only as an internal test utility.
- **Keep** `PIPELINE_USE_COMPILED=0` as an escape hatch for users who discover
  regressions. Document this in README.
- **Remove** `PIPELINE_USE_COMPILED=1` (force) — it's no longer needed since
  compiled is default.
- Simplify `getCompiledPipelineExecutionMode()` to: default=on, env=0 means off.

### Decision 4: Benchmark Strategy

Create **four cluster-specific benchmark files** that model real production workloads:

| Benchmark file | Cluster | What it measures |
|---|---|---|
| `benchmark/cluster-a-batch.bench.ts` | A: Batch export | 8-stage flat Pipeline × 1000 iterations |
| `benchmark/cluster-b-http.bench.ts` | B: HTTP routing | 3-stage Pipeline with Timeout+rescue, single execution |
| `benchmark/cluster-c-cli.bench.ts` | C: CLI/bootstrap | 5-stage flat Pipeline, single execution cold-start |
| `benchmark/cluster-d-codegen.bench.ts` | D: Codegen | Sequential with split over 10-50 items |

Each benchmark reports:
- **Absolute time** (µs per execution)
- **Legacy vs compiled comparison** (% improvement or regression)
- **Linear fit slope** for scaling tests (A, D)

### Decision 5: Documentation

Add a **Performance** section to README.md:
- Explain the three-tier model
- Show benchmark results table
- Document `PIPELINE_USE_COMPILED=0` escape hatch
- Provide guidance: "if your pipeline uses only functions and Stage instances, you get
  the fastest path automatically"

### Implementation Plan

| Step | Description | Files | Depends on |
|---|---|---|---|
| 1 | Scaffold cluster benchmarks (A/B/C/D) | `benchmark/cluster-*.bench.ts` | — |
| 2 | Run baseline benchmarks (legacy mode) | — | Step 1 |
| 3 | Enable compiled-hybrid in auto mode | `src/pipeline.ts` | Step 2 |
| 4 | Run comparative benchmarks | — | Step 3 |
| 5 | Simplify execution mode gating | `src/pipeline.ts` | Step 4 |
| 6 | Sequential compiled path (P1) | `src/compiled/compiler.ts`, `src/compiled/executor.ts`, `src/compiled/plan.ts`, `src/sequential.ts` | Step 5 |
| 7 | Run full benchmark suite | — | Step 6 |
| 8 | Update README performance docs | `README.md` | Step 7 |
| 9 | Final DA review | — | Step 8 |

### Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Hybrid compiled slower than legacy for wrapper-heavy graphs | Medium | Medium | Benchmark cluster B; revert to static-only default if >5% regression |
| Sequential compiled path introduces child-normalization bugs | Medium | High | P1 phasing; extensive parity tests before shipping |
| Custom subclass compile() overrides break with new default | Low | High | ControllerPipe ecosystem validation; cache invalidation already handles this |
| Users depend on PIPELINE_USE_COMPILED=1 behavior | Very low | Low | Document the change; env=0 still works as escape hatch |

---

*Research conducted: 2026-03-07*
*Creative phase: 2026-03-07*
*Source: grainjs-prod codebase — 55+ files analyzed*
*Purpose: Inform TASK-009 default fast path optimization strategy*
