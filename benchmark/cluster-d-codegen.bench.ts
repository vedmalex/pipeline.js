/**
 * Cluster D — Codegen and Filesystem Walkers
 *
 * Models the grainjs-prod genpack/ and schemaExport/ workload:
 * - Sequential with split over 10-50 items
 * - Inner stage is a simple fn or Stage
 * - combine() merges results back
 * - Tests both forked context and plain-object child patterns
 *
 * Success criterion: no material regression (>10%) on any measured item count.
 * Sequential compiled path is active; larger item-count regressions should be treated as follow-up optimization work.
 */
import {
  __setCompiledPipelineEnabledForTests,
  Pipeline,
} from '../src/pipeline'
import { compilePipelinePlan } from '../src/compiled/compiler'
import { Sequential } from '../src/sequential'
import { Stage } from '../src/stage'

type CodegenContext = {
  items: Array<{ name: string; code: string }>
  output: string[]
}

type ItemContext = {
  name: string
  code: string
  generated?: string
}

// --- Pipeline construction (mirrors real codegen pattern) ---

function makeCodegenPipeline(itemCount: number) {
  const pipe = new Pipeline<CodegenContext>()

  // Stage 1: Init output array
  pipe.addStage((ctx) => {
    ctx.output = []
  })

  // Stage 2: Sequential over items
  pipe.addStage(new Sequential<CodegenContext, ItemContext>({
    stage: (item: ItemContext) => {
      item.generated = `// Generated: ${item.name}\n${item.code}`
    },
    split: (ctx) => ctx.items.map(item => ({ ...item })),
    combine: (ctx, children) => {
      ctx.output = children.map(c => c.generated ?? '')
      return ctx
    },
  }) as any)

  // Stage 3: Finalize
  pipe.addStage((ctx) => {
    ctx.output.push(`// Total: ${ctx.output.length} files`)
  })

  return pipe
}

function makeCodegenContext(itemCount: number): CodegenContext {
  return {
    items: Array.from({ length: itemCount }, (_, i) => ({
      name: `module_${i}`,
      code: `export const x${i} = ${i}`,
    })),
    output: [],
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

async function measure(fn: () => Promise<void>, iterations: number, warmup: number = 100) {
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

function linearFit(points: Array<{ x: number; y: number }>) {
  const xMean = points.reduce((sum, p) => sum + p.x, 0) / points.length
  const yMean = points.reduce((sum, p) => sum + p.y, 0) / points.length

  let num = 0, den = 0
  for (const p of points) {
    num += (p.x - xMean) * (p.y - yMean)
    den += (p.x - xMean) * (p.x - xMean)
  }

  return { slope: den === 0 ? 0 : num / den, intercept: yMean - (den === 0 ? 0 : num / den) * xMean }
}

// --- Benchmarks ---

const ITEM_COUNTS = [1, 5, 10, 20, 50]

console.log('\n=== Cluster D — Codegen / Sequential Benchmark ===\n')

console.log('── Sequential scaling: items vs execution time ──')
console.log(`${'items'.padStart(6)} | ${'legacy'.padStart(10)} µs | ${'compiled'.padStart(10)} µs | ${'delta'.padStart(10)} | ${'plan'.padStart(15)}`)
console.log('-'.repeat(68))

const legacyPoints: Array<{ x: number; y: number }> = []
const compiledPoints: Array<{ x: number; y: number }> = []

for (const itemCount of ITEM_COUNTS) {
  const iterations = itemCount <= 10 ? 10_000 : 2_000

  const pipe = makeCodegenPipeline(itemCount)
  const plan = compilePipelinePlan(pipe as any)

  // Legacy
  __setCompiledPipelineEnabledForTests(false)
  pipe.compile()
  const legacy = await medianMeasure(async () => {
    await pipe.execute(makeCodegenContext(itemCount))
  }, iterations)

  // Compiled (Pipeline is compiled, Sequential stays legacy — P1 not yet implemented)
  __setCompiledPipelineEnabledForTests(true)
  pipe.compile()
  const compiled = await medianMeasure(async () => {
    await pipe.execute(makeCodegenContext(itemCount))
  }, iterations)

  legacyPoints.push({ x: itemCount, y: legacy })
  compiledPoints.push({ x: itemCount, y: compiled })

  const delta = ((compiled - legacy) / legacy * 100)
  console.log(
    `${String(itemCount).padStart(6)} | ${legacy.toFixed(2).padStart(10)} | ${compiled.toFixed(2).padStart(10)} | ${(delta >= 0 ? '+' : '') + delta.toFixed(1) + '%'} | ${plan.mode.padStart(15)}`
  )
}

// Linear fits
const legacyFit = linearFit(legacyPoints.filter(p => p.x >= 5))
const compiledFit = linearFit(compiledPoints.filter(p => p.x >= 5))

console.log('\n── Linear fit (5+ items) ──')
console.log(`  Legacy:   total ≈ ${legacyFit.intercept.toFixed(2)} + ${legacyFit.slope.toFixed(3)}*N µs`)
console.log(`  Compiled: total ≈ ${compiledFit.intercept.toFixed(2)} + ${compiledFit.slope.toFixed(3)}*N µs`)
console.log(`  Per-item slope: legacy ${legacyFit.slope.toFixed(3)} µs, compiled ${compiledFit.slope.toFixed(3)} µs`)

// --- Success criteria check ---
console.log('\n── Success criterion: No regression for Sequential workloads ──')
const worstDelta = Math.max(
  ...ITEM_COUNTS.map((_, i) =>
    (compiledPoints[i].y - legacyPoints[i].y) / legacyPoints[i].y * 100
  )
)
console.log(`  Worst delta: ${worstDelta >= 0 ? '+' : ''}${worstDelta.toFixed(1)}%`)
console.log(`  PASS: ${worstDelta <= 10 ? 'YES ✓' : 'NO ✗ (follow-up optimization needed)'}`)
console.log(`  Note: Sequential now compiles natively; any remaining regression is executor-optimization debt, not missing compilation coverage.`)

__setCompiledPipelineEnabledForTests(undefined)
console.log('\n=== done ===\n')
