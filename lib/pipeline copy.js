"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Pipeline = void 0;
const run_or_execute_1 = require("./utils/run_or_execute");
const stage_1 = require("./stage");
const empty_run_1 = require("./utils/empty_run");
const types_1 = require("./utils/types");
class Pipeline extends stage_1.Stage {
    constructor(config) {
        super();
        if (config) {
            this._config = types_1.getPipelinConfig(config);
        }
        else {
            this._config.stages = [];
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
                if (_stage instanceof stage_1.Stage) {
                    stage = _stage;
                }
                else {
                    stage = new stage_1.Stage(_stage);
                }
            }
        }
        if (stage) {
            this.config.stages.push(stage);
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
                if (i < this.config.stages.length) {
                    run_or_execute_1.run_or_execute(this.config.stages[i], err, ctx !== null && ctx !== void 0 ? ctx : context, next);
                }
                else if (i == this.config.stages.length) {
                    done(err, ctx !== null && ctx !== void 0 ? ctx : context);
                }
                else {
                    done(new Error('done call more than once'), ctx !== null && ctx !== void 0 ? ctx : context);
                }
            };
            next(err, context);
        };
        if (this.config.stages.length > 0) {
            this.run = run;
        }
        else {
            this.run = empty_run_1.empty_run;
        }
        return super.compile(rebuild);
    }
}
exports.Pipeline = Pipeline;
//# sourceMappingURL=pipeline%20copy.js.map