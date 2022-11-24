"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run_or_execute = void 0;
var execute_callback_1 = require("./execute_callback");
function run_or_execute(stage, err, context, _done) {
    var done = function (err, ctx) {
        _done(err, ctx !== null && ctx !== void 0 ? ctx : context);
    };
    if (typeof stage == 'object') {
        ;
        stage.execute(err, context, done);
    }
    else {
        (0, execute_callback_1.execute_callback)(err, stage, context, done);
    }
}
exports.run_or_execute = run_or_execute;
//# sourceMappingURL=run_or_execute.js.map