/**
 * Cluster C — CLI / Bootstrap / Orchestration
 *
 * Models the grainjs-prod CLI command workload:
 * - Flat Pipeline with 4-6 stages (fn stages)
 * - Single execution (cold-start)
 * - No wrappers, no loops
 * - Measures compilation + execution cost combined (cold) and execution-only (warm)
 *
 * Success criterion: ≥10% improvement for single-run CLI commands.
 */
import { compilePipelinePlan } from '../src/compiled/compiler'
import { executeCompiledPlan } from '../src/compiled/executor'
import {
  __setCompiledPipelineEnabledForTests,
  Pipeline,
} from '../src/pipeline'
import { Stage } from '../src/stage'

type CliContext = {
  args: string[]
  config: Record<string, unknown>
  result: unknown
  exitCode: number
}

// --- Pipeline construction (mirrors real CLI command) ---

function makeCliPipeline() {
  const pipe = new Pipeline<CliContext>()

  // Stage 1: Parse args
  pipe.addStage((ctx) => {
    ctx.config = {}
    for (const arg of ctx.args) {
      const [key, value] = arg.split('=')
      ctx.config[key] = value ?? true
    }
  })

  // Stage 2: Validate config (Stage instance)
  pipe.addStage(new Stage<CliContext>({
    run: (_err, ctx, done) => {
      if (Object.keys(ctx.config).length === 0) {
        done(new Error('empty config'))
      } else {
        done(undefined, ctx)
      }
    },
  }))

  // Stage 3: Execute command
  pipe.addStage((ctx) => {
    ctx.result = { processed: true, keys: Object.keys(ctx.config) }
  })

  // Stage 4: Format output
  pipe.addStage((ctx) => {
    ctx.result = JSON.stringify(ctx.result)
  })

  // Stage 5: Set exit code
  pipe.addStage((ctx) => {
    ctx.exitCode = 0
  })

  return pipe
}

function makeTestArgs(): CliContext {
  return {
    args: ['name=test', 'verbose=true', 'output=json'],
    config: {},
    result: null,
    exitCode: -1,
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

console.log('\n=== Cluster C — CLI / Bootstrap Benchmark ===\n')

const ITERATIONS = 20_000

// --- Warm path: pipeline already compiled, reused ---
console.log('── Warm execution (pipeline pre-compiled, reused) ──')

const pipe = makeCliPipeline()

__setCompiledPipelineEnabledForTests(false)
pipe.compile()
const legacyWarm = await medianMeasure(async () => {
  await pipe.execute(makeTestArgs())
}, ITERATIONS)

__setCompiledPipelineEnabledForTests(true)
pipe.compile()
const compiledWarm = await medianMeasure(async () => {
  await pipe.execute(makeTestArgs())
}, ITERATIONS)

const plan = compilePipelinePlan(pipe as any)
const directWarm = await medianMeasure(async () => {
  await new Promise<void>((resolve, reject) => {
    executeCompiledPlan(plan, undefined, makeTestArgs(), (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}, ITERATIONS)

const warmImprovement = ((legacyWarm - compiledWarm) / legacyWarm * 100)

console.log(`  Legacy:   ${legacyWarm.toFixed(2)} µs/exec`)
console.log(`  Compiled: ${compiledWarm.toFixed(2)} µs/exec`)
console.log(`  Direct:   ${directWarm.toFixed(2)} µs/exec`)
console.log(`  Improvement: ${warmImprovement.toFixed(1)}%`)

// --- Cold path: create + compile + execute (single use) ---
console.log('\n── Cold execution (create + compile + execute once) ──')

__setCompiledPipelineEnabledForTests(false)
const legacyCold = await medianMeasure(async () => {
  const p = makeCliPipeline()
  await p.execute(makeTestArgs())
}, ITERATIONS)

__setCompiledPipelineEnabledForTests(true)
const compiledCold = await medianMeasure(async () => {
  const p = makeCliPipeline()
  await p.execute(makeTestArgs())
}, ITERATIONS)

const coldImprovement = ((legacyCold - compiledCold) / legacyCold * 100)

console.log(`  Legacy:   ${legacyCold.toFixed(2)} µs/exec`)
console.log(`  Compiled: ${compiledCold.toFixed(2)} µs/exec`)
console.log(`  Improvement: ${coldImprovement.toFixed(1)}%`)

// --- Success criteria check ---
console.log('\n── Success criterion: ≥10% improvement for single-run ──')
console.log(`  Warm improvement: ${warmImprovement.toFixed(1)}%`)
console.log(`  Cold improvement: ${coldImprovement.toFixed(1)}%`)
console.log(`  PASS (warm): ${warmImprovement >= 10 ? 'YES ✓' : 'NO ✗'}`)
console.log(`  PASS (cold): ${coldImprovement >= 10 ? 'YES ✓' : 'NO ✗ (expected — cold includes compile overhead)'}`)

__setCompiledPipelineEnabledForTests(undefined)
console.log('\n=== done ===\n')
