"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.execute_ensure = void 0;
const CreateError_1 = require("./errors/CreateError");
const errors_1 = require("./errors");
const process_error_1 = require("./errors/process_error");
const types_1 = require("./types");
function execute_ensure(ensure, context, done) {
    switch (ensure.length) {
        case 1:
            if ((0, types_1.isEnsureAsync)(ensure)) {
                try {
                    ensure(context)
                        .then(res => done(undefined, res))
                        .catch(err => done(err));
                }
                catch (err) {
                    (0, process_error_1.process_error)(err, done);
                }
            }
            else if ((0, types_1.isEnsureSync)(ensure)) {
                try {
                    const res = ensure(context);
                    if (res instanceof Promise) {
                        res.then(res => done(undefined, res)).catch(err => done(err));
                    }
                    else if ((0, types_1.is_thenable)(res)) {
                        res.then(res => done(undefined, res)).catch(err => done(err));
                    }
                    else {
                        done(undefined, res);
                    }
                }
                catch (err) {
                    (0, process_error_1.process_error)(err, done);
                }
            }
            else {
                done((0, CreateError_1.CreateError)(errors_1.ERROR.signature));
            }
            break;
        case 2:
            if ((0, types_1.isEnsureCallback)(ensure)) {
                try {
                    ensure(context, (err, ctx) => {
                        done(err, ctx);
                    });
                }
                catch (err) {
                    (0, process_error_1.process_error)(err, done);
                }
            }
            else {
                done((0, CreateError_1.CreateError)(errors_1.ERROR.signature));
            }
            break;
        default:
            done((0, CreateError_1.CreateError)(errors_1.ERROR.signature));
    }
}
exports.execute_ensure = execute_ensure;
//# sourceMappingURL=execute_ensure.js.map