import { AnyStage, CreateError, SingleStageFunction, StageObject, isAnyStage } from '../../stage'
import { DoWhileConfig } from './DoWhileConfig'

export function getDoWhileConfig<R extends StageObject, T extends StageObject, C extends DoWhileConfig<R, T>>(
  _config: AnyStage<R> | C | SingleStageFunction<R>,
): C {
  let config: C = {} as C
  if (isAnyStage(_config)) {
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
  return config
}
