"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Empty = void 0;
const stage_1 = require("./stage");
const types_1 = require("./utils/types");
class Empty extends stage_1.Stage {
    constructor(config) {
        super();
        const res = types_1.getEmptyConfig(config);
        if (res instanceof stage_1.Stage) {
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