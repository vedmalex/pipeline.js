import { CleanError } from '../utils/ErrorList'
import {
  AnyStage,
  CallbackFunction,
  Possible,
  RunPipelineFunction,
  StageObject,
} from '../utils/types'

export type CompiledPlanMode = 'compiled-static' | 'compiled-hybrid'

export type FrameKind = 'ROOT' | 'WRAP' | 'RETRY' | 'LOOP' | 'PARALLEL'

export type CompiledStageFnKind =
  | 'FN0_SYNC'
  | 'FN0_ASYNC'
  | 'FN1_SYNC'
  | 'FN1_ASYNC'
  | 'FN2_CALLBACK'
  | 'FN2_ASYNC'
  | 'FN3_CALLBACK'
  | 'GENERIC'

export type PlanOp =
  | { op: 'RUN_STAGE_FN'; stageFnId: number }
  | { op: 'RUN_STAGE_INSTANCE'; stageId: number }
  | { op: 'RUN_FALLBACK_STAGE'; stageId: number }
  | { op: 'SET_CTX_FROM_RESULT' }
  | { op: 'JUMP'; target: number }
  | { op: 'JUMP_IF_TRUE'; predicateId: number; target: number }
  | { op: 'PUSH_FRAME'; frameKind: FrameKind; data?: number }
  | { op: 'POP_FRAME' }
  | { op: 'RETURN' }

export type PlanTables = {
  stageFns: Array<RunPipelineFunction<any>>
  stageFnKinds: CompiledStageFnKind[]
  stageInstances: Array<AnyStage<any>>
  predicates: Array<(ctx: any, err?: Possible<CleanError>) => boolean | Promise<boolean>>
  transforms: Array<(ctx: any, retCtx?: any) => any>
  combiners: Array<(...args: any[]) => any>
  constants: any[]
}

export type PlanMetadata = {
  rootKind: string
  flattenedStages: number
  fallbackOps: number
  containsAsyncOps: boolean
  containsParallelOps: boolean
  maxStaticDepthBeforeFlatten: number
  sourceVersion: number
}

export type CompiledPlan<T extends StageObject = StageObject> = {
  version: 1
  mode: CompiledPlanMode
  entry: number
  errorExit: number
  ops: PlanOp[]
  tables: PlanTables
  metadata: PlanMetadata
  dependencySignature: string
}

export type Frame =
  | { kind: 'ROOT' }
  | { kind: 'WRAP'; finalizeId: number; originalCtx: any }
  | { kind: 'RETRY'; retriesLeft: number; retryTarget: number }
  | { kind: 'LOOP'; loopHead: number; iteration: number }
  | { kind: 'PARALLEL'; joinTarget: number; pending: number; errors: Error[]; results: any[] }

export type ExecutionState<T extends StageObject> = {
  plan: CompiledPlan<T>
  pc: number
  inputErr: Possible<CleanError>
  ctx: T
  err: Possible<CleanError>
  result: T | undefined
  frameStack: Frame[]
  suspended: boolean
  completed: boolean
  done: CallbackFunction<T>
  yielded: number
}

export function createPlanTables(): PlanTables {
  return {
    stageFns: [],
    stageFnKinds: [],
    stageInstances: [],
    predicates: [],
    transforms: [],
    combiners: [],
    constants: [],
  }
}
