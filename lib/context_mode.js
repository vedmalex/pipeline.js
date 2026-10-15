"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setContextExecutionMode = setContextExecutionMode;
exports.getContextExecutionMode = getContextExecutionMode;
exports.__resetContextExecutionModeForTests = __resetContextExecutionModeForTests;
let contextExecutionModeOverride;
function setContextExecutionMode(mode) {
    contextExecutionModeOverride = mode;
}
function getContextExecutionMode() {
    if (contextExecutionModeOverride) {
        return contextExecutionModeOverride;
    }
    if (typeof process !== 'undefined') {
        const value = process.env.PIPELINE_CONTEXT_MODE;
        if (value === 'legacy' || value === 'warn' || value === 'explicit') {
            return value;
        }
    }
    return 'explicit';
}
function __resetContextExecutionModeForTests() {
    contextExecutionModeOverride = undefined;
}
//# sourceMappingURL=context_mode.js.map