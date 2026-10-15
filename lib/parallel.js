"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParallelError = exports.Parallel = void 0;
exports.normalizeParallelConcurrency = normalizeParallelConcurrency;
exports.normalizeParallelJoin = normalizeParallelJoin;
exports.normalizeParallelQuorum = normalizeParallelQuorum;
exports.normalizeParallelTrailing = normalizeParallelTrailing;
exports.normalizeParallelTrailingTimeout = normalizeParallelTrailingTimeout;
exports.resolveParallelSuccessTarget = resolveParallelSuccessTarget;
const stage_1 = require("./stage");
const execution_signal_1 = require("./execution_signal");
const empty_run_1 = require("./utils/empty_run");
const ErrorList_1 = require("./utils/ErrorList");
const errors_1 = require("./utils/errors");
const run_or_execute_1 = require("./utils/run_or_execute");
const types_1 = require("./utils/types");
class Parallel extends stage_1.Stage {
    constructor(config) {
        super();
        if (config) {
            this._config = (0, types_1.getParallelConfig)(config);
        }
    }
    split(ctx) {
        return this._config.split ? this._config.split(ctx) : [ctx];
    }
    combine(ctx, children) {
        let res;
        if (this.config.combine) {
            let c = this.config.combine(ctx, children);
            res = c !== null && c !== void 0 ? c : ctx;
        }
        else {
            res = ctx;
        }
        return res;
    }
    get reportName() {
        return `PLL:${this.config.name ? this.config.name : ''}`;
    }
    toString() {
        return '[pipeline Pipeline]';
    }
    get name() {
        var _a;
        var _b, _c;
        return (_c = (_b = this._config.name) !== null && _b !== void 0 ? _b : (_a = this._config.stage) === null || _a === void 0 ? void 0 : _a.name) !== null && _c !== void 0 ? _c : '';
    }
    get concurrency() {
        return normalizeParallelConcurrency(this._config.concurrency);
    }
    get join() {
        return normalizeParallelJoin(this._config.join);
    }
    get quorum() {
        return normalizeParallelQuorum(this._config.quorum);
    }
    get trailing() {
        return normalizeParallelTrailing(this.join, this._config.trailing);
    }
    get trailingTimeout() {
        return normalizeParallelTrailingTimeout(this._config.trailingTimeout);
    }
    compile(rebuild = false) {
        if (this.config.stage) {
            const run = (initialErr, initialCtx, done) => {
                var _a;
                const children = this.split(initialCtx);
                const len = children ? children.length : 0;
                if (len === 0) {
                    return done(initialErr, initialCtx);
                }
                try {
                    const errors = [];
                    const controllers = new Array(children.length).fill(null);
                    const successfulChildren = new Array(children.length);
                    const join = this.join;
                    const trailing = this.trailing;
                    const trailingTimeout = this.trailingTimeout;
                    const concurrency = Math.min((_a = this.concurrency) !== null && _a !== void 0 ? _a : children.length, children.length);
                    const successTarget = resolveParallelSuccessTarget(join, this.quorum, children.length);
                    let nextIndex = 0;
                    let active = 0;
                    let pending = children.length;
                    let successCount = 0;
                    let thresholdMet = false;
                    let settled = false;
                    let drainTimer = null;
                    const clearDrainTimer = () => {
                        if (drainTimer) {
                            clearTimeout(drainTimer);
                            drainTimer = null;
                        }
                    };
                    const abortActiveChildren = () => {
                        for (let i = 0; i < controllers.length; i++) {
                            const controller = controllers[i];
                            if (controller && !controller.signal.aborted) {
                                controller.abort((0, ErrorList_1.createCodeError)(errors_1.ErrorCode.ERR_STAGE_ABORTED));
                            }
                            controllers[i] = null;
                        }
                    };
                    const finishSuccess = (resultChildren) => {
                        if (settled) {
                            return;
                        }
                        settled = true;
                        clearDrainTimer();
                        if (join !== 'all') {
                            abortActiveChildren();
                        }
                        try {
                            done(undefined, this.combine(initialCtx, resultChildren));
                        }
                        catch (err) {
                            done(err, initialCtx);
                        }
                    };
                    const finishError = () => {
                        if (settled) {
                            return;
                        }
                        settled = true;
                        clearDrainTimer();
                        done((0, ErrorList_1.createError)(errors), initialCtx);
                    };
                    const collectSuccessfulChildren = () => successfulChildren.filter((child) => child !== undefined);
                    const startDrainTimer = () => {
                        if (settled ||
                            drainTimer ||
                            trailing !== 'drain-active' ||
                            trailingTimeout === undefined) {
                            return;
                        }
                        drainTimer = setTimeout(() => {
                            drainTimer = null;
                            finishSuccess(join === 'all' ? children : collectSuccessfulChildren());
                        }, trailingTimeout);
                    };
                    const onChildSettled = (index, child, err, retCtx) => {
                        controllers[index] = null;
                        if (settled) {
                            return;
                        }
                        active -= 1;
                        pending -= 1;
                        if (err) {
                            errors.push(new Error('parallel - error', {
                                cause: {
                                    stage: this.name,
                                    index,
                                    err,
                                    ctx: child,
                                },
                            }));
                        }
                        else {
                            children[index] = (retCtx !== null && retCtx !== void 0 ? retCtx : child);
                            if (successfulChildren[index] === undefined) {
                                successfulChildren[index] = children[index];
                                successCount += 1;
                            }
                            if (successCount >= successTarget) {
                                thresholdMet = true;
                                if (trailing === 'ignore') {
                                    finishSuccess(join === 'all' ? children : collectSuccessfulChildren());
                                    return;
                                }
                                startDrainTimer();
                                if (active === 0) {
                                    finishSuccess(join === 'all' ? children : collectSuccessfulChildren());
                                    return;
                                }
                                return;
                            }
                        }
                        if (thresholdMet && trailing === 'drain-active') {
                            if (active === 0) {
                                finishSuccess(join === 'all' ? children : collectSuccessfulChildren());
                            }
                            return;
                        }
                        if (pending === 0) {
                            if (successCount < successTarget) {
                                finishError();
                            }
                            else {
                                finishSuccess(join === 'all' ? children : collectSuccessfulChildren());
                            }
                            return;
                        }
                        drain();
                    };
                    const launchChild = (index) => {
                        const child = children[index];
                        const linkedController = (0, execution_signal_1.createLinkedAbortController)((0, execution_signal_1.getExecutionSignal)(initialCtx));
                        const controller = linkedController.controller;
                        let sync = true;
                        let settledSync = false;
                        let syncErr;
                        let syncCtx;
                        active += 1;
                        controllers[index] = controller;
                        (0, run_or_execute_1.run_or_execute)(this.config.stage, initialErr, child, (err, retCtx) => {
                            linkedController.cleanup();
                            if (sync) {
                                settledSync = true;
                                syncErr = err;
                                syncCtx = retCtx;
                                return;
                            }
                            onChildSettled(index, child, err, retCtx);
                        }, controller.signal);
                        sync = false;
                        if (settledSync) {
                            onChildSettled(index, child, syncErr, syncCtx);
                        }
                    };
                    const drain = () => {
                        while (!settled &&
                            !(thresholdMet && trailing === 'drain-active') &&
                            active < concurrency &&
                            nextIndex < children.length) {
                            const index = nextIndex;
                            nextIndex += 1;
                            launchChild(index);
                        }
                    };
                    drain();
                }
                catch (err) {
                    done(err, initialCtx);
                }
            };
            this.run = run;
        }
        else {
            this.run = empty_run_1.empty_run;
        }
        return super.compile();
    }
}
exports.Parallel = Parallel;
class ParallelError extends Error {
    constructor(init) {
        super(init.err.message);
        this.name = 'ParallerStageError';
        this.stage = init.stage;
        this.ctx = init.ctx;
        this.err = init.err;
        this.index = init.index;
    }
    toString() {
        return `${this.name}: at stage ${this.stage} error occured:
    iteration ${this.index}
    ${this.err.message}
    stack is: ${this.err.stack}`;
    }
}
exports.ParallelError = ParallelError;
function normalizeParallelConcurrency(concurrency) {
    if (typeof concurrency !== 'number' || !Number.isFinite(concurrency)) {
        return undefined;
    }
    return Math.max(1, Math.floor(concurrency));
}
function normalizeParallelJoin(join) {
    return join === 'any' || join === 'quorum' ? join : 'all';
}
function normalizeParallelQuorum(quorum) {
    if (typeof quorum !== 'number' || !Number.isFinite(quorum)) {
        return undefined;
    }
    return Math.max(1, Math.floor(quorum));
}
function normalizeParallelTrailing(join, trailing) {
    if (join === 'all') {
        return 'ignore';
    }
    return trailing === 'drain-active' ? 'drain-active' : 'ignore';
}
function normalizeParallelTrailingTimeout(trailingTimeout) {
    if (typeof trailingTimeout !== 'number' || !Number.isFinite(trailingTimeout)) {
        return undefined;
    }
    return trailingTimeout > 0 ? trailingTimeout : undefined;
}
function resolveParallelSuccessTarget(join, quorum, childCount) {
    if (join === 'any') {
        return 1;
    }
    if (join === 'quorum') {
        return Math.min(quorum !== null && quorum !== void 0 ? quorum : childCount, childCount);
    }
    return childCount;
}
//# sourceMappingURL=parallel.js.map