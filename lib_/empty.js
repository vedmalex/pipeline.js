"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Empty = void 0;
const stage_1 = require("./stage");
class Empty extends stage_1.Stage {
    constructor(name) {
        super(name);
        this._config.run = (err, context, callback) => callback(err, context);
    }
    toString() {
        return '[pipeline Empty]';
    }
}
exports.Empty = Empty;
//# sourceMappingURL=Empty.js.map