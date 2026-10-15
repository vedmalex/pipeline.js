"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.planToString = planToString;
function formatOp(plan, op) {
    var _a, _b;
    var _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
    switch (op.op) {
        case 'RUN_STAGE_FN':
            return `${op.op} ${op.stageFnId}`;
        case 'RUN_STAGE_INSTANCE':
        case 'RUN_FALLBACK_STAGE':
            return `${op.op} ${op.stageId}`;
        case 'RUN_SEQUENTIAL': {
            const data = plan.tables.constants[op.data];
            const child = (data === null || data === void 0 ? void 0 : data.subplanId) !== undefined
                ? `subplan:${data.subplanId}`
                : (_c = data === null || data === void 0 ? void 0 : data.stageFnId) !== null && _c !== void 0 ? _c : '?';
            return `${op.op} child=${child} split=${(data === null || data === void 0 ? void 0 : data.split) ? 'yes' : 'no'} combine=${(data === null || data === void 0 ? void 0 : data.combine) ? 'yes' : 'no'}`;
        }
        case 'RUN_LOOP': {
            const data = plan.tables.constants[op.data];
            return `${op.op} child=${(_d = data === null || data === void 0 ? void 0 : data.stageFnId) !== null && _d !== void 0 ? _d : '?'} split=${(data === null || data === void 0 ? void 0 : data.split) ? 'yes' : 'no'} reachEnd=${(data === null || data === void 0 ? void 0 : data.reachEnd) ? 'yes' : 'no'}`;
        }
        case 'RUN_RETRY': {
            const data = plan.tables.constants[op.data];
            return `${op.op} child=${(_e = data === null || data === void 0 ? void 0 : data.stageFnId) !== null && _e !== void 0 ? _e : '?'} retry=${typeof (data === null || data === void 0 ? void 0 : data.retry) === 'function' ? 'fn' : (_f = data === null || data === void 0 ? void 0 : data.retry) !== null && _f !== void 0 ? _f : '?'}`;
        }
        case 'RUN_TIMEOUT': {
            const data = plan.tables.constants[op.data];
            const timeoutLabel = typeof (data === null || data === void 0 ? void 0 : data.timeout) === 'function' ? 'dynamic' : (_g = data === null || data === void 0 ? void 0 : data.timeout) !== null && _g !== void 0 ? _g : 0;
            return `${op.op} stage=${(_h = data === null || data === void 0 ? void 0 : data.stageFnId) !== null && _h !== void 0 ? _h : '-'} overdue=${(_j = data === null || data === void 0 ? void 0 : data.overdueStageFnId) !== null && _j !== void 0 ? _j : '-'} timeout=${timeoutLabel}`;
        }
        case 'RUN_PARALLEL': {
            const data = plan.tables.constants[op.data];
            return `${op.op} child=${(_k = data === null || data === void 0 ? void 0 : data.stageFnId) !== null && _k !== void 0 ? _k : '-'} split=${(data === null || data === void 0 ? void 0 : data.split) ? 'yes' : 'no'} combine=${(data === null || data === void 0 ? void 0 : data.combine) ? 'yes' : 'no'} concurrency=${(_l = data === null || data === void 0 ? void 0 : data.concurrency) !== null && _l !== void 0 ? _l : 'unbounded'} join=${(_m = data === null || data === void 0 ? void 0 : data.join) !== null && _m !== void 0 ? _m : 'all'} quorum=${(_o = data === null || data === void 0 ? void 0 : data.quorum) !== null && _o !== void 0 ? _o : '-'} trailing=${(_p = data === null || data === void 0 ? void 0 : data.trailing) !== null && _p !== void 0 ? _p : 'ignore'} trailingTimeout=${(_q = data === null || data === void 0 ? void 0 : data.trailingTimeout) !== null && _q !== void 0 ? _q : '-'}`;
        }
        case 'RUN_MWS': {
            const data = plan.tables.constants[op.data];
            return `${op.op} statics=${(_r = (_a = data === null || data === void 0 ? void 0 : data.statics) === null || _a === void 0 ? void 0 : _a.length) !== null && _r !== void 0 ? _r : 0} dynamics=${(_s = (_b = data === null || data === void 0 ? void 0 : data.dynamics) === null || _b === void 0 ? void 0 : _b.length) !== null && _s !== void 0 ? _s : 0}`;
        }
        case 'JUMP':
            return `${op.op} ${op.target}`;
        case 'JUMP_IF_TRUE':
            return `${op.op} pred=${op.predicateId} -> ${op.target}`;
        case 'PUSH_FRAME':
            return `${op.op} ${op.frameKind}${op.data === undefined ? '' : ` ${op.data}`}`;
        default:
            return op.op;
    }
}
function planToString(plan) {
    const lines = [
        `CompiledPlan mode=${plan.mode} entry=${plan.entry} errorExit=${plan.errorExit}`,
        `artifact=${plan.metadata.artifactKind}`,
        `dependencySignature=${plan.dependencySignature}`,
        `metadata=${JSON.stringify(plan.metadata)}`,
    ];
    for (let i = 0; i < plan.ops.length; i++) {
        lines.push(`${String(i).padStart(3)}: ${formatOp(plan, plan.ops[i])}`);
    }
    return lines.join('\n');
}
//# sourceMappingURL=debug.js.map