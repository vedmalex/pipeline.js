"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CyclicJSON = void 0;
var CyclicJSON = (function () {
    function CyclicJSON() {
    }
    CyclicJSON.stringify = function (obj) {
        var seen = new Map();
        var pathMap = new Map();
        var currentPath = [];
        function getPath() {
            return currentPath.length ? '$.' + currentPath.join('.') : '$';
        }
        function processValue(value) {
            if (value === null || typeof value !== 'object') {
                return value;
            }
            if (Buffer.isBuffer(value)) {
                return { __buffer: value.toString('base64') };
            }
            if (value instanceof Error) {
                var result = {
                    name: value.name,
                    message: value.message,
                };
                if (value.stack) {
                    result.stack = value.stack;
                }
                if (value.cause) {
                    result.cause = processValue(value.cause);
                }
                return result;
            }
            if (value instanceof Date) {
                return value.toISOString();
            }
            if (typeof value.toJSON === 'function') {
                try {
                    return value.toJSON();
                }
                catch (err) {
                }
            }
            if (seen.has(value)) {
                return { $ref: seen.get(value) };
            }
            var path = getPath();
            seen.set(value, path);
            pathMap.set(path, value);
            if (Array.isArray(value)) {
                var result = [];
                for (var i = 0; i < value.length; i++) {
                    currentPath.push(i);
                    result[i] = processValue(value[i]);
                    currentPath.pop();
                }
                return result;
            }
            else {
                var result = {};
                for (var _i = 0, _a = Object.entries(value); _i < _a.length; _i++) {
                    var _b = _a[_i], key = _b[0], val = _b[1];
                    currentPath.push(key);
                    result[key] = processValue(val);
                    currentPath.pop();
                }
                return result;
            }
        }
        return JSON.stringify(processValue(obj));
    };
    CyclicJSON.parse = function (text) {
        var parsed = JSON.parse(text);
        var isRefObject = function (obj) {
            return (obj !== null &&
                typeof obj === 'object' &&
                '$ref' in obj &&
                typeof obj.$ref === 'string' &&
                Object.keys(obj).length === 1);
        };
        var isBufferObject = function (obj) {
            return (obj !== null &&
                typeof obj === 'object' &&
                '__buffer' in obj &&
                typeof obj.__buffer === 'string');
        };
        var refs = [];
        var collectRefs = function (obj, parent, key) {
            if (obj === null || typeof obj !== 'object')
                return;
            if (isRefObject(obj)) {
                if (parent && key !== undefined) {
                    refs.push({ parent: parent, key: key, path: obj.$ref });
                }
                return;
            }
            if (Array.isArray(obj)) {
                for (var i = 0; i < obj.length; i++) {
                    collectRefs(obj[i], obj, i);
                }
            }
            else {
                for (var _i = 0, _a = Object.entries(obj); _i < _a.length; _i++) {
                    var _b = _a[_i], k = _b[0], value = _b[1];
                    collectRefs(value, obj, k);
                }
            }
        };
        var getValueByPath = function (root, path) {
            if (path === '$')
                return root;
            var parts = path.slice(2).split('.');
            var current = root;
            for (var _i = 0, parts_1 = parts; _i < parts_1.length; _i++) {
                var part = parts_1[_i];
                if (current === undefined || current === null)
                    return undefined;
                current = current[part];
            }
            return current;
        };
        var processBuffers = function (obj) {
            if (obj === null || typeof obj !== 'object')
                return obj;
            if (isBufferObject(obj)) {
                return Buffer.from(obj.__buffer, 'base64');
            }
            if (Array.isArray(obj)) {
                for (var i = 0; i < obj.length; i++) {
                    obj[i] = processBuffers(obj[i]);
                }
            }
            else {
                for (var _i = 0, _a = Object.entries(obj); _i < _a.length; _i++) {
                    var _b = _a[_i], key = _b[0], value = _b[1];
                    obj[key] = processBuffers(value);
                }
            }
            return obj;
        };
        processBuffers(parsed);
        collectRefs(parsed);
        for (var _i = 0, refs_1 = refs; _i < refs_1.length; _i++) {
            var ref = refs_1[_i];
            var target = getValueByPath(parsed, ref.path);
            if (target !== undefined) {
                ref.parent[ref.key] = target;
            }
        }
        return parsed;
    };
    return CyclicJSON;
}());
exports.CyclicJSON = CyclicJSON;
exports.default = CyclicJSON;
//# sourceMappingURL=JSON.js.map