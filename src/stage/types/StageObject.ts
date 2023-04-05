export type StageObject = object
import * as z from 'zod'

export const StageObjectValidator = z.object({}).passthrough()
export function isStageObject(arg: any): arg is StageObject {
  return StageObjectValidator.safeParse(arg)['success']
}
