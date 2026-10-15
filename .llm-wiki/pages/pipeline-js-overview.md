---
node: /Users/vedmalex/work/pipeline.js_2_13/.llm-wiki
title: "pipeline.js — обзор движка (модель, API, статус, shipped-vs-worktree)"
type: summary
slug: pipeline-js-overview
source: roadmap-rm001
created: 2026-06-11
sources:
  - src/stage.ts
  - src/pipeline.ts
  - src/index.ts
  - memory-bank/system/roadmap.md
---

# pipeline.js — обзор движка

> pipeline.js (автор Alex Vedmedenko, npm `pipeline.js`, dev-worktree `/Users/vedmalex/work/pipeline.js_2_13`, version 2.0.33) — **детерминированная декларативная async-workflow библиотека**: граф стадий часто известен на construction-time. Это движок оркестрации под grainjs. Grainjs-side интеграция: см. grainjs-вики `[[grainjs-async-libs]]` (parent-node).

## Модель исполнения (callback-based)
- Каждый composable = `Stage<T,C>`; core-контракт `run(err, ctx, done)`; публичный вход `execute(ctx[,err][,callback][,options])` → Promise (без callback) или void.
- `Pipeline` = subclass `Stage`, исполняющий child-стадии **строго последовательно**: каждая awaited перед следующей; **ПЕРВАЯ ошибка абортит остаток** и всплывает через единственный terminal `done(err, ctx)`.
- Ошибки нормализуются в `CleanError` (через `createError`); stage-level `rescue` перехватывает; `ensure`/`validate` гейтят вход.
- Zoo control-flow = subclasses `Stage`: `Sequential` (split/process-each-serially/combine, first-error-aborts), `Parallel`, `IfElse`, `Timeout`, `DoWhile` (RUN_LOOP), `RetryOnError`, `MultiWaySwitch`, `Wrap`, `Empty`. Экспорт: `src/index.ts:1-17`.
- **ДВЕ concurrency-модели:** `Pipeline`/`Sequential` = fail-fast vs `Parallel` = all-launch + `Promise.allSettled` + агрегированный `ErrorList`.

## Контекст
- Proxy с parent/root-цепочкой; `fork()/getParent()/getRoot()`; RESERVED-key-map; WeakRef+FinalizationRegistry-реестр (`allContexts`).
- **Two-mode контракт** (Track 1.3, см. `[[pipeline-js-semantic-contracts]]`): `explicit` (default) — plain `{}` проходит без wrapping (~0µs); rich Context — только по явному `Context.ensure()`/`new Context()`. `Context.isContext()` — канонический детект.
- `get(path)` ИМПУРНЫЙ (lazy-wraps+memoizes); `toObject()` parent-first flatten.

## Roadmap RM-001 «Compiled Executor Evolution» (статус)
- **Phase 1 (RMP-001, TASK-008..014):** core executor + error-model + native control-flow lowering + default fast-path — ✅ completed.
- **Phase 2 (RMP-002, TASK-015..023):** Parallel joins (bounded-concurrency/any/quorum/trailing-drain+timeout) + AbortSignal-контракт + public execute-signal — ✅ completed.
- **Phase 3 (RMP-003, TASK-024..027):** семантическая стабилизация + compile-native Empty/MWS + devirtualize plain-stages — ✅ completed.
- **Phase 4 (RMP-004):** `TASK-029` benchmark-review ✅; **`TASK-030` CALL_SUBPLAN investigation [~] IN PROGRESS** — evidence-first, НЕ build-commitment.

## 🔴 Shipped-vs-worktree (критично для интеграции в grainjs)
- **node_modules/pipeline.js@2.0.33** (lib собран Oct 2025) = **ЛЕГАСИ** `__awaiter`-loop с `Promise.withResolvers` на стадию; **нет** `compiled/`-dir, нет `executeCompiledPlan`/`PIPELINE_USE_COMPILED`.
- ВСЯ compiled-executor работа + ранние OPT-1/2/3 (Context Infinity-guard, WeakRef allContexts) = **незамёрженный worktree** (10 unpushed-коммитов + крупные uncommitted M). Версия заморожена `2.0.33` в обоих.
- ⇒ **grainjs получает ZERO оптимизаций.** Native-план, ассумящий compiled-семантику, ассумит поведение, которого прод НЕТ. См. `[[pipeline-js-compiled-executor]]`.

## Релевантность для native-core grainjs
Шипнутый контракт (sequential + first-error-abort + единственный terminal + arity-полиморфные стадии) — чистая детерминированная модель, мапится на native sequential-executor с error-short-circuit. Compiled-IR worktree (flat op-array + explicit frame-stack + suspend/resume) = **blueprint для native-VM** (precompute планов на build-time). Подробности контрактов: `[[pipeline-js-compiled-executor]]`, `[[pipeline-js-semantic-contracts]]`.

## Связанные
- `[[pipeline-js-compiled-executor]]` · `[[pipeline-js-semantic-contracts]]` · `[[grainjs-async-libs]]` (grainjs-side, parent-node)
