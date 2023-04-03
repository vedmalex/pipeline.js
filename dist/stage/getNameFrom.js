"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.get_name_from = void 0;
function get_name_from(config) {
    var _a;
    let result = '';
    if (!config.name && config.run) {
        var match = config.run.toString().match(/function\s*(\w+)\s*\(/);
        if (match && match[1]) {
            result = match[1];
        }
        else {
            result = config.run.toString();
        }
    }
    else {
        result = (_a = config.name) !== null && _a !== void 0 ? _a : '';
    }
    return result;
}
exports.get_name_from = get_name_from;
//# sourceMappingURL=getNameFrom.js.map