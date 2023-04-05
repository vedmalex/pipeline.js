"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.process_error_async = void 0;
const process_error_1 = require("./process_error");
function process_error_async(err) {
    return new Promise(resolve => {
        (0, process_error_1.process_error)(err, (err, ctx) => {
            if (err)
                resolve([err, ctx]);
            else
                resolve([undefined, ctx]);
        });
    });
}
exports.process_error_async = process_error_async;
//# sourceMappingURL=process_error_async.js.map