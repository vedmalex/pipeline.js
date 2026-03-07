import { compilePipelinePlan } from '../compiled/compiler'
import { planToString } from '../compiled/debug'
import { executeCompiledPlan } from '../compiled/executor'
import { DoWhile } from '../dowhile'
import { IfElse } from '../ifelse'
import { __setCompiledPipelineEnabledForTests, Pipeline } from '../pipeline'
import { RetryOnError } from '../retryonerror'
import { Sequential } from '../sequential'
import { Stage } from '../stage'
import { Timeout } from '../timeout'
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
    expect(dump).toContain('RUN_LOOP')
    expect(dump).toContain('RUN_RETRY')
    expect(dump).toContain('RUN_TIMEOUT')
  })
})
