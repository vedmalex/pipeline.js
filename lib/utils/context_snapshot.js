"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createIsolatedStageContext = createIsolatedStageContext;
exports.commitIsolatedStageContext = commitIsolatedStageContext;
const context_1 = require("../context");
function isBufferValue(value) {
    return typeof Buffer !== 'undefined' && Buffer.isBuffer(value);
}
function isUnsupportedSnapshotObject(value) {
    return (value instanceof WeakMap ||
        value instanceof WeakSet ||
        value instanceof Promise ||
        (typeof WeakRef !== 'undefined' && value instanceof WeakRef) ||
        (typeof FinalizationRegistry !== 'undefined' && value instanceof FinalizationRegistry));
}
function assertSnapshotSupported(value) {
    if (isUnsupportedSnapshotObject(value)) {
        throw new TypeError('Unsupported timeout snapshot value: only plain objects, arrays, Map/Set, Buffer/ArrayBuffer views, Date/RegExp, and enumerable custom instances are supported');
    }
}
function cloneArrayBufferView(value) {
    if (isBufferValue(value)) {
        return Buffer.from(value);
    }
    if (value instanceof DataView) {
        return new DataView(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength));
    }
    const Ctor = value.constructor;
    return new Ctor(value);
}
function cloneValue(value, seen) {
    if (value === null || typeof value !== 'object') {
        return value;
    }
    if (typeof value === 'function') {
        return value;
    }
    if (!seen) {
        seen = new WeakMap();
    }
    assertSnapshotSupported(value);
    if (context_1.Context.isContext(value)) {
        return cloneValue(value.toObject(), seen);
    }
    if (seen.has(value)) {
        return seen.get(value);
    }
    if (Array.isArray(value)) {
        const cloned = [];
        seen.set(value, cloned);
        for (const item of value) {
            cloned.push(cloneValue(item, seen));
        }
        return cloned;
    }
    if (value instanceof Map) {
        const cloned = new Map();
        seen.set(value, cloned);
        for (const [key, item] of Array.from(value.entries())) {
            cloned.set(cloneValue(key, seen), cloneValue(item, seen));
        }
        return cloned;
    }
    if (value instanceof Set) {
        const cloned = new Set();
        seen.set(value, cloned);
        for (const item of Array.from(value.values())) {
            cloned.add(cloneValue(item, seen));
        }
        return cloned;
    }
    if (value instanceof ArrayBuffer) {
        return value.slice(0);
    }
    if (ArrayBuffer.isView(value)) {
        return cloneArrayBufferView(value);
    }
    if (value instanceof Date) {
        return new Date(value.getTime());
    }
    if (value instanceof RegExp) {
        return new RegExp(value.source, value.flags);
    }
    const cloned = Object.create(Object.getPrototypeOf(value));
    seen.set(value, cloned);
    for (const key of Reflect.ownKeys(value)) {
        ;
        cloned[key] = cloneValue(value[key], seen);
    }
    return cloned;
}
function toPlainStageObject(ctx) {
    if (context_1.Context.isContext(ctx)) {
        return ctx.toObject();
    }
    return ctx;
}
function syncObject(target, source) {
    if (Array.isArray(target) && Array.isArray(source)) {
        target.length = 0;
        for (const item of source) {
            target.push(cloneValue(item));
        }
        return;
    }
    const targetKeys = Object.keys(target !== null && target !== void 0 ? target : {});
    const sourceKeys = Object.keys(source !== null && source !== void 0 ? source : {});
    const sourceKeySet = new Set(sourceKeys);
    for (const key of targetKeys) {
        if (!sourceKeySet.has(key)) {
            delete target[key];
        }
    }
    for (const key of sourceKeys) {
        target[key] = cloneValue(source[key]);
    }
}
function syncMap(target, source) {
    target.clear();
    for (const [key, value] of Array.from(source.entries())) {
        target.set(cloneValue(key), cloneValue(value));
    }
}
function syncSet(target, source) {
    target.clear();
    for (const value of Array.from(source.values())) {
        target.add(cloneValue(value));
    }
}
function commitValue(target, source) {
    if (!target || typeof target !== 'object') {
        return cloneValue(source);
    }
    if (Array.isArray(target) && Array.isArray(source)) {
        syncObject(target, source);
        return target;
    }
    if (target instanceof Map && source instanceof Map) {
        syncMap(target, source);
        return target;
    }
    if (target instanceof Set && source instanceof Set) {
        syncSet(target, source);
        return target;
    }
    if (target instanceof ArrayBuffer && source instanceof ArrayBuffer) {
        return cloneValue(source);
    }
    if (ArrayBuffer.isView(target) && ArrayBuffer.isView(source)) {
        return cloneValue(source);
    }
    syncObject(target, source);
    return target;
}
function createIsolatedStageContext(ctx) {
    const cloned = cloneValue(toPlainStageObject(ctx));
    return context_1.Context.isContext(ctx) ? context_1.Context.ensure(cloned) : cloned;
}
function commitIsolatedStageContext(target, source) {
    const plainSource = cloneValue(toPlainStageObject(source));
    return commitValue(target, plainSource);
}
//# sourceMappingURL=context_snapshot.js.map