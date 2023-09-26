import { z } from 'zod'
import { StageObject, StageObjectSchema } from './StageObject'

export type AsyncStageRun<R extends StageObject> = (err: unknown, context: unknown) => Promise<R>

export const AsyncStageRunSchema = z.function(z.tuple([z.unknown().optional(), StageObjectSchema]), z.promise(StageObjectSchema))
