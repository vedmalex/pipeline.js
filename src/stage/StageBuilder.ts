import z from 'zod'
import { CreateError } from './errors'
import { StageConfig } from './StageConfig'
import { CompileFunction, isRunPipelineFunction, Rescue, RunPipelineFunction } from './types'

export class StageBuilder<R, C extends StageConfig<R>> {
  private cfg: C
  constructor() {
    this.cfg = {} as C
  }
  run(fn: RunPipelineFunction<R>) {
    if (fn && isRunPipelineFunction(fn)) {
      this.cfg.run = fn
    } else {
      throw CreateError('run should be a `RunPipelineFunction`')
    }
    return this
  }
  name(name: string) {
    this.cfg.name = name
    return this
  }
  rescue(fn: Rescue<R>) {
    this.cfg.rescue = fn
    return this
  }
  input(obj: z.Schema<R>) {
    this.cfg.input = obj
    return this
  }
  compile(fn: CompileFunction<R>) {
    this.cfg.compile = fn
    return this
  }
  isValid() {
    // StageConfigValidator.parse(this.cfg)
  }
  get config() {
    return this.cfg
  }
}
