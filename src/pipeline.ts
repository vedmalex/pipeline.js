import { Stage } from './stage'
import {
  compilePipelinePlan,
} from './compiled/compiler'
import { executeCompiledPlan } from './compiled/executor'
import { CompiledPlan } from './compiled/plan'
import { empty_run } from './utils/empty_run'
import { CleanError } from './utils/ErrorList'
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

type CompiledPipelineExecutionMode = 'off' | 'auto' | 'force'

let compiledPipelineOverride: boolean | undefined

export function __setCompiledPipelineEnabledForTests(enabled?: boolean) {
  compiledPipelineOverride = enabled
}

function getCompiledPipelineExecutionMode(): CompiledPipelineExecutionMode {
  if (compiledPipelineOverride === true) {
    return 'force'
  }

  if (compiledPipelineOverride === false) {
    return 'off'
  }

  if (typeof process !== 'undefined') {
    if (process.env.PIPELINE_USE_COMPILED === '1') {
      return 'force'
    }

    if (process.env.PIPELINE_USE_COMPILED === '0') {
      return 'off'
    }
  }

  return 'auto'
}

export function __isCompiledPipelineEnabled() {
  return getCompiledPipelineExecutionMode() !== 'off'
}

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
  protected _graphVersion = 0
  protected compiledPlan?: CompiledPlan<T>
  protected compiledPlanVersion?: number
  protected compiledDependencySignature?: string
  protected _compiledParents = new Set<Pipeline<any>>()

  constructor(
    config?:
      | PipelineConfig<T>
      | AllowedStage<T, T, PipelineConfig<T>>
      | Array<Stage<T, PipelineConfig<T>> | RunPipelineFunction<T>>,
  ) {
    super()
    if (config) {
      this._config = getPipelinConfig(config as any)
      this.registerImmediatePipelineChildren()
    } else {
      this._config.stages = []
    }
  }

  public override get reportName() {
    return `PIPE:${this.config.name ? this.config.name : ''}`
  }

  protected isPipelineStage(stage: unknown): stage is Pipeline<any> {
    return stage instanceof Pipeline
  }

  protected registerImmediatePipelineChildren() {
    for (let i = 0; i < this.config.stages.length; i++) {
      const child = this.config.stages[i]
      if (this.isPipelineStage(child)) {
        child.registerCompiledParent(this)
      }
    }
  }

  protected registerCompiledParent(parent: Pipeline<any>) {
    if (parent !== this) {
      this._compiledParents.add(parent)
    }
  }

  protected invalidateCompiledCache(visited?: Set<Pipeline<any>>) {
    const seen = visited ?? new Set<Pipeline<any>>()
    if (seen.has(this)) return
    seen.add(this)

    this._graphVersion += 1
    this.compiledPlan = undefined
    this.compiledPlanVersion = undefined
    this.compiledDependencySignature = undefined
    this.run = undefined

    this._compiledParents.forEach(parent => {
      parent.invalidateCompiledCache(seen)
    })
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
      if (this.isPipelineStage(stage)) {
        stage.registerCompiledParent(this)
      }
      this.invalidateCompiledCache()
    }
  }

  public override toString() {
    return '[pipeline Pipeline]'
  }

  protected getCompiledPlan(rebuild: boolean = false) {
    const isCurrent =
      !rebuild &&
      this.compiledPlan !== undefined &&
      this.compiledPlanVersion === this._graphVersion

    if (isCurrent) {
      return this.compiledPlan as CompiledPlan<T>
    }

    const candidate = compilePipelinePlan(this as any)

    this.compiledPlan = candidate
    this.compiledPlanVersion = this._graphVersion
    this.compiledDependencySignature = candidate.dependencySignature

    return candidate
  }

  protected shouldUseCompiledPlan(plan: CompiledPlan<T>) {
    const mode = getCompiledPipelineExecutionMode()

    if (mode === 'off') {
      return false
    }

    if (mode === 'force') {
      return true
    }

    // auto mode: use compiled for both static and hybrid plans
    return true
  }

  override compile(rebuild: boolean = false): StageRun<T> {
    if (this.config.stages.length > 0) {
      // Resolve execution mode once at compile-time, not per-call
      const mode = getCompiledPipelineExecutionMode()

      if (mode !== 'off') {
        try {
          const plan = this.getCompiledPlan(rebuild)
          if (this.shouldUseCompiledPlan(plan)) {
            // Fast path: bake compiled plan directly into this.run — zero gating overhead per call
            this.run = (err: Possible<CleanError>, context: T, done: CallbackFunction<T>) => {
              executeCompiledPlan(plan, err, context, done)
            }
            return super.compile(rebuild)
          }
        } catch (_error) {
          // Fall through to legacy if compilation fails
        }
      }

      // Legacy path
      const runAsync = async (
        initialErr: Possible<CleanError>,
        context: T,
      ) => {
        let currentContext = context;
        for (let i = 0; i < this.config.stages.length; i++) {
          const stage = this.config.stages[i];
          // OPT-8: new Promise avoids withResolvers allocation + .catch() rethrow chain
          await new Promise<void>((resolve, reject) => {
            run_or_execute<T>(
              stage,
              initialErr,
              currentContext,
              (err, ctx) => {
                if (err) {
                  reject(err)
                } else {
                  if (ctx) currentContext = ctx
                  resolve()
                }
              }
            );
          })
        }
        return currentContext
      };

      this.run = (err: Possible<CleanError>, context: T, done: CallbackFunction<T>) => {
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
