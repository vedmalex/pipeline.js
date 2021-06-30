"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Pipeline = void 0;
const ErrorList_1 = require("./utils/ErrorList");
const run_or_execute_1 = require("./utils/run_or_execute");
const stage_1 = require("./stage");
const empty_run_1 = require("./utils/empty_run");
const types_1 = require("./utils/types");
class Pipeline extends stage_1.Stage {
    constructor(config) {
        let stages = [];
        if (typeof config == 'object') {
            if (config instanceof stage_1.Stage) {
                stages.push(config);
                super();
            }
            else {
                if (config.run instanceof Function) {
                    stages.push(config.run);
                    delete config.run;
                }
                if (Array.isArray(config.stages)) {
                    stages.push(...config.stages);
                }
                if (config instanceof Array) {
                    stages.push.apply(stages, config);
                }
                super(config);
            }
            this.stages = [];
            for (let i = 0; i < stages.length; i++) {
                this.addStage(stages[i]);
            }
        }
        else if (typeof config == 'string') {
            super(config);
            this.stages = [];
        }
        else if (config) {
            throw ErrorList_1.CreateError('wrong arguments check documentation');
        }
        else {
            super();
            this.stages = [];
        }
    }
    get reportName() {
        return `PIPE:${this.config.name ? this.config.name : ''}`;
    }
    addStage(_stage) {
        let stage;
        if (typeof _stage === 'function') {
            stage = _stage;
        }
        else {
            if (typeof _stage === 'object') {
                if (!types_1.isIStage(_stage)) {
                    stage = new stage_1.Stage(_stage);
                }
                else {
                    stage = _stage;
                }
            }
        }
        if (stage) {
            this.stages.push(stage);
            this.run = undefined;
        }
    }
    toString() {
        return '[pipeline Pipeline]';
    }
    compile(rebuild = false) {
        let run = (err, context, done) => {
            let i = -1;
            let next = (err, ctx) => {
                i += 1;
                if (i < this.stages.length) {
                    run_or_execute_1.run_or_execute(this.stages[i], err, ctx !== null && ctx !== void 0 ? ctx : context, next);
                }
                else if (i == this.stages.length) {
                    done(err, ctx !== null && ctx !== void 0 ? ctx : context);
                }
                else {
                    done(new Error('done call more than once'), ctx !== null && ctx !== void 0 ? ctx : context);
                }
            };
            next(err, context);
        };
        if (this.stages.length > 0) {
            this.run = run;
        }
        else {
            this.run = empty_run_1.empty_run;
        }
        return super.compile(rebuild);
    }
}
exports.Pipeline = Pipeline;
//# sourceMappingURL=pipeline.js.map