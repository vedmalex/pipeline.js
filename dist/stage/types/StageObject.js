"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isStageObject = exports.StageObjectValidator = void 0;
const tslib_1 = require("tslib");
const z = tslib_1.__importStar(require("zod"));
exports.StageObjectValidator = z.object({}).passthrough();
function isStageObject(arg) {
    return exports.StageObjectValidator.safeParse(arg)['success'];
}
exports.isStageObject = isStageObject;
//# sourceMappingURL=StageObject.js.map