"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run_or_execute = void 0;
const execute_callback_1 = require("./execute_callback");
function run_or_execute(stage, err, ctx, done) {
    if (typeof stage == 'object') {
        stage.execute(err, ctx, done);
    }
    else {
        execute_callback_1.execute_callback(err, stage, ctx, done);
    }
}
exports.run_or_execute = run_or_execute;
//# sourceMappingURL=run_or_execute.js.map