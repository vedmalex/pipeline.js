"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetryOnError = void 0;
const stage_1 = require("../../stage");
const getRetryOnErrorConfig_1 = require("./getRetryOnErrorConfig");
class RetryOnError extends stage_1.Stage {
    constructor(config) {
        super();
        if (config) {
            this._config = (0, getRetryOnErrorConfig_1.getRetryOnErrorConfig)(config);
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
            if (stage_1.Context.isContext(ctx)) {
                return ctx.fork({});
            }
            else {
                return ctx;
            }
        }
    }
    restoreContext(ctx, backup) {
        if (this.config.restore) {
            return this.config.restore(ctx, backup);
        }
        else {
            if (stage_1.Context.isContext(ctx) && typeof backup === 'object' && backup !== null) {
                for (let key in backup) {
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
        let run = (err, ctx, done) => {
            let backup = this.backupContext(ctx);
            const reachEnd = (err, iter) => {
                var _a;
                if (err) {
                    if (this.config.retry instanceof Function) {
                        return !this.config.retry(err, ctx, iter);
                    }
                    else {
                        return iter > ((_a = this.config.retry) !== null && _a !== void 0 ? _a : 1);
                    }
                }
                else {
                    return true;
                }
            };
            let iter = -1;
            let next = (err, _ctx) => {
                iter++;
                if (reachEnd(err, iter)) {
                    return done(err, (_ctx !== null && _ctx !== void 0 ? _ctx : ctx));
                }
                else {
                    const res = this.restoreContext(_ctx !== null && _ctx !== void 0 ? _ctx : ctx, backup);
                    (0, stage_1.run_or_execute)(this.config.stage, err, res !== null && res !== void 0 ? res : ctx, next);
                }
            };
            (0, stage_1.run_or_execute)(this.config.stage, err, ctx, next);
        };
        this.run = run;
        return super.compile(rebuild);
    }
}
exports.RetryOnError = RetryOnError;
//# sourceMappingURL=retryonerror.js.map