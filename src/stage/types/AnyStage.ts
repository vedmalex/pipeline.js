import { CallbackFunction } from './CallbackFunction'

export interface AnyStage<R> {
  get config(): unknown
  get reportName(): string
  get name(): string
  toString(): string
  execute(
    _err?: unknown,
    _context?: R,
    _callback?: CallbackFunction<R>,
  ): void | Promise<R>
}

