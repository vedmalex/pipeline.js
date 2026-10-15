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
exports.RetryOnError = void 0;
exports.getRetryOnErrorConfig = getRetryOnErrorConfig;
const context_1 = require("./context");
const stage_1 = require("./stage");
const TypeDetectors_1 = require("./utils/TypeDetectors");
const ErrorList_1 = require("./utils/ErrorList");
const context_snapshot_1 = require("./utils/context_snapshot");
const run_or_execute_1 = require("./utils/run_or_execute");
const types_1 = require("./utils/types");
const types_2 = require("./utils/types");
function getRetryOnErrorConfig(config) {
    const res = (0, types_1.getStageConfig)(config);
    if ((0, types_2.isAnyStage)(res)) {
        return { stage: res };
    }
    else if (typeof config == 'object' && !(0, types_2.isAnyStage)(config)) {
        if (config.run && config.stage) {
            throw (0, ErrorList_1.createError)("don't use run and stage both");
        }
        if (config.run) {
            res.stage = config.run;
        }
        if (config.stage) {
            res.stage = config.stage;
        }
        if (config.backup) {
            res.backup = config.backup;
        }
        if (config.restore) {
            res.restore = config.restore;
        }
        if (config.retry) {
            if (typeof config.retry !== 'function') {
                config.retry *= 1;
            }
            res.retry = config.retry;
        }
        if (!res.retry)
            res.retry = 1;
    }
    else if (typeof config == 'function' && res.run) {
        res.stage = res.run;
        delete res.run;
    }
    return res;
}
class RetryOnError extends stage_1.Stage {
    constructor(config) {
        super();
        if (config) {
            this._config = getRetryOnErrorConfig(config);
        }
    }
    get reportName() {
        return `Templ:${this.config.name ? this.config.name : ''}`;
    }
    toString() {
        return '[pipeline RetryOnError]';
    }
    backupContext(ctx) {
        if (this.config.backup) {
            return this.config.backup(ctx);
        }
        else {
            if (context_1.Context.isContext(ctx)) {
                return ctx.fork({});
            }
            else {
                return (0, context_snapshot_1.createIsolatedStageContext)(ctx);
            }
        }
    }
    restoreContext(ctx, backup) {
        if (this.config.restore) {
            const res = this.config.restore(ctx, backup);
            return res !== null && res !== void 0 ? res : ctx;
        }
        else {
            if (context_1.Context.isContext(ctx)) {
                for (let key in backup) {
                    ;
                    ctx[key] = backup[key];
                }
                return ctx;
            }
            else {
                return backup;
            }
        }
    }
    compile(rebuild = false) {
        const _super = Object.create(null, {
            compile: { get: () => super.compile }
        });
        let run = (initialErr, initialCtx, done) => __awaiter(this, void 0, void 0, function* () {
            let currentError = initialErr;
            let currentCtx = initialCtx;
            let iter = -1;
            const backup = this.backupContext(initialCtx);
            try {
                const reachEnd = (err, iteration) => {
                    if (err) {
                        if ((0, TypeDetectors_1.isFunction)(this.config.retry)) {
                            return !this.config.retry(err, currentCtx, iteration);
                        }
                        else {
                            return iteration > this.config.retry;
                        }
                    }
                    return true;
                };
                do {
                    iter++;
                    if (iter > 0)
                        currentCtx = this.restoreContext(currentCtx, backup);
                    yield new Promise(resolve => {
                        (0, run_or_execute_1.run_or_execute)(this.config.stage, currentError, currentCtx, (err, ctx) => {
                            if (err) {
                                currentError = err;
                            }
                            else {
                                currentCtx = (ctx !== null && ctx !== void 0 ? ctx : currentCtx);
                                currentError = undefined;
                            }
                            resolve();
                        });
                    });
                } while (!reachEnd(currentError, iter));
                done(currentError, currentCtx);
            }
            catch (err) {
                currentCtx = this.restoreContext(currentCtx, backup);
                done(err, initialCtx);
            }
        });
        this.run = run;
        return super.compile(rebuild);
    }
}
exports.RetryOnError = RetryOnError;
//# sourceMappingURL=retryonerror.js.map