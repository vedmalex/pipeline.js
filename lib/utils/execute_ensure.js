"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.execute_ensure = execute_ensure;
const ErrorList_1 = require("./ErrorList");
const TypeDetectors_1 = require("./TypeDetectors");
const errors_1 = require("./errors");
const process_error_1 = require("./process_error");
const types_1 = require("./types");
const types_2 = require("./types");
function execute_ensure(ensure, context, done) {
    switch (ensure.length) {
        case 1:
            if ((0, types_2.is_func1_async)(ensure)) {
                try {
                    ;
                    ensure(context)
                        .then(res => done(undefined, res))
                        .catch(err => done(err));
                }
                catch (err) {
                    (0, process_error_1.process_error)(err, done);
                }
            }
            else if ((0, types_2.is_func1)(ensure)) {
                try {
                    const res = ensure(context);
                    if ((0, TypeDetectors_1.isPromise)(res)) {
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
                done((0, ErrorList_1.createCodeError)(errors_1.ErrorCode.ERR_SIGNATURE));
            }
            break;
        case 2:
            if ((0, types_2.is_func2)(ensure)) {
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
                done((0, ErrorList_1.createCodeError)(errors_1.ErrorCode.ERR_SIGNATURE));
            }
            break;
        default:
            done((0, ErrorList_1.createCodeError)(errors_1.ErrorCode.ERR_SIGNATURE));
    }
}
//# sourceMappingURL=execute_ensure.js.map