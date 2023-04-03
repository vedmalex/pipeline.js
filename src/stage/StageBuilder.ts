import { JSONSchemaType } from 'ajv'
import * as z from 'zod'
import { StageConfig } from './StageConfig'
import { CompileFunction, EnsureFunction, Precompile, Rescue, RunPipelineFunction, ValidateFunction } from './types'
import { CreateError } from './errors'

export class StageBuilder<R, C extends StageConfig<R>> {
  private cfg: C
  constructor() {
    this.cfg = {} as C
  }
  run(fn: RunPipelineFunction<R>) {
    if (fn && RunPipelineFunction.safeParse(fn).success) {
      this.cfg.run = fn
    } else {
      throw CreateError('run should be a `RunPipelineFunction`')
    }
  }
  name(name: string) {
    this.cfg.name = z.string().parse(name)
    return this
  }
  rescue(fn: Rescue<R>) {
    this.cfg.rescue = fn
    return this
  }
  schema(obj: JSONSchemaType<R>) {
    this.cfg.schema = obj
    return this
  }
  ensure(fn: EnsureFunction<R>) {
    this.cfg.ensure = fn
    return this
  }
  validate(fn: ValidateFunction<R>) {
    this.cfg.validate = fn
    this.isValid()
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
    StageConfig.parse(this.cfg)
  }
  get config() {
    return StageConfig.parse(this.cfg)
  }
}
