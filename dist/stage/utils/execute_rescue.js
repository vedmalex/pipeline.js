"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.execute_rescue_async = exports.execute_rescue = void 0;
const errors_1 = require("../errors");
const types_1 = require("../types");
function execute_rescue(rescue, err, context, done) {
    switch (rescue.length) {
        case 1:
            if ((0, types_1.isRescue1ASync)(rescue)) {
                try {
                    rescue(err)
                        .then(_ => done(undefined))
                        .catch(err => done(err));
                }
                catch (err) {
                    (0, errors_1.process_error)(err, done);
                }
            }
            else if ((0, types_1.isRescue1Sync)(rescue)) {
                try {
                    const res = rescue(err);
                    if (res instanceof Promise) {
                        res.then(_ => done()).catch(err => done(err));
                    }
                    else if ((0, types_1.is_thenable)(res)) {
                        res.then(_ => done()).catch(err => done(err));
                    }
                    else {
                        done();
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
            if ((0, types_1.isRescue2ASync)(rescue)) {
                try {
                    rescue(err, context)
                        .then(_ => done())
                        .catch(err => done(err));
                }
                catch (err) {
                    (0, errors_1.process_error)(err, done);
                }
            }
            else if ((0, types_1.isRescue2Sync)(rescue)) {
                try {
                    const res = rescue(err, context);
                    if (res instanceof Promise) {
                        res.then(_ => done()).catch(err => done(err));
                    }
                    else if ((0, types_1.is_thenable)(res)) {
                        res.then(_ => done()).catch(err => done(err));
                    }
                    else {
                        if (Boolean(res)) {
                            (0, errors_1.process_error)(res, done);
                        }
                        else {
                            done();
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
        case 3:
            if ((0, types_1.isRescue3Callback)(rescue)) {
                try {
                    rescue(err, context, done);
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
exports.execute_rescue = execute_rescue;
function execute_rescue_async(rescue, err, context) {
    return new Promise(resolve => {
        execute_rescue(rescue, err, context, err => resolve([err, context]));
    });
}
exports.execute_rescue_async = execute_rescue_async;
//# sourceMappingURL=execute_rescue.js.map