import {
  AllowedStage,
  AnyStage,
  empty_run,
  isAnyStage,
  isRunPipelineFunction,
  makeCallbackArgs,
  run_or_execute_async,
  RunPipelineFunction,
  Stage,
  StageRun,
} from '../../stage'
import { getPipelineConfig } from './getPipelineConfig'
import { PipelineConfig } from './PipelineConfig'

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

export class Pipeline<Input, Output, Config extends PipelineConfig<Input, Output> = PipelineConfig<Input, Output>>
  extends Stage<Input, Output, Config> {
  constructor(
    config?:
      | PipelineConfig<Input, Output>
      | AllowedStage<Input, Output, Config>
      | Array<AnyStage<Input, Output> | RunPipelineFunction<Input, Output>>,
  ) {
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
    let stage: AnyStage<Input, Output> | RunPipelineFunction<Input, Output> | undefined
    if (isRunPipelineFunction<Input, Output>(_stage)) {
      stage = _stage
    } else {
      if (typeof _stage === 'object' && _stage !== null) {
        if (isAnyStage<Input, Output>(_stage)) {
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

  override compile(rebuild: boolean = false): StageRun<Input, Output> {
    let run: StageRun<Input, Output> = (err, context, done) => {
      let i = -1
      // sequential run;
      let next = async (err: unknown, ctx: Input) => {
        if (err) {
          return done(makeCallbackArgs(err))
        }
        while (++i < this.config.stages.length) {
          ;[err, ctx] = await run_or_execute_async(this.config.stages[i], err, ctx ?? context)
          if (err) {
            ;[err, ctx] = await this.rescue_async(err, ctx) as [unknown, Input]
            if (err) {
              return done(makeCallbackArgs(err))
            }
          }
        }
        done(makeCallbackArgs(undefined, ctx as unknown as Output))
      }

      if (this.config.stages.length === 0) {
        done(makeCallbackArgs(undefined, context as unknown as Output))
      } else {
        next(err, context)
      }
    }

    if (this.config.stages.length > 0) {
      this.run = run as StageRun<Input, Output>
    } else {
      this.run = empty_run
    }

    return super.compile(rebuild)
  }
}
