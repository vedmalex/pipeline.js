"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParallelError = exports.Parallel = void 0;
const stage_1 = require("./stage");
const empty_run_1 = require("./utils/empty_run");
const ErrorList_1 = require("./utils/ErrorList");
const run_or_execute_1 = require("./utils/run_or_execute");
const types_1 = require("./utils/types/types");
class Parallel extends stage_1.Stage {
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
                var iter = 0;
                var children = this.split(ctx);
                var len = children ? children.length : 0;
                let errors;
                let hasError = false;
                var next = (index) => {
                    return (err, retCtx) => {
                        if (!err) {
                            children[index] = retCtx !== null && retCtx !== void 0 ? retCtx : children[index];
                        }
                        else {
                            if (!hasError) {
                                hasError = true;
                                errors = [];
                            }
                            const error = new ParallelError({
                                stage: this.name,
                                index: index,
                                err: err,
                                ctx: children[index],
                            });
                            if (error)
                                errors.push(error);
                        }
                        iter += 1;
                        if (iter >= len) {
                            if (!hasError) {
                                let result = this.combine(ctx, children);
                                return done(undefined, result);
                            }
                            else {
                                return done((0, ErrorList_1.CreateError)(errors), ctx);
                            }
                        }
                    };
                };
                if (len === 0) {
                    return done(err, ctx);
                }
                else {
                    for (var i = 0; i < len; i++) {
                        (0, run_or_execute_1.run_or_execute)(this.config.stage, err, children[i], next(i));
                    }
                }
            };
            this.run = run;
        }
        else {
            this.run = empty_run_1.empty_run;
        }
        return super.compile(rebuild);
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
}
exports.Parallel = Parallel;
class ParallelError extends Error {
    constructor(init) {
        super();
        this.name = 'ParallerStageError';
        this.stage = init.stage;
        this.ctx = init.ctx;
        this.err = init.err;
        this.index = init.index;
    }
    toString() {
        return `${this.name}: at stage ${this.stage} error occured:
    iteration ${this.index}
    ${this.err}`;
    }
}
exports.ParallelError = ParallelError;
//# sourceMappingURL=parallel.js.map