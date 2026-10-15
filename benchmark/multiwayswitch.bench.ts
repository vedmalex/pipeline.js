import { compilePipelinePlan } from '../src/compiled/compiler'
import { executeCompiledPlan } from '../src/compiled/executor'
import { MultiWaySwitch } from '../src/multiwayswitch'
import { __setCompiledPipelineEnabledForTests, Pipeline } from '../src/pipeline'
import { formatRuns, formatStats, measureStats } from './stats'

const CASE_COUNTS = [1, 2, 5, 10, 20]

type BenchContext = { total: number }

function executePlanPromise<T extends Record<string, any>>(plan: any, context: T) {
  return new Promise<T>((resolve, reject) => {
    executeCompiledPlan(plan, undefined, context, (err, ctx) => {
      if (err) {
        reject(err)
      } else {
        resolve((ctx ?? context) as T)
      }
    })
  })
}

function makeSharedContextMultiWaySwitch(caseCount: number) {
  return new Pipeline<BenchContext>([
    new MultiWaySwitch<BenchContext, BenchContext>({
      cases: Array.from({ length: caseCount }, (_, index) => ({
        evaluate: true,
        stage: (ctx) => {
          ctx.total += index + 1
          return ctx
        },
      })),
    }) as any,
  ])
}

function makeDirectControl(caseCount: number) {
  return new Pipeline<BenchContext>([
    (ctx) => {
      for (let i = 0; i < caseCount; i++) {
        ctx.total += i + 1
      }
      return ctx
    },
  ])
}

async function benchLegacy(caseCount: number) {
  const pipeline = makeSharedContextMultiWaySwitch(caseCount)

  return measureStats(async () => {
    __setCompiledPipelineEnabledForTests(false)
    try {
      await pipeline.execute({ total: 0 })
    } finally {
      __setCompiledPipelineEnabledForTests(undefined)
    }
  }, 4000, {
    samples: 5,
    warmup: 300,
  })
}

async function benchCompiled(caseCount: number) {
  const pipeline = makeSharedContextMultiWaySwitch(caseCount)
  const plan = compilePipelinePlan(pipeline as any)

  return measureStats(async () => {
    await executePlanPromise(plan, { total: 0 })
  }, 4000, {
    samples: 5,
    warmup: 300,
  })
}

async function benchDirect(caseCount: number) {
  const pipeline = makeDirectControl(caseCount)
  const plan = compilePipelinePlan(pipeline as any)

  return measureStats(async () => {
    await executePlanPromise(plan, { total: 0 })
  }, 4000, {
    samples: 5,
    warmup: 300,
  })
}

console.log('\n=== MultiWaySwitch benchmark ===')
console.log('\n── Shared-context static sync cases ──')
console.log('  Note: isolates MultiWaySwitch case fanout/runner overhead without split/combine warnings.')
console.log('  Control: direct = one function performing the same N increments inline.')

for (const caseCount of CASE_COUNTS) {
  const legacy = await benchLegacy(caseCount)
  const compiled = await benchCompiled(caseCount)
  const direct = await benchDirect(caseCount)
  const compiledGap = ((compiled.median - direct.median) / direct.median) * 100

  console.log(`\n  ${caseCount} cases`)
  console.log(`    legacy   ${formatStats(legacy)} µs`)
  console.log(`    compiled ${formatStats(compiled)} µs`)
  console.log(`    direct   ${formatStats(direct)} µs`)
  console.log(`    compiled vs direct ${compiledGap >= 0 ? '+' : ''}${compiledGap.toFixed(1)}%`)

  if (caseCount >= 10) {
    console.log(`    compiled runs ${formatRuns(compiled)}`)
    console.log(`    direct runs   ${formatRuns(direct)}`)
  }
}

console.log('\n=== done ===')
