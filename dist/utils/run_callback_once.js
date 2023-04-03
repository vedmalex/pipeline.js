"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run_callback_once = void 0;
const CreateError_1 = require("./errors/CreateError");
function run_callback_once(wrapee) {
    let done_call = 0;
    const c = function (err, ctx) {
        if (done_call == 0) {
            done_call += 1;
            wrapee(err, ctx);
        }
        else if (err) {
            throw err;
        }
        else {
            throw (0, CreateError_1.CreateError)([ctx, 'callback called more than once']);
        }
    };
    return c;
}
exports.run_callback_once = run_callback_once;
//# sourceMappingURL=run_callback_once.js.map