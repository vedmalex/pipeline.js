"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run_or_execute = void 0;
const execute_callback_1 = require("./execute_callback");
const types_1 = require("./types/types");
function run_or_execute(stage, err, context, _done) {
    const done = (err, ctx) => {
        _done(err, ctx !== null && ctx !== void 0 ? ctx : context);
    };
    if ((0, types_1.isAnyStage)(stage)) {
        stage.execute(err, context, done);
    }
    else {
        if (typeof stage === 'function')
            (0, execute_callback_1.execute_callback)(err, stage, context, done);
    }
}
exports.run_or_execute = run_or_execute;
//# sourceMappingURL=run_or_execute.js.map