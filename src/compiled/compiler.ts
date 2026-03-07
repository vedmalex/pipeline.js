import { DoWhile } from '../dowhile'
import { IfElse } from '../ifelse'
import { RetryOnError } from '../retryonerror'
import { Sequential } from '../sequential'
import { Timeout } from '../timeout'
import { Wrap } from '../wrap'
import { execute_validate } from '../utils/execute_validate'
import { run_or_execute } from '../utils/run_or_execute'
import {
  CallbackFunction,
  is_async_function,
  isAnyStage,
  RunPipelineFunction,
  StageObject,
  ValidateFunction,
} from '../utils/types'
import { executeCompiledPlan } from './executor'
import {
  CompiledPlan,
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
}

type RunnerInfo = {
  run: RunPipelineFunction<any>
  containsAsyncOps: boolean
  fallbackOps: number
  dependencyParts: string[]
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

function isIfElseStage<T extends StageObject>(stage: unknown): stage is IfElse<T> {
  return stage instanceof IfElse
}

function isWrapStage<T extends StageObject>(stage: unknown): stage is Wrap<T, any> {
  return stage instanceof Wrap
}

function isSequentialStage<T extends StageObject>(stage: unknown): stage is Sequential<T, any> {
  return stage instanceof Sequential
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

function hasStageBoundaryFeatures(stage: any) {
  const config = stage?.config ?? {}

  return Boolean(
    config.ensure ||
      config.validate ||
      config.schema ||
      config.rescue ||
      config.run ||
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

function createCompiledRunnerInfo(stage: unknown): RunnerInfo {
  if (typeof stage === 'function') {
    return {
      run: stage as RunPipelineFunction<any>,
      containsAsyncOps: is_async_function(stage),
      fallbackOps: 0,
      dependencyParts: [getFunctionSignature(stage as RunPipelineFunction<any>, 0)],
    }
  }

  if (isAnyStage(stage)) {
    const plan = compilePipelinePlan(createSyntheticPipeline(stage))
    return {
      run: ((err, ctx, done) => {
        executeCompiledPlan(plan as any, err as any, ctx, done as any)
      }) as RunPipelineFunction<any>,
      containsAsyncOps: true,
      fallbackOps: plan.metadata.fallbackOps,
      dependencyParts: [`subplan:${plan.dependencySignature}`],
    }
  }

  return {
    run: (async (_err: any, ctx: any) => ctx) as RunPipelineFunction<any>,
    containsAsyncOps: false,
    fallbackOps: 0,
    dependencyParts: ['noop'],
  }
}

function createIfElsePredicate<T extends StageObject>(
  condition: ValidateFunction<T>,
) {
  return (ctx: T) => new Promise<PredicateResult>((resolve) => {
    execute_validate(condition, ctx, ((err, result) => {
      resolve({
        value: !!result,
        err: err as any,
      })
    }) as CallbackFunction<boolean>)
  })
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
  const inner = createCompiledRunnerInfo(stage.config.stage)
  const stageFnId = registerRunnerInfo(inner, tables, metadata, dependencyParts)

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
    split: (ctx: any) => stage.split(ctx),
    combine: (ctx: any, children: any[]) => stage.combine(ctx, children),
  }) - 1

  ops.push({ op: 'RUN_SEQUENTIAL', data })
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
  metadata.containsAsyncOps = true

  const predicateId = tables.predicates.push(createIfElsePredicate(condition)) - 1

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
    metadata.flattenedStages += child.config.stages.length
    dependencyParts.push(`pipe:${getGraphVersion(child)}:${child.config.stages.length}`)

    for (let i = 0; i < child.config.stages.length; i++) {
      emitStage(child.config.stages[i], ops, tables, metadata, dependencyParts, depth + 1)
    }
    return
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
