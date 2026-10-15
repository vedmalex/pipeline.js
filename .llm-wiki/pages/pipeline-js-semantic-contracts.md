---
node: /Users/vedmalex/work/pipeline.js_2_13/.llm-wiki
title: "Семантические контракты: Context two-mode / MWS / migration / flow-control"
type: summary
slug: pipeline-js-semantic-contracts
source: context-contract-spec
created: 2026-06-11
sources:
  - memory-bank/docs/context-contract-spec.md
  - memory-bank/docs/mws-semantic-spec.md
  - memory-bank/docs/migration-policy-spec.md
  - memory-bank/docs/flow-control-primitives-adaptation-conclusion.md
---

# Семантические контракты pipeline.js

> Контракты, которые native-core должен honor (Track 1.3-1.5 + flow-control adoption). Большинство — IMPLEMENTED в worktree, но НЕ в шипнутом 2.0.33 (см. `[[pipeline-js-overview]]`).

## 1. Context two-mode контракт (Track 1.3, IMPLEMENTED)
**Проблема:** `Stage.execute()` безусловно звал `Context.ensure()` → Proxy+WeakRef+FinalizationRegistry на КАЖДЫЙ вход = ~8-10µs/call (доминирующий bottleneck compiled-пути, Cluster-A root-cause). Прод (apps/sharan) передаёт plain `{}` и не использует `fork/getParent/getRoot` → wrapping = чистый overhead.
**Принцип:** Context **mutable by design**; разработчик **явно opt-in** в rich-семантику. `ctx.fork()` на plain-объекте → `TypeError: ctx.fork is not a function` (натуральная JS-ошибка, без магии).
- **Mode 1 (default `explicit`): Plain Mutable Carrier** — любой `StageObject` проходит as-is, без wrapping (~0µs); доступна только прямая мутация.
- **Mode 2: Rich Context** — только по явному `Context.ensure(obj)`/`new Context(obj)`; full Proxy + parent-chain + fork/root (~8-10µs).
- `Context.isContext()` — канонический детект. `RetryOnError.backupContext()` для plain-carrier теперь делает **deep snapshot** (`createIsolatedStageContext`) вместо no-backup (был BUG).
- **Compiled-executor** получает context напрямую, сам `Context.ensure()` не зовёт → при `explicit`-mode работает с plain-объектами корректно.

## 2. MultiWaySwitch семантика (Track 1.4, DRAFT)
**Замысел:** parallel case-execution где идеально матчится один case; cases мутируют **shared mutable** объект → мутации мёрджатся натурально. Несколько child-контекстов без явного `combine` — должно быть ошибкой (**пока не enforced**).
- Cases исполняются параллельно (`Promise.allSettled`); `resultContext` **перезаписывался** на каждом успехе (line 294) → с default-`combine` безвредно (shared ref), но с custom-`combine` = **last-writer-wins silent correctness hole**.
- **Mode A (default): Shared Mutable** — все cases один ref; корректность = non-overlapping keys или идемпотентность; race на одном ключе = недетерминизм.
- **Mode B: Split/Combine** — `split` derived-context per case, `combine` мёрджит обратно. **Fix:** combine фолдится (`resultContext ?? initialCtx`), не overwrite.
- **Rule 1 (implemented):** one-time warning при multi-match с explicit-combine («folded in async completion order; make combine commutative or use Sequential»).
- **Rule 3:** MWS НЕ делает implicit `fork()` — изоляция только через явный `split` (согласуется с Context-explicitness).
- Compile-native MWS = synthetic-runner lowering (TASK-026, ранее fallthrough на `RUN_FALLBACK_STAGE`); полный inline-compile deferred.

## 3. Migration policy (Track 1.5, IMPLEMENTED через Phase 2)
Фазированный rollout без поломки консьюмеров:
- **Phase 0 (done):** чистые bug-fixes — nested-Pipeline-flattening boundary-safety (был тихо дропал features), RetryOnError plain-carrier deep-snapshot, MWS combine-accumulation + warning.
- **Phase 1 (done):** one-time deprecation-warning при auto-wrap; API `Pipeline.setContextMode('legacy'|'warn'|'explicit')` + `warnOnce()`.
- **Phase 2 (done, current):** default = `'explicit'`; `Stage.execute()` не wrap'ит plain-объекты (кроме legacy/warn). Affected: код, передающий plain `{}` и зовущий `ctx.fork()` downstream → `TypeError`.
- **Phase 3 (deferred):** удалить legacy/warn — следующий major (semver breaking).
- **Risk:** medium — MWS combine-fold ломает зависящих от last-writer-wins; mitigation = escape-hatches `legacy`/`warn` + `setContextMode()`.

## 4. Flow-control adoption (вывод из внешнего research)
Правило адаптации: **engine-first/compile-first примитивы вместо runtime-emulation**; компилировать детерминированный control-flow в IR/opcodes/frames когда семантика известна заранее; fallback-границы только для пока-не-компилируемого; авто-выбор быстрейшего safe-пути из формы графа.
- **Локальный control-flow:** loops внутри frame (не graph-back-edges), retries = local executor-state (не рекурсия), error-recovery = boundaries вокруг compiled-регионов.
- **Error как explicit control-flow:** сохранять оригинальную ошибку как primary; минимальные safe-метаданные в `CleanError`; stable public-safe error-codes; не течь internals в public-messages.
- **Адопшен-приоритеты:** P0 — loop/switch/error-boundary (DoWhile/RetryOnError, IfElse/MWS, rescue/timeout/retry); P1 — Wrap-transform, Timeout-as-primitive, subplan-composition; P2 — Parallel split/join, map-reduce; P3 — quorum, named-ports/outcome-channels, delay/backoff, **resumable/checkpoint executor-state** (держать frame-state сериализуемым).
- НЕ копировать: editor/UI-паттерны (visual bars, sticky-notes, serialization-tricks, agent-router-branching).

## Native-implications
Native scoped-record должен воспроизвести: prototype-read-fallthrough (own→`__parent`, не `__root`); ДВА независимых линка `__parent`/`__root`; impure `get()` с явным memoization-слотом; parent-first `toObject()`-flatten с cycle-guard. **Two-mode = ключ:** native по умолчанию = plain-carrier (как `explicit`), rich-семантика opt-in — НЕ копировать leaky process-global `allContexts` (см. `[[pipeline-js-compiled-executor]]`). RetryOnError → **детерминированный** state-restore-between-retries (не порт ambiguous/flaky). MWS → enforce combine-fold/shared-mutable явно.

## Связанные
- `[[pipeline-js-overview]]` · `[[pipeline-js-compiled-executor]]` · `[[grainjs-async-libs]]` · `[[grainjs-native-core]]` (parent grainjs)
