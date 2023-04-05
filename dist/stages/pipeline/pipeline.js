"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Pipeline = void 0;
const stage_1 = require("../../stage");
const getPipelineConfig_1 = require("./getPipelineConfig");
class Pipeline extends stage_1.Stage {
    constructor(config) {
        super();
        if (config) {
            this._config = (0, getPipelineConfig_1.getPipelineConfig)(config);
        }
        else {
            this._config.stages = [];
        }
    }
    get reportName() {
        return `PIPE:${this.config.name ? this.config.name : ''}`;
    }
    toString() {
        return '[pipeline Pipeline]';
    }
    addStage(_stage) {
        let stage;
        if (typeof _stage === 'function') {
            stage = _stage;
        }
        else {
            if (typeof _stage === 'object' && _stage !== null) {
                if ((0, stage_1.isAnyStage)(_stage)) {
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
    compile(rebuild = false) {
        let run = (err, context, done) => {
            let i = -1;
            let next = async (err, ctx) => {
                if (err) {
                    return done(err);
                }
                while (++i < this.config.stages.length) {
                    ;
                    [err, ctx] = await (0, stage_1.run_or_execute_async)(this.config.stages[i], err, ctx !== null && ctx !== void 0 ? ctx : context);
                    if (err) {
                        ;
                        [err, ctx] = await this.rescue_async(err, ctx);
                        if (err) {
                            return done(err);
                        }
                    }
                }
                done(undefined, ctx);
            };
            if (this.config.stages.length === 0) {
                done(undefined, context);
            }
            else {
                next(err, context);
            }
        };
        if (this.config.stages.length > 0) {
            this.run = run;
        }
        else {
            this.run = stage_1.empty_run;
        }
        return super.compile(rebuild);
    }
}
exports.Pipeline = Pipeline;
//# sourceMappingURL=Pipeline.js.map