import { Stage } from './stage'
import { ComplexError, CreateError } from './utils/ErrorList'
import { run_or_execute } from './utils/run_or_execute'
import { isAnyStage } from './utils/types'
import {
  AnyStage,
  CallbackFunction,
  Func2Sync,
  Func3Sync,
  Possible,
  SingleStageFunction,
  StageConfig,
  StageObject,
  StageRun,
} from './utils/types'

export interface DoWhileConfig<T extends StageObject, R extends StageObject>
  extends StageConfig<T> {
  stage: AnyStage<T, R> | SingleStageFunction<T>
  split?: Func2Sync<T, Possible<T>, number>
  reachEnd?: Func3Sync<boolean, Possible<ComplexError>, Possible<T>, number>
}

export class DoWhile<
  T extends StageObject,
  R extends StageObject,
> extends Stage<T, DoWhileConfig<T, R>> {
  constructor()
  constructor(stage: Stage<T, StageConfig<T>>)
  constructor(config: DoWhileConfig<T, R>)
  constructor(stageFn: SingleStageFunction<T>)
  constructor(
    _config?:
      | Stage<T, StageConfig<T>>
      | DoWhileConfig<T, R>
      | SingleStageFunction<T>,
  ) {
    let config: DoWhileConfig<T, R> = {} as DoWhileConfig<T, R>
    if (isAnyStage<T, R>(_config)) {
      config.stage = _config
    } else if (typeof _config == 'function') {
      config.stage = _config
    } else {
      if (_config?.run && _config?.stage) {
        throw CreateError('use or run or stage, not both')
      }

      if (_config?.stage) {
        config.stage = _config.stage
      }

      if (_config?.split instanceof Function) {
        config.split = _config.split
      }

      if (_config?.reachEnd instanceof Function) {
        config.reachEnd = _config.reachEnd
      }
    }
    super(config)
    this._config = {
      ...this._config,
      ...config,
    }
  }

  public override get reportName() {
    return `WHI:${this.config.name ? this.config.name : ''}`
  }

  public override toString() {
    return '[pipeline DoWhile]'
  }

  reachEnd(
    err: Possible<ComplexError>,
    ctx: Possible<T>,
    iter: number,
  ): boolean {
    if (this.config.reachEnd) {
      return this.config.reachEnd(err, ctx, iter)
    } else return true
  }

  split(ctx: Possible<T>, iter: number): any {
    if (this.config.split) {
      return this.config.split(ctx, iter)
    } else return ctx
  }

  override compile(rebuild: boolean = false): StageRun<any> {
    let run: StageRun<any> = async (
      initialErr: Possible<ComplexError>,
      initialContext: T,
      done: CallbackFunction<T>,
    ) => {
      let iter = -1;
      let currentError: Possible<ComplexError> = initialErr;
      let currentContext = initialContext;

      try {
        while (true) {
          iter++;

          // Проверка условия завершения
          if (this.reachEnd(currentError, currentContext, iter)) {
            break;
          }

          // Выполнение текущего шага
          const { resolve, promise } = Promise.withResolvers<void>()

          run_or_execute<T>(
            this.config.stage,
            currentError,
            this.split(currentContext, iter),
            (err, ctx) => {
              if (err) {
                currentError = err;
              } else {
                currentContext = ctx ?? currentContext;
              }
              resolve();
            }
          );
          await promise
        }
      } catch (err) {
        currentError = err as ComplexError;
      } finally {
        done(currentError, currentContext);
      }
    };

    this.run = run

    return super.compile(rebuild)
  }
}
