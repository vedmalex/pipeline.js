import { z } from 'zod'
import { StageConfig } from '../StageConfig'
import { AllowedStageStored,AllowedStageStoredSchema } from './AllowedStageStored'
import { StageObject } from './StageObject'

/**
 * то что можно передать в конфиг
 */
export type AllowedStage<R extends StageObject, CONFIG extends StageConfig<R>> = string | AllowedStageStored<R, CONFIG>

export const AllowedStageSchema = z.union([z.string(), AllowedStageStoredSchema])
