"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDoWhileConfig = void 0;
const ErrorList_1 = require("../../ErrorList");
const isAnyStage_1 = require("../stage/isAnyStage");
function getDoWhileConfig(_config) {
    let config = {};
    if ((0, isAnyStage_1.isAnyStage)(_config)) {
        config.stage = _config;
    }
    else if (typeof _config == 'function') {
        config.stage = _config;
    }
    else {
        if ((_config === null || _config === void 0 ? void 0 : _config.run) && (_config === null || _config === void 0 ? void 0 : _config.stage)) {
            throw (0, ErrorList_1.CreateError)('use or run or stage, not both');
        }
        if (_config === null || _config === void 0 ? void 0 : _config.stage) {
            config.stage = _config.stage;
        }
        if ((_config === null || _config === void 0 ? void 0 : _config.split) instanceof Function) {
            config.split = _config.split;
        }
        if ((_config === null || _config === void 0 ? void 0 : _config.reachEnd) instanceof Function) {
            config.reachEnd = _config.reachEnd;
        }
    }
    return config;
}
exports.getDoWhileConfig = getDoWhileConfig;
//# sourceMappingURL=getDoWhileConfig.js.map