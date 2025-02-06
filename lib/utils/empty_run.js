"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.empty_run = empty_run;
function empty_run(err, context, done) {
    return Promise.try(function (err, context) { return done(err, context); }, err, context);
}
//# sourceMappingURL=empty_run.js.map