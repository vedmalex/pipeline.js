import { JSONSchemaType } from 'ajv'
import 'jest'
import { Stage } from './stage'

describe('stage', () => {
  it('throw error', done => {
    let st = new Stage()
    expect.assertions(1)
    st.execute({}, (err, context) => {
      expect(err).not.toBeUndefined()
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
    const s = new Stage<{ name?: string }>(function RunStage(this: { name?: string }) {
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
          run: () => {},
          schema: {},
          validate: {},
        } as any),
    ).toThrow()
  })

  it('intialize using schema and validate separately', () => {
    expect(
      () =>
        new Stage<{ name?: string }>({
          run: () => {},
          validate: (_ctx: {}) => true,
        }),
    ).not.toThrow()
    expect(
      () =>
        new Stage({
          run: () => {},
          schema: {} as JSONSchemaType<{}>,
        }),
    ).not.toThrow()
  })

  it('validate using schema', () => {
    const st = new Stage<{ name: string }>({
      run: () => {},
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
      run: () => {},
      ensure: () => {},
      rescue: () => {},
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
  //     stages: Array<IStage<any, any> | RunPipelineFunction>
  //     addStage(
  //       this: Config,
  //       stage:
  //         | StageConfig<CTX, CTX>
  //         | SingleStageFunction
  //         | IStage<any, any>,
  //     ): void
  //   }

  //   const pipeline = new Stage<CTX, CTX, Config>({
  //     stages: [],
  //     precompile(this: Config) {
  //       let run: StageRun<CTX, CTX> = (
  //         err: Possible<ComplexError>,
  //         context: CTX,
  //         done: CallbackFunction,
  //       ) => {
  //         let i = -1
  //         //sequential run;
  //         let next = (err: Possible<ComplexError>, context: CTX | undefiend) => {
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
  //         | RunPipelineFunction
  //         | IStage<any, any>,
  //     ) {
  //       let stage: IStage<any, any> | RunPipelineFunction| undefined
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
})
