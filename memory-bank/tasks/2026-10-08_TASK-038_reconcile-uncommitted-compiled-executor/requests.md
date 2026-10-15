# User Requests

## UR-001
- Timestamp: 2026-10-08 14:10
- Source: user
- Text (verbatim): "Reconcile uncommitted compiled-executor work (MWS lowering, semantic specs, benchmarks)"
- Superseded by: UR-002

## UR-002
- Timestamp: 2026-10-08 17:30
- Source: user
- Text (verbatim): "Исправить находки группы A из .plan/task-038-findings-triage.md: A1 plain-carrier restoreContext возвращает backup (retryonerror.ts:94,110,147); A2 возврат клона вместо исходного объекта; A3 backupContext вне try (регрессия vs HEAD: Promise/WeakMap в ctx → зависание); A4 Context-carrier не откатывается (fork живой); A5 restore бросает → зависание; A6 compiled: исключение в async retry-предикате (executor.ts:2007); A7 (решение по семантике) число попыток N+2 / retry:0→1. Воспроизведение: src/tests/p2_retry.verify.test.ts."

## UR-003
- Timestamp: 2026-10-08 17:30
- Source: user
- Text (verbatim): "B1: createIsolatedStageContext бросает после взвода таймера → исключение + успех по таймеру, план продолжается (timeout.ts:64→82; executor.ts:2205→2243). B2: Timeout без stage стирает входную ошибку (low). Тесты: src/tests/p4_stage.verify.test.ts."

## UR-004
- Timestamp: 2026-10-08 17:30
- Source: user
- Text (verbatim): "C1 truthy не-boolean выбирает success (compiler.ts:468,546); C2 потеря this в ветке arity 0 (:493,528,556); C3 .then().catch() проглатывает исключение success-ветки (:541-543); C4 condition null → TypeError вне try (:540); C5 ошибка condition теряется для err-blind веток; C6 входная ошибка протекает в ветки (executor.ts:1049-1081); C7 ошибка condition затирается при POP_FRAME (executor.ts:1077,1152). Тесты: src/tests/p1_ifelse.verify.test.ts."

## UR-005
- Timestamp: 2026-10-08 17:30
- Source: user
- Text (verbatim): "D1 (решение по семантике) evaluate не-boolean: compiler.ts:1025,1496 vs multiwayswitch.ts:232; D2 исключение в evaluate → зависание интерпретатора (:258); D3 исключение в combine → зависание (:307); D4 split бросает → ранний done (:326); D5 голая функция-кейс глатает входную ошибку; D6 двойной done в кейсе; D7 compiled Pipeline([fn1]/[Empty]) теряет входную ошибку. Тесты: src/tests/p3_mws.verify.test.ts."

## UR-006
- Timestamp: 2026-10-08 17:31
- Source: user
- Text (verbatim): "E1 (решение по семантике + потеря err) execute() без контекста в explicit: run не вызывается (stage.ts:234,417,430), migration-policy это не описывает; E2 arity-0 функция, вернувшая Promise, отдаёт Promise как ctx (execute_callback.ts:53,57); E3 async validate с truthy не-boolean не вызывает callback (stage.ts:524-531); E4 исключение колбэка глатается без Config.timeout (low); E5 CurrentStage не восстанавливается (low). Тесты: src/tests/p4_stage.verify.test.ts."

## UR-007
- Timestamp: 2026-10-08 17:31
- Source: user
- Text (verbatim): "F1 при split→[c,c] сигнал снимается не по стеку; в инлайненном compiled-Parallel следующая стадия видит устаревший/прерванный сигнал (executor.ts:221,1352; execution_signal.ts:25), в legacy маскируется обёрткой Stage.execute. F2 (решение по контракту; контракт сформулирован агентом, не спекой) проигравший ребёнок не видит свой аборт. Тесты: src/tests/p5_parallel.verify.test.ts."

## UR-008
- Timestamp: 2026-10-08 17:31
- Source: user
- Text (verbatim): "Общая цель задачи: ~165 незакоммиченных файлов (src/compiled, MWS, pipeline/stage/retry, context_mode, warn_once, спеки, бенчмарки, lib/) разобрать по задачам или принять блоком. G4: часть «паритетных» тестов сравнивает compiled с compiled (root.execute в auto-режиме = compiled, compiled-executor.test.ts:556-571; pipeline.ts:213) — добавить differential-тесты compiled vs интерпретатор (setCompiledPipelineEnabledForTests(false)). G1–G3 — гипотезы без воспроизведения (cloneValue копирует символ сигнала; дети split не наследуют сигнал; устаревание вложенных планов). Весь список: .plan/task-038-findings-triage.md. Отклонено: Config.timeout bypass и Parallel quorum:0."
