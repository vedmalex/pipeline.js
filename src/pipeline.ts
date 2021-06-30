import { CreateError } from './utils/ErrorList'
import { run_or_execute } from './utils/run_or_execute'
import { Stage } from './stage'
import { empty_run } from './utils/empty_run'
import {
  isIStage,
  IStage,
  CallbackFunction,
  PipelineConfig,
  StageRun,
  StageConfig,
  RunPipelineFunction,
} from './utils/types'

/**
 * it make possible to choose which stage to run according to result of `condition` evaluation
 *  - config as
 		- `Function` --- first Stage for pipeline
 * 		- `Object` --- config for Pipeline
 *			  - `stages` list of stages
 *			  - `name` name of pipeline
 * 		- `Empty` --- empty pipeline
 *
 * @param {Object} config configuration object
 */
export class Pipeline<T, C extends PipelineConfig<T, R>, R> extends Stage<
  T,
  C,
  R
> {
  stages!: Array<IStage<any, any, any> | RunPipelineFunction<any, any>>

  constructor(config?: string | PipelineConfig<T, R>) {
    let stages: Array<IStage<any, any, any> | RunPipelineFunction<any, any>> =
      []
    if (typeof config == 'object') {
      if (config instanceof Stage) {
        stages.push(config)
        super()
      } else {
        if (config.run instanceof Function) {
          stages.push(config.run)
          delete config.run
        }
        if (Array.isArray(config.stages)) {
          stages.push(...config.stages)
        }
        if (config instanceof Array) {
          stages.push.apply(stages, config)
        }
        super(config as C)
      }
      this.stages = []
      for (let i = 0; i < stages.length; i++) {
        this.addStage(stages[i])
      }
    } else if (typeof config == 'string') {
      super(config)
      this.stages = []
    } else if (config) {
      throw CreateError('wrong arguments check documentation')
    } else {
      super()
      this.stages = []
    }
  }

  public override get reportName() {
    return `PIPE:${this.config.name ? this.config.name : ''}`
  }

  addStage(
    _stage:
      | StageConfig<T, R>
      | RunPipelineFunction<any, any>
      | IStage<any, any, any>,
  ) {
    let stage: IStage<any, any, any> | RunPipelineFunction<any, any> | undefined
    if (typeof _stage === 'function') {
      stage = _stage
    } else {
      if (typeof _stage === 'object') {
        if (!isIStage(_stage)) {
          stage = new Stage(_stage)
        } else {
          stage = _stage
        }
      }
    }
    if (stage) {
      this.stages.push(stage)
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
      let next = (err: Error | undefined, context: T | R) => {
        i += 1
        if (i < this.stages.length) {
          run_or_execute(this.stages[i], err, context, next)
        } else if (i == this.stages.length) {
          done(err, context)
        } else {
          done(new Error('done call more than once'), context)
        }
      }
      next(err, context)
    }

    if (this.stages.length > 0) {
      this.run = run
    } else {
      this.run = empty_run
    }

    return super.compile(rebuild)
  }
}
