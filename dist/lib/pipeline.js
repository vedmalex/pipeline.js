"use strict";
var promise = require('mpromise');
var pipeline = require('pipeline.js');
var Stage = pipeline.Stage;
var schema = require('js-schema');
var util = require('util');
var Base = require('./base.js');
var fStage = require('./stage.js').fStage;
var cfg = require('./cfg.js');
const fBase = require('./base.js');
var validate = schema({
    stages: Array.of([Stage]),
});
class fPipeline extends fBase {
    constructor(stage) {
        Base.apply(this);
        this.stage(stage);
    }
    isValid() {
        fPipeline.super_.prototype.isValid.apply(this);
        var valid = validate(this.cfg);
        if (!valid) {
            throw new Error(JSON.stringify(validate.errors(this.cfg)));
        }
    }
    build() {
        this.cfg.stages = this.cfg.stages
            .map(function (st) {
            if (st instanceof Base) {
                return st.build();
            }
            else if (st instanceof Stage) {
                return st;
            }
        })
            .filter(function (st) {
            return st;
        });
        this.isValid();
        return new pipeline.Pipeline(this.cfg.clone());
    }
    stage(_fn) {
        if (_fn) {
            var fn = _fn;
            if (!(_fn instanceof Base)) {
                if (_fn instanceof Function) {
                    fn = new fStage(_fn);
                }
                else if (_fn instanceof Object) {
                    fn = new fStage();
                    fn.cfg = new cfg(_fn);
                }
                else if (_fn instanceof Stage) {
                    fn = _fn;
                }
                else {
                    throw new Error('unsupported Stage type');
                }
            }
            if (!this.cfg.stages)
                this.cfg.stages = [];
            this.cfg.stages = this.cfg.stages.concat(fn);
        }
        return this;
    }
}
exports.Pipeline = function (stage) {
    return new fPipeline(stage);
};
exports.fPipeline = fPipeline;
//# sourceMappingURL=pipeline.js.map