"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IfElse = void 0;
const stage_1 = require("./stage");
const execute_validate_1 = require("./utils/execute_validate");
const run_or_execute_1 = require("./utils/run_or_execute");
const types_1 = require("./utils/types");
class IfElse extends stage_1.Stage {
    constructor(config) {
        super();
        if (config) {
            this._config = (0, types_1.getIfElseConfig)(config);
        }
    }
    get reportName() {
        return `Templ:${this.config.name ? this.config.name : ''}`;
    }
    toString() {
        return '[pipeline IfElse]';
    }
    compile(rebuild = false) {
        let run = (err, context, done) => {
            if (typeof this.config.condition == 'function') {
                (0, execute_validate_1.execute_validate)(this.config.condition, context, (err, condition) => {
                    if (condition) {
                        if (this.config.success) {
                            (0, run_or_execute_1.run_or_execute)(this.config.success, err, context, done);
                        }
                    }
                    else {
                        if (this.config.failed) {
                            (0, run_or_execute_1.run_or_execute)(this.config.failed, err, context, done);
                        }
                    }
                });
            }
            else if (typeof this.config.condition == 'boolean') {
                if (this.config.condition) {
                    if (this.config.success) {
                        (0, run_or_execute_1.run_or_execute)(this.config.success, err, context, done);
                    }
                }
                else {
                    if (this.config.failed) {
                        (0, run_or_execute_1.run_or_execute)(this.config.failed, err, context, done);
                    }
                }
            }
            else {
                if (this.config.success) {
                    (0, run_or_execute_1.run_or_execute)(this.config.success, err, context, done);
                }
                else if (this.config.failed) {
                    (0, run_or_execute_1.run_or_execute)(this.config.failed, err, context, done);
                }
                else {
                    done(err, context);
                }
            }
        };
        this.run = run;
        return super.compile(rebuild);
    }
}
exports.IfElse = IfElse;
//# sourceMappingURL=ifelse.js.map