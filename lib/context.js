"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Context = exports.RESERVATIONS = exports.CurrentStage = exports.ProxySymbol = exports.OriginalObject = exports.ContextSymbol = void 0;
const lodash_1 = require("lodash");
const TypeDetectors_1 = require("./utils/TypeDetectors");
const JSON_1 = __importDefault(require("./JSON"));
exports.ContextSymbol = Symbol('Context');
exports.OriginalObject = Symbol('OriginalObject');
exports.ProxySymbol = Symbol('Handler');
exports.CurrentStage = Symbol('CurrentStage');
exports.RESERVATIONS = {
    prop: 0,
    func_this: 1,
    func_ctx: 2,
};
const RESERVED = {
    getParent: exports.RESERVATIONS.func_ctx,
    getRoot: exports.RESERVATIONS.func_ctx,
    setParent: exports.RESERVATIONS.func_ctx,
    setRoot: exports.RESERVATIONS.func_ctx,
    toString: exports.RESERVATIONS.func_ctx,
    original: exports.RESERVATIONS.prop,
    __id: exports.RESERVATIONS.prop,
    __parent: exports.RESERVATIONS.prop,
    __root: exports.RESERVATIONS.prop,
    __stack: exports.RESERVATIONS.prop,
    __current: exports.RESERVATIONS.prop,
    hasChild: exports.RESERVATIONS.func_ctx,
    hasSubtree: exports.RESERVATIONS.func_ctx,
    ensure: exports.RESERVATIONS.func_ctx,
    addChild: exports.RESERVATIONS.func_ctx,
    addSubtree: exports.RESERVATIONS.func_ctx,
    toJSON: exports.RESERVATIONS.func_ctx,
    toJSONSafe: exports.RESERVATIONS.func_ctx,
    toObject: exports.RESERVATIONS.func_ctx,
    fork: exports.RESERVATIONS.func_this,
    get: exports.RESERVATIONS.func_this,
    allContexts: exports.RESERVATIONS.func_this,
};
var count = 0;
var allContexts = {};
const _contextRegistry = new FinalizationRegistry((id) => {
    delete allContexts[id];
});
class Context {
    static ensure(_config) {
        if (Context.isContext(_config)) {
            return _config;
        }
        else {
            return new Context(_config !== null && _config !== void 0 ? _config : {});
        }
    }
    static isContext(obj) {
        var _a;
        return obj ? ((_a = obj[exports.ContextSymbol]) !== null && _a !== void 0 ? _a : false) : false;
    }
    get original() {
        return this.ctx;
    }
    constructor(config) {
        this.ctx = config;
        this.__id = count++;
        const ref = new WeakRef(this);
        allContexts[this.__id] = ref;
        _contextRegistry.register(this, String(this.__id));
        const res = new Proxy(this, {
            get(target, key, _proxy) {
                var _a;
                if (key == exports.ContextSymbol)
                    return true;
                if (key == exports.CurrentStage)
                    return target.__current;
                if (key == exports.ProxySymbol)
                    return _proxy;
                if (key == 'allContexts') {
                    const live = {};
                    for (const id in allContexts) {
                        const ctx = allContexts[id].deref();
                        if (ctx !== undefined)
                            live[id] = ctx;
                    }
                    return live;
                }
                if (!(key in RESERVED)) {
                    if (key in target.ctx) {
                        return target.ctx[key];
                    }
                    else {
                        return (_a = target.__parent) === null || _a === void 0 ? void 0 : _a[key];
                    }
                }
                else {
                    if (RESERVED[key] == exports.RESERVATIONS.func_ctx) {
                        return target[key].bind(target);
                    }
                    if (RESERVED[key] == exports.RESERVATIONS.func_this) {
                        return target[key].bind(target);
                    }
                    else
                        return target[key];
                }
            },
            set(target, key, value) {
                if (key == exports.CurrentStage) {
                    target.__current = value;
                    return true;
                }
                if (!(key in RESERVED)) {
                    ;
                    target.ctx[key] = value;
                    return true;
                }
                else if (typeof key == 'string' &&
                    key in RESERVED &&
                    RESERVED[key] != exports.RESERVATIONS.prop) {
                    return false;
                }
                else {
                    ;
                    target[key] = value;
                    return true;
                }
            },
            deleteProperty(target, key) {
                if (!(key in RESERVED)) {
                    return delete target.ctx[key];
                }
                else {
                    return false;
                }
            },
            has(target, key) {
                if (!(key in RESERVED)) {
                    if (target.__parent) {
                        return key in target.ctx || key in target.__parent;
                    }
                    else {
                        return key in target.ctx;
                    }
                }
                else {
                    return false;
                }
            },
            ownKeys(target) {
                if (target.__parent) {
                    const ownKeys = Reflect.ownKeys(target.ctx);
                    const parentKeys = Reflect.ownKeys(target.__parent);
                    const allKeys = [...ownKeys];
                    for (const key of parentKeys) {
                        if (!ownKeys.includes(key)) {
                            allKeys.push(key);
                        }
                    }
                    return allKeys;
                }
                else {
                    return Reflect.ownKeys(target.ctx);
                }
            },
        });
        this.proxy = res;
        return res;
    }
    fork(ctx) {
        var child = Context.ensure(ctx);
        this.addChild(child);
        return child;
    }
    addChild(child) {
        if (!this.hasChild(child)) {
            child.setParent(this.proxy);
        }
        return child;
    }
    get(path) {
        var root = (0, lodash_1.get)(this.ctx, path);
        if ((0, TypeDetectors_1.isObject)(root)) {
            var result = root;
            if (!Context.isContext(result)) {
                var lctx = Context.ensure(result);
                this.addSubtree(lctx);
                (0, lodash_1.set)(this, path, lctx);
                result = lctx;
            }
            return result;
        }
        else {
            return root;
        }
    }
    addSubtree(lctx) {
        if (!this.hasSubtree(lctx)) {
            lctx.setRoot(this.proxy);
        }
        return lctx;
    }
    getParent() {
        return this.__parent;
    }
    getRoot() {
        return this.__root;
    }
    setParent(parent) {
        this.__parent = parent;
    }
    setRoot(root) {
        this.__root = root;
    }
    hasChild(ctx) {
        if (Context.isContext(ctx) && ctx.__parent) {
            return (ctx.__parent == this.proxy ||
                this.proxy == ctx);
        }
        else {
            return false;
        }
    }
    hasSubtree(ctx) {
        if (Context.isContext(ctx) && ctx.__root) {
            return (ctx.__root == this.proxy ||
                this.proxy == ctx);
        }
        else {
            return false;
        }
    }
    toObject(visited) {
        if (!visited) {
            visited = new Set();
        }
        if (visited.has(this)) {
            return { __circularRef: true, id: this.__id };
        }
        visited.add(this);
        let obj = {};
        if (this.__parent && !visited.has(this.__parent)) {
            obj = this.__parent.toObject(visited);
        }
        for (const key in this.ctx) {
            if (this.ctx.hasOwnProperty(key)) {
                obj[key] = this.ctx[key];
            }
        }
        return obj;
    }
    toJSON() {
        try {
            return JSON.stringify(this.toObject());
        }
        catch (error) {
            if ((0, TypeDetectors_1.isTypeError)(error) &&
                (error.message.includes('circular') ||
                    error.message.includes('cyclic'))) {
                return JSON_1.default.stringify(this.toObject());
            }
            throw error;
        }
    }
    toJSONSafe() {
        return JSON_1.default.stringify(this.toObject());
    }
    toString() {
        return '[pipeline Context]';
    }
}
exports.Context = Context;
//# sourceMappingURL=context.js.map