import { compilePipelinePlan } from '../compiled/compiler'
import { planToString } from '../compiled/debug'
import { executeCompiledPlan } from '../compiled/executor'
import { DoWhile } from '../dowhile'
import { getExecutionSignal } from '../execution_signal'
import { IfElse } from '../ifelse'
import { Parallel } from '../parallel'
import { __setCompiledPipelineEnabledForTests, Pipeline } from '../pipeline'
import { RetryOnError } from '../retryonerror'
import { Sequential } from '../sequential'
import { Stage } from '../stage'
import { Timeout } from '../timeout'
import { ErrorCode } from '../utils/errors'
import type { StageObject } from '../utils/types'
import { Wrap } from '../wrap'

function executePlanPromise<T extends StageObject>(
  plan: any,
  context: T,
  err?: Error,
) {
  return new Promise<T>((resolve, reject) => {
    executeCompiledPlan(plan, err, context, (runErr, ctx) => {
      if (runErr) reject(runErr)
      else resolve((ctx ?? context) as T)
    })
  })
}

async function executeLegacyPipeline<T extends StageObject>(
  pipeline: Pipeline<T>,
  context: T,
) {
  __setCompiledPipelineEnabledForTests(false)
  try {
    return await pipeline.execute(context)
  } finally {
    __setCompiledPipelineEnabledForTests(undefined)
  }
}

async function executePipelineWithCompiledFlag<T extends StageObject>(
  pipeline: Pipeline<T>,
  context: T,
  enabled: boolean,
  options?: { signal?: AbortSignal },
) {
  __setCompiledPipelineEnabledForTests(enabled)
  try {
    return await pipeline.execute(context, options ?? {})
  } finally {
    __setCompiledPipelineEnabledForTests(undefined)
  }
}

function executePipelineCallbackWithCompiledFlag<T extends StageObject>(
  pipeline: Pipeline<T>,
  context: T,
  enabled: boolean,
  options?: { signal?: AbortSignal },
) {
  __setCompiledPipelineEnabledForTests(enabled)

  return new Promise<T>((resolve, reject) => {
    try {
      if (options) {
        pipeline.execute(context, (err, ctx) => {
          __setCompiledPipelineEnabledForTests(undefined)
          if (err) reject(err)
          else resolve((ctx ?? context) as T)
        }, options)
      } else {
        pipeline.execute(context, (err, ctx) => {
          __setCompiledPipelineEnabledForTests(undefined)
          if (err) reject(err)
          else resolve((ctx ?? context) as T)
        })
      }
    } catch (error) {
      __setCompiledPipelineEnabledForTests(undefined)
      reject(error)
    }
  })
}

function executePipelineObservedCallbackWithCompiledFlag<T extends StageObject>(
  pipeline: Pipeline<T>,
  context: T,
  enabled: boolean,
  options?: { signal?: AbortSignal },
) {
  __setCompiledPipelineEnabledForTests(enabled)
  let callbackCount = 0

  const promise = new Promise<T>((resolve, reject) => {
    try {
      const callback = (err: any, ctx?: T) => {
        callbackCount += 1
        __setCompiledPipelineEnabledForTests(undefined)

        if (err) {
          reject(err)
        } else {
          resolve((ctx ?? context) as T)
        }
      }

      if (options) {
        pipeline.execute(context, callback, options)
      } else {
        pipeline.execute(context, callback)
      }
    } catch (error) {
      __setCompiledPipelineEnabledForTests(undefined)
      reject(error)
    }
  })

  return {
    promise,
    getCallbackCount: () => callbackCount,
  }
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function expectErrorParity(
  legacyError: any,
  compiledError: any,
  primaryMessage?: string,
) {
  expect(legacyError?.code).toBe(compiledError?.code)
  expect(legacyError?.chain?.primary?.message).toBe(
    compiledError?.chain?.primary?.message,
  )

  if (primaryMessage !== undefined) {
    expect(compiledError?.chain?.primary?.message).toBe(primaryMessage)
  }
}

function expectResultParity(legacyResult: any, compiledResult: any) {
  expect(JSON.parse(JSON.stringify(compiledResult))).toEqual(
    JSON.parse(JSON.stringify(legacyResult)),
  )
}

function makeHybridFallbackPipeline<T extends StageObject>(stage: any) {
  return new Pipeline<T>([
    new Wrap<T, T>({
      ensure: (ctx) => ctx,
      stage,
      prepare: (ctx) => ctx,
      finalize: (_ctx, retCtx) => retCtx,
    }) as any,
  ])
}

class InspectablePipeline<T extends StageObject> extends Pipeline<T> {
  public shouldUseCompiledByDefault() {
    return this.shouldUseCompiledPlan(this.getCompiledPlan())
  }
}

type HybridTestContext = {
  n: number
  branch: boolean
}

function makeHybridParityPipeline() {
  const successNested = new Pipeline<HybridTestContext>([
    (ctx) => {
      ctx.n += 100
    },
    (ctx) => {
      ctx.branch = false
    },
  ])

  return new Pipeline<HybridTestContext>([
    (ctx) => {
      ctx.n += 1
      ctx.branch = true
    },
    new Wrap<HybridTestContext, HybridTestContext>({
      stage: (ctx, done) => {
        ctx.n += 10
        done(undefined, ctx)
      },
      prepare: (ctx) => ctx,
      finalize: (_ctx, retCtx) => retCtx,
    }) as any,
    new IfElse<HybridTestContext>({
      condition: (ctx) => ctx.branch,
      success: successNested,
      failed: (ctx) => {
        ctx.n += 10000
      },
    }) as any,
    new IfElse<HybridTestContext>({
      condition: (ctx) => ctx.branch,
      success: (ctx) => {
        ctx.n += 100000
      },
      failed: (ctx) => {
        ctx.n += 1000
      },
    }) as any,
    new Timeout<HybridTestContext>({
      timeout: 0,
      stage: async (ctx) => {
        ctx.n += 10000
        return ctx
      },
    }) as any,
  ])
}

describe('compiled Pipeline skeleton', () => {
  it('compiles a flat Pipeline into linear phase-1 ops', () => {
    const pipe = new Pipeline<{ n: number }>([
      (ctx) => {
        ctx.n += 1
      },
      (ctx) => {
        ctx.n += 10
      },
    ])

    const plan = compilePipelinePlan(pipe as any)

    expect(plan.mode).toBe('compiled-static')
    expect(plan.entry).toBe(0)
    expect(plan.errorExit).toBe(plan.ops.length - 1)
    expect(plan.ops.map((op) => op.op)).toEqual([
      'RUN_STAGE_FN',
      'SET_CTX_FROM_RESULT',
      'RUN_STAGE_FN',
      'SET_CTX_FROM_RESULT',
      'RETURN',
    ])
  })

  it('flattens nested Pipeline into one linear plan', () => {
    const nested = new Pipeline<{ n: number }>([
      (ctx) => {
        ctx.n += 10
      },
      (ctx) => {
        ctx.n += 100
      },
    ])
    const root = new Pipeline<{ n: number }>([
      (ctx) => {
        ctx.n += 1
      },
      nested,
      (ctx) => {
        ctx.n += 1000
      },
    ])

    const plan = compilePipelinePlan(root as any)
    const runOps = plan.ops.filter((op) => op.op === 'RUN_STAGE_FN')

    expect(plan.mode).toBe('compiled-static')
    expect(runOps.length).toBe(4)
    expect(plan.metadata.flattenedStages).toBeGreaterThan(0)
    expect(plan.ops.some((op) => op.op === 'RUN_FALLBACK_STAGE')).toBe(false)
  })

  it('compiles Wrap stages into native frame ops', () => {
    const wrap = new Wrap<{ n: number }, { n: number }>({
      stage: (ctx) => {
        ctx.n += 10
      },
      prepare: (ctx) => ctx,
      finalize: (ctx) => ctx,
    })
    const root = new Pipeline<{ n: number }>()
    root.addStage((ctx) => {
      ctx.n += 1
    })
    root.addStage(wrap as any)

    const plan = compilePipelinePlan(root as any)

    expect(plan.mode).toBe('compiled-static')
    expect(plan.ops.some((op) => op.op === 'PUSH_FRAME')).toBe(true)
    expect(plan.ops.some((op) => op.op === 'POP_FRAME')).toBe(true)
    expect(plan.ops.some((op) => op.op === 'RUN_FALLBACK_STAGE')).toBe(false)
    expect(plan.metadata.fallbackOps).toBe(0)
  })

  it('dependency signature changes after addStage()', () => {
    const pipe = new Pipeline<{ n: number }>([
      (ctx) => {
        ctx.n += 1
      },
    ])

    const before = compilePipelinePlan(pipe as any)
    pipe.addStage((ctx: { n: number }) => {
      ctx.n += 10
    })
    const after = compilePipelinePlan(pipe as any)

    expect(before.dependencySignature).not.toBe(after.dependencySignature)
  })

  it('reuses cached compiled plan when graph signature is unchanged', async () => {
    __setCompiledPipelineEnabledForTests(true)

    try {
      const root = new Pipeline<{ n: number }>([
        (ctx) => {
          ctx.n += 1
        },
        (ctx) => {
          ctx.n += 10
        },
      ])

      await root.execute({ n: 0 })
      const firstPlan = (root as any).compiledPlan
      const firstSignature = (root as any).compiledDependencySignature

      await root.execute({ n: 0 })
      const secondPlan = (root as any).compiledPlan
      const secondSignature = (root as any).compiledDependencySignature

      expect(firstPlan).toBeDefined()
      expect(secondPlan).toBe(firstPlan)
      expect(secondSignature).toBe(firstSignature)
    } finally {
      __setCompiledPipelineEnabledForTests(undefined)
    }
  })

  it('invalidates parent compiled plan when nested child Pipeline mutates', async () => {
    __setCompiledPipelineEnabledForTests(true)

    try {
      const nested = new Pipeline<{ n: number }>([
        (ctx) => {
          ctx.n += 10
        },
      ])
      const root = new Pipeline<{ n: number }>([
        (ctx) => {
          ctx.n += 1
        },
        nested,
      ])

      const before = await root.execute({ n: 0 })
      const firstPlan = (root as any).compiledPlan
      expect(before.n).toBe(11)

      nested.addStage((ctx) => {
        ctx.n += 100
      })

      const after = await root.execute({ n: 0 })
      const secondPlan = (root as any).compiledPlan

      expect(after.n).toBe(111)
      expect(secondPlan).not.toBe(firstPlan)
    } finally {
      __setCompiledPipelineEnabledForTests(undefined)
    }
  })

  it('executes compiled flat plan with same result as legacy runtime', async () => {
    const root = new Pipeline<{ n: number }>()
    root.addStage((ctx) => {
      ctx.n += 1
    })
    root.addStage(
      new Stage<{ n: number }>({
        run: (ctx) => {
          ctx.n += 10
        },
      }) as any,
    )
    root.addStage(async (ctx) => {
      ctx.n += 100
      return ctx
    })

    const plan = compilePipelinePlan(root as any)
    const legacyResult = await root.execute({ n: 0 })
    const compiledResult = await executePlanPromise(plan, { n: 0 })

    expect(compiledResult.n).toBe(legacyResult.n)
  })

  it('preserves callback-style stage semantics', async () => {
    const root = new Pipeline<{ n: number }>()
    root.addStage((ctx, done) => {
      ctx.n += 1
      done(undefined, ctx)
    })
    root.addStage((ctx) => {
      ctx.n += 10
    })

    const plan = compilePipelinePlan(root as any)
    const legacyResult = await root.execute({ n: 0 })
    const compiledResult = await executePlanPromise(plan, { n: 0 })

    expect(compiledResult.n).toBe(legacyResult.n)
  })

  it('preserves zero-arg stage semantics for sync and async functions', async () => {
    const root = new Pipeline<{ n: number }>([
      function () {
        return { n: 1 }
      },
      async function () {
        return { n: 11 }
      },
    ])

    const plan = compilePipelinePlan(root as any)
    const legacyResult = await root.execute({ n: 0 })
    const compiledResult = await executePlanPromise(plan, { n: 0 })

    expect(compiledResult.n).toBe(legacyResult.n)
  })

  it('preserves err+ctx async and err+ctx+done stage semantics', async () => {
    const root = new Pipeline<{ n: number }>([
      async (_err, ctx) => {
        ctx.n += 1
        return ctx
      },
      (_err, ctx, done) => {
        ctx.n += 10
        done(undefined, ctx)
      },
    ])

    const plan = compilePipelinePlan(root as any)
    const legacyResult = await root.execute({ n: 0 })
    const compiledResult = await executePlanPromise(plan, { n: 0 })

    expect(compiledResult.n).toBe(legacyResult.n)
  })

  it('preserves callback API behavior when compiled runtime flag is enabled', async () => {
    __setCompiledPipelineEnabledForTests(true)

    try {
      const root = new Pipeline<{ n: number }>()
      root.addStage((ctx, done) => {
        ctx.n += 1
        done(undefined, ctx)
      })
      root.addStage((ctx) => {
        ctx.n += 10
      })

      const result = await new Promise<{ n: number }>((resolve, reject) => {
        root.execute({ n: 0 }, (err, ctx) => {
          if (err) reject(err)
          else resolve(ctx as any)
        })
      })

      expect(result.n).toBe(11)
    } finally {
      __setCompiledPipelineEnabledForTests(undefined)
    }
  })

  it('executes nested compiled plan with same result as legacy runtime', async () => {
    const nested = new Pipeline<{ n: number }>([
      (ctx) => {
        ctx.n += 10
      },
      (ctx) => {
        ctx.n += 100
      },
    ])
    const root = new Pipeline<{ n: number }>([
      (ctx) => {
        ctx.n += 1
      },
      nested,
      (ctx) => {
        ctx.n += 1000
      },
    ])

    const plan = compilePipelinePlan(root as any)
    const legacyResult = await root.execute({ n: 0 })
    const compiledResult = await executePlanPromise(plan, { n: 0 })

    expect(compiledResult.n).toBe(legacyResult.n)
  })

  it('executes fallback op with same result as legacy runtime', async () => {
    const wrap = new Wrap<{ n: number }, { n: number }>({
      stage: (ctx) => {
        ctx.n += 10
      },
      prepare: (ctx) => ctx,
      finalize: (ctx) => ctx,
    })
    const root = new Pipeline<{ n: number }>()
    root.addStage((ctx) => {
      ctx.n += 1
    })
    root.addStage(wrap as any)
    root.addStage((ctx) => {
      ctx.n += 100
    })

    const plan = compilePipelinePlan(root as any)
    const legacyResult = await root.execute({ n: 0 })
    const compiledResult = await executePlanPromise(plan, { n: 0 })

    expect(compiledResult.n).toBe(legacyResult.n)
  })

  it('compiles IfElse predicates with scoped branch execution', async () => {
    const root = new Pipeline<{ n: number; branch: boolean }>([
      new IfElse<{ n: number; branch: boolean }>({
        condition: (ctx) => ctx.branch,
        success: (ctx) => {
          ctx.n += 10
        },
        failed: (ctx) => {
          ctx.n += 100
        },
      }) as any,
      (ctx) => {
        ctx.n += 1
      },
    ])

    const plan = compilePipelinePlan(root as any)
    const legacyTrue = await root.execute({ n: 0, branch: true })
    const compiledTrue = await executePlanPromise(plan, { n: 0, branch: true })
    const legacyFalse = await root.execute({ n: 0, branch: false })
    const compiledFalse = await executePlanPromise(plan, {
      n: 0,
      branch: false,
    })

    expect(plan.mode).toBe('compiled-static')
    expect(plan.ops.some((op) => op.op === 'JUMP_IF_TRUE')).toBe(true)
    expect(plan.ops.some((op) => op.op === 'PUSH_FRAME')).toBe(true)
    expect(plan.ops.some((op) => op.op === 'RUN_FALLBACK_STAGE')).toBe(false)
    expect(JSON.parse(JSON.stringify(compiledTrue))).toEqual(
      JSON.parse(JSON.stringify(legacyTrue)),
    )
    expect(JSON.parse(JSON.stringify(compiledFalse))).toEqual(
      JSON.parse(JSON.stringify(legacyFalse)),
    )
  })

  it('compiles Sequential without fallback ops', async () => {
    const root = new Pipeline<{ items: number[]; total: number }>([
      new Sequential<{ items: number[]; total: number }, { value: number }>({
        stage: (item) => ({ value: item.value + 1 }),
        split: (ctx) => ctx.items.map((value) => ({ value })),
        combine: (ctx, children) => {
          ctx.total = children.reduce((sum, child) => sum + child.value, 0)
          return ctx
        },
      }) as any,
    ])

    const plan = compilePipelinePlan(root as any)
    const legacyResult = await root.execute({ items: [1, 2, 3], total: 0 })
    const compiledResult = await executePlanPromise(plan, {
      items: [1, 2, 3],
      total: 0,
    })

    expect(plan.mode).toBe('compiled-static')
    expect(plan.ops.some((op) => op.op === 'RUN_FALLBACK_STAGE')).toBe(false)
    expect(JSON.parse(JSON.stringify(compiledResult))).toEqual(
      JSON.parse(JSON.stringify(legacyResult)),
    )
  })

  it('compiles Parallel without fallback ops', async () => {
    const root = new Pipeline<{ items: number[]; total: number }>([
      new Parallel<{ items: number[]; total: number }, { value: number }>({
        stage: (ctx) => {
          ctx.value += 1
        },
        split: (ctx) => ctx.items.map((value) => ({ value })),
        combine: (ctx, children) => {
          ctx.total = children.reduce((sum, child) => sum + child.value, 0)
          return ctx
        },
      }) as any,
    ])

    const plan = compilePipelinePlan(root as any)
    const legacyResult = await root.execute({ items: [1, 2, 3], total: 0 })
    const compiledResult = await executePlanPromise(plan, {
      items: [1, 2, 3],
      total: 0,
    })

    expect(plan.mode).toBe('compiled-static')
    expect(plan.ops.some((op) => op.op === 'RUN_PARALLEL')).toBe(true)
    expect(plan.ops.some((op) => op.op === 'RUN_FALLBACK_STAGE')).toBe(false)
    expect(JSON.parse(JSON.stringify(compiledResult))).toEqual(
      JSON.parse(JSON.stringify(legacyResult)),
    )
  })

  it('compiles DoWhile and RetryOnError with parity', async () => {
    let retries = 0
    const root = new Pipeline<{ count: number; done: boolean }>([
      new RetryOnError<{ count: number; done: boolean }>({
        retry: 2,
        stage: (ctx) => {
          if (retries++ === 0) {
            throw new Error('retry-me')
          }
          return ctx
        },
      }) as any,
      new DoWhile<{ count: number; done: boolean }>({
        stage: (ctx) => ({ count: ctx.count + 1, done: ctx.done }),
        reachEnd: (_err, ctx, iter) => !!ctx?.done || iter === 3,
      }) as any,
      (ctx) => {
        ctx.done = true
      },
    ])

    const plan = compilePipelinePlan(root as any)
    retries = 0
    const legacyResult = await root.execute({ count: 0, done: false })
    retries = 0
    const compiledResult = await executePlanPromise(plan, {
      count: 0,
      done: false,
    })

    expect(plan.mode).toBe('compiled-static')
    expect(plan.ops.some((op) => op.op === 'RUN_FALLBACK_STAGE')).toBe(false)
    expect(compiledResult).toEqual(legacyResult)
  })

  it('compiles Timeout overdue boundaries without fallback ops', async () => {
    const root = new Pipeline<{ n: number; overdue?: boolean }>([
      new Timeout<{ n: number; overdue?: boolean }>({
        timeout: 0,
        stage: (_ctx, done) => {
          setTimeout(() => done(undefined, { n: 999 }), 25)
        },
        overdue: (ctx) => {
          ctx.overdue = true
          ctx.n += 10
          return ctx
        },
      }) as any,
    ])

    const plan = compilePipelinePlan(root as any)
    const legacyResult = await root.execute({ n: 1 })
    const compiledResult = await executePlanPromise(plan, { n: 1 })

    expect(plan.mode).toBe('compiled-static')
    expect(plan.ops.some((op) => op.op === 'RUN_FALLBACK_STAGE')).toBe(false)
    expect(compiledResult).toEqual(legacyResult)
  })

  it('keeps timeout overdue result stable after late inner mutation', async () => {
    const makePipeline = () =>
      new Pipeline<{ result: string }>([
        new Timeout<{ result: string }>({
          timeout: 10,
          stage: (ctx, done) => {
            setTimeout(() => {
              ctx.result = 'main'
              done(undefined, ctx)
            }, 40)
          },
          overdue: (ctx) => {
            ctx.result = 'overdue'
            return ctx
          },
        }) as any,
      ])

    const legacyPipeline = makePipeline()
    const compiledPipeline = makePipeline()
    const compiledPlan = compilePipelinePlan(compiledPipeline as any)

    const legacyResult = await executeLegacyPipeline(legacyPipeline, {
      result: 'start',
    })
    const compiledResult = await executePlanPromise(compiledPlan, {
      result: 'start',
    })

    await wait(80)

    expect(legacyResult.result).toBe('overdue')
    expect(compiledResult.result).toBe('overdue')
  })

  it('preserves Sequential callback-double error parity', async () => {
    const makePipeline = () =>
      new Pipeline<{ n: number }>([
        new Sequential<{ n: number }, { n: number }>({
          stage: (ctx, done) => {
            done(undefined, ctx)
            done(undefined, ctx)
          },
          split: (ctx) => [ctx],
          combine: (ctx) => ctx,
        }) as any,
      ])

    const legacyPipeline = makePipeline()
    const compiledPipeline = makePipeline()
    const compiledPlan = compilePipelinePlan(compiledPipeline as any)

    const legacyResult = await executeLegacyPipeline(legacyPipeline, { n: 0 })
    const compiledResult = await executePlanPromise(compiledPlan, { n: 0 })

    expectResultParity(legacyResult, compiledResult)
    expect(compiledResult.n).toBe(0)
  })

  it('preserves RetryOnError callback-double error parity', async () => {
    const makePipeline = () =>
      new Pipeline<{ n: number }>([
        new RetryOnError<{ n: number }>({
          retry: 0,
          stage: (ctx, done) => {
            done(undefined, ctx)
            done(undefined, ctx)
          },
        }) as any,
      ])

    const legacyPipeline = makePipeline()
    const compiledPipeline = makePipeline()
    const compiledPlan = compilePipelinePlan(compiledPipeline as any)

    const legacyResult = await executeLegacyPipeline(legacyPipeline, { n: 0 })
    const compiledResult = await executePlanPromise(compiledPlan, { n: 0 })

    expectResultParity(legacyResult, compiledResult)
    expect(compiledResult.n).toBe(0)
  })

  it('preserves Parallel null-split parity', async () => {
    const makePipeline = () =>
      new Pipeline<{ n: number }>([
        new Parallel<{ n: number }, { n: number }>({
          stage: (ctx) => {
            ctx.n = 99
          },
          split: () => null as any,
        }) as any,
      ])

    const legacyPipeline = makePipeline()
    const compiledPipeline = makePipeline()
    const compiledPlan = compilePipelinePlan(compiledPipeline as any)

    const legacyResult = await executeLegacyPipeline(legacyPipeline, { n: 0 })
    const compiledResult = await executePlanPromise(compiledPlan, { n: 0 })

    expectResultParity(legacyResult, compiledResult)
    expect(compiledResult.n).toBe(0)
  })

  it('preserves Parallel aggregated-error parity', async () => {
    const makePipeline = () =>
      new Pipeline<{ n: number }>([
        new Parallel<{ n: number }, { id: number }>({
          stage: (ctx) => {
            if (ctx.id === 2 || ctx.id === 3) {
              throw new Error(`child-${ctx.id}`)
            }
          },
          split: () => [{ id: 1 }, { id: 2 }, { id: 3 }],
        }) as any,
      ])

    const legacyPipeline = makePipeline()
    const compiledPipeline = makePipeline()
    const compiledPlan = compilePipelinePlan(compiledPipeline as any)

    const legacyError: any = await executeLegacyPipeline(legacyPipeline, {
      n: 0,
    }).catch((err) => err)
    const compiledError: any = await executePlanPromise(compiledPlan, {
      n: 0,
    }).catch((err) => err)

    expectErrorParity(legacyError, compiledError, 'parallel - error')
    expect(legacyError.chain.secondary.length).toBe(
      compiledError.chain.secondary.length,
    )
  })

  it('preserves Parallel async fan-out behavior', async () => {
    const makePipeline = (stats: { active: number; peak: number }) =>
      new Pipeline<{ done: number[] }>([
        new Parallel<{ done: number[] }, { id: number }>({
          stage: async (ctx) => {
            stats.active += 1
            stats.peak = Math.max(stats.peak, stats.active)
            await wait(10)
            stats.active -= 1
            ;(ctx as any).done = true
          },
          split: () => [{ id: 1 }, { id: 2 }, { id: 3 }],
          combine: (ctx, children) => {
            ctx.done = children
              .filter((child: any) => child.done)
              .map((child) => child.id)
              .sort()
            return ctx
          },
        }) as any,
      ])

    const legacyStats = { active: 0, peak: 0 }
    const compiledStats = { active: 0, peak: 0 }
    const legacyPipeline = makePipeline(legacyStats)
    const compiledPipeline = makePipeline(compiledStats)
    const compiledPlan = compilePipelinePlan(compiledPipeline as any)

    const legacyResult = await executeLegacyPipeline(legacyPipeline, { done: [] })
    const compiledResult = await executePlanPromise(compiledPlan, { done: [] })

    expectResultParity(legacyResult, compiledResult)
    expect(legacyStats.peak).toBeGreaterThan(1)
    expect(compiledStats.peak).toBeGreaterThan(1)
  })

  it('preserves Parallel bounded-concurrency parity', async () => {
    const makePipeline = (stats: { active: number; peak: number }) =>
      new Pipeline<{ done: number[] }>([
        new Parallel<{ done: number[] }, { id: number; done?: boolean }>({
          concurrency: 2,
          stage: async (ctx) => {
            stats.active += 1
            stats.peak = Math.max(stats.peak, stats.active)
            await wait(10)
            stats.active -= 1
            ctx.done = true
          },
          split: () => [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }],
          combine: (ctx, children) => {
            ctx.done = children
              .filter((child) => child.done)
              .map((child) => child.id)
              .sort()
            return ctx
          },
        }) as any,
      ])

    const legacyStats = { active: 0, peak: 0 }
    const compiledStats = { active: 0, peak: 0 }
    const legacyPipeline = makePipeline(legacyStats)
    const compiledPipeline = makePipeline(compiledStats)
    const compiledPlan = compilePipelinePlan(compiledPipeline as any)

    const legacyResult = await executeLegacyPipeline(legacyPipeline, { done: [] })
    const compiledResult = await executePlanPromise(compiledPlan, { done: [] })

    expectResultParity(legacyResult, compiledResult)
    expect(legacyStats.peak).toBeLessThanOrEqual(2)
    expect(compiledStats.peak).toBeLessThanOrEqual(2)
    expect(compiledStats.peak).toBeGreaterThan(1)
  })

  it('preserves Parallel join-any first-success parity', async () => {
    const makePipeline = (started: number[]) =>
      new Pipeline<{ winners: number[]; winner?: boolean }>([
        new Parallel<
          { winners: number[]; winner?: boolean },
          { id: number; winner?: boolean }
        >({
          concurrency: 1,
          join: 'any',
          stage: async (ctx) => {
            started.push(ctx.id)
            return { id: ctx.id, winner: true }
          },
          split: () => [{ id: 1 }, { id: 2 }],
          combine: (ctx, children) => {
            ctx.winners = children.map((child) => child.id)
            ctx.winner = children[0]?.winner === true
            return ctx
          },
        }) as any,
      ])

    const legacyStarted: number[] = []
    const compiledStarted: number[] = []
    const legacyPipeline = makePipeline(legacyStarted)
    const compiledPipeline = makePipeline(compiledStarted)
    const compiledPlan = compilePipelinePlan(compiledPipeline as any)

    const legacyResult = await executeLegacyPipeline(legacyPipeline, {
      winners: [],
    })
    const compiledResult = await executePlanPromise(compiledPlan, {
      winners: [],
    })

    expectResultParity(legacyResult, compiledResult)
    expect(legacyStarted).toEqual([1])
    expect(compiledStarted).toEqual([1])
  })

  it('preserves Parallel join-any all-fail parity', async () => {
    const makePipeline = () =>
      new Pipeline<{ n: number }>([
        new Parallel<{ n: number }, { id: number }>({
          join: 'any',
          stage: (ctx) => {
            throw new Error(`fail-${ctx.id}`)
          },
          split: () => [{ id: 1 }, { id: 2 }],
        }) as any,
      ])

    const legacyPipeline = makePipeline()
    const compiledPipeline = makePipeline()
    const compiledPlan = compilePipelinePlan(compiledPipeline as any)

    const legacyError: any = await executeLegacyPipeline(legacyPipeline, {
      n: 0,
    }).catch((err) => err)
    const compiledError: any = await executePlanPromise(compiledPlan, {
      n: 0,
    }).catch((err) => err)

    expectErrorParity(legacyError, compiledError, 'parallel - error')
    expect(legacyError.chain.secondary.length).toBe(
      compiledError.chain.secondary.length,
    )
  })

  it('preserves Parallel join-quorum success parity', async () => {
    const makePipeline = (started: number[]) =>
      new Pipeline<{ winners: number[] }>([
        new Parallel<{ winners: number[] }, { id: number; winner?: boolean }>({
          concurrency: 2,
          join: 'quorum',
          quorum: 2,
          stage: async (ctx) => {
            started.push(ctx.id)
            return { id: ctx.id, winner: true }
          },
          split: () => [{ id: 1 }, { id: 2 }, { id: 3 }],
          combine: (ctx, children) => {
            ctx.winners = children.map((child) => child.id)
            return ctx
          },
        }) as any,
      ])

    const legacyStarted: number[] = []
    const compiledStarted: number[] = []
    const legacyPipeline = makePipeline(legacyStarted)
    const compiledPipeline = makePipeline(compiledStarted)
    const compiledPlan = compilePipelinePlan(compiledPipeline as any)

    const legacyResult = await executeLegacyPipeline(legacyPipeline, {
      winners: [],
    })
    const compiledResult = await executePlanPromise(compiledPlan, {
      winners: [],
    })

    expectResultParity(legacyResult, compiledResult)
    expect(legacyStarted.slice(0, 2)).toEqual([1, 2])
    expect(compiledStarted.slice(0, 2)).toEqual([1, 2])
    expect(legacyStarted.length).toBeGreaterThanOrEqual(2)
    expect(legacyStarted.length).toBeLessThanOrEqual(3)
    expect(compiledStarted.length).toBeGreaterThanOrEqual(2)
    expect(compiledStarted.length).toBeLessThanOrEqual(3)
  })

  it('preserves Parallel join-quorum failure parity', async () => {
    const makePipeline = () =>
      new Pipeline<{ n: number }>([
        new Parallel<{ n: number }, { id: number }>({
          join: 'quorum',
          quorum: 3,
          stage: (ctx) => {
            if (ctx.id !== 1) {
              throw new Error(`fail-${ctx.id}`)
            }
            return { id: ctx.id }
          },
          split: () => [{ id: 1 }, { id: 2 }, { id: 3 }],
        }) as any,
      ])

    const legacyPipeline = makePipeline()
    const compiledPipeline = makePipeline()
    const compiledPlan = compilePipelinePlan(compiledPipeline as any)

    const legacyError: any = await executeLegacyPipeline(legacyPipeline, {
      n: 0,
    }).catch((err) => err)
    const compiledError: any = await executePlanPromise(compiledPlan, {
      n: 0,
    }).catch((err) => err)

    expectErrorParity(legacyError, compiledError, 'parallel - error')
    expect(legacyError.chain.secondary.length).toBe(
      compiledError.chain.secondary.length,
    )
  })

  it('preserves Parallel join-any trailing-drain parity', async () => {
    const makePipeline = (started: number[], finished: number[]) =>
      new Pipeline<{ winners: number[] }>([
        new Parallel<{ winners: number[] }, { id: number; winner?: boolean }>({
          concurrency: 2,
          join: 'any',
          trailing: 'drain-active',
          stage: async (ctx) => {
            started.push(ctx.id)
            await wait(ctx.id === 1 ? 5 : 15)
            finished.push(ctx.id)
            return { id: ctx.id, winner: true }
          },
          split: () => [{ id: 1 }, { id: 2 }, { id: 3 }],
          combine: (ctx, children) => {
            ctx.winners = children.map((child) => child.id)
            return ctx
          },
        }) as any,
      ])

    const legacyStarted: number[] = []
    const legacyFinished: number[] = []
    const compiledStarted: number[] = []
    const compiledFinished: number[] = []
    const legacyPipeline = makePipeline(legacyStarted, legacyFinished)
    const compiledPipeline = makePipeline(compiledStarted, compiledFinished)
    const compiledPlan = compilePipelinePlan(compiledPipeline as any)

    const legacyResult = await executeLegacyPipeline(legacyPipeline, { winners: [] })
    const compiledResult = await executePlanPromise(compiledPlan, { winners: [] })

    expectResultParity(legacyResult, compiledResult)
    expect(legacyStarted).toEqual([1, 2])
    expect(compiledStarted).toEqual([1, 2])
    expect(legacyFinished).toEqual([1, 2])
    expect(compiledFinished).toEqual([1, 2])
  })

  it('preserves Parallel join-quorum trailing-drain parity', async () => {
    const makePipeline = (started: number[]) =>
      new Pipeline<{ winners: number[] }>([
        new Parallel<{ winners: number[] }, { id: number; winner?: boolean }>({
          concurrency: 4,
          join: 'quorum',
          quorum: 2,
          trailing: 'drain-active',
          stage: async (ctx) => {
            started.push(ctx.id)
            await wait(ctx.id >= 3 ? 15 : 5)
            return { id: ctx.id, winner: true }
          },
          split: () => [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }],
          combine: (ctx, children) => {
            ctx.winners = children.map((child) => child.id)
            return ctx
          },
        }) as any,
      ])

    const legacyStarted: number[] = []
    const compiledStarted: number[] = []
    const legacyPipeline = makePipeline(legacyStarted)
    const compiledPipeline = makePipeline(compiledStarted)
    const compiledPlan = compilePipelinePlan(compiledPipeline as any)

    const legacyResult = await executeLegacyPipeline(legacyPipeline, { winners: [] })
    const compiledResult = await executePlanPromise(compiledPlan, { winners: [] })

    expectResultParity(legacyResult, compiledResult)
    expect(legacyStarted).toEqual([1, 2, 3, 4])
    expect(compiledStarted).toEqual([1, 2, 3, 4])
  })

  it('preserves Parallel trailing-drain-timeout parity', async () => {
    const makePipeline = (started: number[], finished: number[]) =>
      new Pipeline<{ winners: number[] }>([
        new Parallel<{ winners: number[] }, { id: number; winner?: boolean }>({
          concurrency: 2,
          join: 'any',
          trailing: 'drain-active',
          trailingTimeout: 5,
          stage: async (ctx) => {
            started.push(ctx.id)
            await wait(ctx.id === 1 ? 5 : 40)
            finished.push(ctx.id)
            return { id: ctx.id, winner: true }
          },
          split: () => [{ id: 1 }, { id: 2 }, { id: 3 }],
          combine: (ctx, children) => {
            ctx.winners = children.map((child) => child.id)
            return ctx
          },
        }) as any,
      ])

    const legacyStarted: number[] = []
    const legacyFinished: number[] = []
    const compiledStarted: number[] = []
    const compiledFinished: number[] = []
    const legacyPipeline = makePipeline(legacyStarted, legacyFinished)
    const compiledPipeline = makePipeline(compiledStarted, compiledFinished)
    const compiledPlan = compilePipelinePlan(compiledPipeline as any)

    const legacyResult = await executeLegacyPipeline(legacyPipeline, { winners: [] })
    const compiledResult = await executePlanPromise(compiledPlan, { winners: [] })

    expectResultParity(legacyResult, compiledResult)
    expect(legacyStarted).toEqual([1, 2])
    expect(compiledStarted).toEqual([1, 2])
    expect(legacyFinished).toEqual([1])
    expect(compiledFinished).toEqual([1])

    await wait(50)
    expect(legacyFinished).toEqual([1, 2])
    expect(compiledFinished).toEqual([1, 2])
  })

  it('preserves Parallel abort-signal parity on early success', async () => {
    const makePipeline = (
      started: number[],
      finished: number[],
      aborted: number[],
    ) =>
      new Pipeline<{ winners: number[] }>([
        new Parallel<
          { winners: number[] },
          { id: number; winner?: boolean; aborted?: boolean }
        >({
          concurrency: 2,
          join: 'any',
          stage: function (_err, ctx, done) {
            started.push(ctx.id)

            if (ctx.id === 1) {
              setTimeout(() => {
                done(undefined, { id: ctx.id, winner: true })
              }, 5)
              return
            }

            const signal = getExecutionSignal(ctx)
            const timer = setTimeout(() => {
              finished.push(ctx.id)
              done(undefined, { id: ctx.id, winner: true })
            }, 40)

            signal?.addEventListener('abort', () => {
              aborted.push(ctx.id)
              clearTimeout(timer)
              done(undefined, { id: ctx.id, aborted: true })
            }, { once: true })
          },
          split: () => [{ id: 1 }, { id: 2 }, { id: 3 }],
          combine: (ctx, children) => {
            ctx.winners = children.map((child) => child.id)
            return ctx
          },
        }) as any,
      ])

    const legacyStarted: number[] = []
    const legacyFinished: number[] = []
    const legacyAborted: number[] = []
    const compiledStarted: number[] = []
    const compiledFinished: number[] = []
    const compiledAborted: number[] = []
    const legacyPipeline = makePipeline(legacyStarted, legacyFinished, legacyAborted)
    const compiledPipeline = makePipeline(compiledStarted, compiledFinished, compiledAborted)
    const compiledPlan = compilePipelinePlan(compiledPipeline as any)

    const legacyResult = await executeLegacyPipeline(legacyPipeline, { winners: [] })
    const compiledResult = await executePlanPromise(compiledPlan, { winners: [] })

    expectResultParity(legacyResult, compiledResult)
    expect(legacyStarted).toEqual([1, 2])
    expect(compiledStarted).toEqual([1, 2])
    expect(legacyAborted).toEqual([2])
    expect(compiledAborted).toEqual([2])

    await wait(50)
    expect(legacyFinished).toEqual([])
    expect(compiledFinished).toEqual([])
  })

  it('preserves Parallel abort-signal parity after trailing timeout', async () => {
    const makePipeline = (
      started: number[],
      finished: number[],
      aborted: number[],
    ) =>
      new Pipeline<{ winners: number[] }>([
        new Parallel<
          { winners: number[] },
          { id: number; winner?: boolean; aborted?: boolean }
        >({
          concurrency: 2,
          join: 'any',
          trailing: 'drain-active',
          trailingTimeout: 5,
          stage: function (_err, ctx, done) {
            started.push(ctx.id)

            if (ctx.id === 1) {
              setTimeout(() => {
                done(undefined, { id: ctx.id, winner: true })
              }, 5)
              return
            }

            const signal = getExecutionSignal(ctx)
            const timer = setTimeout(() => {
              finished.push(ctx.id)
              done(undefined, { id: ctx.id, winner: true })
            }, 40)

            signal?.addEventListener('abort', () => {
              aborted.push(ctx.id)
              clearTimeout(timer)
              done(undefined, { id: ctx.id, aborted: true })
            }, { once: true })
          },
          split: () => [{ id: 1 }, { id: 2 }, { id: 3 }],
          combine: (ctx, children) => {
            ctx.winners = children.map((child) => child.id)
            return ctx
          },
        }) as any,
      ])

    const legacyStarted: number[] = []
    const legacyFinished: number[] = []
    const legacyAborted: number[] = []
    const compiledStarted: number[] = []
    const compiledFinished: number[] = []
    const compiledAborted: number[] = []
    const legacyPipeline = makePipeline(legacyStarted, legacyFinished, legacyAborted)
    const compiledPipeline = makePipeline(compiledStarted, compiledFinished, compiledAborted)
    const compiledPlan = compilePipelinePlan(compiledPipeline as any)

    const legacyResult = await executeLegacyPipeline(legacyPipeline, { winners: [] })
    const compiledResult = await executePlanPromise(compiledPlan, { winners: [] })

    expectResultParity(legacyResult, compiledResult)
    expect(legacyStarted).toEqual([1, 2])
    expect(compiledStarted).toEqual([1, 2])
    expect(legacyAborted).toEqual([2])
    expect(compiledAborted).toEqual([2])

    await wait(50)
    expect(legacyFinished).toEqual([])
    expect(compiledFinished).toEqual([])
  })

  it('preserves DoWhile callback-error parity', async () => {
    const makePipeline = () =>
      new Pipeline<{ n: number }>([
        new DoWhile<{ n: number }>({
          stage: (_ctx, done) => {
            done(new Error('loop-failed'))
          },
          reachEnd: (err, _ctx, iter) => !!err || iter > 0,
        }) as any,
      ])

    const legacyPipeline = makePipeline()
    const compiledPipeline = makePipeline()
    const compiledPlan = compilePipelinePlan(compiledPipeline as any)

    const legacyError: any = await executeLegacyPipeline(legacyPipeline, {
      n: 0,
    }).catch((err) => err)
    const compiledError: any = await executePlanPromise(compiledPlan, {
      n: 0,
    }).catch((err) => err)

    expect(legacyError.code).toBe(compiledError.code)
    expect(legacyError.chain.primary.message).toBe(
      compiledError.chain.primary.message,
    )
    expect(compiledError.chain.primary.message).toBe('loop-failed')
  })

  it('preserves timeout overdue error parity', async () => {
    const makePipeline = () =>
      new Pipeline<{ result: string }>([
        new Timeout<{ result: string }>({
          timeout: 10,
          stage: (_ctx, done) => {
            setTimeout(() => done(undefined, { result: 'main' }), 40)
          },
          overdue: () => {
            throw new Error('overdue-failed')
          },
        }) as any,
      ])

    const legacyPipeline = makePipeline()
    const compiledPipeline = makePipeline()
    const compiledPlan = compilePipelinePlan(compiledPipeline as any)

    const legacyError: any = await executeLegacyPipeline(legacyPipeline, {
      result: 'start',
    }).catch((err) => err)
    const compiledError: any = await executePlanPromise(compiledPlan, {
      result: 'start',
    }).catch((err) => err)

    expect(legacyError.code).toBe(compiledError.code)
    expect(legacyError.chain.primary.message).toBe(
      compiledError.chain.primary.message,
    )
    expect(compiledError.chain.primary.message).toBe('overdue-failed')
  })

  it('preserves timeout abort-signal parity', async () => {
    const makePipeline = (stats: { aborted: boolean }) =>
      new Pipeline<{ result?: string }>([
        new Timeout<{ result?: string }>({
          timeout: 10,
          stage: (_err, ctx, _done) => {
            const signal = getExecutionSignal(ctx)
            signal?.addEventListener('abort', () => {
              stats.aborted = true
            }, { once: true })
          },
          overdue: (ctx) => {
            ctx.result = 'overdue'
            return ctx
          },
        }) as any,
      ])

    const legacyStats = { aborted: false }
    const compiledStats = { aborted: false }
    const legacyPipeline = makePipeline(legacyStats)
    const compiledPipeline = makePipeline(compiledStats)
    const compiledPlan = compilePipelinePlan(compiledPipeline as any)

    const legacyResult = await executeLegacyPipeline(legacyPipeline, {})
    const compiledResult = await executePlanPromise(compiledPlan, {})

    expectResultParity(legacyResult, compiledResult)
    expect(legacyResult.result).toBe('overdue')
    expect(compiledResult.result).toBe('overdue')
    expect(legacyStats.aborted).toBe(true)
    expect(compiledStats.aborted).toBe(true)
  })

  it('preserves execute-level abort-signal parity between legacy and compiled Pipeline.execute', async () => {
    const makePipeline = (seenSignals: AbortSignal[]) =>
      new Pipeline<{ n: number }>([
        new Stage<{ n: number }>({
          run: (ctx, done) => {
            const signal = getExecutionSignal(ctx)

            if (signal) {
              seenSignals.push(signal)
            }

            const timer = setTimeout(() => {
              done(undefined, ctx)
            }, 40)

            signal?.addEventListener('abort', () => {
              clearTimeout(timer)
            }, { once: true })
          },
        }) as any,
      ])

    const legacySignals: AbortSignal[] = []
    const compiledSignals: AbortSignal[] = []
    const legacyPipeline = makePipeline(legacySignals)
    const compiledPipeline = makePipeline(compiledSignals)
    const legacyController = new AbortController()
    const compiledController = new AbortController()

    const legacyExecution = executePipelineWithCompiledFlag(
      legacyPipeline,
      { n: 0 },
      false,
      { signal: legacyController.signal },
    ).catch((err) => err)
    const compiledExecution = executePipelineWithCompiledFlag(
      compiledPipeline,
      { n: 0 },
      true,
      { signal: compiledController.signal },
    ).catch((err) => err)

    legacyController.abort()
    compiledController.abort()

    const legacyError: any = await legacyExecution
    const compiledError: any = await compiledExecution

    expect(legacyError.code).toBe(ErrorCode.ERR_STAGE_ABORTED)
    expect(compiledError.code).toBe(ErrorCode.ERR_STAGE_ABORTED)
    expect(legacySignals).toEqual([legacyController.signal])
    expect(compiledSignals).toEqual([compiledController.signal])
  })

  it('preserves callback execute abort parity for pre-aborted Pipeline signals', async () => {
    let legacyRuns = 0
    let compiledRuns = 0
    const makePipeline = (runs: { count: number }) =>
      new Pipeline<{ n: number }>([
        new Stage<{ n: number }>({
          run: (ctx) => {
            runs.count += 1
            return ctx
          },
        }) as any,
      ])

    const legacyState = { count: legacyRuns }
    const compiledState = { count: compiledRuns }
    const legacyPipeline = makePipeline(legacyState)
    const compiledPipeline = makePipeline(compiledState)
    const legacyController = new AbortController()
    const compiledController = new AbortController()

    legacyController.abort(new Error('legacy-abort'))
    compiledController.abort(new Error('compiled-abort'))

    const legacyError: any = await executePipelineCallbackWithCompiledFlag(
      legacyPipeline,
      { n: 0 },
      false,
      { signal: legacyController.signal },
    ).catch((err) => err)
    const compiledError: any = await executePipelineCallbackWithCompiledFlag(
      compiledPipeline,
      { n: 0 },
      true,
      { signal: compiledController.signal },
    ).catch((err) => err)

    expect(legacyError.code).toBe(ErrorCode.ERR_STAGE_ABORTED)
    expect(compiledError.code).toBe(ErrorCode.ERR_STAGE_ABORTED)
    expect(legacyState.count).toBe(0)
    expect(compiledState.count).toBe(0)
  })

  it('preserves callback execute late-abort parity between legacy and compiled Pipeline.execute', async () => {
    const makePipeline = (stats: { started: number; aborted: number }) =>
      new Pipeline<{ n: number }>([
        new Stage<{ n: number }>({
          run: (ctx, done) => {
            stats.started += 1
            const signal = getExecutionSignal(ctx)
            const timer = setTimeout(() => {
              done(undefined, ctx)
            }, 40)

            signal?.addEventListener('abort', () => {
              stats.aborted += 1
              clearTimeout(timer)
            }, { once: true })
          },
        }) as any,
      ])

    const legacyStats = { started: 0, aborted: 0 }
    const compiledStats = { started: 0, aborted: 0 }
    const legacyPipeline = makePipeline(legacyStats)
    const compiledPipeline = makePipeline(compiledStats)
    const legacyController = new AbortController()
    const compiledController = new AbortController()

    const legacyExecution = executePipelineObservedCallbackWithCompiledFlag(
      legacyPipeline,
      { n: 0 },
      false,
      { signal: legacyController.signal },
    )

    await wait(5)
    legacyController.abort(new Error('late-legacy-abort'))

    const legacyError: any = await legacyExecution.promise.catch((err) => err)

    const compiledExecution = executePipelineObservedCallbackWithCompiledFlag(
      compiledPipeline,
      { n: 0 },
      true,
      { signal: compiledController.signal },
    )

    await wait(5)
    compiledController.abort(new Error('late-compiled-abort'))

    const compiledError: any = await compiledExecution.promise.catch((err) => err)

    expect(legacyError.code).toBe(ErrorCode.ERR_STAGE_ABORTED)
    expect(compiledError.code).toBe(ErrorCode.ERR_STAGE_ABORTED)
    expect(legacyStats.started).toBe(1)
    expect(compiledStats.started).toBe(1)
    expect(legacyStats.aborted).toBe(1)
    expect(compiledStats.aborted).toBe(1)

    await wait(50)
    expect(legacyExecution.getCallbackCount()).toBe(1)
    expect(compiledExecution.getCallbackCount()).toBe(1)
  })

  it('preserves inbound err forwarding for compiled stage-instance dispatch', async () => {
    const injectedErr = new Error('forward-me')
    const legacySeen: string[] = []
    const compiledSeen: string[] = []

    const legacyStage = new Stage<{ n: number }>({
      run: (err, ctx, done) => {
        legacySeen.push(err?.code ?? err?.message ?? 'missing')
        done(undefined, ctx)
      },
    }) as any

    const compiledStage = new Stage<{ n: number }>({
      run: (err, ctx, done) => {
        compiledSeen.push(err?.code ?? err?.message ?? 'missing')
        done(undefined, ctx)
      },
    }) as any

    const compiledPlan = compilePipelinePlan(new Pipeline<{ n: number }>([
      compiledStage,
    ]) as any)

    const legacyResult = await (legacyStage as any).execute(injectedErr, { n: 0 })
    const compiledResult = await executePlanPromise(
      compiledPlan,
      { n: 0 },
      injectedErr,
    )

    expect(compiledPlan.mode).toBe('compiled-static')
    expect(legacyResult.n).toBe(0)
    expect(compiledResult.n).toBe(0)
    expect(legacySeen).toEqual([ErrorCode.ERR_STAGE_THROW])
    expect(compiledSeen).toEqual([ErrorCode.ERR_STAGE_THROW])
  })

  it('preserves rescue-modified-context parity in compiled-static plans', async () => {
    const makePipeline = () =>
      new Pipeline<{ n: number }>([
        new Stage<{ n: number }>({
          run: () => {
            throw new Error('rescued-boom')
          },
          rescue: (_err, ctx) => {
            ctx.n = 77
          },
        }) as any,
      ])

    const legacyPipeline = makePipeline()
    const compiledPipeline = makePipeline()
    const compiledPlan = compilePipelinePlan(compiledPipeline as any)

    const legacyResult = await executeLegacyPipeline(legacyPipeline, { n: 0 })
    const compiledResult = await executePlanPromise(compiledPlan, { n: 0 })

    expect(compiledPlan.mode).toBe('compiled-static')
    expectResultParity(legacyResult, compiledResult)
    expect(compiledResult.n).toBe(77)
  })

  it('preserves ensure-throw parity in compiled-static plans', async () => {
    const makePipeline = () =>
      new Pipeline<{ n: number }>([
        new Stage<{ n: number }>({
          ensure: (_ctx) => {
            throw new Error('ensure-failed')
          },
          run: (ctx) => {
            ctx.n += 1
          },
        }) as any,
      ])

    const legacyPipeline = makePipeline()
    const compiledPipeline = makePipeline()
    const compiledPlan = compilePipelinePlan(compiledPipeline as any)

    const legacyError: any = await executeLegacyPipeline(legacyPipeline, {
      n: 0,
    }).catch((err) => err)
    const compiledError: any = await executePlanPromise(compiledPlan, {
      n: 0,
    }).catch((err) => err)

    expectErrorParity(legacyError, compiledError, 'ensure-failed')
  })

  it('preserves validate-reject parity in compiled-static plans', async () => {
    const makePipeline = () =>
      new Pipeline<{ n: number }>([
        new Stage<{ n: number }>({
          validate: async (_ctx) => {
            throw new Error('validate-failed')
          },
          run: (ctx) => {
            ctx.n += 1
          },
        }) as any,
      ])

    const legacyPipeline = makePipeline()
    const compiledPipeline = makePipeline()
    const compiledPlan = compilePipelinePlan(compiledPipeline as any)

    const legacyError: any = await executeLegacyPipeline(legacyPipeline, {
      n: 0,
    }).catch((err) => err)
    const compiledError: any = await executePlanPromise(compiledPlan, {
      n: 0,
    }).catch((err) => err)

    expectErrorParity(legacyError, compiledError, 'validate-failed')
  })

  it('preserves async-reject parity in compiled-static plans', async () => {
    const makePipeline = () =>
      new Pipeline<{ n: number }>([
        async () => {
          throw new Error('async-failed')
        },
      ])

    const legacyPipeline = makePipeline()
    const compiledPipeline = makePipeline()
    const compiledPlan = compilePipelinePlan(compiledPipeline as any)

    const legacyError: any = await executeLegacyPipeline(legacyPipeline, {
      n: 0,
    }).catch((err) => err)
    const compiledError: any = await executePlanPromise(compiledPlan, {
      n: 0,
    }).catch((err) => err)

    expectErrorParity(legacyError, compiledError, 'async-failed')
  })

  it('preserves throw-after-callback parity in compiled-static plans', async () => {
    const makePipeline = () =>
      new Pipeline<{ n: number }>([
        (_ctx, done) => {
          done(undefined, { n: 1 })
          throw new Error('late-failed')
        },
      ])

    const legacyPipeline = makePipeline()
    const compiledPipeline = makePipeline()
    const compiledPlan = compilePipelinePlan(compiledPipeline as any)

    const legacyResult = await executeLegacyPipeline(legacyPipeline, { n: 0 })
    const compiledResult = await executePlanPromise(compiledPlan, { n: 0 })

    expectResultParity(legacyResult, compiledResult)
    expect(compiledResult.n).toBe(1)
  })

  it('preserves fallback-island rescue parity in compiled-hybrid plans', async () => {
    const makePipeline = () =>
      new Pipeline<{ n: number }>([
        new Wrap<{ n: number }, { n: number }>({
          stage: () => {
            throw new Error('hybrid-boom')
          },
          prepare: (ctx) => ctx,
          finalize: (_ctx, retCtx) => retCtx,
          rescue: (_err, ctx) => {
            ctx.n = 15
          },
        }) as any,
      ])

    const legacyPipeline = makePipeline()
    const compiledPipeline = makePipeline()
    const compiledPlan = compilePipelinePlan(compiledPipeline as any)

    const legacyResult = await executeLegacyPipeline(legacyPipeline, { n: 0 })
    const compiledResult = await executePlanPromise(compiledPlan, { n: 0 })

    expect(compiledPlan.mode).toBe('compiled-hybrid')
    expect(compiledPlan.ops.some((op) => op.op === 'RUN_FALLBACK_STAGE')).toBe(
      true,
    )
    expectResultParity(legacyResult, compiledResult)
    expect(compiledResult.n).toBe(15)
  })

  it('preserves fallback-island ensure parity in compiled-hybrid plans', async () => {
    const makePipeline = () =>
      new Pipeline<{ n: number }>([
        new Wrap<{ n: number }, { n: number }>({
          ensure: (_ctx) => {
            throw new Error('hybrid-ensure-failed')
          },
          stage: (ctx) => {
            ctx.n += 1
          },
          prepare: (ctx) => ctx,
          finalize: (_ctx, retCtx) => retCtx,
        }) as any,
      ])

    const legacyPipeline = makePipeline()
    const compiledPipeline = makePipeline()
    const compiledPlan = compilePipelinePlan(compiledPipeline as any)

    const legacyResult = await executeLegacyPipeline(legacyPipeline, { n: 0 })
    const compiledResult = await executePlanPromise(compiledPlan, { n: 0 })

    expect(compiledPlan.mode).toBe('compiled-hybrid')
    expect(compiledPlan.ops.some((op) => op.op === 'RUN_FALLBACK_STAGE')).toBe(
      true,
    )
    expectResultParity(legacyResult, compiledResult)
    expect(compiledResult.n).toBe(1)
  })

  it('preserves fallback-island validate parity in compiled-hybrid plans', async () => {
    const makePipeline = () =>
      new Pipeline<{ n: number }>([
        new Wrap<{ n: number }, { n: number }>({
          validate: async (_ctx) => {
            throw new Error('hybrid-validate-failed')
          },
          stage: (ctx) => {
            ctx.n += 1
          },
          prepare: (ctx) => ctx,
          finalize: (_ctx, retCtx) => retCtx,
        }) as any,
      ])

    const legacyPipeline = makePipeline()
    const compiledPipeline = makePipeline()
    const compiledPlan = compilePipelinePlan(compiledPipeline as any)

    const legacyResult = await executeLegacyPipeline(legacyPipeline, { n: 0 })
    const compiledResult = await executePlanPromise(compiledPlan, { n: 0 })

    expect(compiledPlan.mode).toBe('compiled-hybrid')
    expect(compiledPlan.ops.some((op) => op.op === 'RUN_FALLBACK_STAGE')).toBe(
      true,
    )
    expectResultParity(legacyResult, compiledResult)
    expect(compiledResult.n).toBe(1)
  })

  it('preserves fallback-island async-reject parity in compiled-hybrid plans', async () => {
    const makePipeline = () =>
      new Pipeline<{ n: number }>([
        new Wrap<{ n: number }, { n: number }>({
          validate: (_ctx) => true,
          stage: async () => {
            throw new Error('hybrid-async-failed')
          },
          prepare: (ctx) => ctx,
          finalize: (_ctx, retCtx) => retCtx,
        }) as any,
      ])

    const legacyPipeline = makePipeline()
    const compiledPipeline = makePipeline()
    const compiledPlan = compilePipelinePlan(compiledPipeline as any)

    const legacyError: any = await executeLegacyPipeline(legacyPipeline, {
      n: 0,
    }).catch((err) => err)
    const compiledError: any = await executePlanPromise(compiledPlan, {
      n: 0,
    }).catch((err) => err)

    expect(compiledPlan.mode).toBe('compiled-hybrid')
    expect(compiledPlan.ops.some((op) => op.op === 'RUN_FALLBACK_STAGE')).toBe(
      true,
    )
    expectErrorParity(legacyError, compiledError, 'hybrid-async-failed')
  })

  it('preserves fallback-island callback-error parity in compiled-hybrid plans', async () => {
    const makePipeline = () =>
      makeHybridFallbackPipeline<{ n: number }>((_ctx, done) => {
        done(new Error('hybrid-callback-failed'))
      })

    const legacyPipeline = makePipeline()
    const compiledPipeline = makePipeline()
    const compiledPlan = compilePipelinePlan(compiledPipeline as any)

    const legacyError: any = await executeLegacyPipeline(legacyPipeline, {
      n: 0,
    }).catch((err) => err)
    const compiledError: any = await executePlanPromise(compiledPlan, {
      n: 0,
    }).catch((err) => err)

    expect(compiledPlan.mode).toBe('compiled-hybrid')
    expect(compiledPlan.ops.some((op) => op.op === 'RUN_FALLBACK_STAGE')).toBe(
      true,
    )
    expectErrorParity(legacyError, compiledError, 'hybrid-callback-failed')
  })

  it('preserves fallback-island callback-double parity in compiled-hybrid plans', async () => {
    const makePipeline = () =>
      makeHybridFallbackPipeline<{ n: number }>(
        new Pipeline<{ n: number }>([
          (_ctx, done) => {
            done(undefined, { n: 2 })
            done(undefined, { n: 3 })
          },
        ]),
      )

    const legacyPipeline = makePipeline()
    const compiledPipeline = makePipeline()
    const compiledPlan = compilePipelinePlan(compiledPipeline as any)

    const legacyResult = await executeLegacyPipeline(legacyPipeline, { n: 0 })
    const compiledResult = await executePlanPromise(compiledPlan, { n: 0 })

    expect(compiledPlan.mode).toBe('compiled-hybrid')
    expect(compiledPlan.ops.some((op) => op.op === 'RUN_FALLBACK_STAGE')).toBe(
      true,
    )
    expectResultParity(legacyResult, compiledResult)
    expect(compiledResult.n).toBe(2)
  })

  it('preserves fallback-island throw-after-callback parity in compiled-hybrid plans', async () => {
    const makePipeline = () =>
      makeHybridFallbackPipeline<{ n: number }>(
        new Pipeline<{ n: number }>([
          (_ctx, done) => {
            done(undefined, { n: 1 })
            throw new Error('hybrid-late-failed')
          },
        ]),
      )

    const legacyPipeline = makePipeline()
    const compiledPipeline = makePipeline()
    const compiledPlan = compilePipelinePlan(compiledPipeline as any)

    const legacyResult = await executeLegacyPipeline(legacyPipeline, { n: 0 })
    const compiledResult = await executePlanPromise(compiledPlan, { n: 0 })

    expect(compiledPlan.mode).toBe('compiled-hybrid')
    expect(compiledPlan.ops.some((op) => op.op === 'RUN_FALLBACK_STAGE')).toBe(
      true,
    )
    expectResultParity(legacyResult, compiledResult)
    expect(compiledResult.n).toBe(1)
  })

  it('preserves fallback-island timeout-overdue-error parity in compiled-hybrid plans', async () => {
    const makePipeline = () =>
      makeHybridFallbackPipeline<{ n: number }>(
        new Timeout<{ n: number }>({
          timeout: 10,
          stage: (_ctx, done) => {
            setTimeout(() => done(undefined, { n: 99 }), 40)
          },
          overdue: () => {
            throw new Error('hybrid-overdue-failed')
          },
        }) as any,
      )

    const legacyPipeline = makePipeline()
    const compiledPipeline = makePipeline()
    const compiledPlan = compilePipelinePlan(compiledPipeline as any)

    const legacyError: any = await executeLegacyPipeline(legacyPipeline, {
      n: 0,
    }).catch((err) => err)
    const compiledError: any = await executePlanPromise(compiledPlan, {
      n: 0,
    }).catch((err) => err)

    expect(compiledPlan.mode).toBe('compiled-hybrid')
    expect(compiledPlan.ops.some((op) => op.op === 'RUN_FALLBACK_STAGE')).toBe(
      true,
    )
    expectErrorParity(legacyError, compiledError, 'hybrid-overdue-failed')
  })

  it('executes mixed fully compiled plan with same result as legacy runtime', async () => {
    const root = makeHybridParityPipeline()

    const plan = compilePipelinePlan(root as any)
    const legacyResult = await root.execute({ n: 0, branch: false })
    const compiledResult = await executePlanPromise(plan, {
      n: 0,
      branch: false,
    })

    expect(plan.mode).toBe('compiled-static')
    expect(plan.metadata.fallbackOps).toBe(0)
    expect(JSON.parse(JSON.stringify(compiledResult))).toEqual(
      JSON.parse(JSON.stringify(legacyResult)),
    )
    expect(compiledResult.n).toBe(11111)
  })

  it('preserves mixed fully compiled graph behavior when runtime flag is enabled', async () => {
    const root = makeHybridParityPipeline()
    const legacyResult = await root.execute({ n: 0, branch: false })

    __setCompiledPipelineEnabledForTests(true)

    try {
      const compiledResult = await root.execute({ n: 0, branch: false })

      expect((root as any).compiledPlan?.mode).toBe('compiled-static')
      expect(compiledResult).toEqual(legacyResult)
    } finally {
      __setCompiledPipelineEnabledForTests(undefined)
    }
  })

  it('defaults fully compiled-static Pipelines to compiled execution in auto mode', async () => {
    __setCompiledPipelineEnabledForTests(undefined)

    const root = new InspectablePipeline<{ n: number }>([
      (ctx) => {
        ctx.n += 1
      },
      (ctx) => {
        ctx.n += 10
      },
    ])

    expect(root.shouldUseCompiledByDefault()).toBe(true)

    const result = await root.execute({ n: 0 })

    expect((root as any).compiledPlan?.mode).toBe('compiled-static')
    expect(result.n).toBe(11)
  })

  it('uses compiled execution for wrapper-heavy Pipelines in auto mode', async () => {
    __setCompiledPipelineEnabledForTests(undefined)

    const root = new InspectablePipeline<{ n: number }>([
      (ctx) => {
        ctx.n += 1
      },
      new Wrap<{ n: number }, { n: number }>({
        stage: (ctx) => {
          ctx.n += 10
        },
        prepare: (ctx) => ctx,
        finalize: (_ctx, retCtx) => retCtx,
      }) as any,
    ])

    expect(root.shouldUseCompiledByDefault()).toBe(true)

    const result = await root.execute({ n: 0 })

    expect((root as any).compiledPlan?.mode).toBe('compiled-static')
    expect(result.n).toBe(11)
  })

  it('short-circuits on error and does not run later ops', async () => {
    let reachedTail = false
    const root = new Pipeline<{ n: number }>([
      (ctx) => {
        ctx.n += 1
      },
      () => {
        throw new Error('boom')
      },
      () => {
        reachedTail = true
      },
    ])

    const plan = compilePipelinePlan(root as any)

    await expect(executePlanPromise(plan, { n: 0 })).rejects.toBeDefined()
    expect(reachedTail).toBe(false)
  })

  it('preserves error primary message vs legacy runtime', async () => {
    const root = new Pipeline<{ n: number }>([
      () => {
        throw new Error('boom')
      },
    ])

    const plan = compilePipelinePlan(root as any)

    const legacyError = await root.execute({ n: 0 }).catch((err) => err)
    const compiledError = await executePlanPromise(plan, { n: 0 }).catch(
      (err) => err,
    )

    expect(legacyError.chain.primary.message).toBe('boom')
    expect(compiledError.chain.primary.message).toBe('boom')
  })

  it('controlled runtime flag switches Pipeline.execute to compiled path safely', async () => {
    __setCompiledPipelineEnabledForTests(true)

    try {
      const root = new Pipeline<{ n: number }>([
        (ctx) => {
          ctx.n += 1
        },
        (ctx) => {
          ctx.n += 10
        },
      ])

      const result = await root.execute({ n: 0 })
      expect(result.n).toBe(11)
    } finally {
      __setCompiledPipelineEnabledForTests(undefined)
    }
  })

  it('renders a readable plan dump', () => {
    const pipe = new Pipeline<{ n: number }>([
      (ctx) => {
        ctx.n += 1
      },
    ])

    const dump = planToString(compilePipelinePlan(pipe as any))

    expect(dump).toContain('CompiledPlan')
    expect(dump).toContain('RUN_STAGE_FN')
    expect(dump).toContain('RETURN')
  })

  it('renders explicit primitive ops in plan dump', () => {
    const pipe = new Pipeline<{ n: number; done: boolean }>([
      new Parallel<{ n: number; done: boolean }, { n: number }>({
        concurrency: 2,
        join: 'quorum',
        quorum: 2,
        trailing: 'drain-active',
        trailingTimeout: 7,
        stage: (ctx) => ({ n: ctx.n + 1 }),
        split: (ctx) => [{ n: ctx.n }],
        combine: (ctx, children) => {
          ctx.n = children[0].n
          return ctx
        },
      }) as any,
      new Sequential<{ n: number; done: boolean }, { n: number }>({
        stage: (ctx) => ({ n: ctx.n + 1 }),
        split: (ctx) => [{ n: ctx.n }],
        combine: (ctx, children) => {
          ctx.n = children[0].n
          return ctx
        },
      }) as any,
      new DoWhile<{ n: number; done: boolean }>({
        stage: (ctx) => ctx,
        reachEnd: (_err, _ctx, iter) => iter >= 1,
      }) as any,
      new RetryOnError<{ n: number; done: boolean }>({
        retry: 1,
        stage: (ctx) => ctx,
      }) as any,
      new Timeout<{ n: number; done: boolean }>({
        timeout: 0,
        stage: (ctx) => ctx,
      }) as any,
    ])

    const dump = planToString(compilePipelinePlan(pipe as any))

    expect(dump).toContain('RUN_SEQUENTIAL')
    expect(dump).toContain('RUN_PARALLEL')
    expect(dump).toContain('concurrency=2')
    expect(dump).toContain('join=quorum')
    expect(dump).toContain('quorum=2')
    expect(dump).toContain('trailing=drain-active')
    expect(dump).toContain('trailingTimeout=7')
    expect(dump).toContain('RUN_LOOP')
    expect(dump).toContain('RUN_RETRY')
    expect(dump).toContain('RUN_TIMEOUT')
  })
})
