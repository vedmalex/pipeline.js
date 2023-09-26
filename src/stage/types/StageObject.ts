import { z } from 'zod'

export const StageObjectSchema = z.object({}).passthrough()

export const ExtendStageObjectWith = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) => {
  return StageObjectSchema.merge(schema)
}

export type StageObject<R = object> = R extends object ? R : never

