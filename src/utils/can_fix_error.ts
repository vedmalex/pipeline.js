import { is_func2_async, is_func3, is_func3_async } from './types/types'

export function can_fix_error(run: Function) {
  return is_func2_async(run) || (is_func3(run) && !is_func3_async(run))
}
