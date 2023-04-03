"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isStageObject = exports.StageObject = void 0;
const tslib_1 = require("tslib");
const z = tslib_1.__importStar(require("zod"));
exports.StageObject = z.object({}).passthrough();
function isStageObject(arg) {
    return exports.StageObject.safeParse(arg)['success'];
}
exports.isStageObject = isStageObject;
//# sourceMappingURL=StageObject.js.map