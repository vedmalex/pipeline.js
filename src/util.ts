/*!
 * Module dependency
 */
exports.Util = {}
exports.Util.getClass = function (obj) {
  if (
    obj &&
    typeof obj === 'object' &&
    Object.prototype.toString.call(obj) !== '[object Array]' &&
    obj.constructor &&
    obj !== global
  ) {
    var res = obj.constructor.toString().match(/function\s*(\w+)\s*\(/)
    if (res && res.length === 2) {
      return res[1]
    }
  }
  return false
}
exports.Util.inherits = function (ctor, superCtor) {
  ctor.super_ = superCtor
  ctor.prototype = Object.create(superCtor.prototype, {
    constructor: {
      value: ctor,
      enumerable: false,
    },
  })
}

/*!
 * failproff wrapper for Sync call
 */
function failproofSyncCall(handleError, _this, _fn, finalize) {
  var fn = function () {
    var failed = false
    var args = Array.prototype.slice.call(arguments)
    try {
      _fn.apply(_this, args)
    } catch (err) {
      failed = true
      handleError(err, _fn.length === 1 ? args[0] : _this, finalize)
    }
    if (!failed) {
      finalize()
    }
  }
  return fn
  /*return function() {
    // посмотреть может быть нужно убрать setImmediate?!
    var args = Array.prototype.slice.call(arguments);
    args.unshift(fn);
    setImmediate.apply(null, args);
  };*/
}

exports.failproofSyncCall = failproofSyncCall

/*!
 * failproff wrapper for Async call
 */
function failproofAsyncCall(handleError, _this, _fn) {
  var fn = function () {
    var args = Array.prototype.slice.call(arguments)
    try {
      _fn.apply(_this, args)
    } catch (err) {
      handleError(
        err,
        _fn.length === 2 ? args[0] : args[1],
        _fn.length === 2 ? args[1] : args[2],
      )
    }
  }
  return fn
  /*return function() {
    // посмотреть может быть нужно убрать setImmediate?!
    var args = Array.prototype.slice.call(arguments);
    args.unshift(fn);
    setImmediate.apply(null, args);
  };*/
}

exports.failproofAsyncCall = failproofAsyncCall

/**
 * Extracts symbolic name of the class if exists
 * @api private
 * @param {Object} v source object
 * @return {String}
 */
function extractType(v) {
  var ts = Object.prototype.toString
  return ts.call(v).match(/\[object (.+)\]/)[1]
}

/**
 * Make clone of object and optionally clean it from not direct descendants of `Object`
 * @api private
 * @param {Object|any} src source
 * @param {Boolean} [clean] wheather or not to clean object
 * @return {Object|any}
 */
export function clone(src, clean?) {
  var type = extractType(src)
  switch (type) {
    case 'Boolean':
    case 'String':
    case 'Number':
      return src
    case 'RegExp':
      return new RegExp(src.toString())
    case 'Date':
      return new Date(Number(src))
    case 'Object':
      if (src.toObject instanceof Function) {
        return src.toObject()
      } else {
        if (src.constructor === Object) {
          var obj = {}
          for (var p in src) {
            obj[p] = clone(src[p], clean)
          }
          return obj
        } else {
          return clean ? undefined : src
        }
      }
      break
    case 'Array':
      var res = []
      for (var i = 0, len = src.length; i < len; i++) {
        res.push(clone(src[i], clean))
      }
      return res
    case 'Undefined':
    case 'Null':
      return src
    default:
  }
}
