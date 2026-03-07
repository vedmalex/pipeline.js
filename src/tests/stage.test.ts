import { JSONSchemaType } from 'ajv'
import { createCodeError } from '../utils/ErrorList'
import { Stage } from '../stage'
import { Config } from '../config'
import { getExecutionSignal } from '../execution_signal'
import { ErrorCode } from '../utils/errors'

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describe('stage', () => {
  it('throw error', done => {
    let st = new Stage()
    expect.assertions(1)
    st.execute({}, (err, context) => {
      expect(err).not.toBeUndefined()
      done()
    })
  })

  it('throw error on timeout', done => {
    const current = Config.timeout
    Config.timeout = 100
    let st = new Stage((context, done) => {
      setTimeout(() => done(), 1000)
    })
    st.execute({}, (err, context) => {
      expect(err).not.toBeUndefined()
      Config.timeout = current
      done()
    })
  })

  it('empty run', done => {
    new Stage().execute({}, (err, res) => {
      expect(err).not.toBeUndefined()
      expect(res).toMatchObject({})
      done()
    })
  })
  it('create named', () => {
    const s = new Stage('name')
    expect(s).not.toBeNull()
    expect(s).toMatchSnapshot('names stage')
  })
  it('create with function', () => {
    const s = new Stage<{ name?: string }>(function RunStage(this: {
      name?: string
    }) {
      this.name = 'run this Stage'
    })
    expect(s).not.toBeNull()
    expect(s).toMatchSnapshot('function stage')
  })

  it('create with Lambda 3', () => {
    const s = new Stage<{ name: string }>((err, ctx, done) => {
      if (!err) {
        ctx.name = 'run the stage'
        done(undefined, ctx)
      } else {
        done(err)
      }
    })
    expect(s).toMatchSnapshot('lambda stage')
  })

  it('creates throws when both parameters validate and schema are passed', () => {
    expect(
      () =>
        new Stage({
          run: () => { },
          schema: {},
          validate: {},
        } as any),
    ).toThrow()
  })

  it('intialize using schema and validate separately', () => {
    expect(
      () =>
        new Stage<{ name?: string }>({
          run: () => { },
          validate: (_ctx: {}) => true,
        }),
    ).not.toThrow()
    expect(
      () =>
        new Stage({
          run: () => { },
          schema: {} as JSONSchemaType<{}>,
        }),
    ).not.toThrow()
  })

  it('validate using schema', () => {
    const st = new Stage<{ name: string }>({
      run: () => { },
      schema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
        required: ['name'],
        additionalProperties: false,
        errorMessage: 'should be an object with a name property',
      },
    })

    st.execute({ fullname: 1 } as unknown as { name: string }, (err, res) => {
      expect(err).not.toBeUndefined()
      expect(err).toMatchSnapshot()
    })
  })

  it('initialize other stuff sucessfully', () => {
    let stage = new Stage({
      run: () => { },
      ensure: () => { },
      rescue: () => { },
      name: 'stage',
    })
    expect(stage.name).toBe('stage')
    expect(stage.reportName).toBe(`STG:${stage.name}`)
    expect(stage).toMatchSnapshot('schema stage 1')
  })

  it('create with Lambda 2', () => {
    const s = new Stage((err, ctx) => {
      if (!err) {
        ctx.name = 'run the stage'
        return Promise.resolve(ctx)
      } else {
        return Promise.reject(err)
      }
    })
    expect(s).toMatchSnapshot('lambda stage')
  })

  it('create with Config', () => {
    const s = new Stage<{ name: string }>((err, ctx, done) => {
      if (!err) {
        ctx.name = 'run the stage'
        done(undefined, ctx)
      } else {
        done(err)
      }
    })
    expect(s).toMatchSnapshot('config stage')
  })

  // it('use Precompile to run everything', () => {
  //   type CTX = {
  //     name: string
  //   }
  //   interface Config extends StageConfig<CTX, CTX> {
  //     stages: Array<IStage<any, any> | RunPipelineFunction<any, any>>
  //     addStage(
  //       this: Config,
  //       stage:
  //         | StageConfig<CTX, CTX>
  //         | SingleStageFunction<CTX>
  //         | IStage<any, any>,
  //     ): void
  //   }

  //   const pipeline = new Stage<CTX, CTX, Config>({
  //     stages: [],
  //     precompile(this: Config) {
  //       let run: StageRun<CTX, CTX> = (
  //         err: Possible<CleanError>,
  //         context: CTX,
  //         done: CallbackFunction<CTX>,
  //       ) => {
  //         let i = -1
  //         //sequential run;
  //         let next = (err: Possible<CleanError>, context: CTX | undefiend) => {
  //           i += 1
  //           if (i < this.stages.length) {
  //             run_or_execute(this.stages[i], err, context, next)
  //           } else if (i == this.stages.length) {
  //             done(err, context)
  //           } else {
  //             done(new Error('done call more than once'), context)
  //           }
  //         }
  //         next(err, context)
  //       }

  //       if (this.stages.length > 0) {
  //         this.run = run
  //       } else {
  //         this.run = empty_run
  //       }
  //     },
  //     addStage(
  //       _stage:
  //         | StageConfig<CTX, CTX>
  //         | RunPipelineFunction<any, any>
  //         | IStage<any, any>,
  //     ) {
  //       let stage: IStage<any, any> | RunPipelineFunction<any, any> | undefined
  //       if (typeof _stage === 'function') {
  //         stage = _stage
  //       } else {
  //         if (typeof _stage === 'object') {
  //           if (!isIStage(_stage)) {
  //             stage = new Stage(_stage)
  //           } else {
  //             stage = _stage
  //           }
  //         }
  //       }
  //       if (stage) {
  //         this.stages.push(stage)
  //         this.run = undefined
  //       }
  //     },
  //   })
  // })

  it('supports promise execute options with AbortSignal', async () => {
    const observedSignals: AbortSignal[] = []
    const stage = new Stage<{ n: number }>({
      run: (ctx, done) => {
        const signal = getExecutionSignal(ctx)

        if (signal) {
          observedSignals.push(signal)
          signal.addEventListener('abort', () => {
            done(undefined, ctx)
          }, { once: true })
        }
      },
    })

    const controller = new AbortController()
    const execution = stage.execute({ n: 0 }, { signal: controller.signal })

    controller.abort(createCodeError(ErrorCode.ERR_STAGE_TIMEOUT))

    const err: any = await execution.catch((error) => error)
    expect(err.code).toBe(ErrorCode.ERR_STAGE_ABORTED)
    expect(observedSignals).toEqual([controller.signal])
  })

  it('supports callback execute options with AbortSignal', async () => {
    const stage = new Stage<{ n: number }>({
      run: (ctx, done) => {
        const timer = setTimeout(() => {
          done(undefined, ctx)
        }, 50)

        getExecutionSignal(ctx)?.addEventListener('abort', () => {
          clearTimeout(timer)
        }, { once: true })
      },
    })

    const controller = new AbortController()

    await new Promise<void>((resolve, reject) => {
      stage.execute({ n: 0 }, (err) => {
        try {
          expect(err).toBeDefined()
          expect((err as any).code).toBe(ErrorCode.ERR_STAGE_ABORTED)
          resolve()
        } catch (error) {
          reject(error)
        }
      }, { signal: controller.signal })

      controller.abort(createCodeError(ErrorCode.ERR_STAGE_TIMEOUT))
    })

    await wait(5)
  })

  it('does not confuse signal-shaped context with execute options in err-first promise form', async () => {
    const injectedErr = createCodeError(ErrorCode.ERR_UNKNOWN)
    const signal = new AbortController().signal
    const stage = new Stage<{ signal: AbortSignal }>({
      run: async (_err, ctx) => {
        return ctx
      },
    })

    const result = await (stage as any).execute(injectedErr, { signal })

    expect(result.signal).toBe(signal)
    expect(result.isClean).toBeUndefined()
  })

  it('forwards err in signal-shaped err-first promise form to run handlers', async () => {
    const injectedErr = createCodeError(ErrorCode.ERR_UNKNOWN)
    const signal = new AbortController().signal
    let seenErrCode: string | undefined

    const stage = new Stage<{ signal: AbortSignal }>({
      run: (err, ctx, done) => {
        seenErrCode = err?.code
        done(undefined, ctx)
      },
    })

    const result = await (stage as any).execute(injectedErr, { signal })

    expect(result.signal).toBe(signal)
    expect(seenErrCode).toBe(ErrorCode.ERR_UNKNOWN)
  })

  it('does not confuse signal-shaped context with execute options in 3-arg err-first promise form', async () => {
    const injectedErr = createCodeError(ErrorCode.ERR_UNKNOWN)
    const contextSignal = new AbortController().signal
    const executionController = new AbortController()
    let seenExecutionSignal: AbortSignal | undefined
    let seenErrCode: string | undefined

    const stage = new Stage<{
      signal: AbortSignal
    }>({
      run: (err, ctx, done) => {
        seenExecutionSignal = getExecutionSignal(ctx)
        seenErrCode = err?.code
        done(undefined, ctx)
      },
    })

    const result = await stage.execute(
      injectedErr,
      { signal: contextSignal },
      { signal: executionController.signal },
    )

    expect(result.signal).toBe(contextSignal)
    expect(seenExecutionSignal).toBe(executionController.signal)
    expect(seenErrCode).toBe(ErrorCode.ERR_UNKNOWN)
  })

  it('does not confuse signal-shaped context with execute options in 4-arg err-first callback form', async () => {
    const injectedErr = createCodeError(ErrorCode.ERR_UNKNOWN)
    const contextSignal = new AbortController().signal
    const executionController = new AbortController()
    let seenExecutionSignal: AbortSignal | undefined
    let seenErrCode: string | undefined

    const stage = new Stage<{
      signal: AbortSignal
    }>({
      run: (err, ctx, done) => {
        seenExecutionSignal = getExecutionSignal(ctx)
        seenErrCode = err?.code
        done(undefined, ctx)
      },
    })

    await new Promise<void>((resolve, reject) => {
      stage.execute(
        injectedErr,
        { signal: contextSignal },
        (err, ctx) => {
          try {
            expect(err).toBeUndefined()
            expect(ctx?.signal).toBe(contextSignal)
            resolve()
          } catch (error) {
            reject(error)
          }
        },
        { signal: executionController.signal },
      )
    })

    expect(seenExecutionSignal).toBe(executionController.signal)
    expect(seenErrCode).toBe(ErrorCode.ERR_UNKNOWN)
  })

  it('short-circuits pre-aborted execute options before running stage', async () => {
    let ran = false
    const stage = new Stage<{ n: number }>({
      run: (ctx) => {
        ran = true
        return ctx
      },
    })
    const controller = new AbortController()
    controller.abort(createCodeError(ErrorCode.ERR_STAGE_TIMEOUT))

    const err: any = await stage
      .execute({ n: 0 }, { signal: controller.signal })
      .catch((error) => error)

    expect(err.code).toBe(ErrorCode.ERR_STAGE_ABORTED)
    expect(ran).toBe(false)
  })
})
