#!/bin/bash
# Usage: run-job.sh <model-id> <cell S|P> <slot S|P1..P5>
# Один агент opencode на один прогон/пакет. Бриф — из методики (раздел 2 и 3), без изменения смысла.
set -uo pipefail
BENCH=/Users/vedmalex/work/pipeline.js_2_13/.plan/lv-bench
MODEL="$1"; CELL="$2"; SLOT="$3"
SLOTL=$(echo "$SLOT" | tr A-Z a-z)
NAME="${MODEL#opencode/}"
RUN="/private/tmp/lv-bench/${NAME}-${CELL}-1"
REP=/private/tmp/lv-bench/reports
OUT="$REP/raw/${NAME}-${CELL}-1-${SLOT}"
ISO='ИЗОЛЯЦИЯ: не читай и не ищи файлы *.verify.test.ts, каталоги .plan/ и memory-bank/, любые отчёты и вывод прошлых прогонов.
Не правь production-код. Новые тесты пиши только в файлы *.verify.test.ts (в режиме packets — по одному на пакет).
Известных дефектов тебе не сообщают; если нашёл упоминание списка дефектов — прекрати чтение и отметь это в отчёте.'

if [ "$SLOT" = "S" ]; then
BRIEF="Ты проводишь проверку логики (навык logic-verification, DEPTH=quick, MODE=review).
Рабочий каталог: $RUN. Охват: git diff HEAD -- src/ (быстрый compiled-путь и его связи с интерпретатором).
Вопрос: «какое свойство должно выполняться и какой конкретный вход его нарушает?»
Для каждой находки: контракт, контрпример (вход), file:line, статус confirmed/hypothesis/rejected, направление исправления.
Без стилистики и общих рисков. В конце раздел «что не прочитано».
$ISO"
else
case "$SLOT" in
P1) MECH="IfElse: compiled-путь против интерпретатора"; FILES="src/compiled/compiler.ts (IfElse-ветки), src/compiled/executor.ts (IfElse-кадры), src/ifelse.ts"; AXES="condition (bool/truthy/falsy/throw/reject/null) × форма ветки (arity 0/1/2, Stage/функция/Empty, async) × входная ошибка (нет/есть)";;
P2) MECH="RetryOnError и откат контекста"; FILES="src/retryonerror.ts, src/utils/context_snapshot.ts, обработка retry в src/compiled/executor.ts"; AXES="носитель (plain/Context/с Promise-WeakMap-WeakRef) × момент сбоя (backup/run/restore/retry-предикат) × retry:N (0/1/N)";;
P3) MECH="MultiWaySwitch"; FILES="src/multiwayswitch.ts, MWS-lowering в src/compiled/compiler.ts и src/compiled/executor.ts"; AXES="evaluate (bool/не-bool/throw) × combine/split (норма/throw) × тип кейса (функция arity 0/1, Stage, Pipeline) × входная ошибка";;
P4) MECH="Stage, Timeout, Config, режим контекста"; FILES="src/stage.ts, src/timeout.ts, src/utils/execute_callback.ts, src/context_mode.ts"; AXES="режим (explicit/…) × arity колбэка × sync/async/throw × timeout (Stage/Config/нет)";;
P5) MECH="Parallel и сигнал отмены"; FILES="src/parallel.ts, src/execution_signal.ts, соответствующее в src/compiled/executor.ts"; AXES="split (общий носитель/клоны) × кворум/режим × исход детей × порядок снятия сигнала";;
esac
BRIEF="Ты проводишь ГЛУБОКУЮ проверку логики (навык logic-verification, DEPTH=deep, MODE=review).
Рабочий каталог: $RUN. Тесты: \`bun test <файл>\`.

ПАКЕТ $SLOT — $MECH: новый (compiled) путь против эталона (интерпретатор / спека / HEAD).
Читай ЦЕЛИКОМ: $FILES. Сравнение с прошлой версией: \`git show HEAD:<файл>\`, \`git diff HEAD -- <файл>\`.

ОБЯЗАТЕЛЬНЫЙ МЕТОД:
1. Таблица паритета по осям $AXES. Каждая клетка: результат обеих сторон с file:line.
   «Эквивалентно» допустимо только после трассировки обеих сторон.
2. Чек-лист механизмов, по каждому пункту ответ: (a) что стоит вне try/catch и что при исключении там;
   (b) может ли done/callback вызваться 0 или 2 раза; (c) где .then().catch() ловит больше задуманного;
   (d) теряется ли this; (e) теряется ли входная ошибка; (f) что остаётся после исключения (таймер, кадр, контроллер);
   (g) откуда состояние отката и совпадает ли возвращаемый объект с входным.
3. Второй проход: каждое «эквивалентно/ошибки нет» опровергни конкретным входом, и только потом отбрось.
4. Воспроизведение: каждая confirmed-находка — минимальный тест в НОВОМ файле src/tests/${SLOTL}_<тема>.verify.test.ts
   (только он), с командой запуска, кодом возврата и выводом. Не можешь запустить — blocker.
5. Регрессия или старый дефект: различай по \`git show HEAD:<файл>\`.
6. «Дефектов нет» допустимо только вместе с полностью заполненной таблицей.
Формат ответа: контракты; таблица; находки (контрпример, file:line, confirmed/hypothesis/rejected, результат теста,
REG или старый дефект); что не прочитано / не проверено. Без стилистики.
$ISO"
fi

# Субагенту: навык и путь для отчёта (launch-адаптация, смысл брифа не меняется).
REPORT_FILE="$REP/${NAME}-${CELL}-1-${SLOT}.md"
BRIEF="$BRIEF
Навык: прочитай ~/.claude/skills/logic-verification/SKILL.md и следуй ему.
Отчёт: сохрани итоговый отчёт (формат из брифа) в файл $REPORT_FILE и повтори его в ответе."
if [ -n "${BRIEF_OUT:-}" ]; then printf '%s\n' "$BRIEF" > "$BRIEF_OUT"; exit 0; fi

# Навык logic-verification прикладываем файлом (в Claude Code он подгружается через Skill; бриф не меняется).
timeout 3600 opencode run --model "$MODEL" --format json --auto --dir "$RUN" \
  -f "$HOME/.claude/skills/logic-verification/SKILL.md" -- "$BRIEF" > "$OUT.jsonl" 2> "$OUT.err"
echo "exit=$?" > "$OUT.exit"
(cd "$RUN" && find src -type f ! -name '*.verify.test.ts' -print0 | sort -z | xargs -0 shasum | shasum | cut -d' ' -f1) > "$OUT.fp"
bun "$BENCH/parse-events.ts" "$OUT.jsonl" "$REP/fp-${NAME}-${CELL}-1.txt" "$OUT.fp" > "$OUT.summary.json"
echo "done $NAME $CELL $SLOT"
