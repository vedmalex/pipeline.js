import { AnyStage, run_or_execute_async, SingleStageFunction, Stage, StageRun } from '../../stage'
import { DoWhileConfig } from './DoWhileConfig'
import { getDoWhileConfig } from './getDoWhileConfig'

export class DoWhile<
  Input,
  Output,
  T,
  Config extends DoWhileConfig<Input, Output, T> = DoWhileConfig<Input, Output, T>,
> extends Stage<Input, Output, Config> {
  constructor()
  constructor(stage: AnyStage<Input, Output>)
  constructor(config: Config)
  constructor(stageFn: SingleStageFunction<Input, Output>)
  constructor(config?: AnyStage<Input, Output> | Config | SingleStageFunction<Input, Output>) {
    super()
    if (config) {
      this._config = getDoWhileConfig<Input, Output, T, Config>(config)
    }
  }

  public override get reportName() {
    return `WHI:${this.config.name ? this.config.name : ''}`
  }

  public override toString() {
    return '[pipeline DoWhile]'
  }
  protected reachEnd(err: unknown, ctx: Input, iter: number): boolean {
    if (this.config.reachEnd) {
      let result = this.config.reachEnd(err, ctx, iter)
      if (typeof result === 'boolean') {
        return result
      } else {
        return Boolean(result)
      }
    } else {
      return true
    }
  }

  protected split(ctx: unknown, iter: number): any {
    if (this.config.split) {
      return this.config.split(ctx as Output, iter)
    } else {
      return ctx
    }
  }

  override compile(rebuild: boolean = false): StageRun<Input, Output> {
    let run: StageRun<Input, Output> = async (err, context, done) => {
      let iter = -1

      const next = async (err: unknown) => {
        iter++
        let retCtx: Output
        while (!this.reachEnd(err, context, iter)) {
          ;[err, retCtx] = await run_or_execute_async(this.config.stage, err, this.split(context, iter))
          if (err) {
            ;[err, context] = (await this.rescue_async(err, retCtx)) as [unknown, Input]
            if (err) {
              return done(err)
            }
          }
          iter++
        }

        done(err, context as unknown as Output)
      }

      next(err)
    }

    this.run = run as StageRun<Input, Output>

    return super.compile(rebuild)
  }
}
