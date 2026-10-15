"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invokeStageFn = invokeStageFn;
exports.executeFusedStageFnSequence = executeFusedStageFnSequence;
exports.executeNativeMultiWaySwitch = executeNativeMultiWaySwitch;
exports.executeInlineControlFlowSubplan = executeInlineControlFlowSubplan;
exports.executeCompiledPlan = executeCompiledPlan;
const execution_signal_1 = require("../execution_signal");
const ErrorList_1 = require("../utils/ErrorList");
const context_snapshot_1 = require("../utils/context_snapshot");
const errors_1 = require("../utils/errors");
const execute_validate_1 = require("../utils/execute_validate");
const TypeDetectors_1 = require("../utils/TypeDetectors");
const process_error_1 = require("../utils/process_error");
const run_or_execute_1 = require("../utils/run_or_execute");
const run_callback_once_1 = require("../utils/run_callback_once");
const warn_once_1 = require("../utils/warn_once");
const types_1 = require("../utils/types");
function createExecutionState(plan, err, context, done) {
    return {
        plan,
        pc: plan.entry,
        inputErr: err,
        ctx: context,
        err: undefined,
        result: undefined,
        frameStack: [{ kind: 'ROOT' }],
        suspended: false,
        completed: false,
        done,
        yielded: 0,
    };
}
function completeState(state) {
    if (state.completed)
        return;
    state.completed = true;
    state.done(state.err, state.ctx);
}
function removeFrame(state, frame) {
    if (state.frameStack[state.frameStack.length - 1] === frame) {
        state.frameStack.pop();
    }
}
function unwindFramesOnError(state) {
    var _a;
    while (state.frameStack.length > 1) {
        const top = state.frameStack[state.frameStack.length - 1];
        if ((top === null || top === void 0 ? void 0 : top.kind) === 'SUBPLAN_RETURN') {
            return;
        }
        const frame = state.frameStack.pop();
        if (!frame) {
            return;
        }
        switch (frame.kind) {
            case 'SCOPE':
                state.inputErr = frame.inputErr;
                break;
            case 'WRAP':
                state.ctx = frame.originalCtx;
                break;
            case 'SEQUENTIAL':
                state.ctx = frame.originalCtx;
                break;
            case 'LOOP':
                state.ctx = frame.currentCtx;
                break;
            case 'RETRY_STATE':
                state.ctx = frame.currentCtx;
                break;
            case 'TIMEOUT':
                state.ctx = frame.originalCtx;
                (_a = frame.controllerCleanup) === null || _a === void 0 ? void 0 : _a.call(frame);
                frame.controllerCleanup = null;
                if (frame.controller && !frame.controller.signal.aborted) {
                    frame.controller.abort((0, ErrorList_1.createCodeError)(errors_1.ErrorCode.ERR_STAGE_TIMEOUT));
                }
                if (frame.timer) {
                    clearTimeout(frame.timer);
                    frame.timer = null;
                }
                frame.settled = true;
                break;
            case 'PARALLEL':
                state.ctx = frame.originalCtx;
                if (frame.drainTimer) {
                    clearTimeout(frame.drainTimer);
                    frame.drainTimer = null;
                }
                for (const cleanup of frame.controllerCleanups) {
                    cleanup === null || cleanup === void 0 ? void 0 : cleanup();
                }
                for (const controller of frame.controllers) {
                    if (controller && !controller.signal.aborted) {
                        controller.abort((0, ErrorList_1.createCodeError)(errors_1.ErrorCode.ERR_STAGE_ABORTED));
                    }
                }
                frame.settled = true;
                break;
            default:
                break;
        }
    }
}
function setExecutionError(state, err) {
    state.err = err ? (0, ErrorList_1.createError)(err) : err;
    state.result = undefined;
    state.suspended = false;
    unwindFramesOnError(state);
    state.pc = state.plan.errorExit;
}
function failState(state, error, code) {
    state.err = (0, ErrorList_1.createError)(error instanceof Error ? error : String(error), code);
    state.result = undefined;
    state.suspended = false;
    unwindFramesOnError(state);
    state.pc = state.plan.errorExit;
}
function completePrimitiveSuccess(state, ctx) {
    state.err = undefined;
    state.result = undefined;
    state.ctx = ctx;
    state.suspended = false;
    state.pc = state.pc + 1;
}
function completePrimitiveError(state, err, ctx) {
    if (ctx !== undefined) {
        state.ctx = ctx;
    }
    setExecutionError(state, err);
}
function failPrimitive(state, error, ctx, code) {
    if (ctx !== undefined) {
        state.ctx = ctx;
    }
    failState(state, error, code);
}
function invokeStageFn(plan, stageFnId, inputErr, context, done, signal) {
    var _a;
    const run = plan.tables.stageFns[stageFnId];
    const kind = (_a = plan.tables.stageFnKinds[stageFnId]) !== null && _a !== void 0 ? _a : 'GENERIC';
    const effectiveSignal = signal !== null && signal !== void 0 ? signal : (0, execution_signal_1.getExecutionSignal)(context);
    if (!effectiveSignal) {
        invokeStageFnDispatch(run, kind, inputErr, context, done, undefined);
        return;
    }
    const cleanup = (0, execution_signal_1.bindExecutionSignal)(context, effectiveSignal);
    const finish = ((err, ctx) => {
        cleanup();
        done(err, ctx);
    });
    invokeStageFnDispatch(run, kind, inputErr, context, finish, effectiveSignal);
}
function invokeStageFnDispatch(run, kind, inputErr, context, done, signal) {
    switch (kind) {
        case 'FN0_ASYNC': {
            try {
                ;
                run.call(context)
                    .then(res => done(undefined, (res !== null && res !== void 0 ? res : context)))
                    .catch(err => done(err));
            }
            catch (err) {
                (0, process_error_1.process_error)(err, done);
            }
            return;
        }
        case 'FN0_SYNC': {
            try {
                const res = run.call(context);
                if ((0, TypeDetectors_1.isPromise)(res) || (0, types_1.is_thenable)(res)) {
                    res
                        .then(value => done(undefined, (value !== null && value !== void 0 ? value : context)))
                        .catch(err => done(err));
                }
                else {
                    done(undefined, (res !== null && res !== void 0 ? res : context));
                }
            }
            catch (err) {
                (0, process_error_1.process_error)(err, done);
            }
            return;
        }
        case 'FN1_ASYNC': {
            try {
                ;
                run(context)
                    .then(ctx => done(undefined, ctx))
                    .catch(err => done(err));
            }
            catch (err) {
                (0, process_error_1.process_error)(err, done);
            }
            return;
        }
        case 'FN1_SYNC': {
            try {
                const res = run(context);
                if ((0, TypeDetectors_1.isPromise)(res) || (0, types_1.is_thenable)(res)) {
                    res.then(value => done(undefined, value)).catch(err => done(err));
                }
                else {
                    done(undefined, res);
                }
            }
            catch (err) {
                (0, process_error_1.process_error)(err, done);
            }
            return;
        }
        case 'FN2_ASYNC': {
            try {
                ;
                run(inputErr, context)
                    .then(ctx => done(undefined, ctx))
                    .catch(err => done(err));
            }
            catch (err) {
                (0, process_error_1.process_error)(err, done);
            }
            return;
        }
        case 'FN2_CALLBACK': {
            let callbackCalled = false;
            const callback = (0, run_callback_once_1.run_callback_once)(((err, ctx) => {
                callbackCalled = true;
                done(err, ctx);
            }));
            try {
                ;
                run(context, callback);
            }
            catch (err) {
                if (!callbackCalled) {
                    (0, process_error_1.process_error)(err, callback);
                }
            }
            return;
        }
        case 'FN3_CALLBACK': {
            let callbackCalled = false;
            const callback = (0, run_callback_once_1.run_callback_once)(((err, ctx) => {
                callbackCalled = true;
                done(err, ctx);
            }));
            try {
                ;
                run(inputErr, context, callback);
            }
            catch (err) {
                if (!callbackCalled) {
                    (0, process_error_1.process_error)(err, callback);
                }
            }
            return;
        }
        case 'GENERIC':
        default:
            (0, run_or_execute_1.run_or_execute)(run, inputErr, context, done, signal);
    }
}
function executeFusedStageFnSequence(plan, stageFnIds, inputErr, initialCtx, done) {
    let currentCtx = initialCtx;
    let index = 0;
    let completed = false;
    const finish = (err, ctx) => {
        if (completed) {
            return;
        }
        completed = true;
        done(err, ctx);
    };
    const advance = () => {
        while (!completed && index < stageFnIds.length) {
            const stageFnId = stageFnIds[index];
            let sync = true;
            let settledSync = false;
            let syncErr;
            let syncCtx;
            invokeStageFn(plan, stageFnId, inputErr, currentCtx, ((err, ctx) => {
                if (completed) {
                    return;
                }
                if (sync) {
                    settledSync = true;
                    syncErr = err;
                    syncCtx = ctx;
                    return;
                }
                if (err) {
                    finish(err, currentCtx);
                    return;
                }
                currentCtx = (ctx !== null && ctx !== void 0 ? ctx : currentCtx);
                index += 1;
                advance();
            }));
            sync = false;
            if (!settledSync) {
                return;
            }
            if (syncErr) {
                finish(syncErr, currentCtx);
                return;
            }
            currentCtx = (syncCtx !== null && syncCtx !== void 0 ? syncCtx : currentCtx);
            index += 1;
        }
        if (!completed) {
            finish(undefined, currentCtx);
        }
    };
    advance();
}
function runWithStage(state, stage) {
    let sync = true;
    (0, run_or_execute_1.run_or_execute)(stage, state.inputErr, state.ctx, ((err, ctx) => {
        if (state.completed)
            return;
        state.result = err ? undefined : (ctx !== null && ctx !== void 0 ? ctx : state.ctx);
        state.suspended = false;
        if (err) {
            setExecutionError(state, err);
        }
        else {
            state.err = undefined;
            state.pc = state.pc + 1;
        }
        if (!sync) {
            executeCompiledPlanLoop(state);
        }
    }));
    sync = false;
}
function completeOp(state, err, ctx, sync) {
    if (state.completed)
        return;
    state.result = err ? undefined : (ctx !== null && ctx !== void 0 ? ctx : state.ctx);
    state.suspended = false;
    if (err) {
        setExecutionError(state, err);
    }
    else {
        state.err = undefined;
        state.pc = state.pc + 1;
    }
    if (!sync) {
        executeCompiledPlanLoop(state);
    }
}
function wrapMultiWaySwitchCaseError(actuals, index, err, ctx) {
    return new Error('mws - error', {
        cause: {
            err,
            ctx,
            actuals,
            index,
        },
    });
}
function runSingleMultiWaySwitchCase(initialErr, initialCtx, actuals, caseItem, done) {
    let localCtx;
    try {
        localCtx = typeof caseItem.split === 'function'
            ? caseItem.split(initialCtx)
            : initialCtx;
    }
    catch (splitErr) {
        done(wrapMultiWaySwitchCaseError(actuals, 0, splitErr, initialCtx), initialCtx);
        return;
    }
    (0, run_or_execute_1.run_or_execute)(caseItem.run, initialErr, localCtx, ((err, retCtx) => {
        if (err) {
            done(wrapMultiWaySwitchCaseError(actuals, 0, err, localCtx), initialCtx);
            return;
        }
        try {
            const resultContext = typeof caseItem.combine === 'function'
                ? caseItem.combine(initialCtx, retCtx)
                : initialCtx;
            done(undefined, (resultContext !== null && resultContext !== void 0 ? resultContext : initialCtx));
        }
        catch (combineErr) {
            done(wrapMultiWaySwitchCaseError(actuals, 0, combineErr, localCtx), initialCtx);
        }
    }));
}
function executeNativeMultiWaySwitch(initialErr, initialCtx, data, done) {
    var _a, _b;
    const statics = (_a = data.statics) !== null && _a !== void 0 ? _a : [];
    const dynamics = (_b = data.dynamics) !== null && _b !== void 0 ? _b : [];
    if (statics.length === 0 && dynamics.length === 0) {
        done(initialErr, initialCtx);
        return;
    }
    if (statics.length === 1 && dynamics.length === 0) {
        runSingleMultiWaySwitchCase(initialErr, initialCtx, [statics[0]], statics[0], done);
        return;
    }
    if (statics.length === 0 && dynamics.length === 1) {
        let matched = false;
        try {
            matched = !!dynamics[0].evaluate(initialCtx);
        }
        catch (err) {
            done((0, ErrorList_1.createError)(err, errors_1.ErrorCode.ERR_STAGE_THROW), initialCtx);
            return;
        }
        if (!matched) {
            done(initialErr, initialCtx);
            return;
        }
        runSingleMultiWaySwitchCase(initialErr, initialCtx, [dynamics[0]], dynamics[0], done);
        return;
    }
    const actuals = [];
    actuals.push(...statics);
    for (let i = 0; i < dynamics.length; i++) {
        try {
            if (dynamics[i].evaluate(initialCtx)) {
                actuals.push(dynamics[i]);
            }
        }
        catch (err) {
            done((0, ErrorList_1.createError)(err, errors_1.ErrorCode.ERR_STAGE_THROW), initialCtx);
            return;
        }
    }
    if (actuals.length === 0) {
        done(initialErr, initialCtx);
        return;
    }
    if (actuals.length === 1) {
        runSingleMultiWaySwitchCase(initialErr, initialCtx, actuals, actuals[0], done);
        return;
    }
    if (actuals.some((item) => typeof item.combine === 'function')) {
        (0, warn_once_1.warnOnce)('mws-multi-combine-order', '[pipeline.js] MultiWaySwitch: multiple matching cases with combine functions are folded in async completion order. Make combine commutative or use Sequential if order matters.');
    }
    const hasCustomSplitOrCombine = actuals.some((item) => typeof item.split === 'function' || typeof item.combine === 'function');
    if (!hasCustomSplitOrCombine) {
        let pending = actuals.length;
        let completed = false;
        const errorSlots = new Array(actuals.length);
        const finish = (err, ctx) => {
            if (completed) {
                return;
            }
            completed = true;
            done(err, ctx);
        };
        const maybeComplete = () => {
            if (completed || pending > 0) {
                return;
            }
            const errors = errorSlots.filter((value) => value !== undefined);
            if (errors.length > 0) {
                finish((0, ErrorList_1.createError)(errors), initialCtx);
            }
            else {
                finish(undefined, initialCtx);
            }
        };
        for (let i = 0; i < actuals.length; i++) {
            (0, run_or_execute_1.run_or_execute)(actuals[i].run, initialErr, initialCtx, ((err) => {
                if (completed) {
                    return;
                }
                if (err) {
                    errorSlots[i] = wrapMultiWaySwitchCaseError(actuals, i, err, initialCtx);
                }
                pending -= 1;
                maybeComplete();
            }));
        }
        return;
    }
    let pending = actuals.length;
    let completed = false;
    let resultContext = null;
    let firstError;
    let firstErrorIndex = -1;
    let errorSlots = null;
    const finish = (err, ctx) => {
        if (completed) {
            return;
        }
        completed = true;
        done(err, ctx);
    };
    const maybeComplete = () => {
        if (completed || pending > 0) {
            return;
        }
        if (errorSlots) {
            const errors = errorSlots.filter((value) => value !== undefined);
            finish((0, ErrorList_1.createError)(errors), initialCtx);
        }
        else if (firstError !== undefined) {
            finish((0, ErrorList_1.createError)(firstError), initialCtx);
        }
        else {
            finish(undefined, (resultContext !== null && resultContext !== void 0 ? resultContext : initialCtx));
        }
    };
    const storeCaseError = (index, err, ctx) => {
        const wrappedError = wrapMultiWaySwitchCaseError(actuals, index, err, ctx);
        if (errorSlots) {
            errorSlots[index] = wrappedError;
            return;
        }
        if (firstError === undefined) {
            firstError = wrappedError;
            firstErrorIndex = index;
            return;
        }
        errorSlots = new Array(actuals.length);
        errorSlots[firstErrorIndex] = firstError;
        errorSlots[index] = wrappedError;
        firstError = undefined;
    };
    for (let i = 0; i < actuals.length; i++) {
        const caseItem = actuals[i];
        let localCtx;
        try {
            localCtx = typeof caseItem.split === 'function'
                ? caseItem.split(initialCtx)
                : initialCtx;
        }
        catch (err) {
            storeCaseError(i, err, initialCtx);
            pending -= 1;
            maybeComplete();
            continue;
        }
        (0, run_or_execute_1.run_or_execute)(caseItem.run, initialErr, localCtx, ((err, retCtx) => {
            if (completed) {
                return;
            }
            try {
                if (err) {
                    storeCaseError(i, err, localCtx);
                }
                else if (typeof caseItem.combine === 'function') {
                    resultContext = caseItem.combine((resultContext !== null && resultContext !== void 0 ? resultContext : initialCtx), retCtx);
                }
                else {
                    resultContext = (resultContext !== null && resultContext !== void 0 ? resultContext : initialCtx);
                }
            }
            catch (combineErr) {
                storeCaseError(i, combineErr, localCtx);
            }
            pending -= 1;
            maybeComplete();
        }));
    }
}
function runCompiledStageFn(state, stageFnId) {
    let sync = true;
    invokeStageFn(state.plan, stageFnId, state.inputErr, state.ctx, ((err, ctx) => {
        completeOp(state, err, ctx, sync);
    }));
    sync = false;
}
function invokeSubplan(state, plan, inputErr, context, sequentialFrameIndex, childIndex, childCtx) {
    state.frameStack.push({
        kind: 'SUBPLAN_RETURN',
        parentPlan: state.plan,
        parentPc: state.pc,
        parentInputErr: state.inputErr,
        sequentialFrameIndex,
        childIndex,
        childCtx,
    });
    state.plan = plan;
    state.pc = plan.entry;
    state.inputErr = inputErr;
    state.ctx = context;
    state.err = undefined;
    state.result = undefined;
    state.suspended = false;
}
function returnFromSubplan(state) {
    const frame = state.frameStack[state.frameStack.length - 1];
    if (!frame || frame.kind !== 'SUBPLAN_RETURN') {
        return false;
    }
    state.frameStack.pop();
    const childErr = state.err;
    const childCtx = state.ctx;
    state.plan = frame.parentPlan;
    state.pc = frame.parentPc;
    state.inputErr = frame.parentInputErr;
    state.err = undefined;
    state.result = undefined;
    state.suspended = false;
    const sequentialFrame = state.frameStack[frame.sequentialFrameIndex];
    if (!sequentialFrame || sequentialFrame.kind !== 'SEQUENTIAL') {
        failState(state, `${errors_1.ErrorMessage[errors_1.ErrorCode.ERR_OPCODE_NOT_IMPL]}: SUBPLAN_RETURN/${frame.sequentialFrameIndex}`, errors_1.ErrorCode.ERR_OPCODE_NOT_IMPL);
        return true;
    }
    if (childErr) {
        removeFrame(state, sequentialFrame);
        completePrimitiveError(state, createSequentialIterationError(sequentialFrame, childErr, frame.childCtx), sequentialFrame.originalCtx);
        return true;
    }
    sequentialFrame.results[frame.childIndex] = (childCtx !== null && childCtx !== void 0 ? childCtx : frame.childCtx);
    sequentialFrame.index = frame.childIndex + 1;
    state.suspended = true;
    continueSequentialFrame(state, sequentialFrame);
    return true;
}
function normalizePredicateResult(result) {
    if (typeof result === 'object' && result !== null && 'value' in result) {
        return {
            value: !!result.value,
            err: result.err,
        };
    }
    return {
        value: !!result,
    };
}
function dispatchPredicate(predicate, kind, ctx, inputErr, settle) {
    try {
        if (kind === 'BOOL_CTX_SYNC') {
            const result = predicate(ctx, inputErr);
            if ((0, TypeDetectors_1.isPromise)(result) || (0, types_1.is_thenable)(result)) {
                result.then((value) => settle({ value: !!value })).catch(() => settle({ value: false }));
            }
            else {
                settle({ value: !!result });
            }
            return;
        }
        if (kind === 'GENERIC_CALLBACK') {
            (0, execute_validate_1.execute_validate)(predicate, ctx, ((err, value) => {
                settle({
                    value: !!value,
                    err: err,
                });
            }));
            return;
        }
        const result = predicate(ctx, inputErr);
        if ((0, TypeDetectors_1.isPromise)(result) || (0, types_1.is_thenable)(result)) {
            result.then((value) => settle(normalizePredicateResult(value))).catch((err) => settle({ value: false, err }));
        }
        else {
            settle(normalizePredicateResult(result));
        }
    }
    catch (err) {
        if (kind === 'BOOL_CTX_SYNC') {
            settle({ value: false });
        }
        else {
            settle({ value: false, err: err });
        }
    }
}
function executeInlineControlFlowSubplan(plan, inputErr, initialCtx, done) {
    let currentCtx = initialCtx;
    let currentErr = inputErr;
    let currentResult;
    let pc = plan.entry;
    let completed = false;
    const finish = (err, ctx) => {
        if (completed) {
            return;
        }
        completed = true;
        done(err, ctx);
    };
    const advance = () => {
        var _a;
        while (!completed) {
            const op = plan.ops[pc];
            if (!op) {
                finish((0, ErrorList_1.createCodeError)(errors_1.ErrorCode.ERR_PC_OUT_OF_BOUNDS, `inline-subplan/${pc}`), currentCtx);
                return;
            }
            switch (op.op) {
                case 'RUN_STAGE_FN': {
                    const resumePc = pc + 1;
                    let sync = true;
                    let settledSync = false;
                    let syncErr;
                    let syncCtx;
                    invokeStageFn(plan, op.stageFnId, currentErr, currentCtx, ((err, ctx) => {
                        if (completed) {
                            return;
                        }
                        if (sync) {
                            settledSync = true;
                            syncErr = err;
                            syncCtx = ctx;
                            return;
                        }
                        if (err) {
                            finish(err, currentCtx);
                            return;
                        }
                        currentResult = (ctx !== null && ctx !== void 0 ? ctx : currentCtx);
                        pc = resumePc;
                        advance();
                    }));
                    sync = false;
                    if (!settledSync) {
                        return;
                    }
                    if (syncErr) {
                        finish(syncErr, currentCtx);
                        return;
                    }
                    currentResult = (syncCtx !== null && syncCtx !== void 0 ? syncCtx : currentCtx);
                    pc = resumePc;
                    continue;
                }
                case 'SET_CTX_FROM_RESULT':
                    if (currentResult !== undefined) {
                        currentCtx = currentResult;
                    }
                    currentResult = undefined;
                    pc += 1;
                    continue;
                case 'JUMP':
                    pc = op.target;
                    continue;
                case 'JUMP_IF_TRUE': {
                    const predicate = plan.tables.predicates[op.predicateId];
                    const kind = ((_a = plan.tables.predicateKinds[op.predicateId]) !== null && _a !== void 0 ? _a : 'GENERIC');
                    if (!predicate) {
                        finish((0, ErrorList_1.createCodeError)(errors_1.ErrorCode.ERR_OPCODE_NOT_IMPL, `predicate ${op.predicateId}`), currentCtx);
                        return;
                    }
                    const falseTarget = pc + 1;
                    const trueTarget = op.target;
                    let sync = true;
                    let settledSync = false;
                    let syncTarget = falseTarget;
                    let syncErr;
                    const settle = (result) => {
                        if (completed) {
                            return;
                        }
                        if (result.err !== undefined) {
                            currentErr = result.err;
                        }
                        if (sync) {
                            settledSync = true;
                            syncTarget = result.value ? trueTarget : falseTarget;
                            syncErr = result.err;
                            return;
                        }
                        pc = result.value ? trueTarget : falseTarget;
                        advance();
                    };
                    dispatchPredicate(predicate, kind, currentCtx, currentErr, settle);
                    sync = false;
                    if (!settledSync) {
                        return;
                    }
                    if (syncErr !== undefined) {
                        currentErr = syncErr;
                    }
                    pc = syncTarget;
                    continue;
                }
                case 'RETURN':
                    finish(undefined, currentCtx);
                    return;
                default:
                    finish((0, ErrorList_1.createCodeError)(errors_1.ErrorCode.ERR_OPCODE_NOT_IMPL, `inline-subplan/${op.op}`), currentCtx);
                    return;
            }
        }
    };
    advance();
}
function runPredicate(state, predicateId, target) {
    var _a;
    const predicate = state.plan.tables.predicates[predicateId];
    const kind = ((_a = state.plan.tables.predicateKinds[predicateId]) !== null && _a !== void 0 ? _a : 'GENERIC');
    if (!predicate) {
        failState(state, `${errors_1.ErrorMessage[errors_1.ErrorCode.ERR_OPCODE_NOT_IMPL]}: predicate ${predicateId}`, errors_1.ErrorCode.ERR_OPCODE_NOT_IMPL);
        return;
    }
    let sync = true;
    const advance = (value) => {
        state.suspended = false;
        state.pc = value ? target : state.pc + 1;
        if (!sync) {
            executeCompiledPlanLoop(state);
        }
    };
    const settle = (result) => {
        if (state.completed) {
            return;
        }
        if (result.err !== undefined) {
            state.inputErr = result.err;
        }
        advance(result.value);
    };
    dispatchPredicate(predicate, kind, state.ctx, state.inputErr, settle);
    sync = false;
}
function pushFrame(state, op) {
    var _a;
    switch (op.frameKind) {
        case 'SCOPE': {
            state.frameStack.push({ kind: 'SCOPE', inputErr: state.inputErr });
            state.pc += 1;
            return;
        }
        case 'WRAP': {
            const data = typeof op.data === 'number' ? state.plan.tables.constants[op.data] : undefined;
            if (!data) {
                failState(state, `${errors_1.ErrorMessage[errors_1.ErrorCode.ERR_OPCODE_NOT_IMPL]}: PUSH_FRAME/${op.frameKind}`, errors_1.ErrorCode.ERR_OPCODE_NOT_IMPL);
                return;
            }
            try {
                const originalCtx = state.ctx;
                const prepare = state.plan.tables.transforms[data.prepareId];
                const preparedCtx = prepare ? ((_a = prepare(originalCtx)) !== null && _a !== void 0 ? _a : originalCtx) : originalCtx;
                state.frameStack.push({
                    kind: 'WRAP',
                    finalizeId: data.finalizeId,
                    originalCtx,
                });
                state.ctx = preparedCtx;
                state.pc += 1;
            }
            catch (err) {
                failState(state, err);
            }
            return;
        }
        default:
            failState(state, `${errors_1.ErrorMessage[errors_1.ErrorCode.ERR_OPCODE_NOT_IMPL]}: PUSH_FRAME/${op.frameKind}`, errors_1.ErrorCode.ERR_OPCODE_NOT_IMPL);
    }
}
function popFrame(state) {
    var _a;
    const frame = state.frameStack.pop();
    if (!frame || frame.kind === 'ROOT') {
        failState(state, `${errors_1.ErrorMessage[errors_1.ErrorCode.ERR_OPCODE_NOT_IMPL]}: POP_FRAME`, errors_1.ErrorCode.ERR_OPCODE_NOT_IMPL);
        return;
    }
    switch (frame.kind) {
        case 'SCOPE':
            state.inputErr = frame.inputErr;
            state.pc += 1;
            return;
        case 'WRAP': {
            try {
                const finalize = state.plan.tables.transforms[frame.finalizeId];
                state.ctx = finalize ? ((_a = finalize(frame.originalCtx, state.ctx)) !== null && _a !== void 0 ? _a : frame.originalCtx) : frame.originalCtx;
                state.pc += 1;
            }
            catch (err) {
                failState(state, err);
            }
            return;
        }
        default:
            failState(state, `${errors_1.ErrorMessage[errors_1.ErrorCode.ERR_OPCODE_NOT_IMPL]}: POP_FRAME/${frame.kind}`, errors_1.ErrorCode.ERR_OPCODE_NOT_IMPL);
    }
}
function createSequentialIterationError(frame, err, ctx) {
    return new Error('sequential - error', {
        cause: {
            err,
            iteration: frame.index,
            stage: frame.data.stage,
            ctx,
        },
    });
}
function createParallelIterationError(frame, index, err, ctx) {
    return new Error('parallel - error', {
        cause: {
            stage: frame.data.stageName,
            index,
            err,
            ctx,
        },
    });
}
function abortParallelActiveControllers(frame) {
    var _a, _b;
    for (let i = 0; i < frame.controllers.length; i++) {
        const controller = frame.controllers[i];
        (_b = (_a = frame.controllerCleanups)[i]) === null || _b === void 0 ? void 0 : _b.call(_a);
        frame.controllerCleanups[i] = null;
        if (controller && !controller.signal.aborted) {
            controller.abort((0, ErrorList_1.createCodeError)(errors_1.ErrorCode.ERR_STAGE_ABORTED));
        }
        frame.controllers[i] = null;
    }
}
function settleParallelFrame(state, frame, resume, resultChildren) {
    var _a;
    if (frame.settled || state.completed) {
        return;
    }
    frame.settled = true;
    if (frame.drainTimer) {
        clearTimeout(frame.drainTimer);
        frame.drainTimer = null;
    }
    if (resultChildren !== undefined && frame.data.join !== 'all') {
        abortParallelActiveControllers(frame);
    }
    removeFrame(state, frame);
    if (resultChildren === undefined && frame.errors.length > 0) {
        completePrimitiveError(state, (0, ErrorList_1.createError)(frame.errors), frame.originalCtx);
    }
    else {
        try {
            completePrimitiveSuccess(state, ((_a = frame.data.combine(frame.originalCtx, resultChildren !== null && resultChildren !== void 0 ? resultChildren : frame.children)) !== null && _a !== void 0 ? _a : frame.originalCtx));
        }
        catch (err) {
            failPrimitive(state, err, frame.originalCtx);
        }
    }
    if (resume && !state.completed) {
        executeCompiledPlanLoop(state);
    }
}
function getParallelSuccessTarget(frame) {
    var _a;
    if (frame.data.join === 'any') {
        return 1;
    }
    if (frame.data.join === 'quorum') {
        return Math.min(Math.max(1, (_a = frame.data.quorum) !== null && _a !== void 0 ? _a : frame.children.length), frame.children.length);
    }
    return frame.children.length;
}
function shouldDrainTrailing(frame) {
    return frame.data.trailing === 'drain-active' && frame.data.join !== 'all';
}
function maybeStartParallelDrainTimer(state, frame) {
    if (frame.settled ||
        frame.drainTimer ||
        !shouldDrainTrailing(frame) ||
        frame.data.trailingTimeout === undefined) {
        return;
    }
    frame.drainTimer = setTimeout(() => {
        frame.drainTimer = null;
        if (frame.settled || state.completed || !frame.thresholdMet) {
            return;
        }
        settleParallelFrame(state, frame, true, frame.data.join === 'all'
            ? frame.children
            : collectParallelSuccessfulChildren(frame));
    }, frame.data.trailingTimeout);
}
function collectParallelSuccessfulChildren(frame) {
    return frame.successfulChildren.filter((child) => child !== undefined);
}
function getParallelConcurrencyLimit(frame) {
    var _a;
    return Math.min(Math.max(1, (_a = frame.data.concurrency) !== null && _a !== void 0 ? _a : frame.children.length), frame.children.length);
}
function continueParallelFrame(state, frame) {
    try {
        const concurrency = getParallelConcurrencyLimit(frame);
        const successTarget = getParallelSuccessTarget(frame);
        while (!state.completed &&
            !frame.settled &&
            !(frame.thresholdMet && shouldDrainTrailing(frame)) &&
            frame.active < concurrency &&
            frame.nextIndex < frame.children.length) {
            const index = frame.nextIndex;
            const childCtx = frame.children[index];
            const linkedController = (0, execution_signal_1.createLinkedAbortController)((0, execution_signal_1.getExecutionSignal)(frame.originalCtx));
            const controller = linkedController.controller;
            frame.nextIndex += 1;
            frame.active += 1;
            frame.controllers[index] = controller;
            frame.controllerCleanups[index] = linkedController.cleanup;
            let sync = true;
            let settledSync = false;
            let syncErr;
            let syncCtx;
            invokeStageFn(state.plan, frame.data.stageFnId, state.inputErr, childCtx, ((err, ctx) => {
                linkedController.cleanup();
                frame.controllerCleanups[index] = null;
                frame.controllers[index] = null;
                if (state.completed || frame.settled) {
                    return;
                }
                if (sync) {
                    settledSync = true;
                    syncErr = err;
                    syncCtx = ctx;
                    return;
                }
                frame.active -= 1;
                frame.pending -= 1;
                if (err) {
                    frame.errors.push(createParallelIterationError(frame, index, err, childCtx));
                }
                else {
                    frame.children[index] = (ctx !== null && ctx !== void 0 ? ctx : childCtx);
                    if (frame.successfulChildren[index] === undefined) {
                        frame.successfulChildren[index] = frame.children[index];
                        frame.successCount += 1;
                    }
                    if (frame.successCount >= successTarget) {
                        frame.thresholdMet = true;
                        if (!shouldDrainTrailing(frame)) {
                            settleParallelFrame(state, frame, true, frame.data.join === 'all'
                                ? frame.children
                                : collectParallelSuccessfulChildren(frame));
                            return;
                        }
                        maybeStartParallelDrainTimer(state, frame);
                        if (frame.active === 0) {
                            settleParallelFrame(state, frame, true, frame.data.join === 'all'
                                ? frame.children
                                : collectParallelSuccessfulChildren(frame));
                        }
                        return;
                    }
                }
                if (frame.thresholdMet && shouldDrainTrailing(frame)) {
                    if (frame.active === 0) {
                        settleParallelFrame(state, frame, true, frame.data.join === 'all'
                            ? frame.children
                            : collectParallelSuccessfulChildren(frame));
                    }
                    return;
                }
                if (frame.pending === 0) {
                    if (frame.successCount >= successTarget) {
                        settleParallelFrame(state, frame, true, frame.data.join === 'all'
                            ? frame.children
                            : collectParallelSuccessfulChildren(frame));
                    }
                    else {
                        settleParallelFrame(state, frame, true);
                    }
                    return;
                }
                continueParallelFrame(state, frame);
                if (!state.suspended && !state.completed) {
                    executeCompiledPlanLoop(state);
                }
            }), controller.signal);
            sync = false;
            if (!settledSync) {
                continue;
            }
            frame.active -= 1;
            frame.pending -= 1;
            frame.controllers[index] = null;
            if (syncErr) {
                frame.errors.push(createParallelIterationError(frame, index, syncErr, childCtx));
            }
            else {
                frame.children[index] = (syncCtx !== null && syncCtx !== void 0 ? syncCtx : childCtx);
                if (frame.successfulChildren[index] === undefined) {
                    frame.successfulChildren[index] = frame.children[index];
                    frame.successCount += 1;
                }
                if (frame.successCount >= successTarget) {
                    frame.thresholdMet = true;
                    if (!shouldDrainTrailing(frame)) {
                        settleParallelFrame(state, frame, false, frame.data.join === 'all'
                            ? frame.children
                            : collectParallelSuccessfulChildren(frame));
                        return;
                    }
                    maybeStartParallelDrainTimer(state, frame);
                    if (frame.active === 0) {
                        settleParallelFrame(state, frame, false, frame.data.join === 'all'
                            ? frame.children
                            : collectParallelSuccessfulChildren(frame));
                    }
                    return;
                }
            }
            if (frame.thresholdMet && shouldDrainTrailing(frame)) {
                if (frame.active === 0) {
                    settleParallelFrame(state, frame, false, frame.data.join === 'all'
                        ? frame.children
                        : collectParallelSuccessfulChildren(frame));
                }
                return;
            }
            if (frame.pending === 0) {
                if (frame.successCount >= successTarget) {
                    settleParallelFrame(state, frame, false, frame.data.join === 'all'
                        ? frame.children
                        : collectParallelSuccessfulChildren(frame));
                }
                else {
                    settleParallelFrame(state, frame, false);
                }
                return;
            }
        }
    }
    catch (err) {
        removeFrame(state, frame);
        failPrimitive(state, err, frame.originalCtx);
    }
}
function runParallelOp(state, dataIndex) {
    const data = state.plan.tables.constants[dataIndex];
    if (!data || data.kind !== 'PARALLEL') {
        failState(state, `${errors_1.ErrorMessage[errors_1.ErrorCode.ERR_OPCODE_NOT_IMPL]}: RUN_PARALLEL`, errors_1.ErrorCode.ERR_OPCODE_NOT_IMPL);
        return;
    }
    if (data.stageFnId === undefined) {
        if (state.inputErr) {
            completePrimitiveError(state, state.inputErr, state.ctx);
        }
        else {
            completePrimitiveSuccess(state, state.ctx);
        }
        return;
    }
    let children;
    try {
        children = data.split(state.ctx);
    }
    catch (err) {
        failPrimitive(state, err, state.ctx);
        return;
    }
    if (!Array.isArray(children) || children.length === 0) {
        if (state.inputErr) {
            completePrimitiveError(state, state.inputErr, state.ctx);
        }
        else {
            completePrimitiveSuccess(state, state.ctx);
        }
        return;
    }
    const frame = {
        kind: 'PARALLEL',
        data,
        originalCtx: state.ctx,
        children,
        controllers: new Array(children.length).fill(null),
        controllerCleanups: new Array(children.length).fill(null),
        successfulChildren: new Array(children.length),
        successCount: 0,
        thresholdMet: false,
        drainTimer: null,
        nextIndex: 0,
        active: 0,
        pending: children.length,
        errors: [],
        settled: false,
    };
    state.frameStack.push(frame);
    continueParallelFrame(state, frame);
}
function runMultiWaySwitchOp(state, dataIndex) {
    const data = state.plan.tables.constants[dataIndex];
    if (!data || data.kind !== 'MWS') {
        failState(state, `${errors_1.ErrorMessage[errors_1.ErrorCode.ERR_OPCODE_NOT_IMPL]}: RUN_MWS`, errors_1.ErrorCode.ERR_OPCODE_NOT_IMPL);
        return;
    }
    const toExecutableStaticCase = (caseItem) => ({
        stage: caseItem.stage,
        split: caseItem.split,
        combine: caseItem.combine,
        run: ((err, ctx, done) => {
            invokeStageFn(state.plan, caseItem.stageFnId, err, ctx, done);
        }),
    });
    const toExecutableDynamicCase = (caseItem) => (Object.assign(Object.assign({}, toExecutableStaticCase(caseItem)), { evaluate: caseItem.evaluate }));
    let sync = true;
    executeNativeMultiWaySwitch(state.inputErr, state.ctx, {
        statics: data.statics.map(toExecutableStaticCase),
        dynamics: data.dynamics.map(toExecutableDynamicCase),
    }, ((err, ctx) => {
        completeOp(state, err, ctx, sync);
    }));
    sync = false;
}
function continueSequentialFrame(state, frame) {
    var _a;
    try {
        while (!state.completed && frame.index < frame.children.length) {
            const index = frame.index;
            const childCtx = frame.children[index];
            if (frame.data.inlineControlPlan) {
                let sync = true;
                let settledSync = false;
                let syncErr;
                let syncResult;
                executeInlineControlFlowSubplan(frame.data.inlineControlPlan, undefined, childCtx, ((err, ctx) => {
                    if (state.completed) {
                        return;
                    }
                    if (sync) {
                        settledSync = true;
                        syncErr = err;
                        syncResult = ctx;
                        return;
                    }
                    if (err) {
                        removeFrame(state, frame);
                        completePrimitiveError(state, createSequentialIterationError(frame, err, childCtx), frame.originalCtx);
                        executeCompiledPlanLoop(state);
                        return;
                    }
                    frame.results[index] = (ctx !== null && ctx !== void 0 ? ctx : childCtx);
                    frame.index = index + 1;
                    continueSequentialFrame(state, frame);
                    if (!state.suspended && !state.completed) {
                        executeCompiledPlanLoop(state);
                    }
                }));
                sync = false;
                if (!settledSync) {
                    return;
                }
                if (syncErr) {
                    removeFrame(state, frame);
                    completePrimitiveError(state, createSequentialIterationError(frame, syncErr, childCtx), frame.originalCtx);
                    return;
                }
                frame.results[index] = syncResult !== null && syncResult !== void 0 ? syncResult : childCtx;
                frame.index = index + 1;
                continue;
            }
            if (frame.data.subplanId !== undefined) {
                const subplan = state.plan.tables.subplans[frame.data.subplanId];
                if (!subplan) {
                    removeFrame(state, frame);
                    failPrimitive(state, `${errors_1.ErrorMessage[errors_1.ErrorCode.ERR_OPCODE_NOT_IMPL]}: RUN_SEQUENTIAL subplan ${frame.data.subplanId}`, frame.originalCtx, errors_1.ErrorCode.ERR_OPCODE_NOT_IMPL);
                    return;
                }
                invokeSubplan(state, subplan, undefined, childCtx, state.frameStack.length - 1, index, childCtx);
                return;
            }
            let sync = true;
            let settledSync = false;
            let syncErr;
            let syncResult;
            const settle = ((err, ctx) => {
                if (state.completed) {
                    return;
                }
                if (sync) {
                    settledSync = true;
                    syncErr = err;
                    syncResult = ctx;
                    return;
                }
                if (err) {
                    removeFrame(state, frame);
                    completePrimitiveError(state, createSequentialIterationError(frame, err, childCtx), frame.originalCtx);
                    executeCompiledPlanLoop(state);
                    return;
                }
                frame.results[index] = (ctx !== null && ctx !== void 0 ? ctx : childCtx);
                frame.index = index + 1;
                continueSequentialFrame(state, frame);
                if (!state.suspended && !state.completed) {
                    executeCompiledPlanLoop(state);
                }
            });
            if (frame.data.fusedPlan && frame.data.fusedStageFnIds) {
                executeFusedStageFnSequence(frame.data.fusedPlan, frame.data.fusedStageFnIds, undefined, childCtx, settle);
            }
            else if (frame.data.stageFnId !== undefined) {
                invokeStageFn(state.plan, frame.data.stageFnId, undefined, childCtx, settle);
            }
            else {
                settledSync = true;
                syncResult = childCtx;
            }
            sync = false;
            if (!settledSync) {
                return;
            }
            if (syncErr) {
                removeFrame(state, frame);
                completePrimitiveError(state, createSequentialIterationError(frame, syncErr, childCtx), frame.originalCtx);
                return;
            }
            frame.results[index] = syncResult !== null && syncResult !== void 0 ? syncResult : childCtx;
            frame.index = index + 1;
        }
        removeFrame(state, frame);
        completePrimitiveSuccess(state, ((_a = frame.data.combine(frame.originalCtx, frame.results)) !== null && _a !== void 0 ? _a : frame.originalCtx));
    }
    catch (err) {
        removeFrame(state, frame);
        failPrimitive(state, err, frame.originalCtx);
    }
}
function runSequentialOp(state, dataIndex) {
    const data = state.plan.tables.constants[dataIndex];
    if (!data || data.kind !== 'SEQUENTIAL') {
        failState(state, `${errors_1.ErrorMessage[errors_1.ErrorCode.ERR_OPCODE_NOT_IMPL]}: RUN_SEQUENTIAL`, errors_1.ErrorCode.ERR_OPCODE_NOT_IMPL);
        return;
    }
    if (state.inputErr) {
        completePrimitiveError(state, state.inputErr, state.ctx);
        return;
    }
    try {
        const children = data.split(state.ctx);
        if (!children.length) {
            completePrimitiveSuccess(state, state.ctx);
            return;
        }
        const frame = {
            kind: 'SEQUENTIAL',
            data,
            originalCtx: state.ctx,
            children,
            results: new Array(children.length),
            index: 0,
        };
        state.frameStack.push(frame);
        continueSequentialFrame(state, frame);
    }
    catch (err) {
        failPrimitive(state, err, state.ctx);
    }
}
function continueLoopFrame(state, frame) {
    var _a;
    try {
        while (!state.completed) {
            frame.iteration += 1;
            if (frame.data.reachEnd(frame.currentErr, frame.currentCtx, frame.iteration)) {
                removeFrame(state, frame);
                if (frame.currentErr) {
                    completePrimitiveError(state, frame.currentErr, frame.currentCtx);
                }
                else {
                    completePrimitiveSuccess(state, frame.currentCtx);
                }
                return;
            }
            const splitCtx = frame.data.split(frame.currentCtx, frame.iteration);
            let sync = true;
            let settledSync = false;
            let syncErr;
            let syncResult;
            invokeStageFn(state.plan, frame.data.stageFnId, frame.currentErr, splitCtx, ((err, ctx) => {
                var _a;
                if (state.completed) {
                    return;
                }
                if (sync) {
                    settledSync = true;
                    syncErr = err;
                    syncResult = ctx;
                    return;
                }
                frame.currentErr = err;
                if (!err) {
                    frame.currentCtx = ((_a = ctx !== null && ctx !== void 0 ? ctx : splitCtx) !== null && _a !== void 0 ? _a : frame.currentCtx);
                }
                continueLoopFrame(state, frame);
                if (!state.suspended && !state.completed) {
                    executeCompiledPlanLoop(state);
                }
            }));
            sync = false;
            if (!settledSync) {
                return;
            }
            frame.currentErr = syncErr;
            if (!syncErr) {
                frame.currentCtx = ((_a = syncResult !== null && syncResult !== void 0 ? syncResult : splitCtx) !== null && _a !== void 0 ? _a : frame.currentCtx);
            }
        }
    }
    catch (err) {
        removeFrame(state, frame);
        failPrimitive(state, err, frame.currentCtx);
    }
}
function runLoopOp(state, dataIndex) {
    const data = state.plan.tables.constants[dataIndex];
    if (!data || data.kind !== 'LOOP') {
        failState(state, `${errors_1.ErrorMessage[errors_1.ErrorCode.ERR_OPCODE_NOT_IMPL]}: RUN_LOOP`, errors_1.ErrorCode.ERR_OPCODE_NOT_IMPL);
        return;
    }
    const frame = {
        kind: 'LOOP',
        data,
        currentCtx: state.ctx,
        currentErr: state.inputErr,
        iteration: -1,
    };
    state.frameStack.push(frame);
    continueLoopFrame(state, frame);
}
function shouldRetry(frame) {
    if (!frame.currentErr) {
        return false;
    }
    if (typeof frame.data.retry === 'function') {
        return frame.data.retry(frame.currentErr, frame.currentCtx, frame.iteration);
    }
    return frame.iteration <= frame.data.retry;
}
function continueRetryFrame(state, frame) {
    try {
        while (!state.completed) {
            frame.iteration += 1;
            if (frame.iteration > 0) {
                frame.currentCtx = frame.data.restore(frame.currentCtx, frame.backup);
            }
            let sync = true;
            let settledSync = false;
            let syncErr;
            let syncResult;
            invokeStageFn(state.plan, frame.data.stageFnId, frame.currentErr, frame.currentCtx, ((err, ctx) => {
                if (state.completed) {
                    return;
                }
                if (sync) {
                    settledSync = true;
                    syncErr = err;
                    syncResult = ctx;
                    return;
                }
                frame.currentErr = err;
                if (!err) {
                    frame.currentCtx = (ctx !== null && ctx !== void 0 ? ctx : frame.currentCtx);
                }
                if (shouldRetry(frame)) {
                    continueRetryFrame(state, frame);
                    if (!state.suspended && !state.completed) {
                        executeCompiledPlanLoop(state);
                    }
                    return;
                }
                removeFrame(state, frame);
                if (frame.currentErr) {
                    completePrimitiveError(state, frame.currentErr, frame.currentCtx);
                }
                else {
                    completePrimitiveSuccess(state, frame.currentCtx);
                }
                executeCompiledPlanLoop(state);
            }));
            sync = false;
            if (!settledSync) {
                return;
            }
            frame.currentErr = syncErr;
            if (!syncErr) {
                frame.currentCtx = (syncResult !== null && syncResult !== void 0 ? syncResult : frame.currentCtx);
            }
            if (!shouldRetry(frame)) {
                removeFrame(state, frame);
                if (frame.currentErr) {
                    completePrimitiveError(state, frame.currentErr, frame.currentCtx);
                }
                else {
                    completePrimitiveSuccess(state, frame.currentCtx);
                }
                return;
            }
        }
    }
    catch (err) {
        removeFrame(state, frame);
        failPrimitive(state, err, frame.initialCtx);
    }
}
function runRetryOp(state, dataIndex) {
    const data = state.plan.tables.constants[dataIndex];
    if (!data || data.kind !== 'RETRY') {
        failState(state, `${errors_1.ErrorMessage[errors_1.ErrorCode.ERR_OPCODE_NOT_IMPL]}: RUN_RETRY`, errors_1.ErrorCode.ERR_OPCODE_NOT_IMPL);
        return;
    }
    try {
        const frame = {
            kind: 'RETRY_STATE',
            data,
            initialCtx: state.ctx,
            currentCtx: state.ctx,
            currentErr: state.inputErr,
            backup: data.backup(state.ctx),
            iteration: -1,
        };
        state.frameStack.push(frame);
        continueRetryFrame(state, frame);
    }
    catch (err) {
        failPrimitive(state, err, state.ctx);
    }
}
function runTimeoutOp(state, dataIndex) {
    var _a;
    const data = state.plan.tables.constants[dataIndex];
    if (!data || data.kind !== 'TIMEOUT') {
        failState(state, `${errors_1.ErrorMessage[errors_1.ErrorCode.ERR_OPCODE_NOT_IMPL]}: RUN_TIMEOUT`, errors_1.ErrorCode.ERR_OPCODE_NOT_IMPL);
        return;
    }
    let waitFor;
    try {
        waitFor = typeof data.timeout === 'function' ? data.timeout(state.ctx) : data.timeout;
    }
    catch (err) {
        failPrimitive(state, err, state.ctx);
        return;
    }
    if (!waitFor) {
        if (data.stageFnId === undefined) {
            completePrimitiveSuccess(state, state.ctx);
            return;
        }
        let sync = true;
        let settledSync = false;
        let syncErr;
        let syncResult;
        invokeStageFn(state.plan, data.stageFnId, state.inputErr, state.ctx, ((err, ctx) => {
            if (sync) {
                settledSync = true;
                syncErr = err;
                syncResult = ctx;
                return;
            }
            if (err) {
                completePrimitiveError(state, err, state.ctx);
            }
            else {
                completePrimitiveSuccess(state, (ctx !== null && ctx !== void 0 ? ctx : state.ctx));
            }
            executeCompiledPlanLoop(state);
        }));
        sync = false;
        if (!settledSync) {
            return;
        }
        if (syncErr) {
            completePrimitiveError(state, syncErr, state.ctx);
        }
        else {
            completePrimitiveSuccess(state, (syncResult !== null && syncResult !== void 0 ? syncResult : state.ctx));
        }
        return;
    }
    const frame = {
        kind: 'TIMEOUT',
        data,
        originalCtx: state.ctx,
        settled: false,
        timer: null,
        controller: null,
        controllerCleanup: null,
    };
    if (data.stageFnId !== undefined) {
        const linkedController = (0, execution_signal_1.createLinkedAbortController)((0, execution_signal_1.getExecutionSignal)(state.ctx));
        frame.controller = linkedController.controller;
        frame.controllerCleanup = linkedController.cleanup;
    }
    state.frameStack.push(frame);
    const finalize = (sync, err, ctx) => {
        var _a;
        if (frame.settled || state.completed) {
            return;
        }
        frame.settled = true;
        if (frame.timer) {
            clearTimeout(frame.timer);
            frame.timer = null;
        }
        (_a = frame.controllerCleanup) === null || _a === void 0 ? void 0 : _a.call(frame);
        frame.controllerCleanup = null;
        removeFrame(state, frame);
        if (err) {
            completePrimitiveError(state, err, frame.originalCtx);
        }
        else {
            completePrimitiveSuccess(state, (ctx !== null && ctx !== void 0 ? ctx : frame.originalCtx));
        }
        if (!sync) {
            executeCompiledPlanLoop(state);
        }
    };
    frame.timer = setTimeout(() => {
        frame.timer = null;
        if (frame.settled || state.completed) {
            return;
        }
        if (frame.controller && !frame.controller.signal.aborted) {
            frame.controller.abort((0, ErrorList_1.createCodeError)(errors_1.ErrorCode.ERR_STAGE_TIMEOUT));
        }
        if (data.overdueStageFnId === undefined) {
            finalize(false, undefined, frame.originalCtx);
            return;
        }
        let sync = true;
        let settledSync = false;
        let syncErr;
        let syncResult;
        invokeStageFn(state.plan, data.overdueStageFnId, state.inputErr, frame.originalCtx, ((err, ctx) => {
            if (frame.settled || state.completed) {
                return;
            }
            if (sync) {
                settledSync = true;
                syncErr = err;
                syncResult = ctx;
                return;
            }
            finalize(false, err, (ctx !== null && ctx !== void 0 ? ctx : frame.originalCtx));
        }));
        sync = false;
        if (settledSync) {
            finalize(false, syncErr, (syncResult !== null && syncResult !== void 0 ? syncResult : frame.originalCtx));
        }
    }, waitFor);
    if (data.stageFnId === undefined) {
        return;
    }
    const isolatedCtx = (0, context_snapshot_1.createIsolatedStageContext)(frame.originalCtx);
    let sync = true;
    let settledSync = false;
    let syncErr;
    let syncResult;
    invokeStageFn(state.plan, data.stageFnId, state.inputErr, isolatedCtx, ((err, ctx) => {
        if (frame.settled || state.completed) {
            return;
        }
        if (sync) {
            settledSync = true;
            syncErr = err;
            syncResult = ctx;
            return;
        }
        if (err) {
            finalize(false, err, frame.originalCtx);
            return;
        }
        const committed = (0, context_snapshot_1.commitIsolatedStageContext)(frame.originalCtx, (ctx !== null && ctx !== void 0 ? ctx : isolatedCtx));
        finalize(false, undefined, committed);
    }), (_a = frame.controller) === null || _a === void 0 ? void 0 : _a.signal);
    sync = false;
    if (!settledSync) {
        return;
    }
    if (syncErr) {
        finalize(true, syncErr, frame.originalCtx);
    }
    else {
        const committed = (0, context_snapshot_1.commitIsolatedStageContext)(frame.originalCtx, (syncResult !== null && syncResult !== void 0 ? syncResult : isolatedCtx));
        finalize(true, undefined, committed);
    }
}
function executeCompiledPlanLoop(state) {
    while (!state.suspended && !state.completed) {
        const op = state.plan.ops[state.pc];
        if (!op) {
            failState(state, errors_1.ErrorMessage[errors_1.ErrorCode.ERR_PC_OUT_OF_BOUNDS], errors_1.ErrorCode.ERR_PC_OUT_OF_BOUNDS);
            continue;
        }
        switch (op.op) {
            case 'RUN_STAGE_FN':
                state.suspended = true;
                runCompiledStageFn(state, op.stageFnId);
                if (state.suspended)
                    return;
                continue;
            case 'RUN_STAGE_INSTANCE':
                state.suspended = true;
                runWithStage(state, state.plan.tables.stageInstances[op.stageId]);
                if (state.suspended)
                    return;
                continue;
            case 'RUN_FALLBACK_STAGE':
                state.suspended = true;
                runWithStage(state, state.plan.tables.stageInstances[op.stageId]);
                if (state.suspended)
                    return;
                continue;
            case 'RUN_SEQUENTIAL':
                state.suspended = true;
                runSequentialOp(state, op.data);
                if (state.suspended)
                    return;
                continue;
            case 'RUN_LOOP':
                state.suspended = true;
                runLoopOp(state, op.data);
                if (state.suspended)
                    return;
                continue;
            case 'RUN_RETRY':
                state.suspended = true;
                runRetryOp(state, op.data);
                if (state.suspended)
                    return;
                continue;
            case 'RUN_TIMEOUT':
                state.suspended = true;
                runTimeoutOp(state, op.data);
                if (state.suspended)
                    return;
                continue;
            case 'RUN_PARALLEL':
                state.suspended = true;
                runParallelOp(state, op.data);
                if (state.suspended)
                    return;
                continue;
            case 'RUN_MWS':
                state.suspended = true;
                runMultiWaySwitchOp(state, op.data);
                if (state.suspended)
                    return;
                continue;
            case 'SET_CTX_FROM_RESULT':
                if (!state.err && state.result !== undefined) {
                    state.ctx = state.result;
                }
                state.result = undefined;
                state.pc += 1;
                continue;
            case 'JUMP':
                state.pc = op.target;
                continue;
            case 'JUMP_IF_TRUE':
                state.suspended = true;
                runPredicate(state, op.predicateId, op.target);
                if (state.suspended)
                    return;
                continue;
            case 'PUSH_FRAME':
                pushFrame(state, op);
                continue;
            case 'POP_FRAME':
                popFrame(state);
                continue;
            case 'RETURN':
                if (returnFromSubplan(state)) {
                    continue;
                }
                completeState(state);
                return;
        }
    }
}
function executeCompiledPlan(plan, err, context, done) {
    const state = createExecutionState(plan, err, context, done);
    executeCompiledPlanLoop(state);
}
//# sourceMappingURL=executor.js.map