import * as z from 'zod'
import { CallbackFunction } from './CallbackFunction'

export type StageRun<R> = (err: unknown, context: R, callback: CallbackFunction<R>) => void
export const StageRun = z.function().args(z.unknown(), z.unknown(), z.function()).returns(z.void())
