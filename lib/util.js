/*!
 * Module dependency
 */
exports.Util = {};
exports.Util.getClass = function(obj) {
  if (obj && typeof obj === 'object' && Object.prototype.toString.call(obj) !== '[object Array]' && obj.constructor && obj !== global) {
    var res = obj.constructor.toString().match(/function\s*(\w+)\s*\(/);
    if (res && res.length === 2) {
      return res[1];
    }
  }
  return false;
};
exports.Util.inherits = function(ctor, superCtor) {
  ctor.super_ = superCtor;
  ctor.prototype = Object.create(superCtor.prototype, {
    constructor: {
      value: ctor,
      enumerable: false
    }
  });
};

/*!
 * failproff wrapper for Sync call
 */
function failproofSyncCall(handleError, _this, _fn, finalize) {
  var fn = function() {
    var failed = false;
    var args = Array.prototype.slice.call(arguments);
    try {
      _fn.apply(_this, args);
    } catch (err) {
      failed = true;
      handleError(err);
    }
    if (!failed) {
      finalize();
    }
  };
  return function() {
    // посмотреть может быть нужно убрать setImmediate?!
    var args = Array.prototype.slice.call(arguments);
    args.unshift(fn);
    setImmediate.apply(null, args);
  };
}

exports.failproofSyncCall = failproofSyncCall;

/*!
 * failproff wrapper for Async call
 */
function failproofAsyncCall(handleError, _this, _fn) {
  var fn = function() {
    var args = Array.prototype.slice.call(arguments);
    try {
      _fn.apply(_this, args);
    } catch (err) {
      handleError(err);
    }
  };
  return function() {
    // посмотреть может быть нужно убрать setImmediate?!
    var args = Array.prototype.slice.call(arguments);
    args.unshift(fn);
    setImmediate.apply(null, args);
  };
}

exports.failproofAsyncCall = failproofAsyncCall;

function ErrorList(list) {
  var self = this;
  if (!(self instanceof ErrorList)) {
    throw new Error('constructor is not a function');
  }
  Error.apply(self);
  self.message = "Complex Error";
  self.errors = list;
}

ErrorList.prototype.errors = undefined;
exports.Util.inherits(ErrorList, Error);

exports.ErrorList = ErrorList;