/**
 * Extracts symbolic name of the class if exists
 * @api private
 * @param {Object} v source object
 * @return {String}
 */
function extractType(v) {
  var ts = Object.prototype.toString;
  return ts.call(v).match(/\[object (.+)\]/)[1];
}

/**
 * Make clone of object and optionally clean it from not direct descendants of `Object`
 * @api private
 * @param {Object|any} src source
 * @param {Boolean} [clean] wheather or not to clean object
 * @return {Object|any}
 */
function clone(src, clean) {
  var type = extractType(src);
  switch (type) {
    case 'Boolean':
    case 'String':
    case 'Number':
      return src;
    case 'RegExp':
      return new RegExp(src.toString());
    case 'Date':
      return new Date(Number(src));
    case 'Object':
      if (src.toObject instanceof Function) {
        return src.toObject();
      } else {
        if (src.constructor === Object) {
          var obj = {};
          for (var p in src) {
            obj[p] = clone(src[p]);
          }
          return obj;
        } else {
          return clean ? undefined : src;
        }
      }
      break;
    case 'Array':
      var res = [];
      for (var i = 0, len = src.length; i < len; i++) {
        res.push(clone(src[i], clean));
      }
      return res;
    case 'Undefined':
    case 'Null':
      return src;
    default:
  }
}

exports.clone = clone;