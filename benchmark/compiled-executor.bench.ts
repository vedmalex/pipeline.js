import { compilePipelinePlan } from '../src/compiled/compiler'
import { executeCompiledPlan } from '../src/compiled/executor'
import { IfElse } from '../src/ifelse'
import {
  __setCompiledPipelineEnabledForTests,
  Pipeline,
} from '../src/pipeline'
import { Timeout } from '../src/timeout'
import { Wrap } from '../src/wrap'

const COUNTS = [1, 2, 5, 10, 20, 50, 100]

type BenchContext = { n: number }

function makePipeline(count: number) {
  const pipe = new Pipeline<BenchContext>()
  for (let i = 0; i < count; i++) {
    pipe.addStage((ctx) => {
      ctx.n += 1
    })
  }
  return pipe
}

function makeNestedPipeline(count: number, chunk: number = 5) {
  const root = new Pipeline<BenchContext>()
  for (let i = 0; i < count; i += chunk) {
    const nested = new Pipeline<BenchContext>()
    const end = Math.min(i + chunk, count)
    for (let j = i; j < end; j++) {
      nested.addStage((ctx) => {
        ctx.n += 1
      })
    }
    root.addStage(nested as any)
  }
  return root
}

function makeHybridPipeline(count: number) {
  const pipe = new Pipeline<BenchContext>()

  for (let i = 0; i < count; i++) {
    switch (i % 4) {
      case 0:
        pipe.addStage((ctx) => {
          ctx.n += 1
        })
        break

      case 1:
        pipe.addStage(new Wrap<BenchContext, BenchContext>({
          stage: (ctx) => {
            ctx.n += 1
          },
          prepare: (ctx) => ctx,
          finalize: (_ctx, retCtx) => retCtx,
        }) as any)
        break

      case 2:
        pipe.addStage(new IfElse<BenchContext>({
          condition: i % 8 === 2,
          success: (ctx) => {
            ctx.n += 1
          },
          failed: (ctx) => {
            ctx.n += 1
          },
        }) as any)
        break

      default:
        pipe.addStage(new Timeout<BenchContext>({
          timeout: 0,
          stage: (ctx) => {
            ctx.n += 1
          },
        }) as any)
        break
    }
  }

  return pipe
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

function linearFit(points: Array<{ x: number; y: number }>) {
  const xMean = points.reduce((sum, point) => sum + point.x, 0) / points.length
  const yMean = points.reduce((sum, point) => sum + point.y, 0) / points.length

  let numerator = 0
  let denominator = 0
  for (const point of points) {
    numerator += (point.x - xMean) * (point.y - yMean)
    denominator += (point.x - xMean) * (point.x - xMean)
  }

  const slope = denominator === 0 ? 0 : numerator / denominator
  const intercept = yMean - slope * xMean

  return { slope, intercept }
}

async function measure(fn: () => Promise<void>, iterations: number, warmup: number = 200) {
  for (let i = 0; i < warmup; i++) await fn()

  const started = performance.now()
  for (let i = 0; i < iterations; i++) await fn()
  return ((performance.now() - started) / iterations) * 1000
}

async function medianMeasure(fn: () => Promise<void>, iterations: number, samples: number = 5) {
  const runs: number[] = []
  for (let i = 0; i < samples; i++) {
    runs.push(await measure(fn, iterations))
  }
  return median(runs)
}

function iterationsFor(count: number) {
  if (count <= 10) return 20_000
  if (count <= 50) return 5_000
  return 2_000
}

async function benchRuntime(count: number, compiled: boolean) {
  __setCompiledPipelineEnabledForTests(compiled)
  const pipe = makePipeline(count)
  return medianMeasure(async () => {
    await pipe.execute({ n: 0 })
  }, iterationsFor(count))
}

async function benchHybridRuntime(count: number, compiled: boolean) {
  __setCompiledPipelineEnabledForTests(compiled)
  const pipe = makeHybridPipeline(count)
  return medianMeasure(async () => {
    await pipe.execute({ n: 0 })
  }, iterationsFor(count))
}

async function benchDirectCompiled(count: number) {
  const pipe = makePipeline(count)
  const plan = compilePipelinePlan(pipe as any)
  return medianMeasure(async () => {
    await new Promise<void>((resolve, reject) => {
      executeCompiledPlan(plan, undefined, { n: 0 }, (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }, iterationsFor(count))
}

async function benchDirectHybridCompiled(count: number) {
  const pipe = makeHybridPipeline(count)
  const plan = compilePipelinePlan(pipe as any)
  return medianMeasure(async () => {
    await new Promise<void>((resolve, reject) => {
      executeCompiledPlan(plan, undefined, { n: 0 }, (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }, iterationsFor(count))
}

async function benchNestedRuntime(count: number, compiled: boolean) {
  __setCompiledPipelineEnabledForTests(compiled)
  const pipe = makeNestedPipeline(count)
  return medianMeasure(async () => {
    await pipe.execute({ n: 0 })
  }, iterationsFor(count))
}

console.log('\n=== compiled executor benchmark ===\n')

const legacyPoints: Array<{ x: number; y: number }> = []
const runtimeCompiledPoints: Array<{ x: number; y: number }> = []
const directCompiledPoints: Array<{ x: number; y: number }> = []
const hybridLegacyPoints: Array<{ x: number; y: number }> = []
const hybridRuntimeCompiledPoints: Array<{ x: number; y: number }> = []
const hybridDirectCompiledPoints: Array<{ x: number; y: number }> = []

console.log('── Flat Pipeline scaling (compiled-static) ──')
for (const count of COUNTS) {
  const legacy = await benchRuntime(count, false)
  const runtimeCompiled = await benchRuntime(count, true)
  const directCompiled = await benchDirectCompiled(count)

  legacyPoints.push({ x: count, y: legacy })
  runtimeCompiledPoints.push({ x: count, y: runtimeCompiled })
  directCompiledPoints.push({ x: count, y: directCompiled })

  console.log(
    `${String(count).padStart(3)} stages | legacy ${legacy.toFixed(2).padStart(8)} µs | runtime-compiled ${runtimeCompiled.toFixed(2).padStart(8)} µs | direct-compiled ${directCompiled.toFixed(2).padStart(8)} µs`,
  )
}

const legacyFit = linearFit(legacyPoints.filter(point => point.x >= 10))
const runtimeCompiledFit = linearFit(runtimeCompiledPoints.filter(point => point.x >= 10))
const directCompiledFit = linearFit(directCompiledPoints.filter(point => point.x >= 10))

console.log('\n── Flat Pipeline linear fit (10+ stages, compiled-static) ──')
console.log(`  legacy            total ≈ ${legacyFit.intercept.toFixed(2)} + ${legacyFit.slope.toFixed(3)}*N µs`)
console.log(`  runtime-compiled  total ≈ ${runtimeCompiledFit.intercept.toFixed(2)} + ${runtimeCompiledFit.slope.toFixed(3)}*N µs`)
console.log(`  direct-compiled   total ≈ ${directCompiledFit.intercept.toFixed(2)} + ${directCompiledFit.slope.toFixed(3)}*N µs`)

console.log('\n── Flat Pipeline scaling (compiled-hybrid) ──')
for (const count of COUNTS) {
  const legacy = await benchHybridRuntime(count, false)
  const runtimeCompiled = await benchHybridRuntime(count, true)
  const directCompiled = await benchDirectHybridCompiled(count)

  hybridLegacyPoints.push({ x: count, y: legacy })
  hybridRuntimeCompiledPoints.push({ x: count, y: runtimeCompiled })
  hybridDirectCompiledPoints.push({ x: count, y: directCompiled })

  console.log(
    `${String(count).padStart(3)} hybrid stages | legacy ${legacy.toFixed(2).padStart(8)} µs | runtime-compiled ${runtimeCompiled.toFixed(2).padStart(8)} µs | direct-compiled ${directCompiled.toFixed(2).padStart(8)} µs`,
  )
}

const hybridLegacyFit = linearFit(hybridLegacyPoints.filter(point => point.x >= 10))
const hybridRuntimeCompiledFit = linearFit(hybridRuntimeCompiledPoints.filter(point => point.x >= 10))
const hybridDirectCompiledFit = linearFit(hybridDirectCompiledPoints.filter(point => point.x >= 10))

console.log('\n── Flat Pipeline linear fit (10+ stages, compiled-hybrid) ──')
console.log(`  legacy            total ≈ ${hybridLegacyFit.intercept.toFixed(2)} + ${hybridLegacyFit.slope.toFixed(3)}*N µs`)
console.log(`  runtime-compiled  total ≈ ${hybridRuntimeCompiledFit.intercept.toFixed(2)} + ${hybridRuntimeCompiledFit.slope.toFixed(3)}*N µs`)
console.log(`  direct-compiled   total ≈ ${hybridDirectCompiledFit.intercept.toFixed(2)} + ${hybridDirectCompiledFit.slope.toFixed(3)}*N µs`)

console.log('\n── Nested Pipeline spot-check ──')
for (const count of [10, 50, 100]) {
  const legacy = await benchNestedRuntime(count, false)
  const runtimeCompiled = await benchNestedRuntime(count, true)

  console.log(
    `${String(count).padStart(3)} nested stages | legacy ${legacy.toFixed(2).padStart(8)} µs | runtime-compiled ${runtimeCompiled.toFixed(2).padStart(8)} µs`,
  )
}

__setCompiledPipelineEnabledForTests(undefined)

console.log('\n=== done ===\n')
