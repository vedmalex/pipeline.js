"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StageError = exports.Sequential = void 0;
const types_1 = require("./utils/types");
const stage_1 = require("./stage");
const run_or_execute_1 = require("./utils/run_or_execute");
const empty_run_1 = require("./utils/empty_run");
class Sequential extends stage_1.Stage {
    constructor(config) {
        super();
        if (config) {
            this._config = types_1.getParallelConfig(config);
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
        var _a, _b, _c;
        return (_c = (_a = this._config.name) !== null && _a !== void 0 ? _a : (_b = this._config.stage) === null || _b === void 0 ? void 0 : _b.name) !== null && _c !== void 0 ? _c : '';
    }
    compile(rebuild = false) {
        if (this.config.stage) {
            var run = (err, ctx, done) => {
                var iter = -1;
                var children = this.split ? this.split(ctx) : [ctx];
                var len = children ? children.length : 0;
                var next = (err, retCtx) => {
                    if (err) {
                        return done(new StageError({
                            name: 'Sequential stage Error',
                            stage: this.name,
                            index: iter,
                            err: err,
                            ctx: children[iter],
                        }));
                    }
                    if (retCtx) {
                        children[iter] = retCtx;
                    }
                    iter += 1;
                    if (iter >= len) {
                        let result = this.combine(ctx, children);
                        return done(undefined, result);
                    }
                    else {
                        run_or_execute_1.run_or_execute(this.config.stage, err, children[iter], next);
                    }
                };
                if (len === 0) {
                    return done(err, ctx);
                }
                else {
                    next(err, ctx);
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
exports.Sequential = Sequential;
class StageError extends Error {
    constructor(err) {
        super(err.name);
        this.info = err;
    }
}
exports.StageError = StageError;
//# sourceMappingURL=sequential.js.map