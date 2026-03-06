"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run_callback_once = run_callback_once;
var ErrorList_1 = require("./ErrorList");
var TypeDetectors_1 = require("./TypeDetectors");
function run_callback_once(wrapee) {
    var done_call = 0;
    var c = function (err, ctx) {
        if (done_call == 0) {
            done_call += 1;
            wrapee(err, ctx);
        }
        else {
            var errors = [err, new Error('callback called more than once')].filter(function (e) { return (0, TypeDetectors_1.isError)(e); });
            throw errors.length > 0 ? (0, ErrorList_1.createError)(errors) : (0, ErrorList_1.createError)('Callback called more than once');
        }
    };
    return c;
}
//# sourceMappingURL=run_callback_once.js.map