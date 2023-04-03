"use strict";
var mpromise = require('mpromise');
var pipeline = require('pipeline.js');
var Stage = pipeline.Stage;
var schema = require('js-schema');
var util = require('util');
var Base = require('./base.js');
var cfg = require('./cfg.js');
var validate = schema({
    run: [Function],
});
class fStage extends fBase {
    constructor(stage) {
        Base.apply(this);
        this.stage(stage);
    }
    isValid() {
        fStage.super_.prototype.isValid.apply(this);
        var valid = validate(this.cfg);
        if (!valid) {
            throw new Error(JSON.stringify(validate.errors(this.cfg)));
        }
    }
    build() {
        this.isValid();
        return new pipeline.Stage(this.cfg.clone());
    }
    stage(_fn) {
        if (_fn) {
            var fn = _fn;
            if (!(_fn instanceof Base)) {
                if (_fn instanceof Function) {
                    fn = _fn;
                }
                else if (_fn instanceof Object) {
                    fn.cfg = new cfg(_fn);
                }
                else if (_fn instanceof Stage) {
                    fn = _fn;
                }
                else {
                    throw new Error('unsupported Stage type');
                }
            }
            this.cfg.run = fn;
        }
        return this;
    }
}
exports.fStage = fStage;
exports.Stage = function (fn) {
    return new fStage(fn);
};
//# sourceMappingURL=stage.js.map