import { ContextType } from '../Context'
import { CallbackFunction } from './CallbackFunction'
import { StageObject } from './StageObject'

export interface AnyStage<R extends StageObject> {
  config: any
  get reportName(): string
  get name(): string
  toString(): string
  execute<T extends StageObject>(context: unknown): Promise<T>
  execute<T extends StageObject>(context: unknown, callback: CallbackFunction<ContextType<R & T>>): void
  execute<T extends StageObject>(err: any, context: R, callback: CallbackFunction<ContextType<R & T>>): void
  execute<T extends StageObject>(
    _err?: any,
    _context?: R,
    _callback?: CallbackFunction<ContextType<R & T>>,
  ): void | Promise<T>
}
