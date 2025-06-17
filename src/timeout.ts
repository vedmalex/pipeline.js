import { Stage } from './stage'
import { CleanError } from './utils/ErrorList'
import { run_or_execute } from './utils/run_or_execute'
import { AllowedStage, getTimeoutConfig, StageObject } from './utils/types'
import {
  CallbackFunction,
  Possible,
  StageRun,
  TimeoutConfig,
} from './utils/types'

export class Timeout<T extends StageObject> extends Stage<T, TimeoutConfig<T>> {
  constructor(config?: AllowedStage<T, T, TimeoutConfig<T>>) {
    super()
    if (config) {
      this._config = getTimeoutConfig<T>(config)
    }
  }

  public override get reportName() {
    return `Templ:${this.config.name ? this.config.name : ''}`
  }

  public override toString() {
    return '[pipeline Timeout]'
  }

  override compile(rebuild: boolean = false): StageRun<T> {
    let run: StageRun<T> = (
      err: Possible<CleanError>,
      ctx: T,
      done: CallbackFunction<T>,
    ) => {
      let to: NodeJS.Timeout | null = null;
      let isDone = false // Флаг, чтобы отслеживать, был ли уже вызван done

      const localDone = ((err: Possible<CleanError>, retCtx: T) => {
        if (isDone) return // Если done уже был вызван, выходим
        isDone = true // Устанавливаем флаг, что done вызван
        if (to) clearTimeout(to) // Отменяем таймаут
        to = null;
        return done(err, retCtx);
      }) as CallbackFunction<T>;

      const waitFor =
        this.config.timeout instanceof Function
          ? this.config.timeout(ctx)
          : this.config.timeout;

      if (waitFor) {
        to = setTimeout(() => {
          const timeoutRef = to;
          to = null;

          if (timeoutRef && this.config.overdue) {
            run_or_execute(this.config.overdue, err, ctx, localDone);
          } else {
            if (!isDone) { // если overdue не настроен и если done еще не был вызван - вызываем done
              localDone(null, ctx);
            }
          }
        }, waitFor);

        if (this.config.stage) {
          try {
            run_or_execute(this.config.stage, err, ctx, localDone);
          } catch (error) {
            if (to) clearTimeout(to); // Отменяем таймаут при ошибке
            to = null;
            localDone(error as CleanError, ctx);
          }
        }
      } else if (this.config.stage) {
        run_or_execute(this.config.stage, err, ctx, done);
      } else {
        localDone(null, ctx); // Если нет ни таймаута, ни stage, завершаем работу
      }
    }

    this.run = run;
    return super.compile(rebuild);
  }
}