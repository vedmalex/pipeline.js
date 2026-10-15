/**
 * Cluster C — CLI / Bootstrap / Orchestration
 *
 * Models the grainjs-prod CLI command workload:
 * - Flat Pipeline with 4-6 stages (fn stages)
 * - Single execution (cold-start)
 * - No wrappers, no loops
 * - Measures compilation + execution cost combined (cold) and execution-only (warm)
 *
 * Success criteria:
 * - warm reused path: >=10% improvement
 * - cold single-use path: informational compile-cost tracking, not a promotion gate
 */
import { compilePipelinePlan } from '../src/compiled/compiler'
import { executeCompiledPlan } from '../src/compiled/executor'
import {
  __setCompiledPipelineEnabledForTests,
  Pipeline,
} from '../src/pipeline'
import { Stage } from '../src/stage'
import { formatRuns, formatStats, measureStats } from './stats'

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

// --- Benchmarks ---

console.log('\n=== Cluster C — CLI / Bootstrap Benchmark ===\n')

const ITERATIONS = 20_000

// --- Warm path: pipeline already compiled, reused ---
console.log('── Warm execution (pipeline pre-compiled, reused) ──')

const pipe = makeCliPipeline()

__setCompiledPipelineEnabledForTests(false)
pipe.compile()
const legacyWarm = await measureStats(async () => {
  await pipe.execute(makeTestArgs())
}, ITERATIONS, { samples: 7, warmup: 200 })

__setCompiledPipelineEnabledForTests(true)
pipe.compile()
const compiledWarm = await measureStats(async () => {
  await pipe.execute(makeTestArgs())
}, ITERATIONS, { samples: 7, warmup: 200 })

const plan = compilePipelinePlan(pipe as any)
const directWarm = await measureStats(async () => {
  await new Promise<void>((resolve, reject) => {
    executeCompiledPlan(plan, undefined, makeTestArgs(), (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}, ITERATIONS, { samples: 7, warmup: 200 })

const warmImprovement = ((legacyWarm.median - compiledWarm.median) / legacyWarm.median * 100)

console.log(`  Legacy:   ${formatStats(legacyWarm)} µs/exec`)
console.log(`  Compiled: ${formatStats(compiledWarm)} µs/exec`)
console.log(`  Direct:   ${formatStats(directWarm)} µs/exec`)
console.log(`  Improvement: ${warmImprovement.toFixed(1)}%`)
console.log(`  Warm runs (compiled): ${formatRuns(compiledWarm)}`)

// --- Cold path: create + compile + execute (single use) ---
console.log('\n── Cold execution (create + compile + execute once) ──')

__setCompiledPipelineEnabledForTests(false)
const legacyCold = await measureStats(async () => {
  const p = makeCliPipeline()
  await p.execute(makeTestArgs())
}, ITERATIONS, { samples: 7, warmup: 200 })

__setCompiledPipelineEnabledForTests(true)
const compiledCold = await measureStats(async () => {
  const p = makeCliPipeline()
  await p.execute(makeTestArgs())
}, ITERATIONS, { samples: 7, warmup: 200 })

const coldImprovement = ((legacyCold.median - compiledCold.median) / legacyCold.median * 100)

console.log(`  Legacy:   ${formatStats(legacyCold)} µs/exec`)
console.log(`  Compiled: ${formatStats(compiledCold)} µs/exec`)
console.log(`  Improvement: ${coldImprovement.toFixed(1)}%`)
console.log(`  Cold runs (compiled): ${formatRuns(compiledCold)}`)

// --- Success criteria check ---
console.log('\n── Success criteria: warm gate + cold informational tracking ──')
console.log(`  Warm improvement: ${warmImprovement.toFixed(1)}%`)
console.log(`  Cold improvement: ${coldImprovement.toFixed(1)}%`)
console.log(`  PASS (warm): ${warmImprovement >= 10 ? 'YES ✓' : 'NO ✗'}`)
console.log('  PASS (cold): informational only')

__setCompiledPipelineEnabledForTests(undefined)
console.log('\n=== done ===\n')
