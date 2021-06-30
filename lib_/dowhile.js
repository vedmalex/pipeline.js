"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DoWhile = void 0;
const stage_1 = require("./stage");
const ErrorList_1 = require("./utils/ErrorList");
class DoWhile extends stage_1.Stage {
    constructor(config) {
        if (config.run && config.stage) {
            throw ErrorList_1.CreateError('use or run or stage, not both');
        }
        super(config);
    }
    get reportName() {
        return `WHI:${this.config.name ? this.config.name : ''}`;
    }
    toString() {
        return '[pipeline DoWhile]';
    }
    compile(rebuild = false) {
        let run = (err, context, done) => { };
        this.run = run;
        return super.compile(rebuild);
    }
}
exports.DoWhile = DoWhile;
//# sourceMappingURL=dowhile.js.map