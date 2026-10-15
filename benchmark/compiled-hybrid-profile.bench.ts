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
import { formatStats, measureStats } from './stats'

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

function createContext(): BenchContext {
  return { n: 0, branch: true }
}

async function benchRawStage(makeStage: () => any) {
  return measureStats(async () => {
    const stage = makeStage()
    await new Promise<void>((resolve, reject) => {
      run_or_execute(stage, undefined, createContext(), (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }, 10_000, { samples: 5, warmup: 200 })
}

async function benchDirectCompiled(makeStage: () => any) {
  const pipe = new Pipeline<BenchContext>([makeStage()])
  const plan = compilePipelinePlan(pipe as any)

  return measureStats(async () => {
    await new Promise<void>((resolve, reject) => {
      executeCompiledPlan(plan, undefined, createContext(), (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }, 10_000, { samples: 5, warmup: 200 })
}

async function benchRuntime(makeStage: () => any, compiled: boolean) {
  __setCompiledPipelineEnabledForTests(compiled)
  const pipe = new Pipeline<BenchContext>([makeStage()])

  return measureStats(async () => {
    await pipe.execute(createContext())
  }, 10_000, { samples: 5, warmup: 200 })
}

console.log('\n=== compiled hybrid fallback profile ===\n')
console.log('Single fallback stage cost breakdown')

for (const testCase of CASES) {
  const raw = await benchRawStage(testCase.makeStage)
  const legacy = await benchRuntime(testCase.makeStage, false)
  const runtimeCompiled = await benchRuntime(testCase.makeStage, true)
  const directCompiled = await benchDirectCompiled(testCase.makeStage)

  console.log(`\n${testCase.name}`)
  console.log(`  raw run_or_execute   ${formatStats(raw)} µs`)
  console.log(`  legacy Pipeline      ${formatStats(legacy)} µs`)
  console.log(`  runtime-compiled     ${formatStats(runtimeCompiled)} µs`)
  console.log(`  direct-compiled      ${formatStats(directCompiled)} µs`)
}

__setCompiledPipelineEnabledForTests(undefined)

console.log('\n=== done ===\n')
