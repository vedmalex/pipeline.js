"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMultWaySwitchConfig = void 0;
const stage_1 = require("../../stage");
const isMultiWaySwitch_1 = require("./isMultiWaySwitch");
function getMultWaySwitchConfig(config) {
    if (Array.isArray(config)) {
        return {
            cases: config.map(item => {
                let res;
                if ((0, stage_1.isRunPipelineFunction)(item)) {
                    res = { stage: item, evaluate: true };
                }
                else if ((0, stage_1.isAnyStage)(item)) {
                    res = {
                        stage: item,
                        evaluate: true,
                    };
                }
                else if ((0, isMultiWaySwitch_1.isMultiWaySwitch)(item)) {
                    res = item;
                }
                else {
                    throw (0, stage_1.CreateError)(new Error('not suitable type for array in pipelin'));
                }
                return res;
            }),
        };
    }
    else {
        const res = (0, stage_1.getStageConfig)(config);
        if ((0, stage_1.isAnyStage)(res)) {
            return { cases: [{ stage: res, evaluate: true }] };
        }
        else if (typeof config == 'object' && !(0, stage_1.isAnyStage)(config)) {
            if ((config === null || config === void 0 ? void 0 : config.run) && config.cases && config.cases.length > 0) {
                throw (0, stage_1.CreateError)(new Error(" don't use run and stage both "));
            }
            if (config.run) {
                res.cases = [{ stage: config.run, evaluate: true }];
            }
            if (config.cases) {
                res.cases = config.cases;
            }
            if (config.split) {
                res.split = config.split;
            }
            if (config.combine) {
                res.combine = config.combine;
            }
        }
        else if (typeof config == 'function' && res.run) {
            res.cases = [{ stage: res.run, evaluate: true }];
            delete res.run;
        }
        if (typeof res.cases == 'undefined')
            res.cases = [];
        return res;
    }
}
exports.getMultWaySwitchConfig = getMultWaySwitchConfig;
//# sourceMappingURL=getMultWaySwitchConfig.js.map