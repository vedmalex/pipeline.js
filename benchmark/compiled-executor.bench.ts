import { compilePipelinePlan } from '../src/compiled/compiler'
import { executeCompiledPlan } from '../src/compiled/executor'
import { IfElse } from '../src/ifelse'
import { MultiWaySwitch } from '../src/multiwayswitch'
import {
  __setCompiledPipelineEnabledForTests,
  Pipeline,
} from '../src/pipeline'
import { Sequential } from '../src/sequential'
import { Timeout } from '../src/timeout'
import { Wrap } from '../src/wrap'
import { formatRuns, formatStats, measureStats } from './stats'

const COUNTS = [1, 2, 5, 10, 20, 50, 100]

type BenchContext = { n: number }
type NestedParentContext = { items: number[]; total: number }
type NestedChildContext = { n: number }

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

function makeSequentialNestedSubplanPipeline(innerStages: number = 3) {
  const child = new Pipeline<NestedChildContext>()

  for (let i = 0; i < innerStages; i++) {
    child.addStage((ctx) => {
      ctx.n += 1
    })
  }

  return new Pipeline<NestedParentContext>([
    new Sequential<NestedParentContext, NestedChildContext>({
      split: (ctx) => ctx.items.map(() => ({ n: 0 })),
      stage: child as any,
      combine: (ctx, children) => {
        ctx.total = children.reduce((sum, childCtx) => sum + childCtx.n, 0)
        return ctx
      },
    }) as any,
  ])
}

function makeSequentialDirectChildPipeline(innerStages: number = 3) {
  return new Pipeline<NestedParentContext>([
    new Sequential<NestedParentContext, NestedChildContext>({
      split: (ctx) => ctx.items.map(() => ({ n: 0 })),
      stage: (ctx) => {
        for (let i = 0; i < innerStages; i++) {
          ctx.n += 1
        }
      },
      combine: (ctx, children) => {
        ctx.total = children.reduce((sum, childCtx) => sum + childCtx.n, 0)
        return ctx
      },
    }) as any,
  ])
}

function runComplexChildLogic(ctx: NestedChildContext) {
  if (ctx.n % 2 === 0) {
    ctx.n += 1
  } else {
    ctx.n += 2
  }

  ctx.n += 10
  return ctx
}

function makeSequentialComplexNestedSubplanPipeline() {
  const child = new Pipeline<NestedChildContext>([
    new IfElse<NestedChildContext>({
      condition: (ctx, done) => {
        done(undefined, ctx.n % 2 === 0)
      },
      success: (ctx) => {
        ctx.n += 1
        return ctx
      },
      failed: (ctx) => {
        ctx.n += 2
        return ctx
      },
    }) as any,
    (ctx) => {
      ctx.n += 10
      return ctx
    },
  ])

  return new Pipeline<NestedParentContext>([
    new Sequential<NestedParentContext, NestedChildContext>({
      split: (ctx) => ctx.items.map((value) => ({ n: value })),
      stage: child as any,
      combine: (ctx, children) => {
        ctx.total = children.reduce((sum, childCtx) => sum + childCtx.n, 0)
        return ctx
      },
    }) as any,
  ])
}

function makeSequentialInlineComplexNestedSubplanPipeline() {
  const child = new Pipeline<NestedChildContext>([
    new IfElse<NestedChildContext>({
      condition: (ctx) => ctx.n % 2 === 0,
      success: (ctx) => {
        ctx.n += 1
        return ctx
      },
      failed: (ctx) => {
        ctx.n += 2
        return ctx
      },
    }) as any,
    (ctx) => {
      ctx.n += 10
      return ctx
    },
  ])

  return new Pipeline<NestedParentContext>([
    new Sequential<NestedParentContext, NestedChildContext>({
      split: (ctx) => ctx.items.map((value) => ({ n: value })),
      stage: child as any,
      combine: (ctx, children) => {
        ctx.total = children.reduce((sum, childCtx) => sum + childCtx.n, 0)
        return ctx
      },
    }) as any,
  ])
}

function makeSequentialComplexDirectChildPipeline() {
  return new Pipeline<NestedParentContext>([
    new Sequential<NestedParentContext, NestedChildContext>({
      split: (ctx) => ctx.items.map((value) => ({ n: value })),
      stage: (ctx) => runComplexChildLogic(ctx),
      combine: (ctx, children) => {
        ctx.total = children.reduce((sum, childCtx) => sum + childCtx.n, 0)
        return ctx
      },
    }) as any,
  ])
}

function makeSequentialMWSSingleDynamicPipeline() {
  const child = new MultiWaySwitch<NestedChildContext, { value: number }>({
    cases: [
      {
        evaluate: (ctx) => ctx.n >= 0,
        split: (ctx) => ({ value: ctx.n + 1 }),
        stage: async (ctx) => ({ value: ctx.value + 1 }),
      },
      {
        evaluate: () => false,
        stage: (ctx) => ({ value: ctx.n + 100 }),
      },
    ],
    combine: (ctx, retCtx) => {
      ctx.n = retCtx.value
      return ctx
    },
  }) as any

  return new Pipeline<NestedParentContext>([
    new Sequential<NestedParentContext, NestedChildContext>({
      split: (ctx) => ctx.items.map((value) => ({ n: value })),
      stage: child as any,
      combine: (ctx, children) => {
        ctx.total = children.reduce((sum, childCtx) => sum + childCtx.n, 0)
        return ctx
      },
    }) as any,
  ])
}

function makeSequentialMWSDirectChildPipeline() {
  return new Pipeline<NestedParentContext>([
    new Sequential<NestedParentContext, NestedChildContext>({
      split: (ctx) => ctx.items.map((value) => ({ n: value })),
      stage: async (ctx) => {
        ctx.n += 2
        return ctx
      },
      combine: (ctx, children) => {
        ctx.total = children.reduce((sum, childCtx) => sum + childCtx.n, 0)
        return ctx
      },
    }) as any,
  ])
}

function makeSequentialMWSMultiSharedPipeline() {
  const child = new MultiWaySwitch<NestedChildContext, NestedChildContext>({
    cases: [
      {
        evaluate: true,
        stage: async (ctx) => {
          ctx.n += 1
          return ctx
        },
      },
      {
        evaluate: true,
        stage: async (ctx) => {
          ctx.n += 2
          return ctx
        },
      },
    ],
  }) as any

  return new Pipeline<NestedParentContext>([
    new Sequential<NestedParentContext, NestedChildContext>({
      split: (ctx) => ctx.items.map((value) => ({ n: value })),
      stage: child as any,
      combine: (ctx, children) => {
        ctx.total = children.reduce((sum, childCtx) => sum + childCtx.n, 0)
        return ctx
      },
    }) as any,
  ])
}

function makeSequentialMWSMultiSharedDirectChildPipeline() {
  return new Pipeline<NestedParentContext>([
    new Sequential<NestedParentContext, NestedChildContext>({
      split: (ctx) => ctx.items.map((value) => ({ n: value })),
      stage: async (ctx) => {
        ctx.n += 1
        ctx.n += 2
        return ctx
      },
      combine: (ctx, children) => {
        ctx.total = children.reduce((sum, childCtx) => sum + childCtx.n, 0)
        return ctx
      },
    }) as any,
  ])
}

function makeSequentialMWSMultiCombinePipeline() {
  const child = new MultiWaySwitch<NestedChildContext, { delta: number }>({
    cases: [
      {
        evaluate: true,
        split: (ctx) => ({ delta: ctx.n + 1 }),
        stage: async (ctx) => ({ delta: ctx.delta + 1 }),
      },
      {
        evaluate: true,
        split: (ctx) => ({ delta: ctx.n + 10 }),
        stage: async (ctx) => ({ delta: ctx.delta + 2 }),
      },
    ],
    combine: (ctx, retCtx) => {
      ctx.n += retCtx.delta
      return ctx
    },
  }) as any

  return new Pipeline<NestedParentContext>([
    new Sequential<NestedParentContext, NestedChildContext>({
      split: (ctx) => ctx.items.map((value) => ({ n: value })),
      stage: child as any,
      combine: (ctx, children) => {
        ctx.total = children.reduce((sum, childCtx) => sum + childCtx.n, 0)
        return ctx
      },
    }) as any,
  ])
}

function makeSequentialMWSMultiCombineDirectChildPipeline() {
  return new Pipeline<NestedParentContext>([
    new Sequential<NestedParentContext, NestedChildContext>({
      split: (ctx) => ctx.items.map((value) => ({ n: value })),
      stage: async (ctx) => {
        const base = ctx.n
        ctx.n += (base + 2) + (base + 12)
        return ctx
      },
      combine: (ctx, children) => {
        ctx.total = children.reduce((sum, childCtx) => sum + childCtx.n, 0)
        return ctx
      },
    }) as any,
  ])
}

/**
 * Honest control: same dispatch volume as the nested-subplan case (3 separate function
 * invocations per item) but without a subplan boundary. This isolates subplan boundary
 * cost from inner stage dispatch count.
 */
function makeSequentialMultiStepChildPipeline(innerStages: number = 3) {
  // Build an array of separate step functions to call per-item
  const steps: Array<(ctx: NestedChildContext) => void> = []
  for (let i = 0; i < innerStages; i++) {
    steps.push((ctx) => { ctx.n += 1 })
  }

  return new Pipeline<NestedParentContext>([
    new Sequential<NestedParentContext, NestedChildContext>({
      split: (ctx) => ctx.items.map(() => ({ n: 0 })),
      stage: (ctx) => {
        // Dispatch N separate function calls — same call count as the nested Pipeline(N)
        // but without subplan boundary overhead
        for (const step of steps) {
          step(ctx)
        }
      },
      combine: (ctx, children) => {
        ctx.total = children.reduce((sum, childCtx) => sum + childCtx.n, 0)
        return ctx
      },
    }) as any,
  ])
}

function makeNestedParentContext(count: number): NestedParentContext {
  return {
    items: Array.from({ length: count }, (_, index) => index),
    total: 0,
  }
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

function iterationsFor(count: number) {
  if (count <= 10) return 20_000
  if (count <= 50) return 5_000
  return 2_000
}

async function benchRuntime(count: number, compiled: boolean) {
  __setCompiledPipelineEnabledForTests(compiled)
  const pipe = makePipeline(count)
  return measureStats(async () => {
    await pipe.execute({ n: 0 })
  }, iterationsFor(count), { samples: 5, warmup: 200 })
}

async function benchHybridRuntime(count: number, compiled: boolean) {
  __setCompiledPipelineEnabledForTests(compiled)
  const pipe = makeHybridPipeline(count)
  return measureStats(async () => {
    await pipe.execute({ n: 0 })
  }, iterationsFor(count), { samples: 5, warmup: 200 })
}

async function benchDirectCompiled(count: number) {
  const pipe = makePipeline(count)
  const plan = compilePipelinePlan(pipe as any)
  return measureStats(async () => {
    await new Promise<void>((resolve, reject) => {
      executeCompiledPlan(plan, undefined, { n: 0 }, (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }, iterationsFor(count), { samples: 5, warmup: 200 })
}

async function benchDirectHybridCompiled(count: number) {
  const pipe = makeHybridPipeline(count)
  const plan = compilePipelinePlan(pipe as any)
  return measureStats(async () => {
    await new Promise<void>((resolve, reject) => {
      executeCompiledPlan(plan, undefined, { n: 0 }, (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }, iterationsFor(count), { samples: 5, warmup: 200 })
}

async function benchNestedRuntime(count: number, compiled: boolean) {
  __setCompiledPipelineEnabledForTests(compiled)
  const pipe = makeNestedPipeline(count)
  return measureStats(async () => {
    await pipe.execute({ n: 0 })
  }, iterationsFor(count), { samples: 5, warmup: 200 })
}

async function benchSubplanRuntime(
  count: number,
  compiled: boolean,
  variant: 'nested-subplan' | 'direct-child' | 'complex-subplan' | 'inline-complex-subplan' | 'complex-direct-child',
) {
  __setCompiledPipelineEnabledForTests(compiled)
  const pipe = variant === 'nested-subplan'
    ? makeSequentialNestedSubplanPipeline()
    : variant === 'direct-child'
      ? makeSequentialDirectChildPipeline()
      : variant === 'complex-subplan'
        ? makeSequentialComplexNestedSubplanPipeline()
        : variant === 'inline-complex-subplan'
          ? makeSequentialInlineComplexNestedSubplanPipeline()
        : makeSequentialComplexDirectChildPipeline()

  return measureStats(async () => {
    await pipe.execute(makeNestedParentContext(count))
  }, iterationsFor(count), { samples: 5, warmup: 200 })
}

async function benchDirectSubplanCompiled(
  count: number,
  variant: 'nested-subplan' | 'direct-child' | 'complex-subplan' | 'inline-complex-subplan' | 'complex-direct-child',
) {
  const pipe = variant === 'nested-subplan'
    ? makeSequentialNestedSubplanPipeline()
    : variant === 'direct-child'
      ? makeSequentialDirectChildPipeline()
      : variant === 'complex-subplan'
        ? makeSequentialComplexNestedSubplanPipeline()
        : variant === 'inline-complex-subplan'
          ? makeSequentialInlineComplexNestedSubplanPipeline()
        : makeSequentialComplexDirectChildPipeline()
  const plan = compilePipelinePlan(pipe as any)

  return measureStats(async () => {
    await new Promise<void>((resolve, reject) => {
      executeCompiledPlan(plan, undefined, makeNestedParentContext(count), (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }, iterationsFor(count), { samples: 5, warmup: 200 })
}

async function benchMWSRuntime(
  count: number,
  compiled: boolean,
  variant: 'mws-single-dynamic' | 'mws-direct-child' | 'mws-multi-shared' | 'mws-multi-shared-direct-child' | 'mws-multi-combine' | 'mws-multi-combine-direct-child',
) {
  __setCompiledPipelineEnabledForTests(compiled)
  const pipe = variant === 'mws-single-dynamic'
    ? makeSequentialMWSSingleDynamicPipeline()
    : variant === 'mws-direct-child'
      ? makeSequentialMWSDirectChildPipeline()
      : variant === 'mws-multi-shared'
        ? makeSequentialMWSMultiSharedPipeline()
        : variant === 'mws-multi-shared-direct-child'
          ? makeSequentialMWSMultiSharedDirectChildPipeline()
          : variant === 'mws-multi-combine'
            ? makeSequentialMWSMultiCombinePipeline()
            : makeSequentialMWSMultiCombineDirectChildPipeline()

  return measureStats(async () => {
    await pipe.execute(makeNestedParentContext(count))
  }, iterationsFor(count), { samples: 5, warmup: 200 })
}

async function benchDirectMWSCompiled(
  count: number,
  variant: 'mws-single-dynamic' | 'mws-direct-child' | 'mws-multi-shared' | 'mws-multi-shared-direct-child' | 'mws-multi-combine' | 'mws-multi-combine-direct-child',
) {
  const pipe = variant === 'mws-single-dynamic'
    ? makeSequentialMWSSingleDynamicPipeline()
    : variant === 'mws-direct-child'
      ? makeSequentialMWSDirectChildPipeline()
      : variant === 'mws-multi-shared'
        ? makeSequentialMWSMultiSharedPipeline()
        : variant === 'mws-multi-shared-direct-child'
          ? makeSequentialMWSMultiSharedDirectChildPipeline()
          : variant === 'mws-multi-combine'
            ? makeSequentialMWSMultiCombinePipeline()
            : makeSequentialMWSMultiCombineDirectChildPipeline()
  const plan = compilePipelinePlan(pipe as any)

  return measureStats(async () => {
    await new Promise<void>((resolve, reject) => {
      executeCompiledPlan(plan, undefined, makeNestedParentContext(count), (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }, iterationsFor(count), { samples: 5, warmup: 200 })
}

async function benchMultiStepControlRuntime(
  count: number,
  compiled: boolean,
) {
  __setCompiledPipelineEnabledForTests(compiled)
  const pipe = makeSequentialMultiStepChildPipeline()

  return measureStats(async () => {
    await pipe.execute(makeNestedParentContext(count))
  }, iterationsFor(count), { samples: 5, warmup: 200 })
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

  legacyPoints.push({ x: count, y: legacy.median })
  runtimeCompiledPoints.push({ x: count, y: runtimeCompiled.median })
  directCompiledPoints.push({ x: count, y: directCompiled.median })

  console.log(
    `${String(count).padStart(3)} stages | legacy ${formatStats(legacy)} µs | runtime-compiled ${formatStats(runtimeCompiled)} µs | direct-compiled ${formatStats(directCompiled)} µs`,
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

  hybridLegacyPoints.push({ x: count, y: legacy.median })
  hybridRuntimeCompiledPoints.push({ x: count, y: runtimeCompiled.median })
  hybridDirectCompiledPoints.push({ x: count, y: directCompiled.median })

  console.log(
    `${String(count).padStart(3)} hybrid stages | legacy ${formatStats(legacy)} µs | runtime-compiled ${formatStats(runtimeCompiled)} µs | direct-compiled ${formatStats(directCompiled)} µs`,
  )
}

const hybridLegacyFit = linearFit(hybridLegacyPoints.filter(point => point.x >= 10))
const hybridRuntimeCompiledFit = linearFit(hybridRuntimeCompiledPoints.filter(point => point.x >= 10))
const hybridDirectCompiledFit = linearFit(hybridDirectCompiledPoints.filter(point => point.x >= 10))

console.log('\n── Flat Pipeline linear fit (10+ stages, compiled-hybrid) ──')
console.log(`  legacy            total ≈ ${hybridLegacyFit.intercept.toFixed(2)} + ${hybridLegacyFit.slope.toFixed(3)}*N µs`)
console.log(`  runtime-compiled  total ≈ ${hybridRuntimeCompiledFit.intercept.toFixed(2)} + ${hybridRuntimeCompiledFit.slope.toFixed(3)}*N µs`)
console.log(`  direct-compiled   total ≈ ${hybridDirectCompiledFit.intercept.toFixed(2)} + ${hybridDirectCompiledFit.slope.toFixed(3)}*N µs`)

console.log('\n── Nested Pipeline flattening spot-check ──')
for (const count of [10, 50, 100]) {
  const legacy = await benchNestedRuntime(count, false)
  const runtimeCompiled = await benchNestedRuntime(count, true)

  console.log(
    `${String(count).padStart(3)} nested stages | legacy ${formatStats(legacy)} µs | runtime-compiled ${formatStats(runtimeCompiled)} µs`,
  )
}

console.log('\n── Nested compiled child lane (Sequential child = trivial nested Pipeline) ──')
console.log('  Note: this lane exercises the fused child fast-path when the nested child plan is a simple static RUN_STAGE_FN sequence.')
console.log('  Controls:')
console.log('    direct-child     = single fn doing N increments inline (lower-bound, 1 dispatch)')
console.log('    multi-step-ctrl  = single fn calling N separate fns (honest control, N dispatches, no subplan)')

for (const count of [1, 5, 10, 20, 50]) {
  const legacyNested = await benchSubplanRuntime(count, false, 'nested-subplan')
  const compiledNested = await benchSubplanRuntime(count, true, 'nested-subplan')
  const compiledDirectChild = await benchSubplanRuntime(count, true, 'direct-child')
  const compiledMultiStep = await benchMultiStepControlRuntime(count, true)
  const directNested = await benchDirectSubplanCompiled(count, 'nested-subplan')
  const nestedVsDirectGap = ((compiledNested.median - compiledDirectChild.median) / compiledDirectChild.median) * 100
  const nestedVsMultiStepGap = ((compiledNested.median - compiledMultiStep.median) / compiledMultiStep.median) * 100

  console.log(`\n  ${String(count).padStart(3)} items`)
  console.log(`    legacy nested-subplan     ${formatStats(legacyNested)} µs`)
  console.log(`    compiled nested-subplan   ${formatStats(compiledNested)} µs`)
  console.log(`    compiled direct-child     ${formatStats(compiledDirectChild)} µs`)
  console.log(`    compiled multi-step-ctrl  ${formatStats(compiledMultiStep)} µs`)
  console.log(`    direct nested-subplan     ${formatStats(directNested)} µs`)
  console.log(`    nested vs direct-child    ${nestedVsDirectGap >= 0 ? '+' : ''}${nestedVsDirectGap.toFixed(1)}%`)
  console.log(`    nested vs multi-step-ctrl ${nestedVsMultiStepGap >= 0 ? '+' : ''}${nestedVsMultiStepGap.toFixed(1)}% (honest gap)`)

  if (count === 20) {
    console.log(`    nested compiled runs      ${formatRuns(compiledNested)}`)
    console.log(`    multi-step-ctrl runs      ${formatRuns(compiledMultiStep)}`)
    console.log(`    direct-child runs         ${formatRuns(compiledDirectChild)}`)
  }
}

console.log('\n── Nested compiled subplan lane (Sequential child = non-fusable nested Pipeline) ──')
console.log('  Note: this lane exercises the real subplan target path because the child contains control-flow and cannot be fused into a flat stage-fn sequence.')
console.log('  Control:')
console.log('    complex-direct-child = single fn with equivalent branch logic, no subplan boundary')

for (const count of [1, 5, 10, 20, 50]) {
  const legacyComplex = await benchSubplanRuntime(count, false, 'complex-subplan')
  const compiledComplex = await benchSubplanRuntime(count, true, 'complex-subplan')
  const compiledComplexDirect = await benchSubplanRuntime(count, true, 'complex-direct-child')
  const directComplex = await benchDirectSubplanCompiled(count, 'complex-subplan')
  const complexGap = ((compiledComplex.median - compiledComplexDirect.median) / compiledComplexDirect.median) * 100

  console.log(`\n  ${String(count).padStart(3)} items`)
  console.log(`    legacy complex-subplan     ${formatStats(legacyComplex)} µs`)
  console.log(`    compiled complex-subplan   ${formatStats(compiledComplex)} µs`)
  console.log(`    compiled direct-child      ${formatStats(compiledComplexDirect)} µs`)
  console.log(`    direct complex-subplan     ${formatStats(directComplex)} µs`)
  console.log(`    complex vs direct-child    ${complexGap >= 0 ? '+' : ''}${complexGap.toFixed(1)}%`)

  if (count === 20) {
    console.log(`    complex compiled runs      ${formatRuns(compiledComplex)}`)
    console.log(`    direct-child runs         ${formatRuns(compiledComplexDirect)}`)
  }
}

console.log('\n── Frame-free branchy child lane (Sequential child = nested Pipeline with jumps, no frames) ──')
console.log('  Note: this lane isolates the new inline control-flow runner path: the child is still a nested Pipeline, but its compiled plan contains only jumps, predicates, stage-fn ops, and return.')
console.log('  Control:')
console.log('    complex-direct-child = single fn with equivalent branch logic, no nested plan boundary')

for (const count of [1, 5, 10, 20, 50]) {
  const legacyInlineComplex = await benchSubplanRuntime(count, false, 'inline-complex-subplan')
  const compiledInlineComplex = await benchSubplanRuntime(count, true, 'inline-complex-subplan')
  const compiledComplexDirect = await benchSubplanRuntime(count, true, 'complex-direct-child')
  const directInlineComplex = await benchDirectSubplanCompiled(count, 'inline-complex-subplan')
  const inlineComplexGap = ((compiledInlineComplex.median - compiledComplexDirect.median) / compiledComplexDirect.median) * 100

  console.log(`\n  ${String(count).padStart(3)} items`)
  console.log(`    legacy inline-branchy      ${formatStats(legacyInlineComplex)} µs`)
  console.log(`    compiled inline-branchy    ${formatStats(compiledInlineComplex)} µs`)
  console.log(`    compiled direct-child      ${formatStats(compiledComplexDirect)} µs`)
  console.log(`    direct inline-branchy      ${formatStats(directInlineComplex)} µs`)
  console.log(`    inline vs direct-child     ${inlineComplexGap >= 0 ? '+' : ''}${inlineComplexGap.toFixed(1)}%`)

  if (count === 20) {
    console.log(`    inline compiled runs       ${formatRuns(compiledInlineComplex)}`)
    console.log(`    direct-child runs         ${formatRuns(compiledComplexDirect)}`)
  }
}

console.log('\n── MultiWaySwitch single-case lane (runner-backed primitive) ──')
console.log('  Note: this lane isolates the MWS orchestration cost when exactly one dynamic case matches.')
console.log('  Control:')
console.log('    mws-direct-child = equivalent direct child logic without MultiWaySwitch runner')

for (const count of [1, 5, 10, 20, 50]) {
  const legacyMWS = await benchMWSRuntime(count, false, 'mws-single-dynamic')
  const compiledMWS = await benchMWSRuntime(count, true, 'mws-single-dynamic')
  const compiledDirectChild = await benchMWSRuntime(count, true, 'mws-direct-child')
  const directMWS = await benchDirectMWSCompiled(count, 'mws-single-dynamic')
  const mwsGap = ((compiledMWS.median - compiledDirectChild.median) / compiledDirectChild.median) * 100

  console.log(`\n  ${String(count).padStart(3)} items`)
  console.log(`    legacy mws-single-case     ${formatStats(legacyMWS)} µs`)
  console.log(`    compiled mws-single-case   ${formatStats(compiledMWS)} µs`)
  console.log(`    compiled direct-child      ${formatStats(compiledDirectChild)} µs`)
  console.log(`    direct mws-single-case     ${formatStats(directMWS)} µs`)
  console.log(`    mws vs direct-child        ${mwsGap >= 0 ? '+' : ''}${mwsGap.toFixed(1)}%`)

  if (count === 20) {
    console.log(`    mws compiled runs          ${formatRuns(compiledMWS)}`)
    console.log(`    direct-child runs         ${formatRuns(compiledDirectChild)}`)
  }
}

console.log('\n── MultiWaySwitch shared-context multi-case lane (runner-backed primitive) ──')
console.log('  Note: this lane isolates generic multi-case orchestration without split/combine semantics.')
console.log('  Control:')
console.log('    mws-multi-direct-child = equivalent direct child logic without MultiWaySwitch orchestration')

for (const count of [1, 5, 10, 20, 50]) {
  const legacyMWS = await benchMWSRuntime(count, false, 'mws-multi-shared')
  const compiledMWS = await benchMWSRuntime(count, true, 'mws-multi-shared')
  const compiledDirectChild = await benchMWSRuntime(count, true, 'mws-multi-shared-direct-child')
  const directMWS = await benchDirectMWSCompiled(count, 'mws-multi-shared')
  const mwsGap = ((compiledMWS.median - compiledDirectChild.median) / compiledDirectChild.median) * 100

  console.log(`\n  ${String(count).padStart(3)} items`)
  console.log(`    legacy mws-multi-shared   ${formatStats(legacyMWS)} µs`)
  console.log(`    compiled mws-multi-shared ${formatStats(compiledMWS)} µs`)
  console.log(`    compiled direct-child     ${formatStats(compiledDirectChild)} µs`)
  console.log(`    direct mws-multi-shared   ${formatStats(directMWS)} µs`)
  console.log(`    mws vs direct-child       ${mwsGap >= 0 ? '+' : ''}${mwsGap.toFixed(1)}%`)

  if (count === 20) {
    console.log(`    mws compiled runs         ${formatRuns(compiledMWS)}`)
    console.log(`    direct-child runs         ${formatRuns(compiledDirectChild)}`)
  }
}

console.log('\n── MultiWaySwitch split/combine multi-case lane (runner-backed primitive) ──')
console.log('  Note: this lane isolates the remaining multi-case path with per-case split and stage-level combine.')
console.log('  Control:')
console.log('    mws-multi-combine-direct-child = equivalent direct child logic without MultiWaySwitch orchestration')

for (const count of [1, 5, 10, 20, 50]) {
  const legacyMWS = await benchMWSRuntime(count, false, 'mws-multi-combine')
  const compiledMWS = await benchMWSRuntime(count, true, 'mws-multi-combine')
  const compiledDirectChild = await benchMWSRuntime(count, true, 'mws-multi-combine-direct-child')
  const directMWS = await benchDirectMWSCompiled(count, 'mws-multi-combine')
  const mwsGap = ((compiledMWS.median - compiledDirectChild.median) / compiledDirectChild.median) * 100

  console.log(`\n  ${String(count).padStart(3)} items`)
  console.log(`    legacy mws-multi-combine   ${formatStats(legacyMWS)} µs`)
  console.log(`    compiled mws-multi-combine ${formatStats(compiledMWS)} µs`)
  console.log(`    compiled direct-child      ${formatStats(compiledDirectChild)} µs`)
  console.log(`    direct mws-multi-combine   ${formatStats(directMWS)} µs`)
  console.log(`    mws vs direct-child        ${mwsGap >= 0 ? '+' : ''}${mwsGap.toFixed(1)}%`)

  if (count === 20) {
    console.log(`    mws compiled runs          ${formatRuns(compiledMWS)}`)
    console.log(`    direct-child runs         ${formatRuns(compiledDirectChild)}`)
  }
}

__setCompiledPipelineEnabledForTests(undefined)

console.log('\n=== done ===\n')
