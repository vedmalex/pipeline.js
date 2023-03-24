import { Stage } from './stage'
import { empty_run } from './utils/empty_run'
import { run_or_execute } from './utils/run_or_execute'
import { isAnyStage, AnyStage } from './utils/types/types'
import { getPipelinConfig } from './utils/types/types'
import { AllowedStage, CallbackFunction, PipelineConfig, RunPipelineFunction, StageRun } from './utils/types/types'

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
export class Pipeline<R, C extends PipelineConfig<R>> extends Stage<R, C> {
  constructor(config?: PipelineConfig<R> | AllowedStage<R, C> | Array<AnyStage | RunPipelineFunction<R>>) {
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

  public addStage(_stage: unknown) {
    let stage: AnyStage | RunPipelineFunction<R> | undefined
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

  public override toString() {
    return '[pipeline Pipeline]'
  }

  override compile(rebuild: boolean = false): StageRun<R> {
    let run: StageRun<R> = (err, context, done) => {
      let i = -1
      // sequential run;
      let next = (err: unknown, ctx: unknown) => {
        i += 1
        if (!err && i < this.config.stages.length) {
          const st = this.config.stages[i]
          run_or_execute(st, err, ctx ?? context, next as CallbackFunction<R>)
        } else if (i >= this.config.stages.length || err) {
          done(err, (ctx ?? context) as R)
        }
      }
      next(err, context)
    }

    if (this.config.stages.length > 0) {
      this.run = run as StageRun<R>
    } else {
      this.run = empty_run
    }

    return super.compile(rebuild)
  }
}
