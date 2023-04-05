"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isEvaluateFunction = exports.StageEvaluateFunctionValidator = void 0;
const tslib_1 = require("tslib");
const z = tslib_1.__importStar(require("zod"));
exports.StageEvaluateFunctionValidator = z.custom((f) => {
    if (typeof f === 'function') {
        return f.length === 1;
    }
    else
        return false;
}, 'EvaluateFunction');
function isEvaluateFunction(arg) {
    return exports.StageEvaluateFunctionValidator.safeParse(arg)['success'];
}
exports.isEvaluateFunction = isEvaluateFunction;
//# sourceMappingURL=StageEvaluateFunction.js.map