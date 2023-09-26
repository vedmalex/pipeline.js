var promise = require('mpromise')
var pipeline = require('pipeline.js')
var Stage = pipeline.Stage
var schema = require('js-schema')
var util = require('util')
var Base = require('./base.js')
var fStage = require('./stage.js').fStage
var cfg = require('./cfg.js')
const fBase = require('./base.js')

var validate = schema({
  stage: [Stage],
  prepare: [null, Function],
  finalize: [null, Function],
})

class fWrap extends fBase {
  constructor(stage) {
    Base.apply(this)
    this.stage(stage)
  }
  isValid() {
    fWrap.super_.prototype.isValid.apply(this)
    var valid = validate(this.cfg)
    if (!valid) {
      throw new Error(JSON.stringify(validate.errors(this.cfg)))
    }
  }
  build() {
    if (this.cfg.stage instanceof Base) {
      this.cfg.stage = this.cfg.stage.build()
    }
    this.isValid()
    return new pipeline.Wrap(this.cfg.clone())
  }
  stage(_fn) {
    if (_fn) {
      var fn = _fn
      if (!(_fn instanceof Base)) {
        if (_fn instanceof Function) {
          fn = new fStage(_fn)
        } else if (_fn instanceof Object) {
          fn = new fStage()
          fn.cfg = new cfg(_fn)
        } else if (_fn instanceof Stage) {
          fn = _fn
        } else {
          throw new Error('unsupported Stage type')
        }
      }
      this.cfg.stage = fn
    }
    return this
  }
  prepare(fn) {
    this.cfg.prepare = fn
    return this
  }
  finalize(fn) {
    this.cfg.finalize = fn
    return this
  }
}

exports.fWrap = fWrap

exports.Wrap = function (stage) {
  return new fWrap(stage)
}
