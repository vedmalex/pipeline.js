"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isMultiWaySwitch = void 0;
const stage_1 = require("../../stage");
function isMultiWaySwitch(inp) {
    return (typeof inp == 'object' && inp != null && 'stage' in inp && (0, stage_1.isRunPipelineFunction)(inp['stage']));
}
exports.isMultiWaySwitch = isMultiWaySwitch;
//# sourceMappingURL=isMultiWaySwitch.js.map