"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.compilePipelinePlan = compilePipelinePlan;
exports.getPipelineDependencySignature = getPipelineDependencySignature;
const dowhile_1 = require("../dowhile");
const empty_1 = require("../empty");
const ifelse_1 = require("../ifelse");
const multiwayswitch_1 = require("../multiwayswitch");
const parallel_1 = require("../parallel");
const retryonerror_1 = require("../retryonerror");
const sequential_1 = require("../sequential");
const stage_1 = require("../stage");
const timeout_1 = require("../timeout");
const wrap_1 = require("../wrap");
const ErrorList_1 = require("../utils/ErrorList");
const ErrorList_2 = require("../utils/ErrorList");
const ErrorList_3 = require("../utils/ErrorList");
const can_fix_error_1 = require("../utils/can_fix_error");
const execute_callback_1 = require("../utils/execute_callback");
const execute_validate_1 = require("../utils/execute_validate");
const empty_run_1 = require("../utils/empty_run");
const errors_1 = require("../utils/errors");
const run_or_execute_1 = require("../utils/run_or_execute");
const TypeDetectors_1 = require("../utils/TypeDetectors");
const types_1 = require("../utils/types");
const executor_1 = require("./executor");
const plan_1 = require("./plan");
function isPipelineLike(stage) {
    var _a;
    return ((0, types_1.isAnyStage)(stage) &&
        Array.isArray((_a = stage.config) === null || _a === void 0 ? void 0 : _a.stages) &&
        typeof stage.split !== 'function');
}
function isPlainStageLike(stage) {
    return (0, types_1.isAnyStage)(stage) && typeof stage.toString === 'function' && stage.toString() === '[pipeline Stage]';
}
function hasPlainStageBoundaryFeatures(stage) {
    var _a;
    const config = (_a = stage === null || stage === void 0 ? void 0 : stage.config) !== null && _a !== void 0 ? _a : {};
    return Boolean(config.ensure ||
        config.validate ||
        config.schema ||
        config.rescue ||
        config.compile ||
        config.precompile);
}
function canDevirtualizePlainStage(stage) {
    var _a;
    return (stage instanceof stage_1.Stage &&
        stage.constructor === stage_1.Stage &&
        typeof ((_a = stage.config) === null || _a === void 0 ? void 0 : _a.run) === 'function' &&
        !hasPlainStageBoundaryFeatures(stage));
}
function isEmptyStage(stage) {
    return stage instanceof empty_1.Empty;
}
function isIfElseStage(stage) {
    return stage instanceof ifelse_1.IfElse;
}
function isWrapStage(stage) {
    return stage instanceof wrap_1.Wrap;
}
function isSequentialStage(stage) {
    return stage instanceof sequential_1.Sequential;
}
function isParallelStage(stage) {
    return stage instanceof parallel_1.Parallel;
}
function isDoWhileStage(stage) {
    return stage instanceof dowhile_1.DoWhile;
}
function isRetryOnErrorStage(stage) {
    return stage instanceof retryonerror_1.RetryOnError;
}
function isTimeoutStage(stage) {
    return stage instanceof timeout_1.Timeout;
}
function isMultiWaySwitchStage(stage) {
    return stage instanceof multiwayswitch_1.MultiWaySwitch;
}
function hasStageBoundaryFeatures(stage) {
    var _a;
    const config = (_a = stage === null || stage === void 0 ? void 0 : stage.config) !== null && _a !== void 0 ? _a : {};
    const hasSyntheticEmptyRun = isEmptyStage(stage) && config.run === empty_run_1.empty_run;
    return Boolean(config.ensure ||
        config.validate ||
        config.schema ||
        config.rescue ||
        (config.run && !hasSyntheticEmptyRun) ||
        config.compile ||
        config.precompile);
}
function getGraphVersion(stage) {
    return typeof (stage === null || stage === void 0 ? void 0 : stage._graphVersion) === 'number' ? stage._graphVersion : 0;
}
function getFunctionSignature(fn, index) {
    return `fn:${index}:${fn.name || 'anon'}:${fn.length}:${(0, types_1.is_async_function)(fn) ? 1 : 0}`;
}
function classifyStageFn(fn) {
    const isAsync = (0, types_1.is_async_function)(fn);
    switch (fn.length) {
        case 0:
            return isAsync ? 'FN0_ASYNC' : 'FN0_SYNC';
        case 1:
            return isAsync ? 'FN1_ASYNC' : 'FN1_SYNC';
        case 2:
            return isAsync ? 'FN2_ASYNC' : 'FN2_CALLBACK';
        case 3:
            return isAsync ? 'GENERIC' : 'FN3_CALLBACK';
        default:
            return 'GENERIC';
    }
}
function addStageFn(tables, run) {
    const stageFnId = tables.stageFns.push(run) - 1;
    tables.stageFnKinds[stageFnId] = classifyStageFn(run);
    return stageFnId;
}
function addPredicate(tables, predicate, kind = 'GENERIC') {
    const predicateId = tables.predicates.push(predicate) - 1;
    tables.predicateKinds[predicateId] = kind;
    return predicateId;
}
function createSyntheticPipeline(stage) {
    return {
        config: {
            stages: [stage],
        },
        toString() {
            return '[pipeline Pipeline]';
        },
        reportName: 'CompiledSubplan',
        _graphVersion: getGraphVersion(stage),
    };
}
function executeRunnerPromise(run, err, ctx) {
    return new Promise((resolve, reject) => {
        (0, run_or_execute_1.run_or_execute)(run, err, ctx, ((runErr, nextCtx) => {
            if (runErr) {
                reject(runErr);
            }
            else {
                resolve((nextCtx !== null && nextCtx !== void 0 ? nextCtx : ctx));
            }
        }));
    });
}
function getNestedPipelinePlan(stage) {
    if (typeof stage.getCompiledPlan === 'function' && !hasStageBoundaryFeatures(stage)) {
        return stage.getCompiledPlan(false);
    }
    return compilePipelinePlan(stage);
}
function getFusableSubplanStageFnIds(plan) {
    if (plan.mode !== 'compiled-static' || plan.metadata.fallbackOps > 0) {
        return null;
    }
    const stageFnIds = [];
    for (let i = 0; i < plan.ops.length; i++) {
        const op = plan.ops[i];
        if (op.op === 'RETURN') {
            return i === plan.ops.length - 1 ? stageFnIds : null;
        }
        if (op.op !== 'RUN_STAGE_FN') {
            return null;
        }
        const next = plan.ops[i + 1];
        if (!next || next.op !== 'SET_CTX_FROM_RESULT') {
            return null;
        }
        stageFnIds.push(op.stageFnId);
        i += 1;
    }
    return null;
}
function isInlineControlFlowSubplan(plan) {
    var _a;
    if (plan.mode !== 'compiled-static'
        || plan.metadata.fallbackOps > 0
        || plan.tables.stageInstances.length > 0
        || plan.tables.subplans.length > 0) {
        return false;
    }
    for (let i = 0; i < plan.ops.length; i++) {
        const op = plan.ops[i];
        if (op.op === 'RETURN') {
            return i === plan.ops.length - 1;
        }
        switch (op.op) {
            case 'RUN_STAGE_FN':
                if (((_a = plan.ops[i + 1]) === null || _a === void 0 ? void 0 : _a.op) !== 'SET_CTX_FROM_RESULT') {
                    return false;
                }
                i += 1;
                break;
            case 'JUMP':
            case 'JUMP_IF_TRUE':
                break;
            default:
                return false;
        }
    }
    return false;
}
function createFusedSubplanRunnerInfo(plan) {
    const stageFnIds = getFusableSubplanStageFnIds(plan);
    if (!stageFnIds) {
        return null;
    }
    const run = ((initialErr, initialCtx, done) => {
        (0, executor_1.executeFusedStageFnSequence)(plan, stageFnIds, initialErr, initialCtx, done);
    });
    return {
        run,
        containsAsyncOps: plan.metadata.containsAsyncOps,
        fallbackOps: 0,
        dependencyParts: [`subplan-fused:${plan.dependencySignature}`],
    };
}
function createPlanRunnerInfo(plan, dependencyLabel) {
    return {
        run: ((err, ctx, done) => {
            (0, executor_1.executeCompiledPlan)(plan, err, ctx, done);
        }),
        containsAsyncOps: true,
        fallbackOps: plan.metadata.fallbackOps,
        dependencyParts: [`${dependencyLabel}:${plan.dependencySignature}`],
    };
}
function createCompiledRunnerInfo(stage) {
    var _a;
    if (typeof stage === 'function') {
        return {
            run: stage,
            containsAsyncOps: (0, types_1.is_async_function)(stage),
            fallbackOps: 0,
            dependencyParts: [getFunctionSignature(stage, 0)],
        };
    }
    if (isPipelineLike(stage) && !hasStageBoundaryFeatures(stage)) {
        const plan = getNestedPipelinePlan(stage);
        return (_a = createFusedSubplanRunnerInfo(plan)) !== null && _a !== void 0 ? _a : createPlanRunnerInfo(plan, 'subplan');
    }
    if (isMultiWaySwitchStage(stage) && !hasStageBoundaryFeatures(stage)) {
        return createMultiWaySwitchRunnerInfo(stage);
    }
    if ((0, types_1.isAnyStage)(stage)) {
        const plan = compilePipelinePlan(createSyntheticPipeline(stage));
        return createPlanRunnerInfo(plan, 'subplan');
    }
    return {
        run: ((_err, ctx) => __awaiter(this, void 0, void 0, function* () { return ctx; })),
        containsAsyncOps: false,
        fallbackOps: 0,
        dependencyParts: ['noop'],
    };
}
function createPlainStageRunnerInfo(stage) {
    const run = stage.config.run;
    const runCanFixError = (0, can_fix_error_1.can_fix_error)({ run });
    const directRun = ((err, ctx, done) => {
        const normalizedErr = (0, ErrorList_3.normalizeExecutionErrorInput)(err);
        if (normalizedErr && !runCanFixError) {
            done(normalizedErr, ctx);
            return;
        }
        (0, execute_callback_1.execute_callback)(normalizedErr, run, ctx, ((runErr, nextCtx) => {
            if (runErr) {
                done((0, ErrorList_1.createError)(runErr), ctx);
            }
            else {
                done(undefined, (nextCtx !== null && nextCtx !== void 0 ? nextCtx : ctx));
            }
        }));
    });
    return {
        run: directRun,
        containsAsyncOps: true,
        fallbackOps: 0,
        dependencyParts: [
            `plain-stage:${stage.reportName}:${getGraphVersion(stage)}`,
            getFunctionSignature(run, 0),
        ],
    };
}
function createIfElsePredicate(condition) {
    if (!(0, types_1.is_async_function)(condition) && condition.length === 1) {
        return (ctx) => {
            try {
                const result = condition(ctx);
                if ((0, TypeDetectors_1.isPromise)(result) || (0, types_1.is_thenable)(result)) {
                    return Promise.resolve(result).then((resolved) => ({
                        value: !!resolved,
                    })).catch((err) => ({
                        value: false,
                        err: err,
                    }));
                }
                if (typeof result === 'boolean') {
                    return result
                        ? { value: true }
                        : {
                            value: false,
                            err: (0, ErrorList_2.createCodeError)(errors_1.ErrorCode.ERR_INVALID_CONTEXT),
                        };
                }
                if (result === undefined) {
                    return { value: false };
                }
                return {
                    value: false,
                    err: result,
                };
            }
            catch (err) {
                return {
                    value: false,
                    err: (0, ErrorList_1.createError)(err, errors_1.ErrorCode.ERR_STAGE_THROW),
                };
            }
        };
    }
    return (ctx) => new Promise((resolve) => {
        (0, execute_validate_1.execute_validate)(condition, ctx, ((err, result) => {
            resolve({
                value: !!result,
                err: err,
            });
        }));
    });
}
function createIfElseBooleanPredicate(condition) {
    return (ctx) => {
        try {
            const result = condition(ctx);
            if ((0, TypeDetectors_1.isPromise)(result) || (0, types_1.is_thenable)(result)) {
                return Promise.resolve(result)
                    .then((resolved) => !!resolved)
                    .catch(() => false);
            }
            return !!result;
        }
        catch (_a) {
            return false;
        }
    };
}
function isCallbackValidateCondition(condition) {
    return !(0, types_1.is_async_function)(condition) && condition.length === 2;
}
function getErrBlindSyncBranchFn(child) {
    if (child === undefined || child === null) {
        return null;
    }
    if (isEmptyStage(child) && !hasStageBoundaryFeatures(child)) {
        return null;
    }
    if (typeof child === 'function') {
        if (child.length <= 1 && !(0, types_1.is_async_function)(child)) {
            return child;
        }
        return undefined;
    }
    if (canDevirtualizePlainStage(child)) {
        const run = child.config.run;
        if (run && run.length <= 1 && !(0, types_1.is_async_function)(run)) {
            return run;
        }
    }
    return undefined;
}
function createFusedErrBlindIfElseStageFn(condition, success, failed) {
    const successBranch = getErrBlindSyncBranchFn(success);
    const failedBranch = getErrBlindSyncBranchFn(failed);
    if (successBranch === undefined || failedBranch === undefined) {
        return null;
    }
    const runBranch = (branch, ctx) => {
        if (!branch) {
            return ctx;
        }
        return branch(ctx);
    };
    return ((ctx) => {
        let result;
        try {
            result = condition(ctx);
        }
        catch (_a) {
            return runBranch(failedBranch, ctx);
        }
        if ((0, TypeDetectors_1.isPromise)(result) || (0, types_1.is_thenable)(result)) {
            return Promise.resolve(result)
                .then((resolved) => runBranch(resolved ? successBranch : failedBranch, ctx))
                .catch(() => runBranch(failedBranch, ctx));
        }
        return runBranch(result ? successBranch : failedBranch, ctx);
    });
}
function isErrBlindIfElseBranch(child) {
    if (child === undefined || child === null) {
        return true;
    }
    if (typeof child === 'function') {
        return child.length <= 1;
    }
    if (isEmptyStage(child) && !hasStageBoundaryFeatures(child)) {
        return true;
    }
    if (canDevirtualizePlainStage(child)) {
        const run = child.config.run;
        return !!run && run.length <= 1;
    }
    if (isPipelineLike(child) && !hasStageBoundaryFeatures(child)) {
        return child.config.stages.every((stage) => isErrBlindIfElseBranch(stage));
    }
    return false;
}
function createSequentialIterationError(stage, iteration, err, ctx) {
    return new Error('sequential - error', {
        cause: {
            err,
            iteration,
            stage: stage.config.stage,
            ctx,
        },
    });
}
function createSequentialRunnerInfo(stage) {
    const inner = createCompiledRunnerInfo(stage.config.stage);
    const dependencyParts = [
        `sequential:${stage.reportName}:${getGraphVersion(stage)}`,
        ...inner.dependencyParts,
    ];
    if (stage.config.split) {
        dependencyParts.push(getFunctionSignature(stage.config.split, 1));
    }
    if (stage.config.combine) {
        dependencyParts.push(getFunctionSignature(stage.config.combine, 2));
    }
    const run = ((initialErr, initialCtx, done) => {
        let completed = false;
        const finish = (err, ctx) => {
            if (completed) {
                return;
            }
            completed = true;
            done(err, ctx);
        };
        try {
            const children = stage.split ? stage.split(initialCtx) : [initialCtx];
            const len = children.length;
            if (initialErr) {
                finish(initialErr, initialCtx);
                return;
            }
            if (len === 0) {
                finish(undefined, initialCtx);
                return;
            }
            const currentChildren = new Array(len);
            let iter = 0;
            const iterate = () => {
                while (!completed && iter < len) {
                    const iterSnapshot = iter;
                    const childCtx = children[iterSnapshot];
                    let sync = true;
                    let settledSync = false;
                    let syncErr;
                    let syncResult;
                    const settle = ((err, ctx) => {
                        if (completed) {
                            return;
                        }
                        if (sync) {
                            settledSync = true;
                            syncErr = err;
                            syncResult = ctx;
                            return;
                        }
                        if (err) {
                            finish(createSequentialIterationError(stage, iterSnapshot, err, childCtx), initialCtx);
                            return;
                        }
                        currentChildren[iterSnapshot] = ctx !== null && ctx !== void 0 ? ctx : childCtx;
                        iter = iterSnapshot + 1;
                        iterate();
                    });
                    (0, run_or_execute_1.run_or_execute)(inner.run, undefined, childCtx, settle);
                    sync = false;
                    if (!settledSync) {
                        return;
                    }
                    if (syncErr) {
                        finish(createSequentialIterationError(stage, iterSnapshot, syncErr, childCtx), initialCtx);
                        return;
                    }
                    currentChildren[iterSnapshot] = syncResult !== null && syncResult !== void 0 ? syncResult : childCtx;
                    iter = iterSnapshot + 1;
                }
                if (!completed) {
                    finish(undefined, stage.combine(initialCtx, currentChildren));
                }
            };
            iterate();
        }
        catch (err) {
            finish(err, initialCtx);
        }
    });
    return {
        run,
        containsAsyncOps: true,
        fallbackOps: inner.fallbackOps,
        dependencyParts,
    };
}
function createDoWhileRunnerInfo(stage) {
    const inner = createCompiledRunnerInfo(stage.config.stage);
    const dependencyParts = [
        `dowhile:${stage.reportName}:${getGraphVersion(stage)}`,
        ...inner.dependencyParts,
    ];
    if (stage.config.split) {
        dependencyParts.push(getFunctionSignature(stage.config.split, 2));
    }
    if (stage.config.reachEnd) {
        dependencyParts.push(getFunctionSignature(stage.config.reachEnd, 3));
    }
    const run = ((initialErr, initialContext) => __awaiter(this, void 0, void 0, function* () {
        if (!stage.config.stage) {
            return initialContext;
        }
        let iter = -1;
        let currentError = initialErr;
        let currentContext = initialContext;
        while (true) {
            iter += 1;
            if (stage.reachEnd(currentError, currentContext, iter)) {
                if (currentError) {
                    throw currentError;
                }
                return currentContext;
            }
            const splitCtx = stage.split(currentContext, iter);
            try {
                currentContext = yield executeRunnerPromise(inner.run, currentError, splitCtx);
                currentError = undefined;
            }
            catch (err) {
                currentError = err;
            }
        }
    }));
    return {
        run,
        containsAsyncOps: true,
        fallbackOps: inner.fallbackOps,
        dependencyParts,
    };
}
function createRetryRunnerInfo(stage) {
    var _a;
    const inner = createCompiledRunnerInfo(stage.config.stage);
    const dependencyParts = [
        `retry:${stage.reportName}:${getGraphVersion(stage)}`,
        ...inner.dependencyParts,
    ];
    if (typeof stage.config.retry === 'function') {
        dependencyParts.push(getFunctionSignature(stage.config.retry, 3));
    }
    else {
        dependencyParts.push(`retry-count:${(_a = stage.config.retry) !== null && _a !== void 0 ? _a : 1}`);
    }
    if (stage.config.backup) {
        dependencyParts.push(getFunctionSignature(stage.config.backup, 1));
    }
    if (stage.config.restore) {
        dependencyParts.push(getFunctionSignature(stage.config.restore, 2));
    }
    const run = ((initialErr, initialCtx) => __awaiter(this, void 0, void 0, function* () {
        if (!stage.config.stage) {
            return initialCtx;
        }
        let currentError = initialErr;
        let currentCtx = initialCtx;
        let iter = -1;
        const backup = stage.backupContext(initialCtx);
        const reachEnd = (err, iteration) => {
            var _a;
            if (err) {
                if (typeof stage.config.retry === 'function') {
                    return !stage.config.retry(err, currentCtx, iteration);
                }
                return iteration > ((_a = stage.config.retry) !== null && _a !== void 0 ? _a : 1);
            }
            return true;
        };
        try {
            do {
                iter += 1;
                if (iter > 0) {
                    currentCtx = stage.restoreContext(currentCtx, backup);
                }
                try {
                    currentCtx = yield executeRunnerPromise(inner.run, currentError, currentCtx);
                    currentError = undefined;
                }
                catch (err) {
                    currentError = err;
                }
            } while (!reachEnd(currentError, iter));
        }
        catch (err) {
            currentCtx = stage.restoreContext(currentCtx, backup);
            throw err;
        }
        if (currentError) {
            throw currentError;
        }
        return currentCtx;
    }));
    return {
        run,
        containsAsyncOps: true,
        fallbackOps: inner.fallbackOps,
        dependencyParts,
    };
}
function createTimeoutRunnerInfo(stage) {
    var _a, _b;
    const inner = createCompiledRunnerInfo(stage.config.stage);
    const overdue = stage.config.overdue ? createCompiledRunnerInfo(stage.config.overdue) : null;
    const dependencyParts = [
        `timeout:${stage.reportName}:${getGraphVersion(stage)}`,
        ...inner.dependencyParts,
    ];
    if (typeof stage.config.timeout === 'function') {
        dependencyParts.push(getFunctionSignature(stage.config.timeout, 1));
    }
    else {
        dependencyParts.push(`timeout-ms:${(_a = stage.config.timeout) !== null && _a !== void 0 ? _a : 0}`);
    }
    if (overdue) {
        dependencyParts.push(...overdue.dependencyParts);
    }
    const run = ((initialErr, initialCtx) => __awaiter(this, void 0, void 0, function* () {
        const waitFor = typeof stage.config.timeout === 'function'
            ? stage.config.timeout(initialCtx)
            : stage.config.timeout;
        if (!waitFor) {
            if (!stage.config.stage) {
                return initialCtx;
            }
            return executeRunnerPromise(inner.run, initialErr, initialCtx);
        }
        return yield new Promise((resolve, reject) => {
            let settled = false;
            let timeoutRef = null;
            const finish = (fn) => (value) => {
                if (settled) {
                    return;
                }
                settled = true;
                if (timeoutRef) {
                    clearTimeout(timeoutRef);
                    timeoutRef = null;
                }
                fn(value);
            };
            timeoutRef = setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                timeoutRef = null;
                try {
                    if (overdue) {
                        const overdueCtx = yield executeRunnerPromise(overdue.run, initialErr, initialCtx);
                        finish(resolve)(overdueCtx);
                    }
                    else {
                        finish(resolve)(initialCtx);
                    }
                }
                catch (err) {
                    finish(reject)(err);
                }
            }), waitFor);
            if (!stage.config.stage) {
                return;
            }
            executeRunnerPromise(inner.run, initialErr, initialCtx)
                .then(finish(resolve))
                .catch(finish(reject));
        });
    }));
    return {
        run,
        containsAsyncOps: true,
        fallbackOps: inner.fallbackOps + ((_b = overdue === null || overdue === void 0 ? void 0 : overdue.fallbackOps) !== null && _b !== void 0 ? _b : 0),
        dependencyParts,
    };
}
function normalizeMultiWaySwitchCase(stage, rawCase) {
    let caseItem = rawCase;
    if (typeof caseItem === 'function') {
        caseItem = {
            stage: caseItem,
            evaluate: true,
        };
    }
    else if ((0, types_1.isAnyStage)(caseItem)) {
        caseItem = {
            stage: caseItem,
            evaluate: true,
        };
    }
    if (!caseItem || typeof caseItem !== 'object' || !caseItem.stage) {
        return null;
    }
    let caseStage = caseItem.stage;
    if (!(0, types_1.isAnyStage)(caseStage) && typeof caseStage === 'object') {
        caseStage = new stage_1.Stage(caseStage);
    }
    const normalized = Object.assign(Object.assign({}, caseItem), { stage: caseStage });
    if (typeof normalized.split !== 'function') {
        normalized.split = stage.config.split;
    }
    if (typeof normalized.combine !== 'function') {
        normalized.combine = stage.config.combine;
    }
    if (!('evaluate' in normalized)) {
        normalized.evaluate = true;
    }
    return normalized;
}
function buildCompiledMultiWaySwitchCases(stage) {
    var _a;
    return ((_a = stage.config.cases) !== null && _a !== void 0 ? _a : [])
        .map((item) => normalizeMultiWaySwitchCase(stage, item))
        .filter((item) => item !== null)
        .map((item) => (Object.assign(Object.assign({}, item), { runner: createCompiledRunnerInfo(item.stage) })));
}
function appendMultiWaySwitchCaseDependencyParts(caseItem, index, dependencyParts) {
    dependencyParts.push(`mws-case:${index}`);
    if (typeof caseItem.evaluate === 'function') {
        dependencyParts.push(getFunctionSignature(caseItem.evaluate, index));
    }
    else {
        dependencyParts.push(`mws-eval:${String(caseItem.evaluate !== false)}`);
    }
    if (typeof caseItem.split === 'function') {
        dependencyParts.push(getFunctionSignature(caseItem.split, index));
    }
    if (typeof caseItem.combine === 'function') {
        dependencyParts.push(getFunctionSignature(caseItem.combine, index));
    }
}
function createExecutableMultiWaySwitchData(cases) {
    const statics = [];
    const dynamics = [];
    for (let i = 0; i < cases.length; i++) {
        const caseItem = cases[i];
        if (typeof caseItem.evaluate === 'function') {
            dynamics.push({
                stage: caseItem.stage,
                evaluate: caseItem.evaluate,
                split: caseItem.split,
                combine: caseItem.combine,
                run: caseItem.runner.run,
            });
            continue;
        }
        if (caseItem.evaluate !== false) {
            statics.push({
                stage: caseItem.stage,
                split: caseItem.split,
                combine: caseItem.combine,
                run: caseItem.runner.run,
            });
        }
    }
    return {
        statics,
        dynamics,
    };
}
function createMultiWaySwitchRunnerInfo(stage) {
    const compiledCases = buildCompiledMultiWaySwitchCases(stage);
    const executableData = createExecutableMultiWaySwitchData(compiledCases);
    const dependencyParts = [`mws:${stage.reportName}:${getGraphVersion(stage)}`];
    let fallbackOps = 0;
    let containsAsyncOps = false;
    for (let i = 0; i < compiledCases.length; i++) {
        const caseItem = compiledCases[i];
        appendMultiWaySwitchCaseDependencyParts(caseItem, i, dependencyParts);
        dependencyParts.push(...caseItem.runner.dependencyParts);
        fallbackOps += caseItem.runner.fallbackOps;
        containsAsyncOps = containsAsyncOps || caseItem.runner.containsAsyncOps;
    }
    const run = ((initialErr, initialCtx, done) => {
        (0, executor_1.executeNativeMultiWaySwitch)(initialErr, initialCtx, executableData, done);
    });
    return {
        run,
        containsAsyncOps,
        fallbackOps,
        dependencyParts,
    };
}
function appendDependencySignatureForStage(child, dependencyParts) {
    var _a, _b;
    var _c, _d, _e, _f, _g;
    if (typeof child === 'function') {
        dependencyParts.push(getFunctionSignature(child, dependencyParts.length));
        return;
    }
    if (isPipelineLike(child)) {
        appendDependencySignature(child, dependencyParts);
        return;
    }
    if (isIfElseStage(child) && !hasStageBoundaryFeatures(child)) {
        dependencyParts.push(`ifelse:${child.reportName}:${getGraphVersion(child)}`);
        if (typeof child.config.condition === 'function') {
            dependencyParts.push(getFunctionSignature(child.config.condition, 0));
        }
        else {
            dependencyParts.push(`ifelse-bool:${String((_c = child.config.condition) !== null && _c !== void 0 ? _c : true)}`);
        }
        if (child.config.success) {
            appendDependencySignatureForStage(child.config.success, dependencyParts);
        }
        if (child.config.failed) {
            appendDependencySignatureForStage(child.config.failed, dependencyParts);
        }
        return;
    }
    if (isWrapStage(child) && !hasStageBoundaryFeatures(child)) {
        dependencyParts.push(`wrap:${child.reportName}:${getGraphVersion(child)}`);
        if (child.config.prepare) {
            dependencyParts.push(getFunctionSignature(child.config.prepare, 1));
        }
        if (child.config.finalize) {
            dependencyParts.push(getFunctionSignature(child.config.finalize, 2));
        }
        if (child.config.stage) {
            appendDependencySignatureForStage(child.config.stage, dependencyParts);
        }
        return;
    }
    if (isSequentialStage(child) && !hasStageBoundaryFeatures(child)) {
        dependencyParts.push(...createSequentialRunnerInfo(child).dependencyParts);
        return;
    }
    if (isParallelStage(child) && !hasStageBoundaryFeatures(child)) {
        dependencyParts.push(`parallel:${child.reportName}:${getGraphVersion(child)}`);
        if (child.config.stage) {
            dependencyParts.push(...createCompiledRunnerInfo(child.config.stage).dependencyParts);
        }
        if (child.config.split) {
            dependencyParts.push(getFunctionSignature(child.config.split, 1));
        }
        if (child.config.combine) {
            dependencyParts.push(getFunctionSignature(child.config.combine, 2));
        }
        if (child.concurrency !== undefined) {
            dependencyParts.push(`parallel-concurrency:${child.concurrency}`);
        }
        dependencyParts.push(`parallel-join:${child.join}`);
        if (child.join === 'quorum') {
            dependencyParts.push(`parallel-quorum:${(_d = child.quorum) !== null && _d !== void 0 ? _d : 'default'}`);
        }
        if (child.trailing !== 'ignore') {
            dependencyParts.push(`parallel-trailing:${child.trailing}`);
        }
        if (child.trailingTimeout !== undefined) {
            dependencyParts.push(`parallel-trailing-timeout:${child.trailingTimeout}`);
        }
        return;
    }
    if (isDoWhileStage(child) && !hasStageBoundaryFeatures(child)) {
        dependencyParts.push(...createDoWhileRunnerInfo(child).dependencyParts);
        return;
    }
    if (isRetryOnErrorStage(child) && !hasStageBoundaryFeatures(child)) {
        dependencyParts.push(...createRetryRunnerInfo(child).dependencyParts);
        return;
    }
    if (isTimeoutStage(child) && !hasStageBoundaryFeatures(child)) {
        dependencyParts.push(...createTimeoutRunnerInfo(child).dependencyParts);
        return;
    }
    if (isMultiWaySwitchStage(child) && !hasStageBoundaryFeatures(child)) {
        dependencyParts.push(...createMultiWaySwitchRunnerInfo(child).dependencyParts);
        return;
    }
    if (canDevirtualizePlainStage(child)) {
        dependencyParts.push(...createPlainStageRunnerInfo(child).dependencyParts);
        return;
    }
    if (isPlainStageLike(child)) {
        dependencyParts.push(`stage:${(_e = child.reportName) !== null && _e !== void 0 ? _e : 'Stage'}:${getGraphVersion(child)}`);
        return;
    }
    if ((0, types_1.isAnyStage)(child)) {
        dependencyParts.push(`fallback:${(_g = (_f = child.reportName) !== null && _f !== void 0 ? _f : (_b = (_a = child).toString) === null || _b === void 0 ? void 0 : _b.call(_a)) !== null && _g !== void 0 ? _g : 'stage'}:${getGraphVersion(child)}`);
        return;
    }
    dependencyParts.push(`unknown:${typeof child}:${dependencyParts.length}`);
}
function appendDependencySignature(pipeline, dependencyParts) {
    dependencyParts.push(`pipe:${getGraphVersion(pipeline)}:${pipeline.config.stages.length}`);
    for (let i = 0; i < pipeline.config.stages.length; i++) {
        appendDependencySignatureForStage(pipeline.config.stages[i], dependencyParts);
    }
}
function registerRunnerInfo(info, tables, metadata, dependencyParts) {
    dependencyParts.push(...info.dependencyParts);
    metadata.containsAsyncOps = metadata.containsAsyncOps || info.containsAsyncOps;
    metadata.fallbackOps += info.fallbackOps;
    return addStageFn(tables, info.run);
}
function emitSequentialStage(stage, ops, tables, metadata, dependencyParts) {
    var _a;
    let stageFnId;
    let fusedPlan;
    let fusedStageFnIds;
    let inlineControlPlan;
    let subplanId;
    if (isPipelineLike(stage.config.stage) && !hasStageBoundaryFeatures(stage.config.stage)) {
        const plan = getNestedPipelinePlan(stage.config.stage);
        metadata.containsAsyncOps = metadata.containsAsyncOps || plan.metadata.containsAsyncOps;
        metadata.containsParallelOps = metadata.containsParallelOps || plan.metadata.containsParallelOps;
        metadata.fallbackOps += plan.metadata.fallbackOps;
        fusedStageFnIds = (_a = getFusableSubplanStageFnIds(plan)) !== null && _a !== void 0 ? _a : undefined;
        if (fusedStageFnIds) {
            fusedPlan = plan;
            dependencyParts.push(`subplan-fused-inline:${plan.dependencySignature}`);
        }
        else if (isInlineControlFlowSubplan(plan)) {
            inlineControlPlan = plan;
            dependencyParts.push(`subplan-inline-control:${plan.dependencySignature}`);
        }
        else {
            subplanId = tables.subplans.push(plan) - 1;
            dependencyParts.push(`subplan-inline:${plan.dependencySignature}`);
        }
    }
    else {
        const inner = createCompiledRunnerInfo(stage.config.stage);
        stageFnId = registerRunnerInfo(inner, tables, metadata, dependencyParts);
    }
    dependencyParts.push(`sequential:${stage.reportName}:${getGraphVersion(stage)}`);
    if (stage.config.split) {
        dependencyParts.push(getFunctionSignature(stage.config.split, 1));
    }
    if (stage.config.combine) {
        dependencyParts.push(getFunctionSignature(stage.config.combine, 2));
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
        split: (ctx) => stage.split(ctx),
        combine: (ctx, children) => stage.combine(ctx, children),
    }) - 1;
    ops.push({ op: 'RUN_SEQUENTIAL', data });
}
function emitParallelStage(stage, ops, tables, metadata, dependencyParts) {
    var _a;
    dependencyParts.push(`parallel:${stage.reportName}:${getGraphVersion(stage)}`);
    let stageFnId;
    if (stage.config.stage) {
        const inner = createCompiledRunnerInfo(stage.config.stage);
        stageFnId = registerRunnerInfo(inner, tables, metadata, dependencyParts);
    }
    if (stage.config.split) {
        dependencyParts.push(getFunctionSignature(stage.config.split, 1));
    }
    if (stage.config.combine) {
        dependencyParts.push(getFunctionSignature(stage.config.combine, 2));
    }
    if (stage.concurrency !== undefined) {
        dependencyParts.push(`parallel-concurrency:${stage.concurrency}`);
    }
    dependencyParts.push(`parallel-join:${stage.join}`);
    if (stage.join === 'quorum') {
        dependencyParts.push(`parallel-quorum:${(_a = stage.quorum) !== null && _a !== void 0 ? _a : 'default'}`);
    }
    if (stage.trailing !== 'ignore') {
        dependencyParts.push(`parallel-trailing:${stage.trailing}`);
    }
    if (stage.trailingTimeout !== undefined) {
        dependencyParts.push(`parallel-trailing-timeout:${stage.trailingTimeout}`);
    }
    metadata.containsParallelOps = true;
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
        split: (ctx) => stage.split(ctx),
        combine: (ctx, children) => stage.combine(ctx, children),
    }) - 1;
    ops.push({ op: 'RUN_PARALLEL', data });
}
function emitLoopStage(stage, ops, tables, metadata, dependencyParts) {
    const inner = createCompiledRunnerInfo(stage.config.stage);
    const stageFnId = registerRunnerInfo(inner, tables, metadata, dependencyParts);
    dependencyParts.push(`dowhile:${stage.reportName}:${getGraphVersion(stage)}`);
    if (stage.config.split) {
        dependencyParts.push(getFunctionSignature(stage.config.split, 2));
    }
    if (stage.config.reachEnd) {
        dependencyParts.push(getFunctionSignature(stage.config.reachEnd, 3));
    }
    const data = tables.constants.push({
        kind: 'LOOP',
        reportName: stage.reportName,
        stageFnId,
        split: (ctx, iter) => stage.split(ctx, iter),
        reachEnd: (err, ctx, iter) => stage.reachEnd(err, ctx, iter),
    }) - 1;
    ops.push({ op: 'RUN_LOOP', data });
}
function emitRetryStage(stage, ops, tables, metadata, dependencyParts) {
    var _a, _b;
    const inner = createCompiledRunnerInfo(stage.config.stage);
    const stageFnId = registerRunnerInfo(inner, tables, metadata, dependencyParts);
    dependencyParts.push(`retry:${stage.reportName}:${getGraphVersion(stage)}`);
    if (typeof stage.config.retry === 'function') {
        dependencyParts.push(getFunctionSignature(stage.config.retry, 3));
    }
    else {
        dependencyParts.push(`retry-count:${(_a = stage.config.retry) !== null && _a !== void 0 ? _a : 1}`);
    }
    if (stage.config.backup) {
        dependencyParts.push(getFunctionSignature(stage.config.backup, 1));
    }
    if (stage.config.restore) {
        dependencyParts.push(getFunctionSignature(stage.config.restore, 2));
    }
    const data = tables.constants.push({
        kind: 'RETRY',
        reportName: stage.reportName,
        stageFnId,
        retry: (_b = stage.config.retry) !== null && _b !== void 0 ? _b : 1,
        backup: (ctx) => stage.backupContext(ctx),
        restore: (ctx, backup) => stage.restoreContext(ctx, backup),
    }) - 1;
    ops.push({ op: 'RUN_RETRY', data });
}
function emitTimeoutStage(stage, ops, tables, metadata, dependencyParts) {
    var _a;
    dependencyParts.push(`timeout:${stage.reportName}:${getGraphVersion(stage)}`);
    let stageFnId;
    let overdueStageFnId;
    if (stage.config.stage) {
        const inner = createCompiledRunnerInfo(stage.config.stage);
        stageFnId = registerRunnerInfo(inner, tables, metadata, dependencyParts);
    }
    if (stage.config.overdue) {
        const overdue = createCompiledRunnerInfo(stage.config.overdue);
        overdueStageFnId = registerRunnerInfo(overdue, tables, metadata, dependencyParts);
    }
    if (typeof stage.config.timeout === 'function') {
        dependencyParts.push(getFunctionSignature(stage.config.timeout, 1));
    }
    else {
        dependencyParts.push(`timeout-ms:${(_a = stage.config.timeout) !== null && _a !== void 0 ? _a : 0}`);
    }
    metadata.containsAsyncOps = metadata.containsAsyncOps || Boolean(stage.config.timeout);
    const data = tables.constants.push({
        kind: 'TIMEOUT',
        reportName: stage.reportName,
        stageFnId,
        overdueStageFnId,
        timeout: stage.config.timeout,
    }) - 1;
    ops.push({ op: 'RUN_TIMEOUT', data });
}
function emitMultiWaySwitchStage(stage, ops, tables, metadata, dependencyParts) {
    const compiledCases = buildCompiledMultiWaySwitchCases(stage);
    dependencyParts.push(`mws:${stage.reportName}:${getGraphVersion(stage)}`);
    const statics = [];
    const dynamics = [];
    for (let i = 0; i < compiledCases.length; i++) {
        const caseItem = compiledCases[i];
        appendMultiWaySwitchCaseDependencyParts(caseItem, i, dependencyParts);
        const stageFnId = registerRunnerInfo(caseItem.runner, tables, metadata, dependencyParts);
        if (typeof caseItem.evaluate === 'function') {
            dynamics.push({
                stage: caseItem.stage,
                stageFnId,
                evaluate: caseItem.evaluate,
                split: caseItem.split,
                combine: caseItem.combine,
            });
        }
        else if (caseItem.evaluate !== false) {
            statics.push({
                stage: caseItem.stage,
                stageFnId,
                split: caseItem.split,
                combine: caseItem.combine,
            });
        }
    }
    const data = tables.constants.push({
        kind: 'MWS',
        reportName: stage.reportName,
        statics,
        dynamics,
    }) - 1;
    ops.push({ op: 'RUN_MWS', data });
    ops.push({ op: 'SET_CTX_FROM_RESULT' });
}
function emitPlainStageFn(stage, ops, tables, metadata, dependencyParts) {
    const info = createPlainStageRunnerInfo(stage);
    const stageFnId = registerRunnerInfo(info, tables, metadata, dependencyParts);
    ops.push({ op: 'RUN_STAGE_FN', stageFnId });
    ops.push({ op: 'SET_CTX_FROM_RESULT' });
}
function emitIfElseStage(stage, ops, tables, metadata, dependencyParts, depth) {
    var _a;
    dependencyParts.push(`ifelse:${stage.reportName}:${getGraphVersion(stage)}`);
    const condition = stage.config.condition;
    if (typeof condition === 'boolean') {
        dependencyParts.push(`ifelse-bool:${String(condition)}`);
        emitStage(stage.config[condition ? 'success' : 'failed'], ops, tables, metadata, dependencyParts, depth + 1);
        return;
    }
    if (typeof condition !== 'function') {
        emitStage((_a = stage.config.success) !== null && _a !== void 0 ? _a : stage.config.failed, ops, tables, metadata, dependencyParts, depth + 1);
        return;
    }
    dependencyParts.push(getFunctionSignature(condition, 0));
    const canSkipScope = !(0, types_1.is_async_function)(condition)
        && condition.length === 1
        && isErrBlindIfElseBranch(stage.config.success)
        && isErrBlindIfElseBranch(stage.config.failed);
    metadata.containsAsyncOps = true;
    if (canSkipScope) {
        const fusedStageFn = createFusedErrBlindIfElseStageFn(condition, stage.config.success, stage.config.failed);
        if (fusedStageFn) {
            if (stage.config.success) {
                appendDependencySignatureForStage(stage.config.success, dependencyParts);
            }
            if (stage.config.failed) {
                appendDependencySignatureForStage(stage.config.failed, dependencyParts);
            }
            const stageFnId = addStageFn(tables, fusedStageFn);
            ops.push({ op: 'RUN_STAGE_FN', stageFnId });
            ops.push({ op: 'SET_CTX_FROM_RESULT' });
            return;
        }
    }
    const predicateId = addPredicate(tables, canSkipScope
        ? createIfElseBooleanPredicate(condition)
        : isCallbackValidateCondition(condition)
            ? condition
            : createIfElsePredicate(condition), canSkipScope ? 'BOOL_CTX_SYNC' : isCallbackValidateCondition(condition) ? 'GENERIC_CALLBACK' : 'GENERIC');
    if (canSkipScope) {
        const jumpIndex = ops.length;
        ops.push({ op: 'JUMP_IF_TRUE', predicateId, target: 0 });
        emitStage(stage.config.failed, ops, tables, metadata, dependencyParts, depth + 1);
        const joinJumpIndex = ops.length;
        ops.push({ op: 'JUMP', target: 0 });
        const successStart = ops.length;
        ops[jumpIndex].target = successStart;
        emitStage(stage.config.success, ops, tables, metadata, dependencyParts, depth + 1);
        const joinTarget = ops.length;
        ops[joinJumpIndex].target = joinTarget;
        return;
    }
    ops.push({ op: 'PUSH_FRAME', frameKind: 'SCOPE' });
    const jumpIndex = ops.length;
    ops.push({ op: 'JUMP_IF_TRUE', predicateId, target: 0 });
    emitStage(stage.config.failed, ops, tables, metadata, dependencyParts, depth + 1);
    ops.push({ op: 'POP_FRAME' });
    const joinJumpIndex = ops.length;
    ops.push({ op: 'JUMP', target: 0 });
    const successStart = ops.length;
    ops[jumpIndex].target = successStart;
    emitStage(stage.config.success, ops, tables, metadata, dependencyParts, depth + 1);
    ops.push({ op: 'POP_FRAME' });
    const joinTarget = ops.length;
    ops[joinJumpIndex].target = joinTarget;
}
function emitWrapStage(stage, ops, tables, metadata, dependencyParts, depth) {
    dependencyParts.push(`wrap:${stage.reportName}:${getGraphVersion(stage)}`);
    const prepareId = tables.transforms.push((ctx) => stage.prepare(ctx)) - 1;
    const finalizeId = tables.transforms.push((ctx, retCtx) => stage.finalize(ctx, retCtx)) - 1;
    const wrapData = tables.constants.push({ prepareId, finalizeId }) - 1;
    if (stage.config.prepare) {
        dependencyParts.push(getFunctionSignature(stage.config.prepare, 1));
    }
    if (stage.config.finalize) {
        dependencyParts.push(getFunctionSignature(stage.config.finalize, 2));
    }
    ops.push({ op: 'PUSH_FRAME', frameKind: 'WRAP', data: wrapData });
    emitStage(stage.config.stage, ops, tables, metadata, dependencyParts, depth + 1);
    ops.push({ op: 'POP_FRAME' });
}
function emitStage(child, ops, tables, metadata, dependencyParts, depth) {
    var _a, _b;
    var _c, _d, _e;
    if (child === undefined || child === null) {
        return;
    }
    metadata.maxStaticDepthBeforeFlatten = Math.max(metadata.maxStaticDepthBeforeFlatten, depth);
    if (typeof child === 'function') {
        const stageFn = child;
        const stageFnId = addStageFn(tables, stageFn);
        ops.push({ op: 'RUN_STAGE_FN', stageFnId });
        ops.push({ op: 'SET_CTX_FROM_RESULT' });
        metadata.containsAsyncOps = metadata.containsAsyncOps || (0, types_1.is_async_function)(stageFn);
        dependencyParts.push(getFunctionSignature(stageFn, dependencyParts.length));
        return;
    }
    if (isPipelineLike(child)) {
        if (!hasStageBoundaryFeatures(child)) {
            metadata.flattenedStages += child.config.stages.length;
            dependencyParts.push(`pipe:${getGraphVersion(child)}:${child.config.stages.length}`);
            for (let i = 0; i < child.config.stages.length; i++) {
                emitStage(child.config.stages[i], ops, tables, metadata, dependencyParts, depth + 1);
            }
            return;
        }
    }
    if (isIfElseStage(child) && !hasStageBoundaryFeatures(child)) {
        emitIfElseStage(child, ops, tables, metadata, dependencyParts, depth);
        return;
    }
    if (isWrapStage(child) && !hasStageBoundaryFeatures(child)) {
        emitWrapStage(child, ops, tables, metadata, dependencyParts, depth);
        return;
    }
    if (isSequentialStage(child) && !hasStageBoundaryFeatures(child)) {
        emitSequentialStage(child, ops, tables, metadata, dependencyParts);
        return;
    }
    if (isParallelStage(child) && !hasStageBoundaryFeatures(child)) {
        emitParallelStage(child, ops, tables, metadata, dependencyParts);
        return;
    }
    if (isDoWhileStage(child) && !hasStageBoundaryFeatures(child)) {
        emitLoopStage(child, ops, tables, metadata, dependencyParts);
        return;
    }
    if (isRetryOnErrorStage(child) && !hasStageBoundaryFeatures(child)) {
        emitRetryStage(child, ops, tables, metadata, dependencyParts);
        return;
    }
    if (isTimeoutStage(child) && !hasStageBoundaryFeatures(child)) {
        emitTimeoutStage(child, ops, tables, metadata, dependencyParts);
        return;
    }
    if (isMultiWaySwitchStage(child) && !hasStageBoundaryFeatures(child)) {
        emitMultiWaySwitchStage(child, ops, tables, metadata, dependencyParts);
        return;
    }
    if (canDevirtualizePlainStage(child)) {
        emitPlainStageFn(child, ops, tables, metadata, dependencyParts);
        return;
    }
    if (isEmptyStage(child) && !hasStageBoundaryFeatures(child)) {
        dependencyParts.push(`empty:${getGraphVersion(child)}`);
        return;
    }
    if (isPlainStageLike(child)) {
        const stageId = tables.stageInstances.push(child) - 1;
        ops.push({ op: 'RUN_STAGE_INSTANCE', stageId });
        ops.push({ op: 'SET_CTX_FROM_RESULT' });
        dependencyParts.push(`stage:${(_c = child.reportName) !== null && _c !== void 0 ? _c : 'Stage'}:${getGraphVersion(child)}`);
        return;
    }
    if ((0, types_1.isAnyStage)(child)) {
        const stageId = tables.stageInstances.push(child) - 1;
        ops.push({ op: 'RUN_FALLBACK_STAGE', stageId });
        ops.push({ op: 'SET_CTX_FROM_RESULT' });
        metadata.fallbackOps += 1;
        metadata.containsAsyncOps = true;
        dependencyParts.push(`fallback:${(_e = (_d = child.reportName) !== null && _d !== void 0 ? _d : (_b = (_a = child).toString) === null || _b === void 0 ? void 0 : _b.call(_a)) !== null && _e !== void 0 ? _e : 'stage'}:${getGraphVersion(child)}`);
        return;
    }
    dependencyParts.push(`unknown:${typeof child}:${dependencyParts.length}`);
}
function emitPipelineStages(pipeline, ops, tables, metadata, dependencyParts, depth) {
    metadata.maxStaticDepthBeforeFlatten = Math.max(metadata.maxStaticDepthBeforeFlatten, depth);
    dependencyParts.push(`pipe:${getGraphVersion(pipeline)}:${pipeline.config.stages.length}`);
    for (let i = 0; i < pipeline.config.stages.length; i++) {
        emitStage(pipeline.config.stages[i], ops, tables, metadata, dependencyParts, depth + 1);
    }
}
function compilePipelinePlan(pipeline) {
    const tables = (0, plan_1.createPlanTables)();
    const ops = [];
    const metadata = {
        artifactKind: 'in-memory-runtime-plan',
        rootKind: 'Pipeline',
        flattenedStages: 0,
        fallbackOps: 0,
        containsAsyncOps: false,
        containsParallelOps: false,
        maxStaticDepthBeforeFlatten: 0,
        sourceVersion: getGraphVersion(pipeline),
    };
    const dependencyParts = [];
    emitPipelineStages(pipeline, ops, tables, metadata, dependencyParts, 1);
    const errorExit = ops.length;
    ops.push({ op: 'RETURN' });
    return {
        version: 1,
        mode: metadata.fallbackOps > 0 ? 'compiled-hybrid' : 'compiled-static',
        entry: 0,
        errorExit,
        ops,
        tables,
        metadata,
        dependencySignature: dependencyParts.join('|'),
    };
}
function getPipelineDependencySignature(pipeline) {
    const dependencyParts = [];
    appendDependencySignature(pipeline, dependencyParts);
    return dependencyParts.join('|');
}
//# sourceMappingURL=compiler.js.map