import { CompiledPlan, PlanOp } from './plan'

function formatOp(op: PlanOp) {
  switch (op.op) {
    case 'RUN_STAGE_FN':
      return `${op.op} ${op.stageFnId}`
    case 'RUN_STAGE_INSTANCE':
    case 'RUN_FALLBACK_STAGE':
      return `${op.op} ${op.stageId}`
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
    `dependencySignature=${plan.dependencySignature}`,
    `metadata=${JSON.stringify(plan.metadata)}`,
  ]

  for (let i = 0; i < plan.ops.length; i++) {
    lines.push(`${String(i).padStart(3)}: ${formatOp(plan.ops[i])}`)
  }

  return lines.join('\n')
}
