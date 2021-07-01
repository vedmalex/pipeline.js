"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Wrap = void 0;
const stage_1 = require("./stage");
const types_1 = require("./utils/types");
const run_or_execute_1 = require("./utils/run_or_execute");
class Wrap extends stage_1.Stage {
    constructor(config) {
        super();
        if (config) {
            this._config = types_1.getWrapConfig(config);
        }
    }
    get reportName() {
        return `Wrap:${this.config.name ? this.config.name : ''}`;
    }
    toString() {
        return '[pipeline Wrap]';
    }
    compile(rebuild = false) {
        let run = (err, context, done) => {
            const ctx = this.prepare(context);
            if (this.config.stage) {
                run_or_execute_1.run_or_execute(this.config.stage, err, ctx !== null && ctx !== void 0 ? ctx : context, (err, retCtx) => {
                    if (!err) {
                        const result = this.finalize(ctx, retCtx);
                        done(undefined, result);
                    }
                    else {
                        done(err, ctx);
                    }
                });
            }
        };
        this.run = run;
        return super.compile(rebuild);
    }
    prepare(ctx) {
        if (this.config.prepare) {
            return this.config.prepare(ctx);
        }
        else {
            return ctx;
        }
    }
    finalize(ctx, retCtx) {
        if (this.config.finalize) {
            return this.config.finalize(ctx, retCtx);
        }
        else {
            return retCtx !== null && retCtx !== void 0 ? retCtx : ctx;
        }
    }
}
exports.Wrap = Wrap;
//# sourceMappingURL=wrap.js.map