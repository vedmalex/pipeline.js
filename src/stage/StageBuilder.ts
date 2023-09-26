import { z } from 'zod'
import { CreateError } from './errors'
import { StageConfig } from './StageConfig'
import {
  CompileFunction,
  EnsureFunction,
  isRunPipelineFunction,
  Precompile,
  Rescue,
  RunPipelineFunction,
  StageObject,
  ValidateFunction,
} from './types'

export class StageBuilder<R extends StageObject, C extends StageConfig<R>> {
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
  rescue(fn: Rescue) {
    this.cfg.rescue = fn
    return this
  }
  schema(obj: z.Schema<R>) {
    this.cfg.schema = obj
    return this
  }
  ensure(fn: EnsureFunction<R>) {
    this.cfg.ensure = fn
    return this
  }
  validate(fn: ValidateFunction<R>) {
    this.cfg.validate = fn
    return this
  }
  compile(fn: CompileFunction<R>) {
    this.cfg.compile = fn
    return this
  }
  precompile(fn: Precompile<R>) {
    this.cfg.precompile = fn
    return this
  }
  isValid() {
    // StageConfigValidator.parse(this.cfg)
  }
  get config() {
    return this.cfg
  }
}
