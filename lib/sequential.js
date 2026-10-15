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
exports.Sequential = void 0;
const stage_1 = require("./stage");
const empty_run_1 = require("./utils/empty_run");
const run_or_execute_1 = require("./utils/run_or_execute");
const types_1 = require("./utils/types");
class Sequential extends stage_1.Stage {
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
    compile(rebuild = false) {
        const _super = Object.create(null, {
            compile: { get: () => super.compile }
        });
        if (this.config.stage) {
            const run = (initialErr, initialCtx, done) => __awaiter(this, void 0, void 0, function* () {
                try {
                    let iter = -1;
                    const children = this.split
                        ? this.split(initialCtx)
                        : [initialCtx];
                    const len = children.length;
                    if (len === 0) {
                        return done(initialErr, initialCtx);
                    }
                    let currentError = initialErr;
                    let currentChildren = [];
                    currentChildren.length = len;
                    currentChildren.fill(undefined);
                    while (++iter < len) {
                        if (currentError)
                            break;
                        const iterSnapshot = iter;
                        currentChildren[iter] = yield new Promise((resolve, reject) => {
                            (0, run_or_execute_1.run_or_execute)(this.config.stage, currentError, children[iterSnapshot], (err, ctx) => {
                                if (err) {
                                    reject(new Error('sequential - error', {
                                        cause: {
                                            err,
                                            iteration: iterSnapshot,
                                            stage: this.config.stage,
                                            ctx: children[iterSnapshot]
                                        },
                                    }));
                                }
                                else if (ctx) {
                                    resolve(ctx);
                                }
                            });
                        });
                    }
                    if (currentError) {
                        done(currentError);
                    }
                    else {
                        const result = this.combine(initialCtx, currentChildren);
                        done(undefined, result);
                    }
                }
                catch (err) {
                    done(err);
                }
            });
            this.run = run;
        }
        else {
            this.run = empty_run_1.empty_run;
        }
        return super.compile();
    }
}
exports.Sequential = Sequential;
//# sourceMappingURL=sequential.js.map