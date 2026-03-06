/**
 * Hot path micro-benchmark for pipeline.js
 *
 * Measures per-call overhead for:
 * 1. Stage.execute — single sync stage (baseline)
 * 2. Pipeline of N stages (1, 5, 10)
 * 3. Stage with callback vs Promise API
 * 4. Context.ensure overhead
 * 5. Raw Promise overhead (lower bound)
 */

import { Stage } from '../src/stage'
import { Pipeline } from '../src/pipeline'
import { Context } from '../src/context'
import { DoWhile } from '../src/dowhile'
import { Sequential } from '../src/sequential'
import { RetryOnError } from '../src/retryonerror'

const ITERATIONS = 10_000

async function bench(name: string, fn: () => Promise<void>) {
  // warmup
  for (let i = 0; i < 100; i++) await fn()

  const start = performance.now()
  for (let i = 0; i < ITERATIONS; i++) await fn()
  const elapsed = performance.now() - start

  const perOp = (elapsed / ITERATIONS) * 1000 // microseconds
  console.log(`  ${name.padEnd(45)} ${perOp.toFixed(2).padStart(8)} µs/op   ${(1_000_000 / perOp).toFixed(0).padStart(10)} ops/s`)
}

console.log('\n=== pipeline.js hot path benchmark ===')
console.log(`Iterations: ${ITERATIONS.toLocaleString()}\n`)

// ---------------------------------------------------------------------------
// 0. Lower bound: raw Promise
// ---------------------------------------------------------------------------
console.log('── Lower bounds ──')
await bench('raw Promise.withResolvers + resolve', async () => {
  const { promise, resolve } = Promise.withResolvers<void>()
  resolve()
  await promise
})

await bench('raw Promise.resolve()', async () => {
  await Promise.resolve()
})

// ---------------------------------------------------------------------------
// 1. Stage.execute — single sync stage, callback API (no Promise returned)
// ---------------------------------------------------------------------------
console.log('\n── Stage.execute ──')

const syncStage = new Stage<{ n: number }>({ run: (ctx) => { ctx.n++ } })
const ctx = { n: 0 }

await bench('Stage.execute (1-arg sync, Promise API)', async () => {
  await syncStage.execute({ n: 0 })
})

await bench('Stage.execute (callback API)', async () => {
  await new Promise<void>((resolve) => {
    syncStage.execute({ n: 0 }, () => resolve())
  })
})

// Stage with async run
const asyncStage = new Stage<{ n: number }>({ run: async (ctx) => { ctx.n++ } })

await bench('Stage.execute (async run, Promise API)', async () => {
  await asyncStage.execute({ n: 0 })
})

// Stage with 2-arg callback run (ctx, done)
const cbStage = new Stage<{ n: number }>({ run: (ctx, done) => { ctx.n++; done() } })

await bench('Stage.execute (run(ctx,done) callback, Promise API)', async () => {
  await cbStage.execute({ n: 0 })
})

// ---------------------------------------------------------------------------
// 2. Pipeline of N stages
// ---------------------------------------------------------------------------
console.log('\n── Pipeline.execute ──')

function makePipeline(n: number) {
  const p = new Pipeline<{ n: number }>()
  for (let i = 0; i < n; i++) {
    p.addStage((ctx) => { ctx.n++ })
  }
  return p
}

const pipe1 = makePipeline(1)
const pipe5 = makePipeline(5)
const pipe10 = makePipeline(10)
const pipe50 = makePipeline(50)

await bench('Pipeline(1 stage).execute', async () => {
  await pipe1.execute({ n: 0 })
})

await bench('Pipeline(5 stages).execute', async () => {
  await pipe5.execute({ n: 0 })
})

await bench('Pipeline(10 stages).execute', async () => {
  await pipe10.execute({ n: 0 })
})

await bench('Pipeline(50 stages).execute', async () => {
  await pipe50.execute({ n: 0 })
})

// ---------------------------------------------------------------------------
// 3. Context overhead
// ---------------------------------------------------------------------------
console.log('\n── Context overhead ──')

await bench('Context.ensure (plain object, creates new)', async () => {
  Context.ensure({ n: 0 })
})

await bench('Context.ensure (already Context, no-op)', async () => {
  const c = Context.ensure({ n: 0 })
  Context.ensure(c as any)
})

const existingCtx = Context.ensure({ n: 0 })
await bench('Stage.execute (pre-built Context input)', async () => {
  await syncStage.execute(existingCtx as any)
})

// ---------------------------------------------------------------------------
// 4. Per-stage overhead: Pipeline vs Stage baseline
// ---------------------------------------------------------------------------
console.log('\n── Per-stage overhead analysis ──')

const stageMs = await (() => {
  let sum = 0
  let count = 0
  return {
    async measure() {
      const s = performance.now()
      await syncStage.execute({ n: 0 })
      sum += performance.now() - s
      count++
    },
    avg() { return (sum / count) * 1000 },
  }
})()

// measure isolated
for (let i = 0; i < 1000; i++) await stageMs.measure()
const singleStageUs = stageMs.avg()

const pipe10start = performance.now()
for (let i = 0; i < 1000; i++) await pipe10.execute({ n: 0 })
const pipe10us = ((performance.now() - pipe10start) / 1000) * 1000

console.log(`  Single Stage baseline:               ${singleStageUs.toFixed(2)} µs/op`)
console.log(`  Pipeline(10 stages):                 ${pipe10us.toFixed(2)} µs/op`)
console.log(`  Per-stage overhead inside Pipeline:  ${((pipe10us - singleStageUs) / 10).toFixed(2)} µs/stage`)

// ---------------------------------------------------------------------------
// 5. DoWhile / Sequential / RetryOnError
// ---------------------------------------------------------------------------
console.log('\n── DoWhile / Sequential / RetryOnError ──')

const doWhile5 = new DoWhile<{ n: number }, { n: number }>({
  stage: async (ctx: any) => { ctx.n++ },
  reachEnd: (_err: any, _ctx: any, i: number) => i >= 5,
})
await bench('DoWhile (5 iters, async stage)', async () => {
  await doWhile5.execute({ n: 0 })
})

const doWhile1 = new DoWhile<{ n: number }, { n: number }>({
  stage: async (ctx: any) => { ctx.n++ },
  reachEnd: (_err: any, _ctx: any, i: number) => i >= 1,
})
await bench('DoWhile (1 iter, async stage)', async () => {
  await doWhile1.execute({ n: 0 })
})

const seq3 = new Sequential<{ n: number }, { n: number }>({
  stage: async (ctx: any) => { ctx.n++ },
  split: (ctx: any) => [{ n: ctx.n }, { n: ctx.n }, { n: ctx.n }],
})
await bench('Sequential (3 children, async stage)', async () => {
  await seq3.execute({ n: 0 })
})

const seq1 = new Sequential<{ n: number }, { n: number }>({
  stage: async (ctx: any) => { ctx.n++ },
  split: (ctx: any) => [{ n: ctx.n }],
})
await bench('Sequential (1 child, async stage)', async () => {
  await seq1.execute({ n: 0 })
})

const retryOk = new RetryOnError<{ n: number }>({
  stage: async (ctx: any) => { ctx.n++ },
  retry: 3,
})
await bench('RetryOnError (no error, retry=3)', async () => {
  await retryOk.execute({ n: 0 })
})

let _attempt = 0
const retryFail1 = new RetryOnError<{ n: number }>({
  stage: async (_ctx: any) => {
    _attempt = (_attempt + 1) % 3
    if (_attempt !== 0) throw new Error('fail')
  },
  retry: 3,
})
await bench('RetryOnError (fails 2x then ok, retry=3)', async () => {
  _attempt = 0
  await retryFail1.execute({ n: 0 })
})

console.log('\n=== done ===\n')
