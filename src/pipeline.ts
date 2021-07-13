import { run_or_execute } from './utils/run_or_execute'
import { Stage } from './stage'
import { empty_run } from './utils/empty_run'
import { getPipelinConfig } from './utils/types'
import {
  CallbackFunction,
  PipelineConfig,
  StageRun,
  StageConfig,
  RunPipelineFunction,
  AllowedStage,
} from './utils/types'

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
export class Pipeline<
  T = any,
  C extends PipelineConfig<T, R> = any,
  R = T,
> extends Stage<T, C, R> {
  constructor(
    config?:
      | AllowedStage<T, C, R>
      | Array<Stage | RunPipelineFunction<any, any>>,
  ) {
    super()
    if (config) {
      this._config = getPipelinConfig(config)
    } else {
      this._config.stages = []
    }
  }

  public override get reportName() {
    return `PIPE:${this.config.name ? this.config.name : ''}`
  }

  addStage(_stage: StageConfig<T, R> | RunPipelineFunction<any, any> | Stage) {
    let stage: Stage | RunPipelineFunction<any, any> | undefined
    if (typeof _stage === 'function') {
      stage = _stage
    } else {
      if (typeof _stage === 'object') {
        if (_stage instanceof Stage) {
          stage = _stage
        } else {
          stage = new Stage(_stage)
        }
      }
    }
    if (stage) {
      this.config.stages.push(stage)
      this.run = undefined
    }
  }

  public override toString() {
    return '[pipeline Pipeline]'
  }

  override compile(rebuild: boolean = false): StageRun<T, R> {
    let run: StageRun<T, R> = (
      err: Error | undefined,
      context: T | R,
      done: CallbackFunction<T | R>,
    ) => {
      let i = -1
      //sequential run;
      let next = (err: Error | undefined, ctx: T | R) => {
        i += 1
        if (!err && i < this.config.stages.length) {
          run_or_execute(this.config.stages[i], err, ctx ?? context, next)
        } else if (i >= this.config.stages.length || err) {
          done(err, ctx ?? context)
        }
      }
      next(err, context)
    }

    if (this.config.stages.length > 0) {
      this.run = run
    } else {
      this.run = empty_run
    }

    return super.compile(rebuild)
  }
}
