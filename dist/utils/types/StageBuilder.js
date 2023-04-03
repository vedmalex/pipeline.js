"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StageBuilder = void 0;
const tslib_1 = require("tslib");
const ErrorList_1 = require("../ErrorList");
const z = tslib_1.__importStar(require("zod"));
const StageConfig_1 = require("./stage/StageConfig");
const RunPipelineFunction_1 = require("./stage/RunPipelineFunction");
class StageBuilder {
    constructor() {
        this.cfg = {};
    }
    run(fn) {
        if (fn && RunPipelineFunction_1.RunPipelineFunction.safeParse(fn).success) {
            this.cfg.run = fn;
        }
        else {
            throw (0, ErrorList_1.CreateError)('run should be a `RunPipelineFunction`');
        }
    }
    name(name) {
        this.cfg.name = z.string().parse(name);
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
        this.isValid();
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
        StageConfig_1.StageConfig.parse(this.cfg);
    }
    get config() {
        return StageConfig_1.StageConfig.parse(this.cfg);
    }
}
exports.StageBuilder = StageBuilder;
//# sourceMappingURL=StageBuilder.js.map