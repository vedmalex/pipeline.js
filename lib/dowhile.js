"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DoWhile = void 0;
const stage_1 = require("./stage");
const ErrorList_1 = require("./utils/ErrorList");
const run_or_execute_1 = require("./utils/run_or_execute");
class DoWhile extends stage_1.Stage {
    constructor(_config) {
        let config = {};
        if (_config instanceof stage_1.Stage) {
            config.stage = _config;
        }
        else {
            if (typeof _config == 'function') {
                config.stage = _config;
            }
            else {
                if ((_config === null || _config === void 0 ? void 0 : _config.run) && (_config === null || _config === void 0 ? void 0 : _config.stage)) {
                    throw ErrorList_1.CreateError('use or run or stage, not both');
                }
                if (_config === null || _config === void 0 ? void 0 : _config.stage) {
                    config.stage = _config.stage;
                }
                if ((_config === null || _config === void 0 ? void 0 : _config.split) instanceof Function) {
                    config.split = _config.split;
                }
                if ((_config === null || _config === void 0 ? void 0 : _config.reachEnd) instanceof Function) {
                    config.reachEnd = _config.reachEnd;
                }
            }
        }
        super(config);
        this._config = {
            ...this._config,
            ...config,
        };
    }
    get reportName() {
        return `WHI:${this.config.name ? this.config.name : ''}`;
    }
    toString() {
        return '[pipeline DoWhile]';
    }
    reachEnd(err, ctx, iter) {
        if (this.config.reachEnd) {
            return this.config.reachEnd(err, ctx, iter);
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
        let run = (err, context, done) => {
            let iter = -1;
            let next = (err) => {
                iter++;
                if (this.reachEnd(err, context, iter)) {
                    return done(err, context);
                }
                else {
                    run_or_execute_1.run_or_execute(this.config.stage, err, this.split(context, iter), next);
                }
            };
            next(err);
        };
        this.run = run;
        return super.compile(rebuild);
    }
}
exports.DoWhile = DoWhile;
//# sourceMappingURL=dowhile.js.map