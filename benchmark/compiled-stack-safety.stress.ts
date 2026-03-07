import { strict as assert } from 'node:assert'

import { IfElse } from '../src/ifelse'
import { Pipeline } from '../src/pipeline'
import { Timeout } from '../src/timeout'
import { Wrap } from '../src/wrap'

type StackCtx = {
  ok: boolean
  stackLines: number
}

function captureStack(ctx: StackCtx) {
  ctx.stackLines = new Error().stack?.split('\n').length ?? 0
  ctx.ok = true
}

function assertBounded(result: StackCtx, label: string) {
  assert.equal(result.ok, true, `${label}: terminal stage must execute`)
  assert.ok(result.stackLines > 0, `${label}: stack must be captured`)
  assert.ok(result.stackLines < 2_000, `${label}: stack depth must stay bounded, got ${result.stackLines}`)
}

async function runPipeline20k() {
  const root = new Pipeline<StackCtx>()
  for (let i = 0; i < 20_000; i++) {
    root.addStage((ctx: StackCtx) => {
      if (i === 19_999) captureStack(ctx)
    })
  }

  const started = performance.now()
  const result = await root.execute({ ok: false, stackLines: 0 })
  console.log(`Pipeline depth 20k: ${(performance.now() - started).toFixed(1)}ms, stack=${result.stackLines}`)
  assertBounded(result, 'Pipeline depth 20k')
}

function buildWrap(depth: number) {
  let current: any = captureStack
  for (let i = 0; i < depth; i++) {
    current = new Wrap<StackCtx, StackCtx>({
      stage: current,
      prepare: (ctx) => ctx,
      finalize: (ctx) => ctx,
    })
  }
  return current
}

function buildIfElse(depth: number) {
  let current: any = captureStack
  for (let i = 0; i < depth; i++) {
    current = new IfElse<StackCtx>({
      condition: true,
      success: current,
    })
  }
  return current
}

function buildTimeout(depth: number) {
  let current: any = captureStack
  for (let i = 0; i < depth; i++) {
    current = new Timeout<StackCtx>({
      timeout: 0,
      stage: current,
    })
  }
  return current
}

function buildMixed(depth: number) {
  let current: any = captureStack
  for (let i = 0; i < depth; i++) {
    switch (i % 3) {
      case 0:
        current = new Wrap<StackCtx, StackCtx>({
          stage: current,
          prepare: (ctx) => ctx,
          finalize: (ctx) => ctx,
        })
        break
      case 1:
        current = new IfElse<StackCtx>({
          condition: true,
          success: current,
        })
        break
      default:
        current = new Timeout<StackCtx>({
          timeout: 0,
          stage: current,
        })
        break
    }
  }
  return current
}

async function runNamedDepth(label: string, root: { execute(ctx: StackCtx): Promise<StackCtx> }) {
  const started = performance.now()
  const result = await root.execute({ ok: false, stackLines: 0 })
  console.log(`${label}: ${(performance.now() - started).toFixed(1)}ms, stack=${result.stackLines}`)
  assertBounded(result, label)
}

console.log('\n=== compiled stack-safety stress ===\n')

const previousLimit = Error.stackTraceLimit
Error.stackTraceLimit = 5_000

try {
  await runPipeline20k()
  await runNamedDepth('Wrap depth 10k', buildWrap(10_000))
  await runNamedDepth('IfElse depth 10k', buildIfElse(10_000))
  await runNamedDepth('Timeout depth 10k', buildTimeout(10_000))
  await runNamedDepth('Mixed depth 10k', buildMixed(10_000))
  console.log('\n=== stress complete ===\n')
} finally {
  Error.stackTraceLimit = previousLimit
}
