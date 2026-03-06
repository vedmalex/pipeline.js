/**
 * Memory benchmark for pipeline.js
 *
 * Measures heap growth under sustained load:
 * 1. Stage.execute — many short-lived contexts
 * 2. allContexts registry — does GC actually reclaim entries?
 * 3. Pipeline of N stages — per-run allocation cost
 */

import { Stage } from '../src/stage'
import { Pipeline } from '../src/pipeline'
import { Context } from '../src/context'

const BATCH = 10_000

function heapMB(): number {
  return process.memoryUsage().heapUsed / 1024 / 1024
}

function gcAndMeasure(): number {
  // Bun exposes gc() globally
  if (typeof (globalThis as any).gc === 'function') {
    (globalThis as any).gc()
  }
  return heapMB()
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

console.log('\n=== pipeline.js memory benchmark ===\n')

// ---------------------------------------------------------------------------
// 1. Context registry leak test
//    Create N contexts, drop all references, force GC, check allContexts size
// ---------------------------------------------------------------------------
console.log('── allContexts WeakRef leak test ──')

{
  const before = gcAndMeasure()
  let registrySize = 0

  // Create 50k contexts and immediately drop them
  for (let i = 0; i < 50_000; i++) {
    Context.ensure({ n: i })
  }

  const afterCreate = heapMB()

  // Access registry size before GC
  const anyCtx = Context.ensure({ probe: true }) as any
  const beforeGC = Object.keys(anyCtx.allContexts).length
  
  // Force GC and wait for FinalizationRegistry callbacks
  gcAndMeasure()
  await sleep(100) // give FinalizationRegistry time to fire
  gcAndMeasure()
  await sleep(100)

  const afterGC = Object.keys(anyCtx.allContexts).length
  const afterGCMem = gcAndMeasure()

  console.log(`  Heap before creating contexts:  ${before.toFixed(1)} MB`)
  console.log(`  Heap after 50k contexts:        ${afterCreate.toFixed(1)} MB  (+${(afterCreate - before).toFixed(1)} MB)`)
  console.log(`  allContexts entries before GC:  ${beforeGC}`)
  console.log(`  allContexts entries after GC:   ${afterGC}`)
  console.log(`  Heap after GC:                  ${afterGCMem.toFixed(1)} MB  (+${(afterGCMem - before).toFixed(1)} MB vs baseline)`)
  console.log(`  Registry leak: ${afterGC > 10 ? '⚠ entries remain (FinalizationRegistry is async)' : '✓ cleaned up'}`)
}

// ---------------------------------------------------------------------------
// 2. Stage.execute heap growth under sustained load
//    Run N batches, measure heap growth between batches — should be flat
// ---------------------------------------------------------------------------
console.log('\n── Stage.execute heap growth (sustained load) ──')

{
  const stage = new Stage<{ n: number }>({ run: (ctx) => { ctx.n++ } })

  gcAndMeasure()
  await sleep(50)

  const baseline = gcAndMeasure()
  const samples: number[] = []

  for (let batch = 0; batch < 5; batch++) {
    for (let i = 0; i < BATCH; i++) {
      await stage.execute({ n: 0 })
    }
    gcAndMeasure()
    await sleep(20)
    samples.push(gcAndMeasure())
  }

  const min = Math.min(...samples)
  const max = Math.max(...samples)
  const drift = max - baseline

  console.log(`  Baseline heap:   ${baseline.toFixed(2)} MB`)
  samples.forEach((s, i) =>
    console.log(`  After batch ${i + 1} (${((i+1)*BATCH).toLocaleString()} ops):  ${s.toFixed(2)} MB`)
  )
  console.log(`  Max heap drift:  ${drift.toFixed(2)} MB  ${drift < 2 ? '✓ stable' : '⚠ growing'}`)
}

// ---------------------------------------------------------------------------
// 3. Pipeline heap growth
// ---------------------------------------------------------------------------
console.log('\n── Pipeline(10 stages) heap growth ──')

{
  const pipe = new Pipeline<{ n: number }>()
  for (let i = 0; i < 10; i++) pipe.addStage((ctx) => { ctx.n++ })

  gcAndMeasure()
  await sleep(50)

  const baseline = gcAndMeasure()
  const samples: number[] = []

  for (let batch = 0; batch < 5; batch++) {
    for (let i = 0; i < BATCH; i++) {
      await pipe.execute({ n: 0 })
    }
    gcAndMeasure()
    await sleep(20)
    samples.push(gcAndMeasure())
  }

  const min = Math.min(...samples)
  const max = Math.max(...samples)
  const drift = max - baseline

  console.log(`  Baseline heap:   ${baseline.toFixed(2)} MB`)
  samples.forEach((s, i) =>
    console.log(`  After batch ${i + 1} (${((i+1)*BATCH).toLocaleString()} ops):  ${s.toFixed(2)} MB`)
  )
  console.log(`  Max heap drift:  ${drift.toFixed(2)} MB  ${drift < 5 ? '✓ stable' : '⚠ growing'}`)
}

// ---------------------------------------------------------------------------
// 4. Bytes per Stage.execute call (allocation rate)
// ---------------------------------------------------------------------------
console.log('\n── Allocation rate per Stage.execute call ──')

{
  const stage = new Stage<{ n: number }>({ run: (ctx) => { ctx.n++ } })

  gcAndMeasure()
  await sleep(50)
  const before = gcAndMeasure()

  const N = 100_000
  for (let i = 0; i < N; i++) {
    await stage.execute({ n: 0 })
  }

  const after = heapMB()
  const bytesPerCall = ((after - before) * 1024 * 1024) / N

  console.log(`  Heap before: ${before.toFixed(2)} MB`)
  console.log(`  Heap after ${N.toLocaleString()} calls: ${after.toFixed(2)} MB`)
  console.log(`  Net growth: ${(after - before).toFixed(2)} MB`)
  console.log(`  ~${bytesPerCall.toFixed(0)} bytes allocated per call (before GC)`)
}

console.log('\n=== done ===\n')
