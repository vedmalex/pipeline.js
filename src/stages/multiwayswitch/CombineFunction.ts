import { ContextType } from '../../stage'

export type CombineFunction<R, T> =
  | ((ctx: ContextType<R>, children: T) => R)
  | ((ctx: ContextType<R>, children: T) => unknown)
