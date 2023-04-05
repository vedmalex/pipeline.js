"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isStageConfig = exports.StageConfigValidator = void 0;
const tslib_1 = require("tslib");
const z = tslib_1.__importStar(require("zod"));
const types_1 = require("./types");
exports.StageConfigValidator = z
    .object({
    run: types_1.RunPipelineFunction.optional(),
    name: z.string().optional(),
    rescue: types_1.Rescue.optional(),
    schema: z.object({}).passthrough().optional(),
    ensure: types_1.EnsureFunction.optional(),
    validate: z.function().optional(),
    compile: z.function().optional(),
    precompile: z.function().optional(),
})
    .passthrough()
    .refine(obj => {
    return !((obj.ensure && obj.validate) || (obj.ensure && obj.schema) || (obj.validate && obj.schema));
}, 'ensure, validate, and schema are mutually exclusive');
function isStageConfig(obj) {
    return typeof obj === 'object' && obj !== null && exports.StageConfigValidator.safeParse(obj)['success'];
}
exports.isStageConfig = isStageConfig;
//# sourceMappingURL=StageConfig.js.map