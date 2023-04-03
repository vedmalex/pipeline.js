"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.can_fix_error = void 0;
const types_1 = require("../types");
function can_fix_error(run) {
    return (0, types_1.isCustomRun2Async)(run) || (0, types_1.isCustomRun3Callback)(run);
}
exports.can_fix_error = can_fix_error;
//# sourceMappingURL=can_fix_error.js.map