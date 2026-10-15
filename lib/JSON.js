"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CyclicJSON = void 0;
const TypeDetectors_1 = require("./utils/TypeDetectors");
class CyclicJSON {
    static stringify(obj) {
        const seen = new Map();
        const pathMap = new Map();
        let currentPath = [];
        function getPath() {
            return currentPath.length ? '$.' + currentPath.join('.') : '$';
        }
        function processValue(value) {
            if (value === null || typeof value !== 'object') {
                return value;
            }
            if ((0, TypeDetectors_1.isBuffer)(value)) {
                return { __buffer: value.toString('base64') };
            }
            if ((0, TypeDetectors_1.isError)(value)) {
                const result = {
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
            if ((0, TypeDetectors_1.isDate)(value)) {
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
            const path = getPath();
            seen.set(value, path);
            pathMap.set(path, value);
            if (Array.isArray(value)) {
                const result = [];
                for (let i = 0; i < value.length; i++) {
                    currentPath.push(i);
                    result[i] = processValue(value[i]);
                    currentPath.pop();
                }
                return result;
            }
            else {
                const result = {};
                for (const [key, val] of Object.entries(value)) {
                    currentPath.push(key);
                    result[key] = processValue(val);
                    currentPath.pop();
                }
                return result;
            }
        }
        return JSON.stringify(processValue(obj));
    }
    static parse(text) {
        const parsed = JSON.parse(text);
        const isRefObject = (obj) => {
            return (obj !== null &&
                typeof obj === 'object' &&
                '$ref' in obj &&
                typeof obj.$ref === 'string' &&
                Object.keys(obj).length === 1);
        };
        const isBufferObject = (obj) => {
            return (obj !== null &&
                typeof obj === 'object' &&
                '__buffer' in obj &&
                typeof obj.__buffer === 'string');
        };
        const refs = [];
        const collectRefs = (obj, parent, key) => {
            if (obj === null || typeof obj !== 'object')
                return;
            if (isRefObject(obj)) {
                if (parent && key !== undefined) {
                    refs.push({ parent, key, path: obj.$ref });
                }
                return;
            }
            if (Array.isArray(obj)) {
                for (let i = 0; i < obj.length; i++) {
                    collectRefs(obj[i], obj, i);
                }
            }
            else {
                for (const [k, value] of Object.entries(obj)) {
                    collectRefs(value, obj, k);
                }
            }
        };
        const getValueByPath = (root, path) => {
            if (path === '$')
                return root;
            const parts = path.slice(2).split('.');
            let current = root;
            for (const part of parts) {
                if (current === undefined || current === null)
                    return undefined;
                current = current[part];
            }
            return current;
        };
        const processBuffers = (obj) => {
            if (obj === null || typeof obj !== 'object')
                return obj;
            if (isBufferObject(obj)) {
                return Buffer.from(obj.__buffer, 'base64');
            }
            if (Array.isArray(obj)) {
                for (let i = 0; i < obj.length; i++) {
                    obj[i] = processBuffers(obj[i]);
                }
            }
            else {
                for (const [key, value] of Object.entries(obj)) {
                    obj[key] = processBuffers(value);
                }
            }
            return obj;
        };
        processBuffers(parsed);
        collectRefs(parsed);
        for (const ref of refs) {
            const target = getValueByPath(parsed, ref.path);
            if (target !== undefined) {
                ref.parent[ref.key] = target;
            }
        }
        return parsed;
    }
}
exports.CyclicJSON = CyclicJSON;
exports.default = CyclicJSON;
//# sourceMappingURL=JSON.js.map