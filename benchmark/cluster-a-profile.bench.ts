/**
 * Cluster A — Overhead Profiling
 *
 * Isolates each layer of Stage.execute / Pipeline.execute overhead
 * to find where compiled-runtime loses its advantage over legacy.
 *
 * Layers measured:
 * 1. Raw compiled plan execution (executeCompiledPlan direct)
 * 2. + Context.ensure wrapping
 * 3. + Promise.withResolvers allocation
 * 4. + bindExecutionSignal / cleanup
 * 5. + argument overload parsing (Stage.execute entry)
 * 6. + Context.isContext + unwrap on exit
 * 7. Full Pipeline.execute (all layers combined)
 * 8. Legacy Pipeline.execute (baseline comparison)
 */
import { compilePipelinePlan } from '../src/compiled/compiler'
import { executeCompiledPlan } from '../src/compiled/executor'
import {
  __setCompiledPipelineEnabledForTests,
  Pipeline,
} from '../src/pipeline'
import { Stage } from '../src/stage'
import { Context } from '../src/context'
import { bindExecutionSignal, getExecutionSignal } from '../src/execution_signal'

type SchemaContext = {
  tables: string[]
  processed: number
  crc: number
}

// Same pipeline as cluster-a-batch
function makeSchemaExportPipeline() {
  const pipe = new Pipeline<SchemaContext>()
  pipe.addStage((ctx) => { ctx.processed = 0; ctx.crc = 0 })
  pipe.addStage(new Stage<SchemaContext>({
    run: (_err, ctx, done) => {
      if (!ctx.tables || ctx.tables.length === 0) done(new Error('no tables'))
      else done(undefined, ctx)
    },
  }))
  for (let i = 0; i < 4; i++) {
    pipe.addStage((ctx) => {
      for (let j = 0; j < ctx.tables.length; j++) {
        ctx.crc = (ctx.crc + ctx.tables[j].length) & 0xFFFF
      }
      ctx.processed += 1
    })
  }
  pipe.addStage((ctx) => { ctx.crc = ctx.crc ^ 0xA5A5 })
  pipe.addStage((ctx) => { ctx.processed = ctx.tables.length })
  return pipe
}

function makeTestContext(): SchemaContext {
  return {
    tables: Array.from({ length: 20 }, (_, i) => `table_${i}`),
    processed: 0,
    crc: 0,
  }
}

// --- measurement ---
function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

async function measure(fn: () => Promise<void>, iterations: number, warmup = 200) {
  for (let i = 0; i < warmup; i++) await fn()
  const started = performance.now()
  for (let i = 0; i < iterations; i++) await fn()
  return ((performance.now() - started) / iterations) * 1000 // µs
}

async function medianMeasure(fn: () => Promise<void>, iterations: number, samples = 7) {
  const runs: number[] = []
  for (let i = 0; i < samples; i++) runs.push(await measure(fn, iterations))
  return median(runs)
}

// --- benchmarks ---
const ITERS = 500
const pipe = makeSchemaExportPipeline()

console.log('\n=== Cluster A — Overhead Profiling ===\n')

// Layer 0: raw executeCompiledPlan (no wrapping at all)
__setCompiledPipelineEnabledForTests(true)
pipe.compile()
const plan = compilePipelinePlan(pipe as any)

const layer0 = await medianMeasure(async () => {
  await new Promise<void>((resolve, reject) => {
    executeCompiledPlan(plan, undefined, makeTestContext(), (err) => {
      if (err) reject(err); else resolve()
    })
  })
}, ITERS)

// Layer 1: + Context.ensure
const layer1 = await medianMeasure(async () => {
  const rawCtx = makeTestContext()
  const ctx = Context.ensure(rawCtx)
  await new Promise<void>((resolve, reject) => {
    executeCompiledPlan(plan, undefined, ctx as any, (err) => {
      if (err) reject(err); else resolve()
    })
  })
}, ITERS)

// Layer 2: + Promise.withResolvers (simulate what Stage.execute does)
const layer2 = await medianMeasure(async () => {
  const rawCtx = makeTestContext()
  const ctx = Context.ensure(rawCtx)
  const { promise, resolve, reject } = Promise.withResolvers<SchemaContext>()
  executeCompiledPlan(plan, undefined, ctx as any, (err, retCtx) => {
    if (err) reject(err as any)
    else {
      if (Context.isContext(retCtx)) resolve((retCtx as any).original)
      else resolve(retCtx as any)
    }
  })
  await promise
}, ITERS)

// Layer 3: + bindExecutionSignal / cleanup
const layer3 = await medianMeasure(async () => {
  const rawCtx = makeTestContext()
  const ctx = Context.ensure(rawCtx)
  const signal = getExecutionSignal(ctx)
  const cleanup = bindExecutionSignal(ctx, signal)
  const { promise, resolve, reject } = Promise.withResolvers<SchemaContext>()
  executeCompiledPlan(plan, undefined, ctx as any, (err, retCtx) => {
    cleanup()
    if (err) reject(err as any)
    else {
      if (Context.isContext(retCtx)) resolve((retCtx as any).original)
      else resolve(retCtx as any)
    }
  })
  await promise
}, ITERS)

// Layer 4: full Pipeline.execute (runtime-compiled)
__setCompiledPipelineEnabledForTests(true)
pipe.compile(true)
const layer4 = await medianMeasure(async () => {
  await pipe.execute(makeTestContext())
}, ITERS)

// Layer 5: full Pipeline.execute (legacy)
__setCompiledPipelineEnabledForTests(false)
pipe.compile(true)
const layer5 = await medianMeasure(async () => {
  await pipe.execute(makeTestContext())
}, ITERS)

// --- Cost breakdown ---
console.log('── Per-layer cost breakdown (µs/exec) ──\n')
const layers = [
  { name: 'L0: executeCompiledPlan (raw)', value: layer0 },
  { name: 'L1: + Context.ensure', value: layer1 },
  { name: 'L2: + Promise.withResolvers + unwrap', value: layer2 },
  { name: 'L3: + bindExecutionSignal + cleanup', value: layer3 },
  { name: 'L4: Pipeline.execute (compiled)', value: layer4 },
  { name: 'L5: Pipeline.execute (legacy)', value: layer5 },
]

for (const l of layers) {
  console.log(`  ${l.name.padEnd(45)} ${l.value.toFixed(2).padStart(8)} µs`)
}

console.log('\n── Incremental cost analysis ──\n')
console.log(`  Context.ensure overhead:          ${(layer1 - layer0).toFixed(2).padStart(8)} µs  (L1 - L0)`)
console.log(`  Promise.withResolvers + unwrap:    ${(layer2 - layer1).toFixed(2).padStart(8)} µs  (L2 - L1)`)
console.log(`  bindExecutionSignal + cleanup:     ${(layer3 - layer2).toFixed(2).padStart(8)} µs  (L3 - L2)`)
console.log(`  Stage.execute remaining overhead:  ${(layer4 - layer3).toFixed(2).padStart(8)} µs  (L4 - L3)`)
console.log(`  ────────────────────────────────────────────`)
console.log(`  Total wrapping overhead:           ${(layer4 - layer0).toFixed(2).padStart(8)} µs  (L4 - L0)`)
console.log(`  Legacy total:                      ${layer5.toFixed(2).padStart(8)} µs  (L5)`)
console.log(`  Compiled total:                    ${layer4.toFixed(2).padStart(8)} µs  (L4)`)
console.log(`  Raw compiled advantage:            ${(layer5 - layer0).toFixed(2).padStart(8)} µs  (L5 - L0)`)
console.log(`  Wasted by wrapping:                ${(layer4 - layer0).toFixed(2).padStart(8)} µs  (${((layer4 - layer0) / (layer5 - layer0) * 100).toFixed(0)}% of advantage)`)

// --- Bonus: measure individual micro-operations ---
console.log('\n── Micro-operation costs (10k iterations) ──\n')

const MICRO_ITERS = 10000

// Context.ensure cost
const ctxEnsure = await medianMeasure(async () => {
  const c = Context.ensure(makeTestContext())
  void c
}, MICRO_ITERS)
console.log(`  Context.ensure(plain object):      ${ctxEnsure.toFixed(3).padStart(8)} µs`)

// Context.isContext check
const ctxObj = Context.ensure(makeTestContext())
const ctxIsCtx = await medianMeasure(async () => {
  const r = Context.isContext(ctxObj)
  void r
}, MICRO_ITERS)
console.log(`  Context.isContext() check:         ${ctxIsCtx.toFixed(3).padStart(8)} µs`)

// Promise.withResolvers
const pwr = await medianMeasure(async () => {
  const { promise, resolve } = Promise.withResolvers<void>()
  resolve()
  await promise
}, MICRO_ITERS)
console.log(`  Promise.withResolvers + await:     ${pwr.toFixed(3).padStart(8)} µs`)

// bindExecutionSignal round-trip
const bsig = await medianMeasure(async () => {
  const c = Context.ensure(makeTestContext())
  const sig = getExecutionSignal(c)
  const cleanup = bindExecutionSignal(c, sig)
  cleanup()
}, MICRO_ITERS)
console.log(`  bind+get+cleanupExecutionSignal:   ${bsig.toFixed(3).padStart(8)} µs`)

// run.bind(this) cost
const dummyFn = function (this: any, _a: any, _b: any, _c: any) {}
const obj = { fn: dummyFn }
const bindCost = await medianMeasure(async () => {
  const bound = obj.fn.bind(obj)
  void bound
}, MICRO_ITERS)
console.log(`  fn.bind(this):                     ${bindCost.toFixed(3).padStart(8)} µs`)

__setCompiledPipelineEnabledForTests(undefined)
console.log('\n=== done ===\n')
