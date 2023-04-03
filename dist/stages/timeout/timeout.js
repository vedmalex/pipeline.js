"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Timeout = void 0;
const stage_1 = require("../../stage");
const getTimeoutConfig_1 = require("./getTimeoutConfig");
class Timeout extends stage_1.Stage {
    constructor(config) {
        super();
        if (config) {
            this._config = (0, getTimeoutConfig_1.getTimeoutConfig)(config);
        }
    }
    get reportName() {
        return `Templ:${this.config.name ? this.config.name : ''}`;
    }
    toString() {
        return '[pipeline Timeout]';
    }
    compile(rebuild = false) {
        let run = (err, ctx, done) => {
            let to;
            let localDone = (err, retCtx) => {
                if (to) {
                    clearTimeout(to);
                    to = null;
                    return done(err, retCtx);
                }
            };
            let waitFor;
            if (this.config.timeout instanceof Function) {
                waitFor = this.config.timeout(ctx);
            }
            else {
                waitFor = this.config.timeout;
            }
            if (waitFor) {
                to = setTimeout(() => {
                    if (to) {
                        if (this.config.overdue) {
                            (0, stage_1.run_or_execute)(this.config.overdue, err, ctx, localDone);
                        }
                    }
                }, waitFor);
                if (this.config.stage) {
                    (0, stage_1.run_or_execute)(this.config.stage, err, ctx, localDone);
                }
            }
            else {
                if (this.config.stage) {
                    (0, stage_1.run_or_execute)(this.config.stage, err, ctx, done);
                }
            }
        };
        this.run = run;
        return super.compile(rebuild);
    }
}
exports.Timeout = Timeout;
//# sourceMappingURL=timeout.js.map