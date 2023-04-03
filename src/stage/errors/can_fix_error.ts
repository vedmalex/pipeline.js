import { isCustomRun2Async, isCustomRun3Callback } from '../types'

export function can_fix_error(run: Function) {
  return isCustomRun2Async(run) || isCustomRun3Callback(run)
}
