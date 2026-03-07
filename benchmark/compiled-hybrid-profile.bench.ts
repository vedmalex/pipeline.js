import { compilePipelinePlan } from '../src/compiled/compiler'
import { executeCompiledPlan } from '../src/compiled/executor'
import { IfElse } from '../src/ifelse'
import {
  __setCompiledPipelineEnabledForTests,
  Pipeline,
} from '../src/pipeline'
import { Timeout } from '../src/timeout'
import { run_or_execute } from '../src/utils/run_or_execute'
import { Wrap } from '../src/wrap'

type BenchContext = {
  n: number
  branch: boolean
}

type HybridCase = {
  name: string
  makeStage: () => any
}

const CASES: HybridCase[] = [
  {
    name: 'Wrap',
    makeStage: () => new Wrap<BenchContext, BenchContext>({
      stage: (ctx) => {
        ctx.n += 1
      },
      prepare: (ctx) => ctx,
      finalize: (_ctx, retCtx) => retCtx,
    }),
  },
  {
    name: 'IfElse',
    makeStage: () => new IfElse<BenchContext>({
      condition: (ctx) => ctx.branch,
      success: (ctx) => {
        ctx.n += 1
      },
      failed: (ctx) => {
        ctx.n += 1
      },
    }),
  },
  {
    name: 'Timeout',
    makeStage: () => new Timeout<BenchContext>({
      timeout: 0,
      stage: (ctx) => {
        ctx.n += 1
      },
    }),
  },
]

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

async function medianMeasure(fn: () => Promise<void>, iterations: number, samples: number = 5) {
  const runs: number[] = []
  for (let i = 0; i < samples; i++) {
    runs.push(await measure(fn, iterations))
  }
  return median(runs)
}

function createContext(): BenchContext {
  return { n: 0, branch: true }
}

async function benchRawStage(makeStage: () => any) {
  return medianMeasure(async () => {
    const stage = makeStage()
    await new Promise<void>((resolve, reject) => {
      run_or_execute(stage, undefined, createContext(), (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }, 10_000)
}

async function benchDirectCompiled(makeStage: () => any) {
  const pipe = new Pipeline<BenchContext>([makeStage()])
  const plan = compilePipelinePlan(pipe as any)

  return medianMeasure(async () => {
    await new Promise<void>((resolve, reject) => {
      executeCompiledPlan(plan, undefined, createContext(), (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }, 10_000)
}

async function benchRuntime(makeStage: () => any, compiled: boolean) {
  __setCompiledPipelineEnabledForTests(compiled)
  const pipe = new Pipeline<BenchContext>([makeStage()])

  return medianMeasure(async () => {
    await pipe.execute(createContext())
  }, 10_000)
}

console.log('\n=== compiled hybrid fallback profile ===\n')
console.log('Single fallback stage cost breakdown')

for (const testCase of CASES) {
  const raw = await benchRawStage(testCase.makeStage)
  const legacy = await benchRuntime(testCase.makeStage, false)
  const runtimeCompiled = await benchRuntime(testCase.makeStage, true)
  const directCompiled = await benchDirectCompiled(testCase.makeStage)

  console.log(`\n${testCase.name}`)
  console.log(`  raw run_or_execute   ${raw.toFixed(2).padStart(8)} µs`)
  console.log(`  legacy Pipeline      ${legacy.toFixed(2).padStart(8)} µs`)
  console.log(`  runtime-compiled     ${runtimeCompiled.toFixed(2).padStart(8)} µs`)
  console.log(`  direct-compiled      ${directCompiled.toFixed(2).padStart(8)} µs`)
}

__setCompiledPipelineEnabledForTests(undefined)

console.log('\n=== done ===\n')
