import { Stage } from './stage'
import {
  isIStage,
  IStage,
  SingleStageFunction,
  StageConfigInput,
  CallbackFunction,
  PipelineConfigInput,
  PipelineConfig,
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
  T,
  R,
  I extends PipelineConfigInput<T, R> = PipelineConfigInput<T, R>,
  S extends PipelineConfig<T, R> = PipelineConfig<T, R>,
> extends Stage<T, R, I, S> {
  stages!: Array<IStage<any, any>>

  constructor(
    config?:
      | string
      | PipelineConfigInput<T, R>
      | SingleStageFunction<T>
      | Array<IStage<any, any>>
      | Stage<T, R, I, S>,
  ) {
    let stages: Array<IStage<T, R>> = []

    if (Array.isArray(config)) {
      stages.push(...config)
      super()
    } else if (typeof config == 'function') {
      config
      stages.push(new Stage<T, R, I, S>(config))
      super()
    } else if (typeof config == 'object') {
      if (config instanceof Stage) {
        stages.push(config)
        super()
      } else {
        if (config.run instanceof Function) {
          stages.push(new Stage<T, R, I, S>(config.run))
          delete config.run
        }

        if (Array.isArray(config.stages)) {
          stages.push(...config.stages)
          delete config.stages
        }

        if (config instanceof Array) {
          stages.push.apply(stages, config)
        }
        super(config as I)
      }
    } else {
      config
      super(config)
    }
    this.stages = []
    for (let i = 0; i < stages.length; i++) {
      this.addStage(stages[i])
    }
  }

  public override get reportName() {
    return `PIPE:${this.config.name ? this.config.name : ''}`
  }

  addStage(
    _stage: StageConfigInput<T, R> | SingleStageFunction<T> | IStage<any, any>,
  ) {
    let stage: IStage<any, any> | undefined
    if (typeof _stage === 'function') {
      stage = new Stage<any, any, any, any>(_stage)
    } else {
      if (typeof _stage === 'object') {
        if (_stage instanceof Stage) {
          stage = _stage
        } else if (!isIStage(_stage)) {
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
          this.stages[i].execute(err, context, next)
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
      this.run = function (
        err: Error | undefined,
        context: T | R,
        done: CallbackFunction<T | R>,
      ) {
        done(err, context)
      }
    }

    return super.compile(rebuild)
  }
}
