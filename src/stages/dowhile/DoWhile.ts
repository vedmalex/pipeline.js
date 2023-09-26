import {
  AnyStage,
  run_or_execute_async,
  SingleStageFunction,
  Stage,
  StageRun,
} from '../../stage'
import { DoWhileConfig } from './DoWhileConfig'
import { getDoWhileConfig } from './getDoWhileConfig'

export class DoWhile<
  R,
  T,
  C extends DoWhileConfig<R, T> = DoWhileConfig<R, T>,
> extends Stage<R, C> {
  constructor()
  constructor(stage: AnyStage<R>)
  constructor(config: C)
  constructor(stageFn: SingleStageFunction<R>)
  constructor(config?: AnyStage<R> | C | SingleStageFunction<R>) {
    super()
    if (config) {
      this._config = getDoWhileConfig<R, T, C>(config)
    }
  }

  public override get reportName() {
    return `WHI:${this.config.name ? this.config.name : ''}`
  }

  public override toString() {
    return '[pipeline DoWhile]'
  }
  protected reachEnd(err: unknown, ctx: R, iter: number): boolean {
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
      return this.config.split(ctx as R, iter)
    } else {
      return ctx
    }
  }

  // override compile(rebuild: boolean = false): StageRun<R> {
  //   let run: StageRun<R> = (err, context, done) => {
  //     let iter: number = -1
  //     let next = (err: unknown) => {
  //       iter++
  //       if (this.reachEnd(err, context as R, iter)) {
  //         return done(err, context as R)
  //       } else {
  //         run_or_execute(this.config.stage, err, this.split(context as R, iter), next)
  //       }
  //     }
  //     next(err)
  //   }
  //   this.run = run as StageRun<R>
  //   return super.compile(rebuild)
  // }
  override compile(rebuild: boolean = false): StageRun<R> {
    let run: StageRun<R> = async (err, context, done) => {
      let iter = -1

      const next = async (err: unknown) => {
        iter++
        let retCtx: R
        while (!this.reachEnd(err, context, iter)) {
          ;[err, retCtx] = await run_or_execute_async(this.config.stage, err, this.split(context as R, iter))
          if (err) {
            ;[err, context] = (await this.rescue_async(err, retCtx)) as [unknown, R]
            if (err) {
              return done(err)
            }
          }
          iter++
        }

        done(err, context)
      }

      next(err)
    }

    this.run = run as StageRun<R>

    return super.compile(rebuild)
  }
}
