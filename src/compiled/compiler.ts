import { is_async_function, isAnyStage, RunPipelineFunction, StageObject } from '../utils/types'
import {
  CompiledPlan,
  CompiledStageFnKind,
  createPlanTables,
  PlanMetadata,
  PlanOp,
} from './plan'

type PipelineLike<T extends StageObject> = {
  config: {
    stages: Array<unknown>
  }
  toString(): string
  reportName?: string
  _graphVersion?: number
}

function isPipelineLike<T extends StageObject>(stage: unknown): stage is PipelineLike<T> {
  return isAnyStage(stage) && typeof (stage as any).toString === 'function' && (stage as any).toString() === '[pipeline Pipeline]'
}

function isPlainStageLike<T extends StageObject>(stage: unknown) {
  return isAnyStage(stage) && typeof (stage as any).toString === 'function' && (stage as any).toString() === '[pipeline Stage]'
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

function appendDependencySignature<T extends StageObject>(
  pipeline: PipelineLike<T>,
  dependencyParts: string[],
) {
  dependencyParts.push(`pipe:${getGraphVersion(pipeline)}:${pipeline.config.stages.length}`)

  for (let i = 0; i < pipeline.config.stages.length; i++) {
    const child = pipeline.config.stages[i]

    if (typeof child === 'function') {
      dependencyParts.push(getFunctionSignature(child as RunPipelineFunction<any>, i))
      continue
    }

    if (isPipelineLike(child)) {
      appendDependencySignature(child, dependencyParts)
      continue
    }

    if (isPlainStageLike(child)) {
      dependencyParts.push(`stage:${(child as any).reportName ?? 'Stage'}:${getGraphVersion(child)}`)
      continue
    }

    if (isAnyStage(child)) {
      dependencyParts.push(`fallback:${(child as any).reportName ?? (child as any).toString?.() ?? 'stage'}:${getGraphVersion(child)}`)
      continue
    }

    dependencyParts.push(`unknown:${typeof child}:${i}`)
  }
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
    const child = pipeline.config.stages[i]

    if (typeof child === 'function') {
      const stageFn = child as RunPipelineFunction<any>
      const stageFnId = tables.stageFns.push(stageFn) - 1
      tables.stageFnKinds[stageFnId] = classifyStageFn(stageFn)
      ops.push({ op: 'RUN_STAGE_FN', stageFnId })
      ops.push({ op: 'SET_CTX_FROM_RESULT' })
      metadata.containsAsyncOps = metadata.containsAsyncOps || is_async_function(stageFn)
      dependencyParts.push(getFunctionSignature(stageFn, i))
      continue
    }

    if (isPipelineLike(child)) {
      metadata.flattenedStages += child.config.stages.length
      emitPipelineStages(child, ops, tables, metadata, dependencyParts, depth + 1)
      continue
    }

    if (isPlainStageLike(child)) {
      const stageId = tables.stageInstances.push(child as any) - 1
      ops.push({ op: 'RUN_STAGE_INSTANCE', stageId })
      ops.push({ op: 'SET_CTX_FROM_RESULT' })
      dependencyParts.push(`stage:${(child as any).reportName ?? 'Stage'}:${getGraphVersion(child)}`)
      continue
    }

    if (isAnyStage(child)) {
      const stageId = tables.stageInstances.push(child as any) - 1
      ops.push({ op: 'RUN_FALLBACK_STAGE', stageId })
      ops.push({ op: 'SET_CTX_FROM_RESULT' })
      metadata.fallbackOps += 1
      dependencyParts.push(`fallback:${(child as any).reportName ?? (child as any).toString?.() ?? 'stage'}:${getGraphVersion(child)}`)
      continue
    }

    // Preserve compile stability even if the graph contains unknown values.
    dependencyParts.push(`unknown:${typeof child}:${i}`)
  }
}

export function compilePipelinePlan<T extends StageObject>(pipeline: PipelineLike<T>): CompiledPlan<T> {
  const tables = createPlanTables()
  const ops: PlanOp[] = []
  const metadata: PlanMetadata = {
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
