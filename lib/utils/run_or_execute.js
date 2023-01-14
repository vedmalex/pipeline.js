"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run_or_execute = void 0;
var execute_callback_1 = require("./execute_callback");
var types_1 = require("./types");
function run_or_execute(stage, err, context, _done) {
    var done = (function (err, ctx) {
        _done(err, ctx !== null && ctx !== void 0 ? ctx : context);
    });
    if ((0, types_1.isAnyStage)(stage)) {
        stage.execute(err, context, done);
    }
    else {
        (0, execute_callback_1.execute_callback)(err, stage, context, done);
    }
}
exports.run_or_execute = run_or_execute;
//# sourceMappingURL=run_or_execute.js.map