import { CompiledPlan, PlanOp } from './plan'

function formatOp(plan: CompiledPlan<any>, op: PlanOp) {
  switch (op.op) {
    case 'RUN_STAGE_FN':
      return `${op.op} ${op.stageFnId}`
    case 'RUN_STAGE_INSTANCE':
    case 'RUN_FALLBACK_STAGE':
      return `${op.op} ${op.stageId}`
    case 'RUN_SEQUENTIAL': {
      const data = plan.tables.constants[op.data]
      return `${op.op} child=${data?.stageFnId ?? '?'} split=${data?.split ? 'yes' : 'no'} combine=${data?.combine ? 'yes' : 'no'}`
    }
    case 'RUN_LOOP': {
      const data = plan.tables.constants[op.data]
      return `${op.op} child=${data?.stageFnId ?? '?'} split=${data?.split ? 'yes' : 'no'} reachEnd=${data?.reachEnd ? 'yes' : 'no'}`
    }
    case 'RUN_RETRY': {
      const data = plan.tables.constants[op.data]
      return `${op.op} child=${data?.stageFnId ?? '?'} retry=${typeof data?.retry === 'function' ? 'fn' : data?.retry ?? '?'}`
    }
    case 'RUN_TIMEOUT': {
      const data = plan.tables.constants[op.data]
      const timeoutLabel = typeof data?.timeout === 'function' ? 'dynamic' : data?.timeout ?? 0
      return `${op.op} stage=${data?.stageFnId ?? '-'} overdue=${data?.overdueStageFnId ?? '-'} timeout=${timeoutLabel}`
    }
    case 'JUMP':
      return `${op.op} ${op.target}`
    case 'JUMP_IF_TRUE':
      return `${op.op} pred=${op.predicateId} -> ${op.target}`
    case 'PUSH_FRAME':
      return `${op.op} ${op.frameKind}${op.data === undefined ? '' : ` ${op.data}`}`
    default:
      return op.op
  }
}

export function planToString(plan: CompiledPlan<any>) {
  const lines = [
    `CompiledPlan mode=${plan.mode} entry=${plan.entry} errorExit=${plan.errorExit}`,
    `artifact=${plan.metadata.artifactKind}`,
    `dependencySignature=${plan.dependencySignature}`,
    `metadata=${JSON.stringify(plan.metadata)}`,
  ]

  for (let i = 0; i < plan.ops.length; i++) {
    lines.push(`${String(i).padStart(3)}: ${formatOp(plan, plan.ops[i])}`)
  }

  return lines.join('\n')
}
