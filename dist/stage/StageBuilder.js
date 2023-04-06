"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StageBuilder = void 0;
const types_1 = require("./types");
const errors_1 = require("./errors");
class StageBuilder {
    constructor() {
        this.cfg = {};
    }
    run(fn) {
        if (fn && (0, types_1.isRunPipelineFunction)(fn)) {
            this.cfg.run = fn;
        }
        else {
            throw (0, errors_1.CreateError)('run should be a `RunPipelineFunction`');
        }
    }
    name(name) {
        this.cfg.name = name;
        return this;
    }
    rescue(fn) {
        this.cfg.rescue = fn;
        return this;
    }
    schema(obj) {
        this.cfg.schema = obj;
        return this;
    }
    ensure(fn) {
        this.cfg.ensure = fn;
        return this;
    }
    validate(fn) {
        this.cfg.validate = fn;
        return this;
    }
    compile(fn) {
        this.cfg.compile = fn;
        return this;
    }
    precompile(fn) {
        this.cfg.precompile = fn;
        return this;
    }
    isValid() {
    }
    get config() {
        return this.cfg;
    }
}
exports.StageBuilder = StageBuilder;
//# sourceMappingURL=StageBuilder.js.map