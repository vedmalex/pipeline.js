import { Stage } from './stage'
import { CreateError } from './utils/ErrorList'
import {
  IStage,
  SingleStageFunction,
  CallbackFunction,
  StageConfig,
  StageRun,
  Func3,
  Func2,
} from './utils/types'

export interface DoWhileConfig<T, C, R> extends StageConfig<T, R> {
  stage: IStage<T, C, R> | SingleStageFunction<T>
  split?: Func2<T | R, T | R, number>
  reachEnd?: Func3<boolean, Error | undefined, T | R, number>
}

export class DoWhile<T, C extends DoWhileConfig<T, C, R>, R> extends Stage<
  T,
  C,
  R
> {
  stages!: Array<IStage<any, any, any>>

  constructor(config: C) {
    if (config.run && config.stage) {
      throw CreateError('use or run or stage, not both')
    }
    super(config)
  }

  public override get reportName() {
    return `WHI:${this.config.name ? this.config.name : ''}`
  }

  public override toString() {
    return '[pipeline DoWhile]'
  }

  override compile(rebuild: boolean = false): StageRun<T, R> {
    let run: StageRun<T, R> = (
      err: Error | undefined,
      context: T | R,
      done: CallbackFunction<T | R>,
    ) => {}

    this.run = run

    return super.compile(rebuild)
  }
}
