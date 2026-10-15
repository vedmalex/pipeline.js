# Requests

## UR-001
**Date:** 2026-03-06
**Request (verbatim):** "mb3 давай мигрируем проект на новый memory bank и выполним полный аудит проекта mb3-critic поможет, все в автоматическом режиме только аналитика"
**Profile auto-resolved:** creative-first (T4:standard)
**Task:** TASK-001

## UR-003
**Date:** 2026-03-06
**Request (verbatim):** "да, давай набросаем подробный план, и тесты как это все проверять , сделаем это новой задачем mb3"
**Profile auto-resolved:** creative-first (T4:standard)
**Task:** TASK-008

## UR-004
**Date:** 2026-03-07
**Request (verbatim):** "1 - создай таск на исследование производительности, так же нужно обновить документацию по производительности я бы хотел чтобы по умолчанию была самая эффективная настройка, поскольку при старте уже известно что будет выполняться ведь это декларативная библиотека 2 - давай посмотрим на то как мы можем улучшить механизм работы с ошибками и для этого давай отдельный таск тоже создадим внимательно посмотри на cleanerror - его суть передать саму ошибку которая привела к падению stage/pipeline/etc с минимально необходимыми инструкциями возможно следует ввести нечто подобное error code чтобы можно было более адресно понимать что это и с чем его едят - но и не раскрывало внутренности платформы при падении"
**Profile auto-resolved:** creative-first (T4:standard)
**Tasks:** TASK-009, TASK-010

## UR-005
**Date:** 2026-03-07
**Request (verbatim):** "давйа продолжаем дальше"
**Profile auto-resolved:** creative-first (T4:standard)
**Task:** TASK-015

## UR-006
**Date:** 2026-03-07
**Request (verbatim):** "давай дальше идем на следующий слайс"
**Profile auto-resolved:** creative-first (T4:standard)
**Task:** TASK-016

## UR-007
**Date:** 2026-03-07
**Request (verbatim):** "1"
**Profile auto-resolved:** creative-first (T4:standard)
**Task:** TASK-017

## UR-008
**Date:** 2026-03-07
**Request (verbatim):** "1"
**Profile auto-resolved:** creative-first (T4:standard)
**Task:** TASK-018

## UR-009
**Date:** 2026-03-07
**Request (verbatim):** "1"
**Profile auto-resolved:** creative-first (T4:standard)
**Task:** TASK-019

## UR-010
**Date:** 2026-03-07
**Request (verbatim):** "1"
**Profile auto-resolved:** creative-first (T4:standard)
**Task:** TASK-020

## UR-011
**Date:** 2026-03-08
**Request (verbatim):** "1"
**Profile auto-resolved:** creative-first (T4:standard)
**Task:** TASK-021

## UR-012
**Date:** 2026-03-08
**Request (verbatim):** "1"
**Profile auto-resolved:** creative-first (T4:standard)
**Task:** TASK-022

## UR-013
**Date:** 2026-03-08
**Request (verbatim):** "Continue if you have next steps, or stop and ask for clarification if you are unsure how to proceed."
**Profile auto-resolved:** creative-first (T4:standard)
**Task:** TASK-023

## UR-014
**Date:** 2026-03-08
**Request (verbatim):** "давай внесем необходимые исправления" (from prior session) + "давай оформим задачу через mb3 чего не хватает в артефактах давай добавим" (this session)
**Profile:** creative-first (T4:standard)
**Task:** TASK-024
**Notes:** Semantic contract stabilization — Track 1 of two-track approach. Phase 0 correctness fixes applied. Three spec docs written.

## UR-015
**Date:** 2026-03-08
**Request (verbatim):** "давай продолжим все таски до тех пор пока будет не чего изменять, итерации проверяй через mb3-critic и следуем mb3 workflow"
**Profile:** creative-first (T3:moderate)
**Task:** TASK-025
**Notes:** Follow-up blind-spot cleanup after TASK-024. Start with compile-native Empty lowering as the smallest remaining compiler gap.

## UR-016
**Date:** 2026-03-08
**Request (verbatim):** "давай продолжим"
**Profile:** creative-first (T4:standard)
**Task:** TASK-026
**Notes:** Continue Track 2 blind-spot cleanup after TASK-025. Next slice: compile-native `MultiWaySwitch` lowering with parity against current runtime semantics.

## UR-017
**Date:** 2026-03-08
**Request (verbatim):** "продолжаем"
**Profile:** creative-first (T3:moderate)
**Task:** TASK-027
**Notes:** Continue Track 2 blind-spot cleanup after TASK-026. Next slice: devirtualize `RUN_STAGE_INSTANCE` for boundary-free plain `Stage` objects while preserving inbound error semantics and boundary fallback retention.

## UR-018
**Date:** 2026-03-08
**Request (verbatim):** "давай зафиксируем текущее состояние проекта в задачах mb3
проверим что существует roadmap и он соответствует реальности"
**Profile:** creative-first (T3:moderate)
**Task:** TASK-028
**Notes:** Reconcile MB3 task/roadmap artifacts with the actual compiled-executor state, create missing active roadmap system files, and align the roadmap document with completed TASK-008..027 work.

## UR-019
**Date:** 2026-03-08
**Request (verbatim):** "2 потом 1"
**Profile:** creative-first (T3:moderate)
**Tasks:** TASK-029, TASK-030
**Notes:** First run a benchmark-guided roadmap review after TASK-024..027, then create the next roadmap task for nested compiled subplans / `CALL_SUBPLAN` if the evidence still supports it.

## UR-020
**Date:** 2026-03-08
**Request (verbatim):** "давай так и сделаем"
**Profile:** creative-first (T4:standard)
**Task:** TASK-030
**Notes:** Apply the mb3-critic recommendations to TASK-030 before any implementation claims: tighten the hypothesis, expand benchmark gates, and make variance visible in the decision benchmark outputs.

## UR-021
**Date:** 2026-03-08
**Request (verbatim):** "да, давай 1-3"
**Profile:** creative-first (T4:standard)
**Task:** TASK-030
**Notes:** For TASK-030 PLAN, identify which current benchmark lanes truly exercise synthetic subplan runners, add a dedicated nested-fragment lane if needed, and capture a baseline for comparing future alternatives.

## UR-022
**Date:** 2026-03-18
**Request (verbatim):** "давай наведем порядок, можешь включить группу агентов в работу [@Dirac](agent://019d00cf-a7fb-77e2-84de-00202276ba4c) [@Cicero](agent://019d00cf-a858-7be1-ba89-6c09ca70e1b0) кого нужно"
**Profile:** creative-first (T3:moderate)
**Task:** TASK-031
**Notes:** Administrative MB3 reconciliation. Cross-check memory-bank state with git/GitHub task history, preserve append-only logs and technical artifacts, normalize stale-open task statuses, and restore authoritative active state to TASK-030.

## UR-023
**Date:** 2026-03-18
**Request (verbatim):** "давай посмотрим на активные задачи, и приведем сначала backlog в порядок"
**Profile:** creative-first (T3:moderate)
**Task:** TASK-032
**Notes:** Administrative backlog normalization. Review the real active task set, verify whether backlog `TASK-002..006` is already implemented in code/commits, close only the truly resolved items via append-only registry events, and refresh MB3/ISSUES snapshots without deleting technical history.

## UR-024
**Date:** 2026-03-18
**Request (verbatim):** "давай тогда продолжим работу по оптимизации скорости"
**Profile:** creative-first (T4:standard)
**Task:** TASK-030
**Notes:** Continue TASK-030 speed work. Separate the trivial fused `Sequential -> nested Pipeline` child path from the real non-fusable subplan target, add benchmark attribution for the true subplan lane, and verify whether the remaining cost sits in parent/subplan transfer or inside the child control-flow plan itself.

## UR-025
**Date:** 2026-03-18
**Request (verbatim):** "давай сделаем это дальше"
**Profile:** creative-first (T4:standard)
**Task:** TASK-030
**Notes:** Continue TASK-030 after the first control-flow slice. Validate whether deeper child-plan hot-path reductions are real and safe, keep MB3 evidence honest with repeated benchmarks, and preserve the stage-coverage answer about which boundary-free built-ins already compile natively versus which paths intentionally stay slower.

## UR-026
**Date:** 2026-03-18
**Request (verbatim):** "давай продолжаем оптимизацию"
**Profile:** creative-first (T4:standard)
**Task:** TASK-030
**Notes:** Continue TASK-030 with another narrow control-flow slice. Target the remaining cheap predicate/branch overhead without broadening to `CALL_SUBPLAN`, split tiny-fused err-blind `IfElse` cases from the honest non-fusable lane, and keep benchmark attribution truthful while measuring any new fast path separately.

## UR-027
**Date:** 2026-03-18
**Request (verbatim):** "давай продолжим дальше! желание оптимизировать всё"
**Profile:** creative-first (T4:standard)
**Task:** TASK-030
**Notes:** Continue TASK-030 with another narrow executor/compiler slice. Optimize the remaining callback-based `IfElse` predicate overhead on the honest non-fusable lane, preserve stage semantics for predicate-error forwarding, and refresh the stage-coverage answer so the remaining runner-backed or boundary-heavy gaps stay explicit.

## UR-028
**Date:** 2026-03-18
**Request (verbatim):** "давай так и сделаем тогда"
**Profile:** creative-first (T4:standard)
**Task:** TASK-030
**Notes:** Continue TASK-030 with the next benchmark-led ROI slice after callback-predicate work. Target runner-backed `MultiWaySwitch` overhead without introducing a new opcode or broadening to `CALL_SUBPLAN`, keep legacy parity intact, and add dedicated MWS benchmark coverage so the remaining gap is measurable directly.

## UR-028
**Date:** 2026-03-18
**Request (verbatim):** "давай так и сделаем тогда"
**Profile:** creative-first (T4:standard)
**Task:** TASK-030
**Notes:** Continue TASK-030 with the next benchmark-led runner-backed primitive slice. Target `MultiWaySwitch` first, add a dedicated benchmark lane before over-generalizing, and land the narrowest safe fast path without changing multi-case combine-order semantics or boundary-feature fallback behavior.

## UR-029
**Date:** 2026-03-18
**Request (verbatim):** "давай доделываем"
**Profile:** creative-first (T4:standard)
**Task:** TASK-030
**Notes:** Finish the in-progress `MultiWaySwitch` multi-case slice. Stabilize shared-context and aggregate-error parity for the new no-split/no-combine fast path, extend benchmark evidence for multi-case shared-context fan-out, and verify safety gates before updating MB3 snapshots.

## UR-030
**Date:** 2026-03-18
**Request (verbatim):** "да, давай стартуем и пока не возвращаемся к CALL_SUBPLAN"
**Profile:** creative-first (T4:standard)
**Task:** TASK-030
**Notes:** Continue `TASK-030` strictly inside `MultiWaySwitch` and avoid `CALL_SUBPLAN`. Start with the most benchmark-led MWS shapes: specialize effective single-case lowering further, then extend evidence for the remaining custom `split/combine` multi-case path before attempting broader native lowering.
