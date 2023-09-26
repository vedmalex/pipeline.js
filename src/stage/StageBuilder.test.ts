// import 'jest'
// import { Stage } from './stage'
// import {z} from 'zod'

// type Person = {
//   id?:string
//   name?: string
// }

// describe("stageBuilder", () => {

//   it('empty run', done => {
//     new Stage<Person>(stage().config).execute({}, (err, res) => {
//       expect(err).not.toBeUndefined()
//       expect(res).toMatchObject({})
//       done()
//     })
//   })
//   it('create named', () => {

//     const s = stage<Person>()
//       .name('names stage').build()
//     expect(s).not.toBeNull()
//     expect(s).toMatchSnapshot('names stage')
//   })
//   it('create with function', () => {
//     const s = stage<Person>().run(function(this: { name?: string }) {
//       this.name = 'run this Stage'
//     }).build()
//     expect(s).not.toBeNull()
//     expect(s).toMatchSnapshot('function stage')
//   })

//   it('create with Lambda 3', () => {
//     const s = stage<Person>().run((err, ctx, done) => {
//       if (!err) {
//         ctx.name = 'run the stage'
//         done(undefined, ctx)
//       } else {
//         done(err)
//       }
//     }).build()
//     expect(s).toMatchSnapshot('lambda stage')
//   })

//   it('creates throws when both parameters validate and schema are passed', () => {
//     expect(
//       () =>
//         stage()
//           .run(() => { })
//           .schema(z.object({}))
//           .validate(() => false)
//       .build()
//     ).toThrow()
//   })

//   it('intialize using schema and validate separately', () => {
//     expect(
//       () =>
//         stage<Person>()
//           .run(() => { })
//           .validate((_ctx) => true,
//         ).build()
//     ).not.toThrow()
//     expect(
//       () =>
//         stage<Person>()
//           .run(() => { })
//           .schema(z.object({}).passthrough())
//       .build(),
//     ).not.toThrow()
//   })

//   it('validate using schema', () => {
//     const st = stage<Person>()
//           .run(() => { })
//       .schema(z.object({}).passthrough())
//       .build()

//     st.execute({ fullname: 1 } as unknown as { name: string }, (err, res) => {
//       expect(err).not.toBeUndefined()
//       expect(err).toMatchSnapshot()
//     })
//   })

//   it('initialize other stuff sucessfully', () => {
//     let st = stage()
//       .name('stage')
//       .run(() => { })
//       .ensure(() => { })
//       .rescue(()=>{})
//       .build()

//     expect(st.name).toBe('stage')
//     expect(st.reportName).toBe(`STG:${st.name}`)
//     expect(st).toMatchSnapshot('schema stage 1')
//   })
//   it('create with Lambda 2', () => {
//     const s = new Stage((err, ctx) => {
//       if (!err) {
//         ctx.name = 'run the stage'
//         return Promise.resolve(ctx)
//       } else {
//         return Promise.reject(err)
//       }
//     })
//     expect(s).toMatchSnapshot('lambda stage')
//   })

//   it('create with Config', () => {
//     const s = new Stage<{ name: string }>((err, ctx, done) => {
//       if (!err) {
//         ctx.name = 'run the stage'
//         done(undefined, ctx)
//       } else {
//         done(err)
//       }
//     })
//     expect(s).toMatchSnapshot('config stage')
//   })

//   // it('use Precompile to run everything', () => {
//   //   type CTX = {
//   //     name: string
//   //   }
//   //   interface Config extends StageConfig<CTX, CTX> {
//   //     stages: Array<IStage<any, any> | RunPipelineFunction>
//   //     addStage(
//   //       this: Config,
//   //       stage:
//   //         | StageConfig<CTX, CTX>
//   //         | SingleStageFunction
//   //         | IStage<any, any>,
//   //     ): void
//   //   }

//   //   const pipeline = new Stage<CTX, CTX, Config>({
//   //     stages: [],
//   //     precompile(this: Config) {
//   //       let run: StageRun<CTX, CTX> = (
//   //         err: Possible<ComplexError>,
//   //         context: CTX,
//   //         done: CallbackFunction,
//   //       ) => {
//   //         let i = -1
//   //         //sequential run;
//   //         let next = (err: Possible<ComplexError>, context: CTX | undefiend) => {
//   //           i += 1
//   //           if (i < this.stages.length) {
//   //             run_or_execute(this.stages[i], err, context, next)
//   //           } else if (i == this.stages.length) {
//   //             done(err, context)
//   //           } else {
//   //             done(new Error('done call more than once'), context)
//   //           }
//   //         }
//   //         next(err, context)
//   //       }

//   //       if (this.stages.length > 0) {
//   //         this.run = run
//   //       } else {
//   //         this.run = empty_run
//   //       }
//   //     },
//   //     addStage(
//   //       _stage:
//   //         | StageConfig<CTX, CTX>
//   //         | RunPipelineFunction
//   //         | IStage<any, any>,
//   //     ) {
//   //       let stage: IStage<any, any> | RunPipelineFunction| undefined
//   //       if (typeof _stage === 'function') {
//   //         stage = _stage
//   //       } else {
//   //         if (typeof _stage === 'object') {
//   //           if (!isIStage(_stage)) {
//   //             stage = new Stage(_stage)
//   //           } else {
//   //             stage = _stage
//   //           }
//   //         }
//   //       }
//   //       if (stage) {
//   //         this.stages.push(stage)
//   //         this.run = undefined
//   //       }
//   //     },
//   //   })
//   // })

//   it('rescue do not enter twice into single rescue block', () => {
//     let rescue = 0
//     var st = new Stage({
//       run: function (err, ctx, done) {
//         throw new Error('error')
//       },
//       rescue: function (err, conext) {
//         rescue += 1
//         if (err.payload[0].message !== 'some') {
//           throw err
//         }
//       },
//     })
//     st.execute({}, (err, res) => {
//       expect(rescue).toBe(1)
//     })
//   })
// })
