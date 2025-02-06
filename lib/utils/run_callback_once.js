"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run_callback_once = run_callback_once;
var ErrorList_1 = require("./ErrorList");
function run_callback_once(wrapee) {
    var done_call = 0;
    var c = function (err, ctx) {
        if (done_call == 0) {
            done_call += 1;
            wrapee(err, ctx);
        }
        else {
            throw (0, ErrorList_1.CreateError)([err, 'callback called more than once']);
        }
    };
    return c;
}
//# sourceMappingURL=run_callback_once.js.map