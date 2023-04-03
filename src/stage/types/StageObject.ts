export type StageObject = object
import * as z from 'zod'

export const StageObject = z.object({}).passthrough()
export function isStageObject(arg: any): arg is StageObject {
  return StageObject.safeParse(arg)['success']
}
