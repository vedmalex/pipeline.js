/**
 * Cluster A — Batch Schema Export
 *
 * Models the grainjs-prod schemaExport workload:
 * - Flat Pipeline with 8 stages (fn + Stage mix)
 * - Executed 1000+ times in a loop (batch processing)
 * - Stages are pure transforms (sync, no I/O)
 *
 * Success criterion: ≥15% improvement for 1000+ iteration runs
 * vs legacy execution.
 */
import { compilePipelinePlan } from '../src/compiled/compiler'
import { executeCompiledPlan } from '../src/compiled/executor'
import {
  __setCompiledPipelineEnabledForTests,
  Pipeline,
} from '../src/pipeline'
import { Stage } from '../src/stage'
import { formatStats, measureStats, scaleStats, type BenchStats } from './stats'

type SchemaContext = {
  tables: string[]
  processed: number
  crc: number
}

// --- Pipeline construction (mirrors real schemaExport pattern) ---

function makeSchemaExportPipeline() {
  const pipe = new Pipeline<SchemaContext>()

  // Stage 1: Init metadata
  pipe.addStage((ctx) => {
    ctx.processed = 0
    ctx.crc = 0
  })

  // Stage 2: Validate tables (Stage instance)
  pipe.addStage(new Stage<SchemaContext>({
    run: (_err, ctx, done) => {
      if (!ctx.tables || ctx.tables.length === 0) {
        done(new Error('no tables'))
      } else {
        done(undefined, ctx)
      }
    },
  }))

  // Stage 3-6: Process tables (fn stages, bulk of the work)
  for (let i = 0; i < 4; i++) {
    pipe.addStage((ctx) => {
      for (let j = 0; j < ctx.tables.length; j++) {
        ctx.crc = (ctx.crc + ctx.tables[j].length) & 0xFFFF
      }
      ctx.processed += 1
    })
  }

  // Stage 7: Finalize CRC
  pipe.addStage((ctx) => {
    ctx.crc = ctx.crc ^ 0xA5A5
  })

  // Stage 8: Mark complete
  pipe.addStage((ctx) => {
    ctx.processed = ctx.tables.length
  })

  return pipe
}

function makeTestContext(): SchemaContext {
  return {
    tables: Array.from({ length: 20 }, (_, i) => `table_${i}`),
    processed: 0,
    crc: 0,
  }
}

// --- Benchmarks ---

const BATCH_SIZES = [1, 10, 100]

console.log('\n=== Cluster A — Batch Schema Export Benchmark ===\n')

// Pre-build pipeline (shared across batch iterations, like real code)
const pipe = makeSchemaExportPipeline()

console.log('── Batch execution scaling (N iterations of same pipeline) ──')
console.log(`${'batch'.padStart(6)} | ${'legacy'.padStart(10)} µs/exec | ${'compiled'.padStart(10)} µs/exec | ${'direct'.padStart(10)} µs/exec | ${'improvement'.padStart(12)}`)
console.log('-'.repeat(75))

const legacyResults: BenchStats[] = []
const compiledResults: BenchStats[] = []

for (const batchSize of BATCH_SIZES) {
  const iterations = Math.max(50, Math.floor(500 / batchSize))

  // Legacy
  __setCompiledPipelineEnabledForTests(false)
  // Force recompile in legacy mode
  pipe.compile()
  const legacy = scaleStats(await measureStats(async () => {
    for (let i = 0; i < batchSize; i++) {
      await pipe.execute(makeTestContext())
    }
  }, iterations, { samples: 5, warmup: 100 }), batchSize)

  // Runtime-compiled (through pipeline.execute)
  __setCompiledPipelineEnabledForTests(true)
  pipe.compile()
  const compiled = scaleStats(await measureStats(async () => {
    for (let i = 0; i < batchSize; i++) {
      await pipe.execute(makeTestContext())
    }
  }, iterations, { samples: 5, warmup: 100 }), batchSize)

  // Direct-compiled (bypass pipeline.execute overhead)
  const plan = compilePipelinePlan(pipe as any)
  const direct = scaleStats(await measureStats(async () => {
    for (let i = 0; i < batchSize; i++) {
      await new Promise<void>((resolve, reject) => {
        executeCompiledPlan(plan, undefined, makeTestContext(), (err) => {
          if (err) reject(err)
          else resolve()
        })
      })
    }
  }, iterations, { samples: 5, warmup: 100 }), batchSize)

  legacyResults.push(legacy)
  compiledResults.push(compiled)

  const improvement = ((legacy.median - compiled.median) / legacy.median * 100).toFixed(1)
  const directImprovement = ((legacy.median - direct.median) / legacy.median * 100).toFixed(1)

  console.log(
    `${String(batchSize).padStart(6)} | ${formatStats(legacy).padStart(18)} | ${formatStats(compiled).padStart(18)} | ${formatStats(direct).padStart(18)} | ${improvement.padStart(5)}% / ${directImprovement.padStart(5)}%`
  )
}

// --- Success criteria check (use per-exec times from batch=100) ---
console.log('\n── Success criterion: ≥15% improvement at batch scale ──')
// Use the batch=100 result which best represents repeated execution
const legacyAt100 = legacyResults[legacyResults.length - 1]
const compiledAt100 = compiledResults[compiledResults.length - 1]
const pctImprovement = ((legacyAt100.median - compiledAt100.median) / legacyAt100.median * 100)
console.log(`  Legacy per-exec (batch=100):   ${formatStats(legacyAt100)} µs`)
console.log(`  Compiled per-exec (batch=100): ${formatStats(compiledAt100)} µs`)
console.log(`  Improvement:    ${pctImprovement.toFixed(1)}%`)
console.log(`  PASS: ${pctImprovement >= 15 ? 'YES ✓' : 'NO ✗'}`)

__setCompiledPipelineEnabledForTests(undefined)
console.log('\n=== done ===\n')
