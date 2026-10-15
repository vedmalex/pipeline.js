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
exports.DoWhile = void 0;
const stage_1 = require("./stage");
const TypeDetectors_1 = require("./utils/TypeDetectors");
const ErrorList_1 = require("./utils/ErrorList");
const run_or_execute_1 = require("./utils/run_or_execute");
const types_1 = require("./utils/types");
class DoWhile extends stage_1.Stage {
    constructor(_config) {
        let config = {};
        if ((0, types_1.isAnyStage)(_config)) {
            config.stage = _config;
        }
        else if (typeof _config == 'function') {
            config.stage = _config;
        }
        else {
            if ((_config === null || _config === void 0 ? void 0 : _config.run) && (_config === null || _config === void 0 ? void 0 : _config.stage)) {
                throw (0, ErrorList_1.createError)('use or run or stage, not both');
            }
            if (_config === null || _config === void 0 ? void 0 : _config.stage) {
                config.stage = _config.stage;
            }
            if ((0, TypeDetectors_1.isFunction)(_config === null || _config === void 0 ? void 0 : _config.split)) {
                config.split = _config.split;
            }
            if ((0, TypeDetectors_1.isFunction)(_config === null || _config === void 0 ? void 0 : _config.reachEnd)) {
                config.reachEnd = _config.reachEnd;
            }
        }
        super(config);
        this._config = Object.assign(Object.assign({}, this._config), config);
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
        const _super = Object.create(null, {
            compile: { get: () => super.compile }
        });
        let run = (initialErr, initialContext, done) => __awaiter(this, void 0, void 0, function* () {
            let iter = -1;
            let currentError = initialErr;
            let currentContext = initialContext;
            try {
                while (true) {
                    iter++;
                    if (this.reachEnd(currentError, currentContext, iter)) {
                        break;
                    }
                    yield new Promise(resolve => {
                        (0, run_or_execute_1.run_or_execute)(this.config.stage, currentError, this.split(currentContext, iter), (err, ctx) => {
                            if (err) {
                                currentError = err;
                            }
                            else {
                                currentContext = ctx !== null && ctx !== void 0 ? ctx : currentContext;
                            }
                            resolve();
                        });
                    });
                }
            }
            catch (err) {
                currentError = err;
            }
            finally {
                done(currentError, currentContext);
            }
        });
        this.run = run;
        return super.compile(rebuild);
    }
}
exports.DoWhile = DoWhile;
//# sourceMappingURL=dowhile.js.map