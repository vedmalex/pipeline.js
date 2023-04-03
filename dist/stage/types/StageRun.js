"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StageRun = void 0;
const tslib_1 = require("tslib");
const z = tslib_1.__importStar(require("zod"));
exports.StageRun = z.function().args(z.unknown(), z.unknown(), z.function()).returns(z.void());
//# sourceMappingURL=StageRun.js.map