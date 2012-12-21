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