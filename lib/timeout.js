"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Timeout = void 0;
const stage_1 = require("./stage");
const execution_signal_1 = require("./execution_signal");
const ErrorList_1 = require("./utils/ErrorList");
const context_snapshot_1 = require("./utils/context_snapshot");
const TypeDetectors_1 = require("./utils/TypeDetectors");
const errors_1 = require("./utils/errors");
const run_or_execute_1 = require("./utils/run_or_execute");
const types_1 = require("./utils/types");
class Timeout extends stage_1.Stage {
    constructor(config) {
        super();
        if (config) {
            this._config = (0, types_1.getTimeoutConfig)(config);
        }
    }
    get reportName() {
        return `Templ:${this.config.name ? this.config.name : ''}`;
    }
    toString() {
        return '[pipeline Timeout]';
    }
    compile(rebuild = false) {
        let run = (err, ctx, done) => {
            var _a;
            let to = null;
            let isDone = false;
            let linkedController = null;
            const finish = ((runErr, retCtx) => {
                if (isDone)
                    return;
                isDone = true;
                if (to)
                    clearTimeout(to);
                to = null;
                linkedController === null || linkedController === void 0 ? void 0 : linkedController.cleanup();
                return done(runErr, retCtx);
            });
            const waitFor = (0, TypeDetectors_1.isFunction)(this.config.timeout)
                ? this.config.timeout(ctx)
                : this.config.timeout;
            const parentSignal = (0, execution_signal_1.getExecutionSignal)(ctx);
            linkedController = this.config.stage && waitFor
                ? (0, execution_signal_1.createLinkedAbortController)(parentSignal)
                : null;
            const controller = (_a = linkedController === null || linkedController === void 0 ? void 0 : linkedController.controller) !== null && _a !== void 0 ? _a : null;
            if (waitFor) {
                to = setTimeout(() => {
                    const timeoutRef = to;
                    to = null;
                    if (controller && !controller.signal.aborted) {
                        controller.abort((0, ErrorList_1.createCodeError)(errors_1.ErrorCode.ERR_STAGE_TIMEOUT));
                    }
                    if (timeoutRef && this.config.overdue) {
                        (0, run_or_execute_1.run_or_execute)(this.config.overdue, err, ctx, finish);
                    }
                    else {
                        if (!isDone) {
                            finish(null, ctx);
                        }
                    }
                }, waitFor);
                if (this.config.stage) {
                    const isolatedCtx = (0, context_snapshot_1.createIsolatedStageContext)(ctx);
                    try {
                        (0, run_or_execute_1.run_or_execute)(this.config.stage, err, isolatedCtx, ((innerErr, retCtx) => {
                            if (isDone) {
                                return;
                            }
                            if (innerErr) {
                                finish(innerErr, ctx);
                            }
                            else {
                                finish(undefined, (0, context_snapshot_1.commitIsolatedStageContext)(ctx, (retCtx !== null && retCtx !== void 0 ? retCtx : isolatedCtx)));
                            }
                        }), controller === null || controller === void 0 ? void 0 : controller.signal);
                    }
                    catch (error) {
                        if (to)
                            clearTimeout(to);
                        to = null;
                        finish(error, ctx);
                    }
                }
            }
            else if (this.config.stage) {
                (0, run_or_execute_1.run_or_execute)(this.config.stage, err, ctx, done);
            }
            else {
                finish(null, ctx);
            }
        };
        this.run = run;
        return super.compile(rebuild);
    }
}
exports.Timeout = Timeout;
//# sourceMappingURL=timeout.js.map