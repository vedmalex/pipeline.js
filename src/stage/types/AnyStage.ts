import { z } from 'zod'
import { ContextProxySchema, ContextType } from '../Context'
import { StageConfigSchema } from '../StageConfig'
import { CallbackFunction, CallbackFunctionSchema } from './CallbackFunction'
import { StageObject, StageObjectSchema } from './StageObject'

export interface AnyStage<R extends StageObject> {
  config: unknown
  get reportName(): string
  get name(): string
  toString(): string
  execute<T extends StageObject>(context: unknown): Promise<T>
  execute<T extends StageObject>(context: unknown, callback: CallbackFunction<ContextType<R & T>>): void
  execute<T extends StageObject>(err: unknown, context: R, callback: CallbackFunction<ContextType<R & T>>): void
  execute<T extends StageObject>(
    _err?: unknown,
    _context?: R,
    _callback?: CallbackFunction<ContextType<R & T>>,
  ): void | Promise<T>
}

export const AnyStageSchema = z.object({
  config: StageConfigSchema,
  get reportName() {
    return z.string()
  },
  get name() {
    return z.string()
  },
  toString: z.function(z.tuple([]), z.string()),
  execute: z.union([
    z.function(
      z.tuple([
        ContextProxySchema,
      ]),
      z.promise(StageObjectSchema),
    ),
    z.function(
      z.tuple([
        ContextProxySchema,
        CallbackFunctionSchema,
      ]),
      z.void(),
    ),
    z.function(
      z.tuple([
        z.unknown(),
        ContextProxySchema,
        CallbackFunctionSchema,
      ]),
      z.void(),
    ),
  ]),
}).passthrough()
