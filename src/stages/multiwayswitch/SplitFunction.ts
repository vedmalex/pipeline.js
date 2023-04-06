import { ContextType, StageObject } from '../../stage'

export type SplitFunction<R extends StageObject, T extends StageObject> =
  | ((ctx: ContextType<R>) => ContextType<T>)
  | ((ctx: ContextType<R>) => T)
