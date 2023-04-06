import {
  AllowedStage,
  AnyStage,
  ContextType,
  RunPipelineFunction,
  Stage,
  StageObject,
  StageRun,
  empty_run,
  isAnyStage,
  run_or_execute_async,
} from '../../stage'
import { PipelineConfig } from './PipelineConfig'
import { getPipelineConfig } from './getPipelineConfig'

/**
 * it make possible to choose which stage to run according to result of `condition` evaluation
 *  - config as
        - `Function` --- first Stage for pipeline
 * 		- `Stage` --- first Stage
 * 		- `Array` --- list of stages
 * 		- `Object` --- config for Pipeline
 *			  - `stages` list of stages
 *			  - `name` name of pipeline
 * 		- `Empty` --- empty pipeline
 *
 * @param {Object} config configuration object
 */

export class Pipeline<R extends StageObject, C extends PipelineConfig<R> = PipelineConfig<R>> extends Stage<R, C> {
  constructor(config?: PipelineConfig<R> | AllowedStage<R, C> | Array<AnyStage<R> | RunPipelineFunction<R>>) {
    super()
    if (config) {
      this._config = getPipelineConfig(config)
    } else {
      this._config.stages = []
    }
  }

  public override get reportName() {
    return `PIPE:${this.config.name ? this.config.name : ''}`
  }

  public override toString() {
    return '[pipeline Pipeline]'
  }

  public addStage(_stage: unknown) {
    let stage: AnyStage<R> | RunPipelineFunction<R> | undefined
    if (typeof _stage === 'function') {
      stage = _stage as RunPipelineFunction<R>
    } else {
      if (typeof _stage === 'object' && _stage !== null) {
        if (isAnyStage(_stage)) {
          stage = _stage
        } else {
          stage = new Stage(_stage)
        }
      }
    }
    if (stage) {
      this.config.stages.push(stage as any)
      this.run = undefined
    }
  }

  override compile(rebuild: boolean = false): StageRun<R> {
    let run: StageRun<R> = (err, context, done) => {
      let i = -1
      // sequential run;
      let next = async (err: unknown, ctx: ContextType<R>) => {
        if (err) {
          return done(err)
        }
        while (++i < this.config.stages.length) {
          ;[err, ctx] = await run_or_execute_async(this.config.stages[i], err, ctx ?? context)
          if (err) {
            ;[err, ctx] = await this.rescue_async(err, ctx)
            if (err) {
              return done(err)
            }
          }
        }
        done(undefined, ctx)
      }

      if (this.config.stages.length === 0) {
        done(undefined, context)
      } else {
        next(err, context)
      }
    }

    if (this.config.stages.length > 0) {
      this.run = run as StageRun<R>
    } else {
      this.run = empty_run
    }

    return super.compile(rebuild)
  }
}
