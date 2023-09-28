import { AnyStage, CreateError, isAnyStage, SingleStageFunction } from '../../stage'
import { DoWhileConfig } from './DoWhileConfig'

export function getDoWhileConfig<Input, Output, T, Config extends DoWhileConfig<Input, Output, T>>(
  _config: AnyStage<Input, Output> | Config | SingleStageFunction<Input, Output>,
): Config {
  let config: Config = {} as Config
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
