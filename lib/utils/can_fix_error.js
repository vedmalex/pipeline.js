"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.can_fix_error = void 0;
var types_1 = require("./types");
function can_fix_error(run) {
    return (0, types_1.is_func2_async)(run) || ((0, types_1.is_func3)(run) && !(0, types_1.is_func3_async)(run));
}
exports.can_fix_error = can_fix_error;
//# sourceMappingURL=can_fix_error.js.map