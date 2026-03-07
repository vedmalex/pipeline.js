/**
 * Cluster B — HTTP Request Handling
 *
 * Models the grainjs-prod directEntry.js / registerController.ts workload:
 * - Short Pipeline (2-3 stages) with Timeout wrapper
 * - rescue() error handling
 * - Single execution per "request"
 * - Wrapper-heavy, expected to stay fully compiled-static after TASK-011/TASK-014
 *
 * Success criterion: ≤5% regression between legacy and compiled.
 */
import { compilePipelinePlan } from '../src/compiled/compiler'
import { executeCompiledPlan } from '../src/compiled/executor'
import {
  __setCompiledPipelineEnabledForTests,
  Pipeline,
} from '../src/pipeline'
import { Stage } from '../src/stage'
import { Timeout } from '../src/timeout'
import { Wrap } from '../src/wrap'

type RequestContext = {
  method: string
  path: string
  body: Record<string, unknown>
  status: number
  response: unknown
}

// --- Pipeline construction (mirrors real HTTP handler) ---

function makeHttpHandlerPipeline() {
  const pipe = new Pipeline<RequestContext>()

  // Stage 1: Parse & validate request (fn stage)
  pipe.addStage((ctx) => {
    if (!ctx.method || !ctx.path) {
      throw new Error('invalid request')
    }
    ctx.status = 200
  })

  // Stage 2: Business logic with timeout (wrapper)
  pipe.addStage(new Timeout<RequestContext>({
    timeout: 0, // No real timeout in benchmark, just the wrapper overhead
    stage: (ctx) => {
      // Simulate lightweight business logic
      ctx.response = { ok: true, path: ctx.path }
    },
  }) as any)

  // Stage 3: Serialize response (fn stage)
  pipe.addStage((ctx) => {
    ctx.response = JSON.stringify(ctx.response)
  })

  return pipe
}

function makeHttpWithWrapPipeline() {
  const pipe = new Pipeline<RequestContext>()

  // Stage 1: Auth middleware (Wrap)
  pipe.addStage(new Wrap<RequestContext, RequestContext>({
    stage: (ctx) => {
      ctx.status = 200
    },
    prepare: (ctx) => ctx,
    finalize: (_ctx, retCtx) => retCtx,
  }) as any)

  // Stage 2: Handler
  pipe.addStage((ctx) => {
    ctx.response = { ok: true }
  })

  return pipe
}

function makeTestRequest(): RequestContext {
  return {
    method: 'GET',
    path: '/api/test',
    body: {},
    status: 0,
    response: null,
  }
}

// --- Measurement utilities ---

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

async function measure(fn: () => Promise<void>, iterations: number, warmup: number = 200) {
  for (let i = 0; i < warmup; i++) await fn()

  const started = performance.now()
  for (let i = 0; i < iterations; i++) await fn()
  return ((performance.now() - started) / iterations) * 1000
}

async function medianMeasure(fn: () => Promise<void>, iterations: number, samples: number = 7) {
  const runs: number[] = []
  for (let i = 0; i < samples; i++) {
    runs.push(await measure(fn, iterations))
  }
  return median(runs)
}

// --- Benchmarks ---

console.log('\n=== Cluster B — HTTP Request Handling Benchmark ===\n')

const ITERATIONS = 10_000

// --- Scenario 1: Timeout-wrapped pipeline ---
console.log('── Scenario 1: Pipeline with Timeout wrapper (3 stages) ──')

const httpPipe = makeHttpHandlerPipeline()

__setCompiledPipelineEnabledForTests(false)
httpPipe.compile()
const legacyTimeout = await medianMeasure(async () => {
  await httpPipe.execute(makeTestRequest())
}, ITERATIONS)

__setCompiledPipelineEnabledForTests(true)
httpPipe.compile()
const compiledTimeout = await medianMeasure(async () => {
  await httpPipe.execute(makeTestRequest())
}, ITERATIONS)

const plan1 = compilePipelinePlan(httpPipe as any)
const directTimeout = await medianMeasure(async () => {
  await new Promise<void>((resolve, reject) => {
    executeCompiledPlan(plan1, undefined, makeTestRequest(), (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}, ITERATIONS)

const regressionTimeout = ((compiledTimeout - legacyTimeout) / legacyTimeout * 100)

console.log(`  Legacy:   ${legacyTimeout.toFixed(2)} µs/request`)
console.log(`  Compiled: ${compiledTimeout.toFixed(2)} µs/request`)
console.log(`  Direct:   ${directTimeout.toFixed(2)} µs/request`)
console.log(`  Delta:    ${regressionTimeout >= 0 ? '+' : ''}${regressionTimeout.toFixed(1)}% ${regressionTimeout > 5 ? '(REGRESSION)' : '(OK)'}`)
console.log(`  Plan mode: ${plan1.mode}`)

// --- Scenario 2: Wrap-based pipeline ---
console.log('\n── Scenario 2: Pipeline with Wrap middleware (2 stages) ──')

const wrapPipe = makeHttpWithWrapPipeline()

__setCompiledPipelineEnabledForTests(false)
wrapPipe.compile()
const legacyWrap = await medianMeasure(async () => {
  await wrapPipe.execute(makeTestRequest())
}, ITERATIONS)

__setCompiledPipelineEnabledForTests(true)
wrapPipe.compile()
const compiledWrap = await medianMeasure(async () => {
  await wrapPipe.execute(makeTestRequest())
}, ITERATIONS)

const plan2 = compilePipelinePlan(wrapPipe as any)
const directWrap = await medianMeasure(async () => {
  await new Promise<void>((resolve, reject) => {
    executeCompiledPlan(plan2, undefined, makeTestRequest(), (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}, ITERATIONS)

const regressionWrap = ((compiledWrap - legacyWrap) / legacyWrap * 100)

console.log(`  Legacy:   ${legacyWrap.toFixed(2)} µs/request`)
console.log(`  Compiled: ${compiledWrap.toFixed(2)} µs/request`)
console.log(`  Direct:   ${directWrap.toFixed(2)} µs/request`)
console.log(`  Delta:    ${regressionWrap >= 0 ? '+' : ''}${regressionWrap.toFixed(1)}% ${regressionWrap > 5 ? '(REGRESSION)' : '(OK)'}`)
console.log(`  Plan mode: ${plan2.mode}`)

// --- Success criteria check ---
console.log('\n── Success criterion: ≤5% regression for compiled vs legacy ──')
const maxRegression = Math.max(regressionTimeout, regressionWrap)
console.log(`  Worst regression: ${maxRegression >= 0 ? '+' : ''}${maxRegression.toFixed(1)}%`)
console.log(`  PASS: ${maxRegression <= 5 ? 'YES ✓' : 'NO ✗'}`)

__setCompiledPipelineEnabledForTests(undefined)
console.log('\n=== done ===\n')
