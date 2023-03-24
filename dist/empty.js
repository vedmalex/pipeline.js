"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Empty = void 0;
const stage_1 = require("./stage");
const types_1 = require("./utils/types/types");
const types_2 = require("./utils/types/types");
class Empty extends stage_1.Stage {
    constructor(config) {
        super();
        const res = (0, types_2.getEmptyConfig)(config);
        if ((0, types_1.isAnyStage)(res)) {
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
//# sourceMappingURL=empty.js.map