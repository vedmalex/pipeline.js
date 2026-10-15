# TASK-038 — сводка находок logic-verification (2026-10-08)

Источники: haiku/sonnet/opus quick (по 1 прогону) + haiku deep (5 пакетов P1–P5).
Воспроизведение: `src/tests/p{1..5}_*.verify.test.ts` (созданы haiku, не закоммичены, красные).
Статус «V» = я сам прочитал код / запустил; «T» = подтверждено только красным verify-тестом haiku; «R» = только отчёт агента.

**Базовый коммит охвата:** `770d891596ebc065f19bf8808cc83772bff6890f` (`770d891 (HEAD -> master) feat(TASK-015-023): extend compiled parallel and cancellation support`).

Класс: BUG = нарушение паритета/контракта без сомнений; REG = регрессия относительно HEAD; SEM = нужно решение по семантике; LOW = низкий приоритет.

## A. RetryOnError / снимки контекста
| ID | Находка | Класс | Место | Статус |
|---|---|---|---|---|
| A1 | plain-carrier: `restoreContext` возвращает `backup` как рабочий объект → откат ломается со 2-го ретрая (`seen=[0,0,1]`) | REG+BUG | retryonerror.ts:94,110,147 | V,T |
| A2 | после ретрая возвращается клон, а не исходный объект (нарушает «Same mutated object») | BUG | retryonerror.ts:110 | T |
| A3 | `backupContext` вне `try`: Promise/WeakMap/WeakRef в ctx → интерпретатор зависает + unhandled rejection (в HEAD работало) | REG | retryonerror.ts:94,124; context_snapshot.ts:20 | V,T |
| A4 | Context-носитель: `fork({})` даёт «живой» backup, `for…in` копирует 0 ключей → откат не выполняется (`seen=[0,1,2]`) | BUG (pre-existing, противоречит спеке) | retryonerror.ts:91,104 | T |
| A5 | `restore` бросает → интерпретатор зависает (catch без защиты) | BUG (pre-existing) | retryonerror.ts:173 | T |
| A6 | compiled: исключение в async `retry`-предикате — uncaught, кадр остаётся, `done` не вызван | BUG | executor.ts:2007 | T |
| A7 | число попыток `retry:N` = N+2, `retry:0` → 1 | SEM | retryonerror.ts:54,60,135 | R |

## B. Timeout
| ID | Находка | Класс | Место | Статус |
|---|---|---|---|---|
| B1 | исключение в `createIsolatedStageContext` после взвода таймера → два исхода (throw + успех по таймеру); план продолжается | BUG | timeout.ts:64→82; executor.ts:2205→2243 | T |
| B2 | Timeout без stage стирает входную ошибку | LOW | timeout.ts:105; executor.ts:2108 | T |

## C. IfElse (compiled быстрый путь против интерпретатора)
| ID | Находка | Класс | Место | Статус |
|---|---|---|---|---|
| C1 | truthy не-boolean condition выбирает success (эталон — failed) | BUG | compiler.ts:468,546 | V(код),T |
| C2 | ветка arity 0 теряет `this` (TypeError) | BUG | compiler.ts:493,528,556 | T |
| C3 | `.then(...).catch(...)` ловит исключение success-ветки и запускает failed | BUG | compiler.ts:541-543 | V,T |
| C4 | `condition: null` → TypeError вне try (`is_thenable(null)`) | BUG | compiler.ts:540 | T |
| C5 | ошибка condition (false/falsy/throw/reject) теряется для err-blind веток | BUG (не регрессия) | compiler.ts:536,546; executor.ts:834 | T |
| C6 | входная ошибка протекает в ветки / пропускает failed plain Stage (generic-путь) | BUG | executor.ts:1049-1081 | T |
| C7 | ошибка condition затирается при POP_FRAME (восстанавливается `frame.inputErr`) | BUG | executor.ts:1077,1152 | T |

## D. MultiWaySwitch
| ID | Находка | Класс | Место | Статус |
|---|---|---|---|---|
| D1 | `evaluate` не-boolean (undefined/null/0/''/'yes'): интерпретатор отбрасывает, compiled выполняет | SEM (спека за интерпретатор) | compiler.ts:1025,1496; multiwayswitch.ts:232 | V(код),T |
| D2 | исключение в `evaluate` → интерпретатор зависает, compiled корректен | BUG (pre-existing) | multiwayswitch.ts:258 | T |
| D3 | исключение в `combine` → интерпретатор зависает | BUG | multiwayswitch.ts:307 | T |
| D4 | `split` бросает → ранний `done`, пока соседний кейс ещё работает | BUG | multiwayswitch.ts:326 | T |
| D5 | голая функция-кейс (arity 0/1) глотает входную ошибку | BUG/parity | multiwayswitch.ts:214; executor.ts:501 | T |
| D6 | двойной `done` в кейсе: интерпретатор ERR_CALLBACK_DOUBLE, compiled — успех | BUG/parity | executor.ts:230+ | T (локус не указан) |
| D7 | compiled `Pipeline([fn1])` и `Pipeline([Empty])` теряют входную ошибку (общий lowering) | BUG | compiler.ts:148,1746; executor.ts:68 | T |

## E. Stage / режим контекста
| ID | Находка | Класс | Место | Статус |
|---|---|---|---|---|
| E1 | `explicit` (по умолчанию): `execute()` без контекста → run молча не вызывается, ошибка теряется; в migration-policy не описано | SEM + BUG (потеря err) | stage.ts:234,417,430 | V |
| E2 | arity-0 функция, вернувшая Promise, отдаёт Promise как ctx | BUG (pre-existing) | execute_callback.ts:53,57 | V |
| E3 | async `validate` с truthy не-boolean не вызывает callback | BUG (pre-existing) | stage.ts:524-531 | T |
| E4 | исключение пользовательского колбэка глотается без `Config.timeout` | LOW | stage.ts:327 | T |
| E5 | `Context[CurrentStage]` не восстанавливается после вложенного execute | LOW (читатели не найдены) | stage.ts:251 | T |

## F. Parallel / сигнал отмены
| ID | Находка | Класс | Место | Статус |
|---|---|---|---|---|
| F1 | общий носитель (`split` → `[c,c]`): сигнал снимается не по LIFO; следующая стадия получает устаревший/прерванный сигнал в инлайненном compiled-Parallel (в legacy маскируется обёрткой) | BUG (compiled) | executor.ts:221,1352; execution_signal.ts:25 | T |
| F2 | проигравший ребёнок не видит собственный аборт через ctx; ребёнок видит чужой сигнал | SEM (контракт придуман агентом) | parallel.ts:264; executor.ts:1352 | T |

## G. Гипотезы / процесс
- G1 (hypothesis): `cloneValue` копирует символ сигнала в isolated-клон (context_snapshot.ts:129).
- G2 (hypothesis): дети от `split` не наследуют сигнал (executor.ts:1634,1796).
- G3 (hypothesis): устаревание вложенных планов Sequential/MWS после `addStage` (pipeline.ts:124).
- G4 (процесс, частично V): часть «паритетных» тестов сравнивает compiled с compiled — `root.execute()` в режиме `auto` уже compiled (compiled-executor.test.ts:556-571; pipeline.ts:213).

## Отклонено
- `Config.timeout` обходится в compiled (opus) — **V: опровергнуто запуском**, обе ветви дают ERR_STAGE_TIMEOUT за ~50 мс.
- Parallel `quorum:0` (sonnet) — опровергнуто: `normalizeParallelQuorum` делает `max(1, …)` (parallel.ts:370-378).
- Single-case MWS отдаёт сырой Error; fold combine; subplan unwind; drain/settle Parallel — эквивалентны.

## Итоги
Всего 30 находок: BUG/REG: 23, SEM: 4 (A7, D1, E1, F2), LOW: 3 (B2, E4, E5); плюс гипотез: 3, процесс: 1.
Из 30 лично подтверждено мной (V) полностью или по коду: A1, A3, C1, C3, D1, E1, E2; остальные — по красным тестам агента.
Решения по семантике, нужные от владельца: A7, D1, E1, F2.
