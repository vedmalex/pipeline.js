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
exports.Pipeline = void 0;
exports.__setCompiledPipelineEnabledForTests = __setCompiledPipelineEnabledForTests;
exports.__isCompiledPipelineEnabled = __isCompiledPipelineEnabled;
exports.__getContextModeForTests = __getContextModeForTests;
const stage_1 = require("./stage");
const compiler_1 = require("./compiled/compiler");
const executor_1 = require("./compiled/executor");
const context_mode_1 = require("./context_mode");
const empty_run_1 = require("./utils/empty_run");
const run_or_execute_1 = require("./utils/run_or_execute");
const types_1 = require("./utils/types");
const types_2 = require("./utils/types");
let compiledPipelineOverride;
function __setCompiledPipelineEnabledForTests(enabled) {
    compiledPipelineOverride = enabled;
}
function getCompiledPipelineExecutionMode() {
    if (compiledPipelineOverride === true) {
        return 'force';
    }
    if (compiledPipelineOverride === false) {
        return 'off';
    }
    if (typeof process !== 'undefined') {
        if (process.env.PIPELINE_USE_COMPILED === '1') {
            return 'force';
        }
        if (process.env.PIPELINE_USE_COMPILED === '0') {
            return 'off';
        }
    }
    return 'auto';
}
function __isCompiledPipelineEnabled() {
    return getCompiledPipelineExecutionMode() !== 'off';
}
function __getContextModeForTests() {
    return (0, context_mode_1.getContextExecutionMode)();
}
class Pipeline extends stage_1.Stage {
    static setContextMode(mode) {
        (0, context_mode_1.setContextExecutionMode)(mode);
    }
    static getContextMode() {
        return (0, context_mode_1.getContextExecutionMode)();
    }
    constructor(config) {
        super();
        this._graphVersion = 0;
        this._compiledParents = new Set();
        if (config) {
            this._config = (0, types_2.getPipelinConfig)(config);
            this.registerImmediatePipelineChildren();
        }
        else {
            this._config.stages = [];
        }
    }
    get reportName() {
        return `PIPE:${this.config.name ? this.config.name : ''}`;
    }
    isPipelineStage(stage) {
        return stage instanceof Pipeline;
    }
    registerImmediatePipelineChildren() {
        for (let i = 0; i < this.config.stages.length; i++) {
            const child = this.config.stages[i];
            if (this.isPipelineStage(child)) {
                child.registerCompiledParent(this);
            }
        }
    }
    registerCompiledParent(parent) {
        if (parent !== this) {
            this._compiledParents.add(parent);
        }
    }
    invalidateCompiledCache(visited) {
        const seen = visited !== null && visited !== void 0 ? visited : new Set();
        if (seen.has(this))
            return;
        seen.add(this);
        this._graphVersion += 1;
        this.compiledPlan = undefined;
        this.compiledPlanVersion = undefined;
        this.compiledDependencySignature = undefined;
        this.run = undefined;
        this._compiledParents.forEach(parent => {
            parent.invalidateCompiledCache(seen);
        });
    }
    addStage(_stage) {
        let stage;
        if (typeof _stage === 'function') {
            stage = _stage;
        }
        else {
            if (typeof _stage === 'object') {
                if ((0, types_1.isAnyStage)(_stage)) {
                    stage = _stage;
                }
                else {
                    stage = new stage_1.Stage(_stage);
                }
            }
        }
        if (stage) {
            this.config.stages.push(stage);
            if (this.isPipelineStage(stage)) {
                stage.registerCompiledParent(this);
            }
            this.invalidateCompiledCache();
        }
    }
    toString() {
        return '[pipeline Pipeline]';
    }
    getCompiledPlan(rebuild = false) {
        const isCurrent = !rebuild &&
            this.compiledPlan !== undefined &&
            this.compiledPlanVersion === this._graphVersion;
        if (isCurrent) {
            return this.compiledPlan;
        }
        const candidate = (0, compiler_1.compilePipelinePlan)(this);
        this.compiledPlan = candidate;
        this.compiledPlanVersion = this._graphVersion;
        this.compiledDependencySignature = candidate.dependencySignature;
        return candidate;
    }
    shouldUseCompiledPlan(plan) {
        const mode = getCompiledPipelineExecutionMode();
        if (mode === 'off') {
            return false;
        }
        if (mode === 'force') {
            return true;
        }
        return true;
    }
    compile(rebuild = false) {
        const _super = Object.create(null, {
            compile: { get: () => super.compile }
        });
        if (this.config.stages.length > 0) {
            const mode = getCompiledPipelineExecutionMode();
            if (mode !== 'off') {
                try {
                    const plan = this.getCompiledPlan(rebuild);
                    if (this.shouldUseCompiledPlan(plan)) {
                        this.run = (err, context, done) => {
                            (0, executor_1.executeCompiledPlan)(plan, err, context, done);
                        };
                        return super.compile(rebuild);
                    }
                }
                catch (_error) {
                }
            }
            const runAsync = (initialErr, context) => __awaiter(this, void 0, void 0, function* () {
                let currentContext = context;
                for (let i = 0; i < this.config.stages.length; i++) {
                    const stage = this.config.stages[i];
                    yield new Promise((resolve, reject) => {
                        (0, run_or_execute_1.run_or_execute)(stage, initialErr, currentContext, (err, ctx) => {
                            if (err) {
                                reject(err);
                            }
                            else {
                                if (ctx)
                                    currentContext = ctx;
                                resolve();
                            }
                        });
                    });
                }
                return currentContext;
            });
            this.run = (err, context, done) => {
                let error = err;
                let ctx = context;
                runAsync(err, context)
                    .then(retCtx => { if (retCtx) {
                    ctx = retCtx;
                } })
                    .catch(err => { if (err)
                    error = err; })
                    .finally(() => {
                    done(error, ctx);
                });
            };
        }
        else {
            this.run = empty_run_1.empty_run;
        }
        return super.compile(rebuild);
    }
}
exports.Pipeline = Pipeline;
//# sourceMappingURL=pipeline.js.map