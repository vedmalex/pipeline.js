// import z from 'zod'
// import { CreateError } from './errors'
// import { StageConfig } from './StageConfig'
// import { CompileFunction, isRunPipelineFunction, Rescue, RunPipelineFunction } from './types'

// export class StageBuilder<Input, Output, Config extends StageConfig<Input, Output>> {
//   private cfg: Config
//   constructor() {
//     this.cfg = {} as Config
//   }
//   run(fn: RunPipelineFunction<Input, Output>) {
//     if (fn && isRunPipelineFunction(fn)) {
//       this.cfg.run = fn
//     } else {
//       throw CreateError('run should be a `RunPipelineFunction`')
//     }
//     return this
//   }
//   name(name: string) {
//     this.cfg.name = name
//     return this
//   }
//   rescue(fn: Rescue<Input, Output>) {
//     this.cfg.rescue = fn
//     return this
//   }
//   input(obj: z.Schema<Output>) {
//     this.cfg.input = obj
//     return this
//   }
//   compile(fn: CompileFunction<Input, Output>) {
//     this.cfg.compile = fn
//     return this
//   }
//   isValid() {
//     // StageConfigValidator.parse(this.cfg)
//   }
//   get config() {
//     return this.cfg
//   }
// }
