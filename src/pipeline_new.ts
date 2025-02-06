import { Stage } from './stage'
import { empty_run } from './utils/empty_run'
import { ComplexError } from './utils/ErrorList'
import { run_or_execute } from './utils/run_or_execute'
import { isAnyStage } from './utils/types'
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
export class Pipeline<T extends StageObject> extends Stage<
  T,
  PipelineConfig<T>
> {
  constructor(
    config?:
      | PipelineConfig<T>
      | AllowedStage<T, T, PipelineConfig<T>>
      | Array<Stage<T, PipelineConfig<T>> | RunPipelineFunction<T>>,
  ) {
    super()
    if (config) {
      this._config = getPipelinConfig(config as any)
    } else {
      this._config.stages = []
    }
  }

  public override get reportName() {
    return `PIPE:${this.config.name ? this.config.name : ''}`
  }

  addStage<IT extends StageObject>(
    _stage: StageConfig<IT> | RunPipelineFunction<IT> | AnyStage<IT>,
  ) {
    let stage: AnyStage<IT> | RunPipelineFunction<IT> | undefined
    if (typeof _stage === 'function') {
      stage = _stage
    } else {
      if (typeof _stage === 'object') {
        if (isAnyStage<IT>(_stage)) {
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

  override compile(rebuild: boolean = false): StageRun<T> {
    let runAsync = async (
      initialErr: Possible<ComplexError>,
      context: T,
    ) => {
      let currentContext = context;
      for (let i = 0; i < this.config.stages.length; i++) {
        const stage = this.config.stages[i];
        const { promise, resolve, reject } = Promise.withResolvers<T>()
        run_or_execute<T>(
          stage,
          initialErr,
          currentContext,
          (err, ctx) => {
            if (err) {
              reject(err)
            } else {
              resolve(ctx ?? currentContext);
            }
          }
        );
        await promise.catch(err => {
          throw new Error('pipeline.js', {
            cause: {
              err,
              i,
              stages: this.config.stages,
              ctx: currentContext
            },
          })
        })
      }
      return currentContext
    };

    if (this.config.stages.length > 0) {
      this.run = (err: Possible<ComplexError>, context: T, done: CallbackFunction<T>) => {
        let error = err;
        let ctx = context
        runAsync(err, context)
          .then(retCtx => { if (retCtx) { ctx = retCtx } })
          .catch(err => { if (err) error = err })
          .finally(() => {

            done(error, ctx)
          })

      }
    } else {
      this.run = empty_run
    }

    return super.compile(rebuild)
  }
}
