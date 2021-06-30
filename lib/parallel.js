"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StageError = exports.Parallel = void 0;
const stage_1 = require("./stage");
const ErrorList_1 = require("./utils/ErrorList");
const run_or_execute_1 = require("./utils/run_or_execute");
const empty_run_1 = require("./utils/empty_run");
class Parallel extends stage_1.Stage {
    constructor(_config) {
        let config = {};
        if (_config instanceof stage_1.Stage) {
            super();
            this.config.stage = _config;
        }
        else if (typeof _config == 'object') {
            if (config.run && config.stage) {
                throw ErrorList_1.CreateError('use or run or stage, not both');
            }
            if (_config === null || _config === void 0 ? void 0 : _config.run) {
                config.stage = new stage_1.Stage(_config.run);
                delete _config.run;
            }
            else if (_config === null || _config === void 0 ? void 0 : _config.stage) {
                config.stage = _config.stage;
            }
            if (_config.split) {
                config.split = _config.split;
                delete _config.split;
            }
            if (_config.combine) {
                config.combine = _config.combine;
                delete _config.combine;
            }
            super(_config);
            this._config = { ...this._config, ...config };
        }
        else {
            super();
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
                            errors.push(new StageError({
                                name: 'Parallel stage Error',
                                stage: this.name,
                                index: index,
                                err: err,
                                ctx: children[index],
                            }));
                        }
                        if (++iter >= len) {
                            if (!hasError) {
                                let result = this.combine(ctx, children);
                                return done(undefined, result);
                            }
                            else {
                                return done(ErrorList_1.CreateError(errors), ctx);
                            }
                        }
                    };
                };
                if (len === 0) {
                    return done(err, ctx);
                }
                else {
                    for (var i = 0; i < len; i++) {
                        run_or_execute_1.run_or_execute(this.config.stage, err, children[i], next(i));
                    }
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
class StageError extends Error {
    constructor(err) {
        super(err.name);
        this.info = err;
    }
}
exports.StageError = StageError;
//# sourceMappingURL=parallel.js.map