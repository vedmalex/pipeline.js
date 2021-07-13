"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Template = exports.getTemplateConfig = void 0;
const stage_1 = require("../stage");
const types_1 = require("./types");
const ErrorList_1 = require("./ErrorList");
function getTemplateConfig(config) {
    const res = (0, types_1.getStageConfig)(config);
    if (res instanceof stage_1.Stage) {
        return { stage: res };
    }
    else if (typeof config == 'object' && !(config instanceof stage_1.Stage)) {
        if (config.run && config.stage) {
            throw (0, ErrorList_1.CreateError)("don't use run and stage both");
        }
        if (config.run) {
            res.stage = config.run;
        }
        if (config.stage) {
            res.stage = config.stage;
        }
    }
    else if (typeof config == 'function' && res.run) {
        res.stage = res.run;
        delete res.run;
    }
    return res;
}
exports.getTemplateConfig = getTemplateConfig;
class Template extends stage_1.Stage {
    constructor(config) {
        super();
        if (config) {
            this._config = getTemplateConfig(config);
        }
    }
    get reportName() {
        return `Templ:${this.config.name ? this.config.name : ''}`;
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