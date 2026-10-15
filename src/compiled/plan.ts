import { CleanError } from '../utils/ErrorList'
import {
  AnyStage,
  CallbackFunction,
  Possible,
  RunPipelineFunction,
  StageObject,
  ValidateFunction,
} from '../utils/types'

export type CompiledPlanMode = 'compiled-static' | 'compiled-hybrid'

export type FrameKind = 'ROOT' | 'SCOPE' | 'WRAP' | 'RETRY' | 'LOOP' | 'PARALLEL'

export type PredicateResult = {
  value: boolean
  err?: Possible<CleanError>
}

export type SequentialPlanData = {
  kind: 'SEQUENTIAL'
  reportName: string
  stage: unknown
  stageFnId?: number
  fusedPlan?: CompiledPlan<any>
  fusedStageFnIds?: number[]
  inlineControlPlan?: CompiledPlan<any>
  subplanId?: number
  split: (ctx: any) => any[]
  combine: (ctx: any, children: any[]) => any
}

export type LoopPlanData = {
  kind: 'LOOP'
  reportName: string
  stageFnId: number
  split: (ctx: any, iter: number) => any
  reachEnd: (
    err: Possible<CleanError>,
    ctx: any,
    iter: number,
  ) => boolean
}

export type RetryPlanData = {
  kind: 'RETRY'
  reportName: string
  stageFnId: number
  retry: number | ((err: Possible<CleanError>, ctx: any, iter: number) => boolean)
  backup: (ctx: any) => any
  restore: (ctx: any, backup: any) => any
}

export type TimeoutPlanData = {
  kind: 'TIMEOUT'
  reportName: string
  stageFnId?: number
  overdueStageFnId?: number
  timeout?: number | ((ctx: any) => number | undefined)
}

export type ParallelPlanData = {
  kind: 'PARALLEL'
  reportName: string
  stage: unknown
  stageName: string
  stageFnId?: number
  concurrency?: number
  join: 'all' | 'any' | 'quorum'
  quorum?: number
  trailing: 'ignore' | 'drain-active'
  trailingTimeout?: number
  split: (ctx: any) => any[] | null | undefined
  combine: (ctx: any, children: any[]) => any
}

export type MultiWaySwitchStaticPlanCaseData = {
  stage: unknown
  stageFnId: number
  split?: (ctx: any) => any
  combine?: (ctx: any, retCtx: any) => any
}

export type MultiWaySwitchDynamicPlanCaseData =
  MultiWaySwitchStaticPlanCaseData & {
    evaluate: (ctx: any) => any
  }

export type MultiWaySwitchPlanData = {
  kind: 'MWS'
  reportName: string
  statics: MultiWaySwitchStaticPlanCaseData[]
  dynamics: MultiWaySwitchDynamicPlanCaseData[]
}

export type PrimitivePlanData =
  | SequentialPlanData
  | LoopPlanData
  | RetryPlanData
  | TimeoutPlanData
  | ParallelPlanData
  | MultiWaySwitchPlanData

export type CompiledStageFnKind =
  | 'FN0_SYNC'
  | 'FN0_ASYNC'
  | 'FN1_SYNC'
  | 'FN1_ASYNC'
  | 'FN2_CALLBACK'
  | 'FN2_ASYNC'
  | 'FN3_CALLBACK'
  | 'GENERIC'

export type CompiledPredicateKind =
  | 'BOOL_CTX_SYNC'
  | 'GENERIC_CALLBACK'
  | 'GENERIC'

export type CompiledPredicateFn =
  | ((
      ctx: any,
      err?: Possible<CleanError>,
    ) => boolean | PredicateResult | Promise<boolean | PredicateResult>)
  | ValidateFunction<any>

export type PlanOp =
  | { op: 'RUN_STAGE_FN'; stageFnId: number }
  | { op: 'RUN_STAGE_INSTANCE'; stageId: number }
  | { op: 'RUN_FALLBACK_STAGE'; stageId: number }
  | { op: 'RUN_SEQUENTIAL'; data: number }
  | { op: 'RUN_LOOP'; data: number }
  | { op: 'RUN_RETRY'; data: number }
  | { op: 'RUN_TIMEOUT'; data: number }
  | { op: 'RUN_PARALLEL'; data: number }
  | { op: 'RUN_MWS'; data: number }
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
  subplans: Array<CompiledPlan<any>>
  predicates: CompiledPredicateFn[]
  predicateKinds: CompiledPredicateKind[]
  transforms: Array<(ctx: any, retCtx?: any) => any>
  combiners: Array<(...args: any[]) => any>
  constants: any[]
}

export type PlanMetadata = {
  artifactKind: 'in-memory-runtime-plan'
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
  | { kind: 'SCOPE'; inputErr: Possible<CleanError> }
  | { kind: 'WRAP'; finalizeId: number; originalCtx: any }
  | {
      kind: 'SUBPLAN_RETURN'
      parentPlan: CompiledPlan<any>
      parentPc: number
      parentInputErr: Possible<CleanError>
      sequentialFrameIndex: number
      childIndex: number
      childCtx: any
    }
  | {
      kind: 'SEQUENTIAL'
      data: SequentialPlanData
      originalCtx: any
      children: any[]
      results: any[]
      index: number
    }
  | {
      kind: 'LOOP'
      data: LoopPlanData
      currentCtx: any
      currentErr: Possible<CleanError>
      iteration: number
    }
  | { kind: 'RETRY'; retriesLeft: number; retryTarget: number }
  | {
      kind: 'RETRY_STATE'
      data: RetryPlanData
      initialCtx: any
      currentCtx: any
      currentErr: Possible<CleanError>
      backup: any
      iteration: number
    }
  | {
      kind: 'TIMEOUT'
      data: TimeoutPlanData
      originalCtx: any
      settled: boolean
      timer: ReturnType<typeof setTimeout> | null
      controller: AbortController | null
      controllerCleanup: (() => void) | null
    }
  | {
      kind: 'PARALLEL'
      data: ParallelPlanData
      originalCtx: any
      children: any[]
      controllers: Array<AbortController | null>
      controllerCleanups: Array<(() => void) | null>
      successfulChildren: any[]
      successCount: number
      thresholdMet: boolean
      drainTimer: ReturnType<typeof setTimeout> | null
      nextIndex: number
      active: number
      pending: number
      errors: Error[]
      settled: boolean
    }

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
    subplans: [],
    predicates: [],
    predicateKinds: [],
    transforms: [],
    combiners: [],
    constants: [],
  }
}
