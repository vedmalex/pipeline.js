import 'jest'
import { z } from 'zod'
import { stage } from './StageBuilderWithZod'
import { makeCallbackArgs } from './types'

describe('stageBuilder', () => {
  // дальше работаем с типами!!! чтобы был контроль входщих данных и выходящих
  // исправить работу с Stage<any> похоже что TStage не нужен
  it('run', done => {
    const st = stage()
      .input(z.object({ name: z.string().optional() }))
      .output(z.object({ name: z.string() }))
      .run(ctx => {
        if (ctx) {
          ctx.name = 'name'
        }
      })
      .build()

    st.execute({}, (err, res) => {
      expect(err).toBeUndefined()
      expect(res).toMatchObject({ name: 'name' })
      done()
    })
  })
  it('create named', () => {
    const s = stage()
      .name('names stage').build()
    expect(s).not.toBeNull()
    expect(s).toMatchSnapshot('names stage')
  })
  it('create with function', () => {
    const s = stage()
      .input(z.object({ name: z.string().optional() }))
      .run(function (this) {
        this.name = 'run this Stage'
      }).build()

    expect(s).not.toBeNull()
    expect(s).toMatchSnapshot('function stage')
  })

  it('create with Lambda 3', () => {
    const s = stage()
      .input(z.object({ name: z.string().optional() }))
      .output(z.object({ name: z.string() }))
      .run((err, ctx, done) => {
        if (!err && ctx && done) {
          ctx.name = 'run the stage'
          done(makeCallbackArgs(undefined, ctx))
        } else if (done) {
          done(makeCallbackArgs(err))
        }
      }).build()
    expect(s).toMatchSnapshot('lambda stage')
  })

  it('intialize using schema and validate separately', () => {
    expect(() =>
      stage()
        .input(z.object({ name: z.string() }))
        .run(() => {})
        .build()
    ).not.toThrow()
    expect(() =>
      stage()
        .run(() => {})
        .input(z.object({}).passthrough())
        .build()
    ).not.toThrow()
  })

  it('validate using schema', done => {
    const st = stage()
      .run(() => {})
      .input(z.object({}).passthrough())
      .output(z.object({ name: z.string() }))
      .build()

    st.execute({ fullname: 1 }, (err, res) => {
      expect(err).not.toBeUndefined()
      expect(err).toMatchSnapshot()
      done()
    })
  })

  it('initialize other stuff sucessfully', () => {
    let st = stage()
      .name('stage')
      .run(() => {})
      .rescue(() => {})
      .build()

    expect(st.name).toBe('stage')
    expect(st.reportName).toBe(`STG:${st.name}`)
    expect(st).toMatchSnapshot('schema stage 1')
  })
  it('create with Lambda 2', () => {
    const s = stage()
      .input(z.object({ name: z.string() }))
      .run((err, ctx) => {
        if (!err && ctx) {
          ctx.name = 'run the stage'
          return Promise.resolve(ctx)
        } else {
          return Promise.reject(err)
        }
      })
    expect(s).toMatchSnapshot('lambda stage')
  })

  it('create with Config', () => {
    const s = stage()
      .input(z.object({name: z.string()}))
      .run((err, ctx, done) => {
        if (done) {
          if (!err && ctx) {
            ctx.name = 'run the stage'
            done(makeCallbackArgs(undefined, ctx))
          } else {
            done(makeCallbackArgs(err))
          }
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

  // it('rescue do not enter twice into single rescue block', () => {
  //   let rescue = 0
  //   var st = new Stage({
  //     run: function (err, ctx, done) {
  //       throw new Error('error')
  //     },
  //     rescue: function (err, conext) {
  //       rescue += 1
  //       if (err.payload[0].message !== 'some') {
  //         throw err
  //       }
  //     },
  //   })
  //   st.execute({}, (err, res) => {
  //     expect(rescue).toBe(1)
  //   })
  // })
})
