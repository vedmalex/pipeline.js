"use strict";
function extractType(v) {
    var ts = Object.prototype.toString;
    return ts.call(v).match(/\[object (.+)\]/)[1];
}
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
            }
            else {
                if (src.constructor === Object) {
                    var obj = {};
                    for (var p in src) {
                        obj[p] = clone(src[p]);
                    }
                    return obj;
                }
                else {
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
//# sourceMappingURL=util.js.map