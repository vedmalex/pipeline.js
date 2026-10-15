"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.execute_validate = execute_validate;
const ErrorList_1 = require("./ErrorList");
const errors_1 = require("./errors");
const process_error_1 = require("./process_error");
const TypeDetectors_1 = require("./TypeDetectors");
const types_1 = require("./types");
const types_2 = require("./types");
function execute_validate(validate, context, done) {
    switch (validate.length) {
        case 1:
            if ((0, types_2.is_func1_async)(validate)) {
                try {
                    ;
                    validate(context)
                        .then(res => done(undefined, res))
                        .catch(err => done(err));
                }
                catch (err) {
                    (0, process_error_1.process_error)(err, done);
                }
            }
            else if ((0, types_2.is_func1)(validate)) {
                try {
                    const res = validate(context);
                    if ((0, TypeDetectors_1.isPromise)(res)) {
                        res.then(res => done(undefined, res)).catch(err => done(err));
                    }
                    else if ((0, types_1.is_thenable)(res)) {
                        res.then(res => done(undefined, res)).catch(err => done(err));
                    }
                    else if (typeof res == 'boolean') {
                        if (res) {
                            done(undefined, res);
                        }
                        else {
                            done((0, ErrorList_1.createCodeError)(errors_1.ErrorCode.ERR_INVALID_CONTEXT));
                        }
                    }
                    else {
                        done(res);
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
            if ((0, types_2.is_func2)(validate)) {
                try {
                    validate(context, (err, res) => {
                        if (err)
                            done((0, ErrorList_1.createError)(err), res);
                        else
                            done(err, res);
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
//# sourceMappingURL=execute_validate.js.map