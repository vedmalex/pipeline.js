"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DoWhile = void 0;
const stage_1 = require("./stage");
const run_or_execute_1 = require("./utils/run_or_execute");
const types_1 = require("./utils/types");
class DoWhile extends stage_1.Stage {
    constructor(config) {
        super();
        if (config) {
            this._config = (0, types_1.getDoWhileConfig)(config);
        }
    }
    get reportName() {
        return `WHI:${this.config.name ? this.config.name : ''}`;
    }
    toString() {
        return '[pipeline DoWhile]';
    }
    reachEnd(err, ctx, iter) {
        if (this.config.reachEnd) {
            let result = this.config.reachEnd(err, ctx, iter);
            if (typeof result === 'boolean') {
                return result;
            }
            else {
                return Boolean(result);
            }
        }
        else
            return true;
    }
    split(ctx, iter) {
        if (this.config.split) {
            return this.config.split(ctx, iter);
        }
        else
            return ctx;
    }
    compile(rebuild = false) {
        let run = async (err, context, done) => {
            let iter = -1;
            const next = async (err) => {
                iter++;
                let retCtx;
                while (!this.reachEnd(err, context, iter)) {
                    ;
                    [err, retCtx] = await (0, run_or_execute_1.run_or_execute_async)(this.config.stage, err, this.split(context, iter));
                    if (err) {
                        ;
                        [err, context] = (await this.rescue_async(err, retCtx));
                        if (err) {
                            return done(err);
                        }
                    }
                    iter++;
                }
                done(err, context);
            };
            next(err);
        };
        this.run = run;
        return super.compile(rebuild);
    }
}
exports.DoWhile = DoWhile;
//# sourceMappingURL=dowhile.js.map