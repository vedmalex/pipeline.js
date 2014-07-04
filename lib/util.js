/*!
 * Module dependency
 */
exports.Util = {};
exports.Util.getClass = function(obj) {
  if(obj && typeof obj === 'object' && Object.prototype.toString.call(obj) !== '[object Array]' && obj.constructor && obj !== global) {
    var res = obj.constructor.toString().match(/function\s*(\w+)\s*\(/);
    if(res && res.length === 2) {
      return res[1];
    }
  }
  return false;
};
exports.Util.inherits = function (ctor, superCtor) {
    ctor.super_ = superCtor;
    ctor.prototype = Object.create(superCtor.prototype, {
        constructor: {
            value: ctor,
            enumerable: false
        }
    });
};