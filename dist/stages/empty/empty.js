"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Empty = void 0;
const stage_1 = require("../../stage");
const getEmptyConfig_1 = require("./getEmptyConfig");
class Empty extends stage_1.Stage {
    constructor(config) {
        super();
        const res = (0, getEmptyConfig_1.getEmptyConfig)(config);
        if ((0, stage_1.isAnyStage)(res)) {
            return res;
        }
        else {
            this._config = res;
        }
    }
    toString() {
        return '[pipeline Empty]';
    }
}
exports.Empty = Empty;
//# sourceMappingURL=Empty.js.map