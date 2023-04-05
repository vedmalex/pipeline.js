"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run_or_execute_async = exports.run_or_execute = void 0;
const getStageConfig_1 = require("../getStageConfig");
const execute_callback_1 = require("./execute_callback");
function run_or_execute(stage, err, context, _done) {
    const done = (err, ctx) => {
        _done(err, ctx !== null && ctx !== void 0 ? ctx : context);
    };
    if ((0, getStageConfig_1.isAnyStage)(stage)) {
        stage.execute(err, context, done);
    }
    else {
        if (typeof stage === 'function')
            (0, execute_callback_1.execute_callback)(err, stage, context, done);
    }
}
exports.run_or_execute = run_or_execute;
function run_or_execute_async(stage, err, context) {
    return new Promise(resolve => {
        run_or_execute(stage, err, context, (err, ctx) => {
            resolve([err, (ctx !== null && ctx !== void 0 ? ctx : context)]);
        });
    });
}
exports.run_or_execute_async = run_or_execute_async;
//# sourceMappingURL=run_or_execute.js.map