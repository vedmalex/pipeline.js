"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.can_fix_error = void 0;
const types_1 = require("./types");
function can_fix_error(run) {
    return types_1.is_func2_async(run) || (types_1.is_func3(run) && !types_1.is_func3_async(run));
}
exports.can_fix_error = can_fix_error;
//# sourceMappingURL=can_fix_error.js.map