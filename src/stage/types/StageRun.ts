import { z } from 'zod'
import { ContextProxySchema, ContextType } from '../Context'
import { CallbackFunction, CallbackFunctionSchema } from './CallbackFunction'
import { StageObject } from './StageObject'

export type StageRun<R extends StageObject> = (
  err: unknown,
  context: ContextType<R>,
  callback: CallbackFunction<ContextType<R>>,
) => void

export const StageRunSchema = z.function(z.tuple([z.unknown(), ContextProxySchema, CallbackFunctionSchema]), z.void())
