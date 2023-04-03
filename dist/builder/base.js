"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StageConfigSchema = void 0;
const tslib_1 = require("tslib");
const zod_1 = tslib_1.__importDefault(require("zod"));
exports.StageConfigSchema = zod_1.default.object({
    run: zod_1.default.function(),
    name: zod_1.default.string().optional(),
    rescue: zod_1.default.function().optional(),
    schema: zod_1.default.object({}).optional(),
    ensure: zod_1.default.function().optional(),
    validate: zod_1.default.function().optional(),
    compile: zod_1.default.function().optional(),
});
class BuilderBase {
    constructor() {
        this.cfg = {};
    }
    run(fn) { }
    name(name) {
        this.cfg.name = name;
        return this;
    }
    rescue(fn) {
        this.cfg.rescue = fn;
        return this;
    }
    isValid() {
        exports.StageConfigSchema.parse(this.cfg);
    }
    validate(fn) {
        this.cfg.validate = fn;
        this.isValid();
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
}
module.exports = BuilderBase;
//# sourceMappingURL=base.js.map