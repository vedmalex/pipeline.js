"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.execute_ensure = void 0;
const ErrorList_1 = require("./ErrorList");
const types_1 = require("./types");
const types_2 = require("./types");
const errors_1 = require("./errors");
const process_error_1 = require("./process_error");
function execute_ensure(ensure, context, done) {
    switch (ensure.length) {
        case 1:
            if (types_2.is_func1_async(ensure)) {
                try {
                    ;
                    ensure(context)
                        .then(res => done(undefined, res))
                        .catch(err => done(err));
                }
                catch (err) {
                    process_error_1.process_error(err, done);
                }
            }
            else if (types_2.is_func1(ensure)) {
                try {
                    const res = ensure(context);
                    if (res instanceof Promise) {
                        res.then(res => done(undefined, res)).catch(err => done(err));
                    }
                    else if (types_1.is_thenable(res)) {
                        res.then(res => done(undefined, res)).catch(err => done(err));
                    }
                    else {
                        done(undefined, res);
                    }
                }
                catch (err) {
                    process_error_1.process_error(err, done);
                }
            }
            else {
                done(ErrorList_1.CreateError(errors_1.ERROR.signature));
            }
            break;
        case 2:
            if (types_2.is_func2(ensure)) {
                try {
                    ensure(context, (err, ctx) => {
                        done(err, ctx);
                    });
                }
                catch (err) {
                    process_error_1.process_error(err, done);
                }
            }
            else {
                done(ErrorList_1.CreateError(errors_1.ERROR.signature));
            }
            break;
        default:
            done(ErrorList_1.CreateError(errors_1.ERROR.signature));
    }
}
exports.execute_ensure = execute_ensure;
//# sourceMappingURL=execute_ensure.js.map