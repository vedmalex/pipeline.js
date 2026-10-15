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
import { formatStats, measureStats } from './stats'

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

// --- Benchmarks ---

console.log('\n=== Cluster B — HTTP Request Handling Benchmark ===\n')

const ITERATIONS = 10_000

// --- Scenario 1: Timeout-wrapped pipeline ---
console.log('── Scenario 1: Pipeline with Timeout wrapper (3 stages) ──')

const httpPipe = makeHttpHandlerPipeline()

__setCompiledPipelineEnabledForTests(false)
httpPipe.compile()
const legacyTimeout = await measureStats(async () => {
  await httpPipe.execute(makeTestRequest())
}, ITERATIONS, { samples: 7, warmup: 200 })

__setCompiledPipelineEnabledForTests(true)
httpPipe.compile()
const compiledTimeout = await measureStats(async () => {
  await httpPipe.execute(makeTestRequest())
}, ITERATIONS, { samples: 7, warmup: 200 })

const plan1 = compilePipelinePlan(httpPipe as any)
const directTimeout = await measureStats(async () => {
  await new Promise<void>((resolve, reject) => {
    executeCompiledPlan(plan1, undefined, makeTestRequest(), (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}, ITERATIONS, { samples: 7, warmup: 200 })

const regressionTimeout = ((compiledTimeout.median - legacyTimeout.median) / legacyTimeout.median * 100)

console.log(`  Legacy:   ${formatStats(legacyTimeout)} µs/request`)
console.log(`  Compiled: ${formatStats(compiledTimeout)} µs/request`)
console.log(`  Direct:   ${formatStats(directTimeout)} µs/request`)
console.log(`  Delta:    ${regressionTimeout >= 0 ? '+' : ''}${regressionTimeout.toFixed(1)}% ${regressionTimeout > 5 ? '(REGRESSION)' : '(OK)'}`)
console.log(`  Plan mode: ${plan1.mode}`)

// --- Scenario 2: Wrap-based pipeline ---
console.log('\n── Scenario 2: Pipeline with Wrap middleware (2 stages) ──')

const wrapPipe = makeHttpWithWrapPipeline()

__setCompiledPipelineEnabledForTests(false)
wrapPipe.compile()
const legacyWrap = await measureStats(async () => {
  await wrapPipe.execute(makeTestRequest())
}, ITERATIONS, { samples: 7, warmup: 200 })

__setCompiledPipelineEnabledForTests(true)
wrapPipe.compile()
const compiledWrap = await measureStats(async () => {
  await wrapPipe.execute(makeTestRequest())
}, ITERATIONS, { samples: 7, warmup: 200 })

const plan2 = compilePipelinePlan(wrapPipe as any)
const directWrap = await measureStats(async () => {
  await new Promise<void>((resolve, reject) => {
    executeCompiledPlan(plan2, undefined, makeTestRequest(), (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}, ITERATIONS, { samples: 7, warmup: 200 })

const regressionWrap = ((compiledWrap.median - legacyWrap.median) / legacyWrap.median * 100)

console.log(`  Legacy:   ${formatStats(legacyWrap)} µs/request`)
console.log(`  Compiled: ${formatStats(compiledWrap)} µs/request`)
console.log(`  Direct:   ${formatStats(directWrap)} µs/request`)
console.log(`  Delta:    ${regressionWrap >= 0 ? '+' : ''}${regressionWrap.toFixed(1)}% ${regressionWrap > 5 ? '(REGRESSION)' : '(OK)'}`)
console.log(`  Plan mode: ${plan2.mode}`)

// --- Success criteria check ---
console.log('\n── Success criterion: ≤5% regression for compiled vs legacy ──')
const maxRegression = Math.max(regressionTimeout, regressionWrap)
console.log(`  Worst regression: ${maxRegression >= 0 ? '+' : ''}${maxRegression.toFixed(1)}%`)
console.log(`  PASS: ${maxRegression <= 5 ? 'YES ✓' : 'NO ✗'}`)

__setCompiledPipelineEnabledForTests(undefined)
console.log('\n=== done ===\n')
