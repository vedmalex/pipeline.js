import { AnyStage } from './AnyStage'
import { isStage } from './isStage'

export function isAnyStage<R>(obj: unknown): obj is AnyStage<R> {
  return isStage(obj)
}
