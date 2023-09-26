import { CreateError, getStageConfig, isAnyStage, isRunPipelineFunction, StageObject } from '../../stage'
import { AllowedMWS } from './AllowedMWS'
import { isMultiWaySwitch } from './isMultiWaySwitch'
import { MultiWaySwitchCase } from './MultiWaySwitchCase'
import { MultWaySwitchConfig } from './MultWaySwitchConfig'

export function getMultWaySwitchConfig<
  R extends StageObject,
  T extends StageObject,
  C extends MultWaySwitchConfig<R, T>,
>(config: AllowedMWS<R, T, C>): C {
  if (Array.isArray(config)) {
    return {
      cases: config.map(item => {
        let res: MultiWaySwitchCase<R, T>
        if (isRunPipelineFunction<R>(item)) {
          res = { stage: item, evaluate: true }
        } else if (isAnyStage(item)) {
          res = {
            stage: item,
            evaluate: true,
          }
        } else if (isMultiWaySwitch<R, T>(item)) {
          res = item
        } else {
          throw CreateError(new Error('not suitable type for array in pipelin'))
        }
        return res
      }),
    } as C
  } else {
    const res = getStageConfig(config)
    if (isAnyStage(res)) {
      return { cases: [{ stage: res, evaluate: true }] } as C
    } else if (typeof config == 'object' && !isAnyStage(config)) {
      if (config?.run && config.cases && config.cases.length > 0) {
        throw CreateError(new Error(" don't use run and stage both "))
      }
      if (config.run) {
        res.cases = [{ stage: config.run, evaluate: true }]
      }
      if (config.cases) {
        res.cases = config.cases
      }
      if (config.split) {
        res.split = config.split
      }
      if (config.combine) {
        res.combine = config.combine
      }
    } else if (typeof config == 'function' && res.run) {
      res.cases = [{ stage: res.run, evaluate: true }]
      delete res.run
    }
    if (typeof res.cases == 'undefined') {
      res.cases = []
    }
    return res as C
  }
}
