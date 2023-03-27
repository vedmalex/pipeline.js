"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sequential = void 0;
const stage_1 = require("./stage");
const empty_run_1 = require("./utils/empty_run");
const run_or_execute_1 = require("./utils/run_or_execute");
const types_1 = require("./utils/types/types");
class Sequential extends stage_1.Stage {
    constructor(config) {
        super();
        if (config) {
            this._config = (0, types_1.getParallelConfig)(config);
        }
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
                        return done(err);
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
                        (0, run_or_execute_1.run_or_execute)(this.config.stage, err, children[iter], next);
                    }
                };
                if (len === 0) {
                    return done(err, ctx);
                }
                else {
                    next(err);
                }
            };
            this.run = run;
        }
        else {
            this.run = empty_run_1.empty_run;
        }
        return super.compile();
    }
    split(ctx) {
        var _a;
        return this._config.split ? (_a = this._config.split(ctx)) !== null && _a !== void 0 ? _a : [ctx] : [ctx];
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
}
exports.Sequential = Sequential;
//# sourceMappingURL=sequential.js.map