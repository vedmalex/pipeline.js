"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isStageConfig = exports.StageConfig = void 0;
const tslib_1 = require("tslib");
const Rescue_1 = require("./Rescue");
const EnsureFunction_1 = require("./EnsureFunction");
const z = tslib_1.__importStar(require("zod"));
const RunPipelineFunction_1 = require("./stage/RunPipelineFunction");
exports.StageConfig = z
    .object({
    run: RunPipelineFunction_1.RunPipelineFunction.optional(),
    name: z.string().optional(),
    rescue: Rescue_1.Rescue.optional(),
    schema: z.object({}).passthrough().optional(),
    ensure: EnsureFunction_1.EnsureFunction.optional(),
    validate: z.function().optional(),
    compile: z.function().optional(),
    precompile: z.function().optional(),
})
    .passthrough()
    .refine(obj => {
    return !((obj.ensure && obj.validate) || (obj.ensure && obj.schema) || (obj.validate && obj.schema));
}, 'ensure, validate, and schema are mutually exclusive');
function isStageConfig(obj) {
    return typeof obj === 'object' && obj !== null && exports.StageConfig.safeParse(obj)['success'];
}
exports.isStageConfig = isStageConfig;
//# sourceMappingURL=StageConfig.js.map