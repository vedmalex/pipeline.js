// Usage: bun parse-events.ts <raw.jsonl> <fp-baseline.txt> <fp-now.txt>
// Выжимает из opencode --format json: текст отчёта, токены, число инструментов, длительность,
// вызовы инструментов, касающиеся запрещённых для изоляции путей, и факт правки production-кода.
import { readFileSync, existsSync } from "fs";
const [rawPath, fpBase, fpNow] = process.argv.slice(2);
const lines = readFileSync(rawPath, "utf8").split("\n").filter(Boolean);
const events: any[] = [];
for (const l of lines) { try { events.push(JSON.parse(l)); } catch {} }

let steps = 0, input = 0, output = 0, reasoning = 0, peak = 0, cacheRead = 0;
let tools = 0; const toolNames: Record<string, number> = {};
const texts: string[] = [];
const isoHits: string[] = [];
const FORBIDDEN = /verify\.test|\.plan|memory-bank|triage|task-038|llm-wiki|specstory|ISSUES\.md|requests\.md|TODO|CLAUDE\.md|AGENTS\.md/;
let t0 = Infinity, t1 = 0;
for (const e of events) {
  if (typeof e.timestamp === "number") { t0 = Math.min(t0, e.timestamp); t1 = Math.max(t1, e.timestamp); }
  if (e.type === "step_finish" && e.part?.tokens) {
    steps++;
    const t = e.part.tokens;
    input += t.input ?? 0; output += t.output ?? 0; reasoning += t.reasoning ?? 0;
    cacheRead += t.cache?.read ?? 0;
    peak = Math.max(peak, t.total ?? 0);
  }
  if (e.type === "text" && e.part?.text) texts.push(e.part.text);
  if (e.type === "tool_use" && e.part) {
    tools++;
    const name = e.part.tool ?? "?";
    toolNames[name] = (toolNames[name] ?? 0) + 1;
    const inp = JSON.stringify(e.part.state?.input ?? {});
    if (FORBIDDEN.test(inp)) {
      // Запись собственного нового verify-теста в src/tests — допустима; чтение — нарушение.
      const isOwnWrite = (name === "write" || name === "edit") && /src\/tests\/p\d_[^"]*\.verify\.test\.ts/.test(inp);
      if (!isOwnWrite) isoHits.push(`${name}: ${inp.slice(0, 240)}`);
    }
  }
}
const fpOk = existsSync(fpBase) && existsSync(fpNow) ? readFileSync(fpBase, "utf8").trim() === readFileSync(fpNow, "utf8").trim() : null;
const summary = {
  steps, tools, toolNames,
  tokens: { input, output, reasoning, cacheRead, peakContext: peak, generated: output + reasoning },
  durationSec: t1 > t0 ? Math.round((t1 - t0) / 1000) : 0,
  isolationHits: isoHits,
  productionUnchanged: fpOk,
  textChars: texts.join("").length,
};
console.log(JSON.stringify(summary, null, 2));
await Bun.write(rawPath.replace(/\.jsonl$/, ".report.md"), texts.join("\n"));
