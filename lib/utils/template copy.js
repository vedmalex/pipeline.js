"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Template = void 0;
const stage_1 = require("../stage");
class Template extends stage_1.Stage {
    constructor(config) {
        super(config);
    }
    get reportName() {
        return `PIPE:${this.config.name ? this.config.name : ''}`;
    }
    toString() {
        return '[pipeline Template]';
    }
    compile(rebuild = false) {
        let run = (err, context, done) => { };
        this.run = run;
        return super.compile(rebuild);
    }
}
exports.Template = Template;
//# sourceMappingURL=template%20copy.js.map