"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.execute_validate = void 0;
const errors_1 = require("../errors");
const types_1 = require("../types");
function execute_validate(validate, context, done) {
    switch (validate.length) {
        case 1:
            if ((0, types_1.isValidateFunction1Async)(validate)) {
                try {
                    validate(context)
                        .then(res => {
                        if (typeof res == 'boolean') {
                            done(undefined, res);
                        }
                        else {
                            done(res);
                        }
                    })
                        .catch(err => done(err));
                }
                catch (err) {
                    (0, errors_1.process_error)(err, done);
                }
            }
            else if ((0, types_1.isValidateFunction1Sync)(validate)) {
                try {
                    const res = validate(context);
                    if (res instanceof Promise) {
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
                            done((0, errors_1.CreateError)(errors_1.ERROR.invalid_context));
                        }
                    }
                    else {
                        if (typeof res === 'object' && res) {
                            done(res);
                        }
                        else {
                            done(new Error(String(res)));
                        }
                    }
                }
                catch (err) {
                    (0, errors_1.process_error)(err, done);
                }
            }
            else {
                done((0, errors_1.CreateError)(errors_1.ERROR.signature));
            }
            break;
        case 2:
            if ((0, types_1.isValidateFunction2Sync)(validate)) {
                try {
                    validate(context, (err, res) => {
                        if (err)
                            done((0, errors_1.CreateError)(err), res);
                        else
                            done(err, res);
                    });
                }
                catch (err) {
                    (0, errors_1.process_error)(err, done);
                }
            }
            else {
                done((0, errors_1.CreateError)(errors_1.ERROR.signature));
            }
            break;
        default:
            done((0, errors_1.CreateError)(errors_1.ERROR.signature));
    }
}
exports.execute_validate = execute_validate;
//# sourceMappingURL=execute_validate.js.map