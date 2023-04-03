"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.is_thenable = void 0;
function is_thenable(inp) {
    return typeof inp == 'object' && 'then' in inp;
}
exports.is_thenable = is_thenable;
//# sourceMappingURL=is_thenable.js.map