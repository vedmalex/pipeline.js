"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run_callback_once = void 0;
var ErrorList_1 = require("./ErrorList");
function run_callback_once(wrapee) {
    var done_call = 0;
    var done = function (err, ctx) {
        if (done_call == 0) {
            done_call += 1;
            wrapee(err, ctx);
        }
        else if (err) {
            throw err;
        }
        else {
            throw (0, ErrorList_1.CreateError)([err, 'callback called more than once']);
        }
    };
    return done;
}
exports.run_callback_once = run_callback_once;
//# sourceMappingURL=run_callback_once.js.map