import { ContextType } from '../../stage'

export type SplitFunction<R, T> = ((ctx: ContextType<R>) => ContextType<T>) | ((ctx: ContextType<R>) => T)
