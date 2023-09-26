var promise = require('mpromise')
var pipeline = require('pipeline.js')
var Stage = pipeline.Stage
var schema = require('js-schema')
var util = require('util')
var Base = require('./base.js')
var fStage = require('./stage.js').fStage
var cfg = require('./cfg.js')
const fBase = require('./base.js')

var validateCase = schema({
  evaluate: [null, Boolean, Function],
  stage: [Function, Stage, Object],
  split: [null, Function],
  combine: [null, Function],
})

var validate = schema({
  cases: Array.of[validateCase],
  split: [null, Function],
  combine: [null, Function],
})

class fMultiWaySwitch extends fBase {
  constructor() {
    Base.apply(this)
  }
  isValid() {
    fMultiWaySwitch.super_.prototype.isValid.apply(this)
    var valid = validate(this.cfg)
    if (!valid) {
      throw new Error(JSON.stringify(validate.errors(this.cfg)))
    }
  }
  build() {
    this.cfg.cases = this.cfg.cases
      .map(function (cs) {
        if (cs instanceof fCase) {
          return cs.build()
        }
      })
      .filter(function (cs) {
        return cs
      })
    this.isValid()
    return new pipeline.MultiWaySwitch(this.cfg.clone())
  }
  case(_cs) {
    if (_cs) {
      var cs = _cs
      if (!(_cs instanceof fCase)) {
        if (_cs instanceof Function) {
          cs = new fCase(_cs)
        } else if (_cs instanceof Object) {
          cs = new fCase()
          cs.cfg = new cfg(_cs)
        } else if (_cs instanceof Stage) {
          cs = _cs
        } else {
          throw new Error('unsupported Stage type')
        }
      }
      if (!this.cfg.cases) {
        this.cfg.cases = []
      }
      this.cfg.cases = this.cfg.cases.concat(cs)
    }
    return this
  }
  split(fn) {
    this.cfg.split = fn
    return this
  }
  combine(fn) {
    this.cfg.combine = fn
    return this
  }
}

exports.fMultiWaySwitch = fMultiWaySwitch

exports.MWS = function () {
  return new fMultiWaySwitch()
}

class fCase {
  constructor(stage) {
    this.cfg = new cfg()
    this.stage(stage)
  }
  evaluate(fn) {
    this.cfg.evaluate = fn
    return this
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
  split(fn) {
    this.cfg.split = fn
    return this
  }
  combine(fn) {
    this.cfg.combine = fn
    return this
  }
  build(fn) {
    if (this.cfg.stage && this.cfg.stage instanceof Base) {
      this.cfg.stage = this.cfg.stage.build()
    }
    return this.cfg.clone()
  }
}

exports.MWCase = function (fn) {
  return new fCase(fn)
}

exports.fCase = fCase
