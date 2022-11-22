import { Stage } from './stage'
import { empty_run } from './utils/empty_run'
import { run_or_execute } from './utils/run_or_execute'
import {
  AnyStage,
  getPipelinConfig,
  Possible,
  StageObject,
} from './utils/types'
import {
  AllowedStage,
  CallbackFunction,
  PipelineConfig,
  RunPipelineFunction,
  StageConfig,
  StageRun,
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
  T extends StageObject,
  R extends StageObject = T,
> extends Stage<T, PipelineConfig<T, R>, R> {
  constructor(
    config?:
      | AllowedStage<T, PipelineConfig<T, R>, R>
      | Array<Stage<T, PipelineConfig<T, R>, R> | RunPipelineFunction<T, R>>,
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

  addStage<IT extends StageObject, IR extends StageObject>(
    _stage:
      | StageConfig<IT, IR>
      | RunPipelineFunction<IT, IR>
      | AnyStage<IT, IR>,
  ) {
    let stage: AnyStage<IT, IR> | RunPipelineFunction<IT, IR> | undefined
    if (typeof _stage === 'function') {
      stage = _stage as RunPipelineFunction<IT, IR>
    } else {
      if (typeof _stage === 'object') {
        if (_stage instanceof Stage) {
          stage = _stage as AnyStage<IT, IR>
        } else {
          stage = new Stage<IT, StageConfig<IT, IR>, IR>(_stage)
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

  override compile(rebuild: boolean = false): StageRun<T, R> {
    let run: StageRun<T, R> = (
      err: Possible<Error>,
      context: Possible<T>,
      done: CallbackFunction<R>,
    ) => {
      let i = -1
      // sequential run;
      let next = (err: Possible<Error>, ctx: unknown) => {
        i += 1
        if (!err && i < this.config.stages.length) {
          const st = this.config.stages[i]
          run_or_execute<object, object, object, object>(
            st,
            err,
            ctx ?? context,
            next,
          )
        } else if (i >= this.config.stages.length || err) {
          done(err, (ctx ?? context) as unknown as R)
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