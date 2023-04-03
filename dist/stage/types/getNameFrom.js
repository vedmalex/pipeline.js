"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNameFrom = void 0;
function getNameFrom(config) {
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
exports.getNameFrom = getNameFrom;
//# sourceMappingURL=getNameFrom.js.map