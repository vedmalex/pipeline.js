"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Wrap = void 0;
const stage_1 = require("./stage");
const run_or_execute_1 = require("./utils/run_or_execute");
const types_1 = require("./utils/types/types");
class Wrap extends stage_1.Stage {
    constructor(config) {
        super();
        if (config) {
            this._config = (0, types_1.getWrapConfig)(config);
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
                (0, run_or_execute_1.run_or_execute)(this.config.stage, err, ctx, (err, retCtx) => {
                    if (!err) {
                        const result = this.finalize(context, retCtx !== null && retCtx !== void 0 ? retCtx : ctx);
                        done(undefined, (result !== null && result !== void 0 ? result : context));
                    }
                    else {
                        done(err, context);
                    }
                });
            }
        };
        this.run = run;
        return super.compile(rebuild);
    }
    prepare(ctx) {
        var _a;
        if (this.config.prepare) {
            return (_a = this.config.prepare(ctx)) !== null && _a !== void 0 ? _a : ctx;
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
            return ctx;
        }
    }
}
exports.Wrap = Wrap;
//# sourceMappingURL=wrap.js.map