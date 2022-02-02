"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Template = exports.getTemplateConfig = void 0;
var stage_1 = require("../stage");
var ErrorList_1 = require("./ErrorList");
var types_1 = require("./types");
function getTemplateConfig(config) {
    var res = (0, types_1.getStageConfig)(config);
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
var Template = (function (_super) {
    __extends(Template, _super);
    function Template(config) {
        var _this = _super.call(this) || this;
        if (config) {
            _this._config = getTemplateConfig(config);
        }
        return _this;
    }
    Object.defineProperty(Template.prototype, "reportName", {
        get: function () {
            return "Templ:" + (this.config.name ? this.config.name : '');
        },
        enumerable: false,
        configurable: true
    });
    Template.prototype.toString = function () {
        return '[pipeline Template]';
    };
    Template.prototype.compile = function (rebuild) {
        if (rebuild === void 0) { rebuild = false; }
        var run = function (err, context, done) { };
        this.run = run;
        return _super.prototype.compile.call(this, rebuild);
    };
    return Template;
}(stage_1.Stage));
exports.Template = Template;
//# sourceMappingURL=template.js.map