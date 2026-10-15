import { DoWhile } from '../dowhile'
import { Empty } from '../empty'
import { IfElse } from '../ifelse'
import { MultiWaySwitch } from '../multiwayswitch'
import { Parallel } from '../parallel'
import { RetryOnError } from '../retryonerror'
import { Sequential } from '../sequential'
import { Stage } from '../stage'
import { Timeout } from '../timeout'
import { Wrap } from '../wrap'
import { createError } from '../utils/ErrorList'
import { createCodeError } from '../utils/ErrorList'
import { normalizeExecutionErrorInput } from '../utils/ErrorList'
import { can_fix_error } from '../utils/can_fix_error'
import { execute_callback } from '../utils/execute_callback'
import { execute_validate } from '../utils/execute_validate'
import { empty_run } from '../utils/empty_run'
import { ErrorCode } from '../utils/errors'
import { run_or_execute } from '../utils/run_or_execute'
import { isPromise } from '../utils/TypeDetectors'
import {
  CallbackExternalFunction,
  CallbackFunction,
  is_async_function,
  isAnyStage,
  is_thenable,
  RunPipelineFunction,
  StageObject,
  ValidateFunction,
} from '../utils/types'
import {
  executeCompiledPlan,
  executeFusedStageFnSequence,
  executeNativeMultiWaySwitch,
  type ExecutableMultiWaySwitchData,
  type ExecutableMultiWaySwitchDynamicCase,
  type ExecutableMultiWaySwitchStaticCase,
} from './executor'
import {
  CompiledPlan,
  CompiledPredicateFn,
  CompiledPredicateKind,
  CompiledStageFnKind,
  createPlanTables,
  PlanMetadata,
  PlanOp,
  PredicateResult,
} from './plan'

type PipelineLike<T extends StageObject> = {
  config: {
    stages: Array<unknown>
  }
  toString(): string
  reportName?: string
  _graphVersion?: number
  /** Compiler-accessible hook for nested plan cache reuse. Provided by Pipeline. */
  getCompiledPlan?: (rebuild: boolean) => CompiledPlan<T>
}

type RunnerInfo = {
  run: RunPipelineFunction<any>
  containsAsyncOps: boolean
  fallbackOps: number
  dependencyParts: string[]
}

type NormalizedMultiWaySwitchCase = NonNullable<
  ReturnType<typeof normalizeMultiWaySwitchCase>
>

type CompiledMultiWaySwitchCase = NormalizedMultiWaySwitchCase & {
  runner: RunnerInfo
}

function isPipelineLike<T extends StageObject>(stage: unknown): stage is PipelineLike<T> {
  return (
    isAnyStage(stage) &&
    Array.isArray((stage as any).config?.stages) &&
    typeof (stage as any).split !== 'function'
  )
}

function isPlainStageLike<T extends StageObject>(stage: unknown) {
  return isAnyStage(stage) && typeof (stage as any).toString === 'function' && (stage as any).toString() === '[pipeline Stage]'
}

function hasPlainStageBoundaryFeatures(stage: any) {
  const config = stage?.config ?? {}

  return Boolean(
    config.ensure ||
      config.validate ||
      config.schema ||
      config.rescue ||
      config.compile ||
      config.precompile,
  )
}

function canDevirtualizePlainStage<T extends StageObject>(stage: unknown): stage is Stage<T> {
  return (
    stage instanceof Stage &&
    stage.constructor === Stage &&
    typeof stage.config?.run === 'function' &&
    !hasPlainStageBoundaryFeatures(stage)
  )
}

function isEmptyStage<T extends StageObject>(stage: unknown): stage is Empty<T> {
  return stage instanceof Empty
}

function isIfElseStage<T extends StageObject>(stage: unknown): stage is IfElse<T> {
  return stage instanceof IfElse
}

function isWrapStage<T extends StageObject>(stage: unknown): stage is Wrap<T, any> {
  return stage instanceof Wrap
}

function isSequentialStage<T extends StageObject>(stage: unknown): stage is Sequential<T, any> {
  return stage instanceof Sequential
}

function isParallelStage<T extends StageObject>(stage: unknown): stage is Parallel<T, any> {
  return stage instanceof Parallel
}

function isDoWhileStage<T extends StageObject>(stage: unknown): stage is DoWhile<T, any> {
  return stage instanceof DoWhile
}

function isRetryOnErrorStage<T extends StageObject>(stage: unknown): stage is RetryOnError<T> {
  return stage instanceof RetryOnError
}

function isTimeoutStage<T extends StageObject>(stage: unknown): stage is Timeout<T> {
  return stage instanceof Timeout
}

function isMultiWaySwitchStage<T extends StageObject>(stage: unknown): stage is MultiWaySwitch<T, any> {
  return stage instanceof MultiWaySwitch
}

function hasStageBoundaryFeatures(stage: any) {
  const config = stage?.config ?? {}
  const hasSyntheticEmptyRun = isEmptyStage(stage) && config.run === empty_run

  return Boolean(
    config.ensure ||
      config.validate ||
      config.schema ||
      config.rescue ||
      (config.run && !hasSyntheticEmptyRun) ||
      config.compile ||
      config.precompile,
  )
}

function getGraphVersion(stage: unknown) {
  return typeof (stage as any)?._graphVersion === 'number' ? (stage as any)._graphVersion : 0
}

function getFunctionSignature(fn: RunPipelineFunction<any>, index: number) {
  return `fn:${index}:${fn.name || 'anon'}:${fn.length}:${is_async_function(fn) ? 1 : 0}`
}

function classifyStageFn(fn: RunPipelineFunction<any>): CompiledStageFnKind {
  const isAsync = is_async_function(fn)

  switch (fn.length) {
    case 0:
      return isAsync ? 'FN0_ASYNC' : 'FN0_SYNC'
    case 1:
      return isAsync ? 'FN1_ASYNC' : 'FN1_SYNC'
    case 2:
      return isAsync ? 'FN2_ASYNC' : 'FN2_CALLBACK'
    case 3:
      return isAsync ? 'GENERIC' : 'FN3_CALLBACK'
    default:
      return 'GENERIC'
  }
}

function addStageFn(
  tables: ReturnType<typeof createPlanTables>,
  run: RunPipelineFunction<any>,
) {
  const stageFnId = tables.stageFns.push(run) - 1
  tables.stageFnKinds[stageFnId] = classifyStageFn(run)
  return stageFnId
}

function addPredicate(
  tables: ReturnType<typeof createPlanTables>,
  predicate: CompiledPredicateFn,
  kind: CompiledPredicateKind = 'GENERIC',
) {
  const predicateId = tables.predicates.push(predicate) - 1
  tables.predicateKinds[predicateId] = kind
  return predicateId
}

function createSyntheticPipeline<T extends StageObject>(stage: unknown): PipelineLike<T> {
  return {
    config: {
      stages: [stage],
    },
    toString() {
      return '[pipeline Pipeline]'
    },
    reportName: 'CompiledSubplan',
    _graphVersion: getGraphVersion(stage),
  }
}

function executeRunnerPromise<T extends StageObject>(
  run: RunPipelineFunction<T>,
  err: any,
  ctx: T,
) {
  return new Promise<T>((resolve, reject) => {
    run_or_execute(run as any, err, ctx, ((runErr, nextCtx) => {
      if (runErr) {
        reject(runErr)
      } else {
        resolve((nextCtx ?? ctx) as T)
      }
    }) as CallbackFunction<T>)
  })
}

function getNestedPipelinePlan<T extends StageObject>(stage: PipelineLike<T>): CompiledPlan<T> {
  if (typeof stage.getCompiledPlan === 'function' && !hasStageBoundaryFeatures(stage)) {
    return stage.getCompiledPlan(false)
  }

  return compilePipelinePlan(stage)
}

function getFusableSubplanStageFnIds(plan: CompiledPlan<any>) {
  if (plan.mode !== 'compiled-static' || plan.metadata.fallbackOps > 0) {
    return null
  }

  const stageFnIds: number[] = []

  for (let i = 0; i < plan.ops.length; i++) {
    const op = plan.ops[i]

    if (op.op === 'RETURN') {
      return i === plan.ops.length - 1 ? stageFnIds : null
    }

    if (op.op !== 'RUN_STAGE_FN') {
      return null
    }

    const next = plan.ops[i + 1]

    if (!next || next.op !== 'SET_CTX_FROM_RESULT') {
      return null
    }

    stageFnIds.push(op.stageFnId)
    i += 1
  }

  return null
}

function isInlineControlFlowSubplan(plan: CompiledPlan<any>) {
  if (
    plan.mode !== 'compiled-static'
    || plan.metadata.fallbackOps > 0
    || plan.tables.stageInstances.length > 0
    || plan.tables.subplans.length > 0
  ) {
    return false
  }

  for (let i = 0; i < plan.ops.length; i++) {
    const op = plan.ops[i]

    if (op.op === 'RETURN') {
      return i === plan.ops.length - 1
    }

    switch (op.op) {
      case 'RUN_STAGE_FN':
        if (plan.ops[i + 1]?.op !== 'SET_CTX_FROM_RESULT') {
          return false
        }
        i += 1
        break
      case 'JUMP':
      case 'JUMP_IF_TRUE':
        break
      default:
        return false
    }
  }

  return false
}

function createFusedSubplanRunnerInfo(plan: CompiledPlan<any>): RunnerInfo | null {
  const stageFnIds = getFusableSubplanStageFnIds(plan)

  if (!stageFnIds) {
    return null
  }

  const run = ((initialErr: any, initialCtx: any, done: CallbackFunction<any>) => {
    executeFusedStageFnSequence(plan as any, stageFnIds, initialErr, initialCtx, done as any)
  }) as RunPipelineFunction<any>

  return {
    run,
    containsAsyncOps: plan.metadata.containsAsyncOps,
    fallbackOps: 0,
    dependencyParts: [`subplan-fused:${plan.dependencySignature}`],
  }
}

function createPlanRunnerInfo(plan: CompiledPlan<any>, dependencyLabel: string): RunnerInfo {
  return {
    run: ((err, ctx, done) => {
      executeCompiledPlan(plan as any, err as any, ctx, done as any)
    }) as RunPipelineFunction<any>,
    containsAsyncOps: true,
    fallbackOps: plan.metadata.fallbackOps,
    dependencyParts: [`${dependencyLabel}:${plan.dependencySignature}`],
  }
}

function createCompiledRunnerInfo(stage: unknown): RunnerInfo {
  if (typeof stage === 'function') {
    return {
      run: stage as RunPipelineFunction<any>,
      containsAsyncOps: is_async_function(stage),
      fallbackOps: 0,
      dependencyParts: [getFunctionSignature(stage as RunPipelineFunction<any>, 0)],
    }
  }

  if (isPipelineLike(stage) && !hasStageBoundaryFeatures(stage)) {
    const plan = getNestedPipelinePlan(stage)
    return createFusedSubplanRunnerInfo(plan) ?? createPlanRunnerInfo(plan, 'subplan')
  }

  if (isMultiWaySwitchStage(stage) && !hasStageBoundaryFeatures(stage)) {
    return createMultiWaySwitchRunnerInfo(stage)
  }

  if (isAnyStage(stage)) {
    const plan = compilePipelinePlan(createSyntheticPipeline(stage))
    return createPlanRunnerInfo(plan, 'subplan')
  }

  return {
    run: (async (_err: any, ctx: any) => ctx) as RunPipelineFunction<any>,
    containsAsyncOps: false,
    fallbackOps: 0,
    dependencyParts: ['noop'],
  }
}

function createPlainStageRunnerInfo<T extends StageObject>(stage: Stage<T>): RunnerInfo {
  const run = stage.config.run as RunPipelineFunction<T>
  const runCanFixError = can_fix_error({ run })

  const directRun = ((err: any, ctx: T, done: CallbackFunction<T>) => {
    const normalizedErr = normalizeExecutionErrorInput(err)

    if (normalizedErr && !runCanFixError) {
      done(normalizedErr, ctx)
      return
    }

    execute_callback(normalizedErr, run, ctx, ((runErr, nextCtx) => {
      if (runErr) {
        done(createError(runErr), ctx)
      } else {
        done(undefined, (nextCtx ?? ctx) as T)
      }
    }) as CallbackFunction<T>)
  }) as RunPipelineFunction<T>

  return {
    run: directRun,
    containsAsyncOps: true,
    fallbackOps: 0,
    dependencyParts: [
      `plain-stage:${stage.reportName}:${getGraphVersion(stage)}`,
      getFunctionSignature(run, 0),
    ],
  }
}

function createIfElsePredicate<T extends StageObject>(
  condition: ValidateFunction<T>,
) {
  if (!is_async_function(condition as any) && condition.length === 1) {
    return (ctx: T): PredicateResult | Promise<PredicateResult> => {
      try {
        const result = (condition as (ctx: T) => unknown)(ctx)

        if (isPromise(result) || is_thenable(result)) {
          return Promise.resolve(result).then((resolved) => ({
            value: !!resolved,
          })).catch((err) => ({
            value: false,
            err: err as any,
          }))
        }

        if (typeof result === 'boolean') {
          return result
            ? { value: true }
            : {
                value: false,
                err: createCodeError(ErrorCode.ERR_INVALID_CONTEXT) as any,
              }
        }

        if (result === undefined) {
          return { value: false }
        }

        return {
          value: false,
          err: result as any,
        }
      } catch (err) {
        return {
          value: false,
          err: createError(err as any, ErrorCode.ERR_STAGE_THROW) as any,
        }
      }
    }
  }

  return (ctx: T) => new Promise<PredicateResult>((resolve) => {
    execute_validate(condition, ctx, ((err, result) => {
      resolve({
        value: !!result,
        err: err as any,
      })
    }) as CallbackFunction<boolean>)
  })
}

function createIfElseBooleanPredicate<T extends StageObject>(
  condition: ValidateFunction<T>,
) {
  return (ctx: T): boolean | Promise<boolean> => {
    try {
      const result = (condition as (ctx: T) => unknown)(ctx)

      if (isPromise(result) || is_thenable(result)) {
        return Promise.resolve(result)
          .then((resolved) => !!resolved)
          .catch(() => false)
      }

      return !!result
    } catch {
      return false
    }
  }
}

function isCallbackValidateCondition<T extends StageObject>(
  condition: ValidateFunction<T>,
): condition is (ctx: T, callback: CallbackExternalFunction<boolean>) => void {
  return !is_async_function(condition as any) && condition.length === 2
}

function getErrBlindSyncBranchFn<T extends StageObject>(
  child: unknown,
): ((ctx: T) => unknown) | null | undefined {
  if (child === undefined || child === null) {
    return null
  }

  if (isEmptyStage(child) && !hasStageBoundaryFeatures(child)) {
    return null
  }

  if (typeof child === 'function') {
    if (child.length <= 1 && !is_async_function(child as any)) {
      return child as (ctx: T) => unknown
    }

    return undefined
  }

  if (canDevirtualizePlainStage(child)) {
    const run = child.config.run as ((ctx: T) => unknown) | undefined

    if (run && run.length <= 1 && !is_async_function(run as any)) {
      return run
    }
  }

  return undefined
}

function createFusedErrBlindIfElseStageFn<T extends StageObject>(
  condition: ValidateFunction<T>,
  success: unknown,
  failed: unknown,
): RunPipelineFunction<T> | null {
  const successBranch = getErrBlindSyncBranchFn<T>(success)
  const failedBranch = getErrBlindSyncBranchFn<T>(failed)

  if (successBranch === undefined || failedBranch === undefined) {
    return null
  }

  const runBranch = (branch: ((ctx: T) => unknown) | null, ctx: T) => {
    if (!branch) {
      return ctx
    }

    return branch(ctx)
  }

  return ((ctx: T) => {
    let result: unknown

    try {
      result = (condition as (ctx: T) => unknown)(ctx)
    } catch {
      return runBranch(failedBranch, ctx)
    }

    if (isPromise(result) || is_thenable(result)) {
      return Promise.resolve(result)
        .then((resolved) => runBranch(resolved ? successBranch : failedBranch, ctx))
        .catch(() => runBranch(failedBranch, ctx))
    }

    return runBranch(result ? successBranch : failedBranch, ctx)
  }) as RunPipelineFunction<T>
}

function isErrBlindIfElseBranch(child: unknown): boolean {
  if (child === undefined || child === null) {
    return true
  }

  if (typeof child === 'function') {
    return child.length <= 1
  }

  if (isEmptyStage(child) && !hasStageBoundaryFeatures(child)) {
    return true
  }

  if (canDevirtualizePlainStage(child)) {
    const run = child.config.run as Function | undefined
    return !!run && run.length <= 1
  }

  if (isPipelineLike(child) && !hasStageBoundaryFeatures(child)) {
    return child.config.stages.every((stage) => isErrBlindIfElseBranch(stage))
  }

  return false
}

function createSequentialIterationError(
  stage: Sequential<any, any>,
  iteration: number,
  err: unknown,
  ctx: unknown,
) {
  return new Error('sequential - error', {
    cause: {
      err,
      iteration,
      stage: stage.config.stage,
      ctx,
    },
  })
}

function createSequentialRunnerInfo<T extends StageObject>(
  stage: Sequential<T, any>,
): RunnerInfo {
  const inner = createCompiledRunnerInfo(stage.config.stage)
  const dependencyParts = [
    `sequential:${stage.reportName}:${getGraphVersion(stage)}`,
    ...inner.dependencyParts,
  ]

  if (stage.config.split) {
    dependencyParts.push(getFunctionSignature(stage.config.split as any, 1))
  }

  if (stage.config.combine) {
    dependencyParts.push(getFunctionSignature(stage.config.combine as any, 2))
  }

  const run = ((initialErr: any, initialCtx: T, done: CallbackFunction<T>) => {
    let completed = false

    const finish = (err?: any, ctx?: T) => {
      if (completed) {
        return
      }

      completed = true
      done(err, ctx)
    }

    try {
      const children = stage.split ? stage.split(initialCtx) : [initialCtx as any]
      const len = children.length

      if (initialErr) {
        finish(initialErr, initialCtx)
        return
      }

      if (len === 0) {
        finish(undefined, initialCtx)
        return
      }

      const currentChildren: Array<any> = new Array(len)
      let iter = 0

      const iterate = () => {
        while (!completed && iter < len) {
          const iterSnapshot = iter
          const childCtx = children[iterSnapshot]
          let sync = true
          let settledSync = false
          let syncErr: any
          let syncResult: any

          const settle = ((err?: any, ctx?: any) => {
            if (completed) {
              return
            }

            if (sync) {
              settledSync = true
              syncErr = err
              syncResult = ctx
              return
            }

            if (err) {
              finish(createSequentialIterationError(stage, iterSnapshot, err, childCtx) as any, initialCtx)
              return
            }

            currentChildren[iterSnapshot] = ctx ?? childCtx
            iter = iterSnapshot + 1
            iterate()
          }) as CallbackFunction<any>

          run_or_execute(inner.run as any, undefined, childCtx, settle)
          sync = false

          if (!settledSync) {
            return
          }

          if (syncErr) {
            finish(createSequentialIterationError(stage, iterSnapshot, syncErr, childCtx) as any, initialCtx)
            return
          }

          currentChildren[iterSnapshot] = syncResult ?? childCtx
          iter = iterSnapshot + 1
        }

        if (!completed) {
          finish(undefined, stage.combine(initialCtx, currentChildren))
        }
      }

      iterate()
    } catch (err) {
      finish(err as any, initialCtx)
    }
  }) as RunPipelineFunction<any>

  return {
    run,
    containsAsyncOps: true,
    fallbackOps: inner.fallbackOps,
    dependencyParts,
  }
}

function createDoWhileRunnerInfo<T extends StageObject>(
  stage: DoWhile<T, any>,
): RunnerInfo {
  const inner = createCompiledRunnerInfo(stage.config.stage)
  const dependencyParts = [
    `dowhile:${stage.reportName}:${getGraphVersion(stage)}`,
    ...inner.dependencyParts,
  ]

  if (stage.config.split) {
    dependencyParts.push(getFunctionSignature(stage.config.split as any, 2))
  }

  if (stage.config.reachEnd) {
    dependencyParts.push(getFunctionSignature(stage.config.reachEnd as any, 3))
  }

  const run = (async (initialErr: any, initialContext: T) => {
    if (!stage.config.stage) {
      return initialContext
    }

    let iter = -1
    let currentError = initialErr
    let currentContext = initialContext

    while (true) {
      iter += 1

      if (stage.reachEnd(currentError, currentContext, iter)) {
        if (currentError) {
          throw currentError
        }
        return currentContext
      }

      const splitCtx = stage.split(currentContext, iter)

      try {
        currentContext = await executeRunnerPromise(inner.run as any, currentError, splitCtx)
        currentError = undefined
      } catch (err) {
        currentError = err
      }
    }
  }) as RunPipelineFunction<any>

  return {
    run,
    containsAsyncOps: true,
    fallbackOps: inner.fallbackOps,
    dependencyParts,
  }
}

function createRetryRunnerInfo<T extends StageObject>(
  stage: RetryOnError<T>,
): RunnerInfo {
  const inner = createCompiledRunnerInfo(stage.config.stage)
  const dependencyParts = [
    `retry:${stage.reportName}:${getGraphVersion(stage)}`,
    ...inner.dependencyParts,
  ]

  if (typeof stage.config.retry === 'function') {
    dependencyParts.push(getFunctionSignature(stage.config.retry as any, 3))
  } else {
    dependencyParts.push(`retry-count:${stage.config.retry ?? 1}`)
  }

  if (stage.config.backup) {
    dependencyParts.push(getFunctionSignature(stage.config.backup as any, 1))
  }

  if (stage.config.restore) {
    dependencyParts.push(getFunctionSignature(stage.config.restore as any, 2))
  }

  const run = (async (initialErr: any, initialCtx: T) => {
    if (!stage.config.stage) {
      return initialCtx
    }

    let currentError = initialErr
    let currentCtx = initialCtx
    let iter = -1
    const backup = stage.backupContext(initialCtx)

    const reachEnd = (err: any, iteration: number) => {
      if (err) {
        if (typeof stage.config.retry === 'function') {
          return !stage.config.retry(err, currentCtx, iteration)
        }

        return iteration > (stage.config.retry ?? 1)
      }

      return true
    }

    try {
      do {
        iter += 1

        if (iter > 0) {
          currentCtx = stage.restoreContext(currentCtx, backup)
        }

        try {
          currentCtx = await executeRunnerPromise(inner.run as any, currentError, currentCtx)
          currentError = undefined
        } catch (err) {
          currentError = err
        }
      } while (!reachEnd(currentError, iter))
    } catch (err) {
      currentCtx = stage.restoreContext(currentCtx, backup)
      throw err
    }

    if (currentError) {
      throw currentError
    }

    return currentCtx
  }) as RunPipelineFunction<any>

  return {
    run,
    containsAsyncOps: true,
    fallbackOps: inner.fallbackOps,
    dependencyParts,
  }
}

function createTimeoutRunnerInfo<T extends StageObject>(
  stage: Timeout<T>,
): RunnerInfo {
  const inner = createCompiledRunnerInfo(stage.config.stage)
  const overdue = stage.config.overdue ? createCompiledRunnerInfo(stage.config.overdue) : null
  const dependencyParts = [
    `timeout:${stage.reportName}:${getGraphVersion(stage)}`,
    ...inner.dependencyParts,
  ]

  if (typeof stage.config.timeout === 'function') {
    dependencyParts.push(getFunctionSignature(stage.config.timeout as any, 1))
  } else {
    dependencyParts.push(`timeout-ms:${stage.config.timeout ?? 0}`)
  }

  if (overdue) {
    dependencyParts.push(...overdue.dependencyParts)
  }

  const run = (async (initialErr: any, initialCtx: T) => {
    const waitFor =
      typeof stage.config.timeout === 'function'
        ? stage.config.timeout(initialCtx)
        : stage.config.timeout

    if (!waitFor) {
      if (!stage.config.stage) {
        return initialCtx
      }

      return executeRunnerPromise(inner.run as any, initialErr, initialCtx)
    }

    return await new Promise<T>((resolve, reject) => {
      let settled = false
      let timeoutRef: ReturnType<typeof setTimeout> | null = null

      const finish = (fn: (value: any) => void) => (value: any) => {
        if (settled) {
          return
        }

        settled = true
        if (timeoutRef) {
          clearTimeout(timeoutRef)
          timeoutRef = null
        }

        fn(value)
      }

      timeoutRef = setTimeout(async () => {
        timeoutRef = null

        try {
          if (overdue) {
            const overdueCtx = await executeRunnerPromise(overdue.run as any, initialErr, initialCtx)
            finish(resolve)(overdueCtx)
          } else {
            finish(resolve)(initialCtx)
          }
        } catch (err) {
          finish(reject)(err)
        }
      }, waitFor)

      if (!stage.config.stage) {
        return
      }

      executeRunnerPromise(inner.run as any, initialErr, initialCtx)
        .then(finish(resolve))
        .catch(finish(reject))
    })
  }) as RunPipelineFunction<any>

  return {
    run,
    containsAsyncOps: true,
    fallbackOps: inner.fallbackOps + (overdue?.fallbackOps ?? 0),
    dependencyParts,
  }
}

function normalizeMultiWaySwitchCase(
  stage: MultiWaySwitch<any, any>,
  rawCase: any,
) {
  let caseItem = rawCase

  if (typeof caseItem === 'function') {
    caseItem = {
      stage: caseItem,
      evaluate: true,
    }
  } else if (isAnyStage(caseItem)) {
    caseItem = {
      stage: caseItem,
      evaluate: true,
    }
  }

  if (!caseItem || typeof caseItem !== 'object' || !caseItem.stage) {
    return null
  }

  let caseStage = caseItem.stage

  if (!isAnyStage(caseStage) && typeof caseStage === 'object') {
    caseStage = new Stage(caseStage)
  }

  const normalized = {
    ...caseItem,
    stage: caseStage,
  }

  if (typeof normalized.split !== 'function') {
    normalized.split = stage.config.split
  }

  if (typeof normalized.combine !== 'function') {
    normalized.combine = stage.config.combine
  }

  if (!('evaluate' in normalized)) {
    normalized.evaluate = true
  }

  return normalized
}

function buildCompiledMultiWaySwitchCases<T extends StageObject>(
  stage: MultiWaySwitch<T, any>,
): CompiledMultiWaySwitchCase[] {
  return (stage.config.cases ?? [])
    .map((item) => normalizeMultiWaySwitchCase(stage, item))
    .filter((item): item is NormalizedMultiWaySwitchCase => item !== null)
    .map((item) => ({
      ...item,
      runner: createCompiledRunnerInfo(item.stage),
    }))
}

function appendMultiWaySwitchCaseDependencyParts(
  caseItem: NormalizedMultiWaySwitchCase,
  index: number,
  dependencyParts: string[],
) {
  dependencyParts.push(`mws-case:${index}`)

  if (typeof caseItem.evaluate === 'function') {
    dependencyParts.push(getFunctionSignature(caseItem.evaluate as any, index))
  } else {
    dependencyParts.push(`mws-eval:${String(caseItem.evaluate !== false)}`)
  }

  if (typeof caseItem.split === 'function') {
    dependencyParts.push(getFunctionSignature(caseItem.split as any, index))
  }

  if (typeof caseItem.combine === 'function') {
    dependencyParts.push(getFunctionSignature(caseItem.combine as any, index))
  }
}

function createExecutableMultiWaySwitchData(
  cases: CompiledMultiWaySwitchCase[],
): ExecutableMultiWaySwitchData {
  const statics: ExecutableMultiWaySwitchStaticCase[] = []
  const dynamics: ExecutableMultiWaySwitchDynamicCase[] = []

  for (let i = 0; i < cases.length; i++) {
    const caseItem = cases[i]

    if (typeof caseItem.evaluate === 'function') {
      dynamics.push({
        stage: caseItem.stage,
        evaluate: caseItem.evaluate as ExecutableMultiWaySwitchDynamicCase['evaluate'],
        split: caseItem.split,
        combine: caseItem.combine,
        run: caseItem.runner.run,
      })
      continue
    }

    if (caseItem.evaluate !== false) {
      statics.push({
        stage: caseItem.stage,
        split: caseItem.split,
        combine: caseItem.combine,
        run: caseItem.runner.run,
      })
    }
  }

  return {
    statics,
    dynamics,
  }
}

function createMultiWaySwitchRunnerInfo<T extends StageObject>(
  stage: MultiWaySwitch<T, any>,
): RunnerInfo {
  const compiledCases = buildCompiledMultiWaySwitchCases(stage)
  const executableData = createExecutableMultiWaySwitchData(compiledCases)

  const dependencyParts = [`mws:${stage.reportName}:${getGraphVersion(stage)}`]
  let fallbackOps = 0
  let containsAsyncOps = false

  for (let i = 0; i < compiledCases.length; i++) {
    const caseItem = compiledCases[i]
    appendMultiWaySwitchCaseDependencyParts(caseItem, i, dependencyParts)
    dependencyParts.push(...caseItem.runner.dependencyParts)
    fallbackOps += caseItem.runner.fallbackOps
    containsAsyncOps = containsAsyncOps || caseItem.runner.containsAsyncOps
  }

  const run = ((initialErr: any, initialCtx: T, done: CallbackFunction<T>) => {
    executeNativeMultiWaySwitch(initialErr, initialCtx, executableData, done)
  }) as RunPipelineFunction<any>

  return {
    run,
    containsAsyncOps,
    fallbackOps,
    dependencyParts,
  }
}

function appendDependencySignatureForStage<T extends StageObject>(
  child: unknown,
  dependencyParts: string[],
) {
  if (typeof child === 'function') {
    dependencyParts.push(getFunctionSignature(child as RunPipelineFunction<any>, dependencyParts.length))
    return
  }

  if (isPipelineLike(child)) {
    appendDependencySignature(child, dependencyParts)
    return
  }

  if (isIfElseStage(child) && !hasStageBoundaryFeatures(child)) {
    dependencyParts.push(`ifelse:${child.reportName}:${getGraphVersion(child)}`)

    if (typeof child.config.condition === 'function') {
      dependencyParts.push(getFunctionSignature(child.config.condition as any, 0))
    } else {
      dependencyParts.push(`ifelse-bool:${String(child.config.condition ?? true)}`)
    }

    if (child.config.success) {
      appendDependencySignatureForStage(child.config.success, dependencyParts)
    }

    if (child.config.failed) {
      appendDependencySignatureForStage(child.config.failed, dependencyParts)
    }

    return
  }

  if (isWrapStage(child) && !hasStageBoundaryFeatures(child)) {
    dependencyParts.push(`wrap:${child.reportName}:${getGraphVersion(child)}`)

    if (child.config.prepare) {
      dependencyParts.push(getFunctionSignature(child.config.prepare as any, 1))
    }

    if (child.config.finalize) {
      dependencyParts.push(getFunctionSignature(child.config.finalize as any, 2))
    }

    if (child.config.stage) {
      appendDependencySignatureForStage(child.config.stage, dependencyParts)
    }

    return
  }

  if (isSequentialStage(child) && !hasStageBoundaryFeatures(child)) {
    dependencyParts.push(...createSequentialRunnerInfo(child).dependencyParts)
    return
  }

  if (isParallelStage(child) && !hasStageBoundaryFeatures(child)) {
    dependencyParts.push(`parallel:${child.reportName}:${getGraphVersion(child)}`)

    if (child.config.stage) {
      dependencyParts.push(...createCompiledRunnerInfo(child.config.stage).dependencyParts)
    }

    if (child.config.split) {
      dependencyParts.push(getFunctionSignature(child.config.split as any, 1))
    }

    if (child.config.combine) {
      dependencyParts.push(getFunctionSignature(child.config.combine as any, 2))
    }

    if (child.concurrency !== undefined) {
      dependencyParts.push(`parallel-concurrency:${child.concurrency}`)
    }

    dependencyParts.push(`parallel-join:${child.join}`)

    if (child.join === 'quorum') {
      dependencyParts.push(`parallel-quorum:${child.quorum ?? 'default'}`)
    }

    if (child.trailing !== 'ignore') {
      dependencyParts.push(`parallel-trailing:${child.trailing}`)
    }

    if (child.trailingTimeout !== undefined) {
      dependencyParts.push(`parallel-trailing-timeout:${child.trailingTimeout}`)
    }

    return
  }

  if (isDoWhileStage(child) && !hasStageBoundaryFeatures(child)) {
    dependencyParts.push(...createDoWhileRunnerInfo(child).dependencyParts)
    return
  }

  if (isRetryOnErrorStage(child) && !hasStageBoundaryFeatures(child)) {
    dependencyParts.push(...createRetryRunnerInfo(child).dependencyParts)
    return
  }

  if (isTimeoutStage(child) && !hasStageBoundaryFeatures(child)) {
    dependencyParts.push(...createTimeoutRunnerInfo(child).dependencyParts)
    return
  }

  if (isMultiWaySwitchStage(child) && !hasStageBoundaryFeatures(child)) {
    dependencyParts.push(...createMultiWaySwitchRunnerInfo(child).dependencyParts)
    return
  }

  if (canDevirtualizePlainStage(child)) {
    dependencyParts.push(...createPlainStageRunnerInfo(child).dependencyParts)
    return
  }

  if (isPlainStageLike(child)) {
    dependencyParts.push(`stage:${(child as any).reportName ?? 'Stage'}:${getGraphVersion(child)}`)
    return
  }

  if (isAnyStage(child)) {
    dependencyParts.push(`fallback:${(child as any).reportName ?? (child as any).toString?.() ?? 'stage'}:${getGraphVersion(child)}`)
    return
  }

  dependencyParts.push(`unknown:${typeof child}:${dependencyParts.length}`)
}

function appendDependencySignature<T extends StageObject>(
  pipeline: PipelineLike<T>,
  dependencyParts: string[],
) {
  dependencyParts.push(`pipe:${getGraphVersion(pipeline)}:${pipeline.config.stages.length}`)

  for (let i = 0; i < pipeline.config.stages.length; i++) {
    appendDependencySignatureForStage(pipeline.config.stages[i], dependencyParts)
  }
}

function registerRunnerInfo(
  info: RunnerInfo,
  tables: ReturnType<typeof createPlanTables>,
  metadata: PlanMetadata,
  dependencyParts: string[],
) {
  dependencyParts.push(...info.dependencyParts)
  metadata.containsAsyncOps = metadata.containsAsyncOps || info.containsAsyncOps
  metadata.fallbackOps += info.fallbackOps

  return addStageFn(tables, info.run)
}

function emitSequentialStage<T extends StageObject>(
  stage: Sequential<T, any>,
  ops: PlanOp[],
  tables: ReturnType<typeof createPlanTables>,
  metadata: PlanMetadata,
  dependencyParts: string[],
) {
  let stageFnId: number | undefined
  let fusedPlan: CompiledPlan<any> | undefined
  let fusedStageFnIds: number[] | undefined
  let inlineControlPlan: CompiledPlan<any> | undefined
  let subplanId: number | undefined

  if (isPipelineLike(stage.config.stage) && !hasStageBoundaryFeatures(stage.config.stage)) {
    const plan = getNestedPipelinePlan(stage.config.stage)
    metadata.containsAsyncOps = metadata.containsAsyncOps || plan.metadata.containsAsyncOps
    metadata.containsParallelOps = metadata.containsParallelOps || plan.metadata.containsParallelOps
    metadata.fallbackOps += plan.metadata.fallbackOps
    fusedStageFnIds = getFusableSubplanStageFnIds(plan) ?? undefined

    if (fusedStageFnIds) {
      fusedPlan = plan
      dependencyParts.push(`subplan-fused-inline:${plan.dependencySignature}`)
    } else if (isInlineControlFlowSubplan(plan)) {
      inlineControlPlan = plan
      dependencyParts.push(`subplan-inline-control:${plan.dependencySignature}`)
    } else {
      subplanId = tables.subplans.push(plan) - 1
      dependencyParts.push(`subplan-inline:${plan.dependencySignature}`)
    }
  } else {
    const inner = createCompiledRunnerInfo(stage.config.stage)
    stageFnId = registerRunnerInfo(inner, tables, metadata, dependencyParts)
  }

  dependencyParts.push(`sequential:${stage.reportName}:${getGraphVersion(stage)}`)

  if (stage.config.split) {
    dependencyParts.push(getFunctionSignature(stage.config.split as any, 1))
  }

  if (stage.config.combine) {
    dependencyParts.push(getFunctionSignature(stage.config.combine as any, 2))
  }

  const data = tables.constants.push({
    kind: 'SEQUENTIAL',
    reportName: stage.reportName,
    stage: stage.config.stage,
    stageFnId,
    fusedPlan,
    fusedStageFnIds,
    inlineControlPlan,
    subplanId,
    split: (ctx: any) => stage.split(ctx),
    combine: (ctx: any, children: any[]) => stage.combine(ctx, children),
  }) - 1

  ops.push({ op: 'RUN_SEQUENTIAL', data })
}

function emitParallelStage<T extends StageObject>(
  stage: Parallel<T, any>,
  ops: PlanOp[],
  tables: ReturnType<typeof createPlanTables>,
  metadata: PlanMetadata,
  dependencyParts: string[],
) {
  dependencyParts.push(`parallel:${stage.reportName}:${getGraphVersion(stage)}`)

  let stageFnId: number | undefined

  if (stage.config.stage) {
    const inner = createCompiledRunnerInfo(stage.config.stage)
    stageFnId = registerRunnerInfo(inner, tables, metadata, dependencyParts)
  }

  if (stage.config.split) {
    dependencyParts.push(getFunctionSignature(stage.config.split as any, 1))
  }

  if (stage.config.combine) {
    dependencyParts.push(getFunctionSignature(stage.config.combine as any, 2))
  }

  if (stage.concurrency !== undefined) {
    dependencyParts.push(`parallel-concurrency:${stage.concurrency}`)
  }

  dependencyParts.push(`parallel-join:${stage.join}`)

  if (stage.join === 'quorum') {
    dependencyParts.push(`parallel-quorum:${stage.quorum ?? 'default'}`)
  }

  if (stage.trailing !== 'ignore') {
    dependencyParts.push(`parallel-trailing:${stage.trailing}`)
  }

  if (stage.trailingTimeout !== undefined) {
    dependencyParts.push(`parallel-trailing-timeout:${stage.trailingTimeout}`)
  }

  metadata.containsParallelOps = true

  const data = tables.constants.push({
    kind: 'PARALLEL',
    reportName: stage.reportName,
    stage: stage.config.stage,
    stageName: stage.name,
    stageFnId,
    concurrency: stage.concurrency,
    join: stage.join,
    quorum: stage.quorum,
    trailing: stage.trailing,
    trailingTimeout: stage.trailingTimeout,
    split: (ctx: any) => stage.split(ctx),
    combine: (ctx: any, children: any[]) => stage.combine(ctx, children),
  }) - 1

  ops.push({ op: 'RUN_PARALLEL', data })
}

function emitLoopStage<T extends StageObject>(
  stage: DoWhile<T, any>,
  ops: PlanOp[],
  tables: ReturnType<typeof createPlanTables>,
  metadata: PlanMetadata,
  dependencyParts: string[],
) {
  const inner = createCompiledRunnerInfo(stage.config.stage)
  const stageFnId = registerRunnerInfo(inner, tables, metadata, dependencyParts)

  dependencyParts.push(`dowhile:${stage.reportName}:${getGraphVersion(stage)}`)

  if (stage.config.split) {
    dependencyParts.push(getFunctionSignature(stage.config.split as any, 2))
  }

  if (stage.config.reachEnd) {
    dependencyParts.push(getFunctionSignature(stage.config.reachEnd as any, 3))
  }

  const data = tables.constants.push({
    kind: 'LOOP',
    reportName: stage.reportName,
    stageFnId,
    split: (ctx: any, iter: number) => stage.split(ctx, iter),
    reachEnd: (err: any, ctx: any, iter: number) => stage.reachEnd(err, ctx, iter),
  }) - 1

  ops.push({ op: 'RUN_LOOP', data })
}

function emitRetryStage<T extends StageObject>(
  stage: RetryOnError<T>,
  ops: PlanOp[],
  tables: ReturnType<typeof createPlanTables>,
  metadata: PlanMetadata,
  dependencyParts: string[],
) {
  const inner = createCompiledRunnerInfo(stage.config.stage)
  const stageFnId = registerRunnerInfo(inner, tables, metadata, dependencyParts)

  dependencyParts.push(`retry:${stage.reportName}:${getGraphVersion(stage)}`)

  if (typeof stage.config.retry === 'function') {
    dependencyParts.push(getFunctionSignature(stage.config.retry as any, 3))
  } else {
    dependencyParts.push(`retry-count:${stage.config.retry ?? 1}`)
  }

  if (stage.config.backup) {
    dependencyParts.push(getFunctionSignature(stage.config.backup as any, 1))
  }

  if (stage.config.restore) {
    dependencyParts.push(getFunctionSignature(stage.config.restore as any, 2))
  }

  const data = tables.constants.push({
    kind: 'RETRY',
    reportName: stage.reportName,
    stageFnId,
    retry: stage.config.retry ?? 1,
    backup: (ctx: any) => stage.backupContext(ctx),
    restore: (ctx: any, backup: any) => stage.restoreContext(ctx, backup),
  }) - 1

  ops.push({ op: 'RUN_RETRY', data })
}

function emitTimeoutStage<T extends StageObject>(
  stage: Timeout<T>,
  ops: PlanOp[],
  tables: ReturnType<typeof createPlanTables>,
  metadata: PlanMetadata,
  dependencyParts: string[],
) {
  dependencyParts.push(`timeout:${stage.reportName}:${getGraphVersion(stage)}`)

  let stageFnId: number | undefined
  let overdueStageFnId: number | undefined

  if (stage.config.stage) {
    const inner = createCompiledRunnerInfo(stage.config.stage)
    stageFnId = registerRunnerInfo(inner, tables, metadata, dependencyParts)
  }

  if (stage.config.overdue) {
    const overdue = createCompiledRunnerInfo(stage.config.overdue)
    overdueStageFnId = registerRunnerInfo(overdue, tables, metadata, dependencyParts)
  }

  if (typeof stage.config.timeout === 'function') {
    dependencyParts.push(getFunctionSignature(stage.config.timeout as any, 1))
  } else {
    dependencyParts.push(`timeout-ms:${stage.config.timeout ?? 0}`)
  }

  metadata.containsAsyncOps = metadata.containsAsyncOps || Boolean(stage.config.timeout)

  const data = tables.constants.push({
    kind: 'TIMEOUT',
    reportName: stage.reportName,
    stageFnId,
    overdueStageFnId,
    timeout: stage.config.timeout,
  }) - 1

  ops.push({ op: 'RUN_TIMEOUT', data })
}

function emitMultiWaySwitchStage<T extends StageObject>(
  stage: MultiWaySwitch<T, any>,
  ops: PlanOp[],
  tables: ReturnType<typeof createPlanTables>,
  metadata: PlanMetadata,
  dependencyParts: string[],
) {
  const compiledCases = buildCompiledMultiWaySwitchCases(stage)
  dependencyParts.push(`mws:${stage.reportName}:${getGraphVersion(stage)}`)

  const statics: Array<{
    stage: unknown
    stageFnId: number
    split?: (ctx: any) => any
    combine?: (ctx: any, retCtx: any) => any
  }> = []
  const dynamics: Array<{
    stage: unknown
    stageFnId: number
    evaluate: (ctx: any) => any
    split?: (ctx: any) => any
    combine?: (ctx: any, retCtx: any) => any
  }> = []

  for (let i = 0; i < compiledCases.length; i++) {
    const caseItem = compiledCases[i]
    appendMultiWaySwitchCaseDependencyParts(caseItem, i, dependencyParts)
    const stageFnId = registerRunnerInfo(caseItem.runner, tables, metadata, dependencyParts)

    if (typeof caseItem.evaluate === 'function') {
      dynamics.push({
        stage: caseItem.stage,
        stageFnId,
        evaluate: caseItem.evaluate,
        split: caseItem.split,
        combine: caseItem.combine,
      })
    } else if (caseItem.evaluate !== false) {
      statics.push({
        stage: caseItem.stage,
        stageFnId,
        split: caseItem.split,
        combine: caseItem.combine,
      })
    }
  }

  const data = tables.constants.push({
    kind: 'MWS',
    reportName: stage.reportName,
    statics,
    dynamics,
  }) - 1

  ops.push({ op: 'RUN_MWS', data })
  ops.push({ op: 'SET_CTX_FROM_RESULT' })
}

function emitPlainStageFn<T extends StageObject>(
  stage: Stage<T>,
  ops: PlanOp[],
  tables: ReturnType<typeof createPlanTables>,
  metadata: PlanMetadata,
  dependencyParts: string[],
) {
  const info = createPlainStageRunnerInfo(stage)
  const stageFnId = registerRunnerInfo(info, tables, metadata, dependencyParts)
  ops.push({ op: 'RUN_STAGE_FN', stageFnId })
  ops.push({ op: 'SET_CTX_FROM_RESULT' })
}

function emitIfElseStage<T extends StageObject>(
  stage: IfElse<T>,
  ops: PlanOp[],
  tables: ReturnType<typeof createPlanTables>,
  metadata: PlanMetadata,
  dependencyParts: string[],
  depth: number,
) {
  dependencyParts.push(`ifelse:${stage.reportName}:${getGraphVersion(stage)}`)

  const condition = stage.config.condition

  if (typeof condition === 'boolean') {
    dependencyParts.push(`ifelse-bool:${String(condition)}`)
    emitStage(stage.config[condition ? 'success' : 'failed'], ops, tables, metadata, dependencyParts, depth + 1)
    return
  }

  if (typeof condition !== 'function') {
    emitStage(stage.config.success ?? stage.config.failed, ops, tables, metadata, dependencyParts, depth + 1)
    return
  }

  dependencyParts.push(getFunctionSignature(condition as any, 0))
  const canSkipScope =
    !is_async_function(condition as any)
    && condition.length === 1
    && isErrBlindIfElseBranch(stage.config.success)
    && isErrBlindIfElseBranch(stage.config.failed)

  metadata.containsAsyncOps = true

  if (canSkipScope) {
    const fusedStageFn = createFusedErrBlindIfElseStageFn(
      condition,
      stage.config.success,
      stage.config.failed,
    )

    if (fusedStageFn) {
      if (stage.config.success) {
        appendDependencySignatureForStage(stage.config.success, dependencyParts)
      }

      if (stage.config.failed) {
        appendDependencySignatureForStage(stage.config.failed, dependencyParts)
      }

      const stageFnId = addStageFn(tables, fusedStageFn)
      ops.push({ op: 'RUN_STAGE_FN', stageFnId })
      ops.push({ op: 'SET_CTX_FROM_RESULT' })
      return
    }
  }

  const predicateId = addPredicate(
    tables,
    canSkipScope
      ? createIfElseBooleanPredicate(condition)
      : isCallbackValidateCondition(condition)
        ? condition
        : createIfElsePredicate(condition),
    canSkipScope ? 'BOOL_CTX_SYNC' : isCallbackValidateCondition(condition) ? 'GENERIC_CALLBACK' : 'GENERIC',
  )

  if (canSkipScope) {
    const jumpIndex = ops.length
    ops.push({ op: 'JUMP_IF_TRUE', predicateId, target: 0 })

    emitStage(stage.config.failed, ops, tables, metadata, dependencyParts, depth + 1)

    const joinJumpIndex = ops.length
    ops.push({ op: 'JUMP', target: 0 })

    const successStart = ops.length
    ;(ops[jumpIndex] as Extract<PlanOp, { op: 'JUMP_IF_TRUE' }>).target = successStart

    emitStage(stage.config.success, ops, tables, metadata, dependencyParts, depth + 1)

    const joinTarget = ops.length
    ;(ops[joinJumpIndex] as Extract<PlanOp, { op: 'JUMP' }>).target = joinTarget
    return
  }

  ops.push({ op: 'PUSH_FRAME', frameKind: 'SCOPE' })

  const jumpIndex = ops.length
  ops.push({ op: 'JUMP_IF_TRUE', predicateId, target: 0 })

  emitStage(stage.config.failed, ops, tables, metadata, dependencyParts, depth + 1)
  ops.push({ op: 'POP_FRAME' })

  const joinJumpIndex = ops.length
  ops.push({ op: 'JUMP', target: 0 })

  const successStart = ops.length
  ;(ops[jumpIndex] as Extract<PlanOp, { op: 'JUMP_IF_TRUE' }>).target = successStart

  emitStage(stage.config.success, ops, tables, metadata, dependencyParts, depth + 1)
  ops.push({ op: 'POP_FRAME' })

  const joinTarget = ops.length
  ;(ops[joinJumpIndex] as Extract<PlanOp, { op: 'JUMP' }>).target = joinTarget
}

function emitWrapStage<T extends StageObject>(
  stage: Wrap<T, any>,
  ops: PlanOp[],
  tables: ReturnType<typeof createPlanTables>,
  metadata: PlanMetadata,
  dependencyParts: string[],
  depth: number,
) {
  dependencyParts.push(`wrap:${stage.reportName}:${getGraphVersion(stage)}`)

  const prepareId = tables.transforms.push((ctx: any) => stage.prepare(ctx)) - 1
  const finalizeId = tables.transforms.push((ctx: any, retCtx: any) => stage.finalize(ctx, retCtx)) - 1
  const wrapData = tables.constants.push({ prepareId, finalizeId }) - 1

  if (stage.config.prepare) {
    dependencyParts.push(getFunctionSignature(stage.config.prepare as any, 1))
  }

  if (stage.config.finalize) {
    dependencyParts.push(getFunctionSignature(stage.config.finalize as any, 2))
  }

  ops.push({ op: 'PUSH_FRAME', frameKind: 'WRAP', data: wrapData })
  emitStage(stage.config.stage, ops, tables, metadata, dependencyParts, depth + 1)
  ops.push({ op: 'POP_FRAME' })
}

function emitStage<T extends StageObject>(
  child: unknown,
  ops: PlanOp[],
  tables: ReturnType<typeof createPlanTables>,
  metadata: PlanMetadata,
  dependencyParts: string[],
  depth: number,
) {
  if (child === undefined || child === null) {
    return
  }

  metadata.maxStaticDepthBeforeFlatten = Math.max(metadata.maxStaticDepthBeforeFlatten, depth)

  if (typeof child === 'function') {
    const stageFn = child as RunPipelineFunction<any>
    const stageFnId = addStageFn(tables, stageFn)
    ops.push({ op: 'RUN_STAGE_FN', stageFnId })
    ops.push({ op: 'SET_CTX_FROM_RESULT' })
    metadata.containsAsyncOps = metadata.containsAsyncOps || is_async_function(stageFn)
    dependencyParts.push(getFunctionSignature(stageFn, dependencyParts.length))
    return
  }

  if (isPipelineLike(child)) {
    // Only flatten if the nested pipeline has no boundary features (ensure/validate/rescue/etc.)
    // Otherwise, those boundary features would be silently dropped during flattening.
    if (!hasStageBoundaryFeatures(child)) {
      metadata.flattenedStages += child.config.stages.length
      dependencyParts.push(`pipe:${getGraphVersion(child)}:${child.config.stages.length}`)

      for (let i = 0; i < child.config.stages.length; i++) {
        emitStage(child.config.stages[i], ops, tables, metadata, dependencyParts, depth + 1)
      }
      return
    }
    // Fall through to RUN_STAGE_INSTANCE / RUN_FALLBACK_STAGE below
  }

  if (isIfElseStage(child) && !hasStageBoundaryFeatures(child)) {
    emitIfElseStage(child, ops, tables, metadata, dependencyParts, depth)
    return
  }

  if (isWrapStage(child) && !hasStageBoundaryFeatures(child)) {
    emitWrapStage(child, ops, tables, metadata, dependencyParts, depth)
    return
  }

  if (isSequentialStage(child) && !hasStageBoundaryFeatures(child)) {
    emitSequentialStage(child, ops, tables, metadata, dependencyParts)
    return
  }

  if (isParallelStage(child) && !hasStageBoundaryFeatures(child)) {
    emitParallelStage(child, ops, tables, metadata, dependencyParts)
    return
  }

  if (isDoWhileStage(child) && !hasStageBoundaryFeatures(child)) {
    emitLoopStage(child, ops, tables, metadata, dependencyParts)
    return
  }

  if (isRetryOnErrorStage(child) && !hasStageBoundaryFeatures(child)) {
    emitRetryStage(child, ops, tables, metadata, dependencyParts)
    return
  }

  if (isTimeoutStage(child) && !hasStageBoundaryFeatures(child)) {
    emitTimeoutStage(child, ops, tables, metadata, dependencyParts)
    return
  }

  if (isMultiWaySwitchStage(child) && !hasStageBoundaryFeatures(child)) {
    emitMultiWaySwitchStage(child, ops, tables, metadata, dependencyParts)
    return
  }

  if (canDevirtualizePlainStage(child)) {
    emitPlainStageFn(child, ops, tables, metadata, dependencyParts)
    return
  }

  if (isEmptyStage(child) && !hasStageBoundaryFeatures(child)) {
    dependencyParts.push(`empty:${getGraphVersion(child)}`)
    return
  }

  if (isPlainStageLike(child)) {
    const stageId = tables.stageInstances.push(child as any) - 1
    ops.push({ op: 'RUN_STAGE_INSTANCE', stageId })
    ops.push({ op: 'SET_CTX_FROM_RESULT' })
    dependencyParts.push(`stage:${(child as any).reportName ?? 'Stage'}:${getGraphVersion(child)}`)
    return
  }

  if (isAnyStage(child)) {
    const stageId = tables.stageInstances.push(child as any) - 1
    ops.push({ op: 'RUN_FALLBACK_STAGE', stageId })
    ops.push({ op: 'SET_CTX_FROM_RESULT' })
    metadata.fallbackOps += 1
    metadata.containsAsyncOps = true
    dependencyParts.push(`fallback:${(child as any).reportName ?? (child as any).toString?.() ?? 'stage'}:${getGraphVersion(child)}`)
    return
  }

  dependencyParts.push(`unknown:${typeof child}:${dependencyParts.length}`)
}

function emitPipelineStages<T extends StageObject>(
  pipeline: PipelineLike<T>,
  ops: PlanOp[],
  tables: ReturnType<typeof createPlanTables>,
  metadata: PlanMetadata,
  dependencyParts: string[],
  depth: number,
) {
  metadata.maxStaticDepthBeforeFlatten = Math.max(metadata.maxStaticDepthBeforeFlatten, depth)
  dependencyParts.push(`pipe:${getGraphVersion(pipeline)}:${pipeline.config.stages.length}`)

  for (let i = 0; i < pipeline.config.stages.length; i++) {
    emitStage(pipeline.config.stages[i], ops, tables, metadata, dependencyParts, depth + 1)
  }
}

export function compilePipelinePlan<T extends StageObject>(pipeline: PipelineLike<T>): CompiledPlan<T> {
  const tables = createPlanTables()
  const ops: PlanOp[] = []
  const metadata: PlanMetadata = {
    artifactKind: 'in-memory-runtime-plan',
    rootKind: 'Pipeline',
    flattenedStages: 0,
    fallbackOps: 0,
    containsAsyncOps: false,
    containsParallelOps: false,
    maxStaticDepthBeforeFlatten: 0,
    sourceVersion: getGraphVersion(pipeline),
  }
  const dependencyParts: string[] = []

  emitPipelineStages(pipeline, ops, tables, metadata, dependencyParts, 1)
  const errorExit = ops.length
  ops.push({ op: 'RETURN' })

  return {
    version: 1,
    mode: metadata.fallbackOps > 0 ? 'compiled-hybrid' : 'compiled-static',
    entry: 0,
    errorExit,
    ops,
    tables,
    metadata,
    dependencySignature: dependencyParts.join('|'),
  }
}

export function getPipelineDependencySignature<T extends StageObject>(pipeline: PipelineLike<T>) {
  const dependencyParts: string[] = []
  appendDependencySignature(pipeline, dependencyParts)
  return dependencyParts.join('|')
}
