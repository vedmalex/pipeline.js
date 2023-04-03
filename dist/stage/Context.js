"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Context = exports.RESERVED = exports.RESERVATIONS = exports.ProxySymbol = exports.OriginalObject = exports.ContextSymbol = void 0;
const lodash_1 = require("lodash");
exports.ContextSymbol = Symbol('Context');
exports.OriginalObject = Symbol('OriginalObject');
exports.ProxySymbol = Symbol('Handler');
var count = 0;
var allContexts = {};
var RESERVATIONS;
(function (RESERVATIONS) {
    RESERVATIONS[RESERVATIONS["prop"] = 0] = "prop";
    RESERVATIONS[RESERVATIONS["func_this"] = 1] = "func_this";
    RESERVATIONS[RESERVATIONS["func_ctx"] = 2] = "func_ctx";
})(RESERVATIONS = exports.RESERVATIONS || (exports.RESERVATIONS = {}));
exports.RESERVED = {
    getParent: RESERVATIONS.func_ctx,
    getRoot: RESERVATIONS.func_ctx,
    setParent: RESERVATIONS.func_ctx,
    setRoot: RESERVATIONS.func_ctx,
    toString: RESERVATIONS.func_ctx,
    original: RESERVATIONS.prop,
    __parent: RESERVATIONS.prop,
    __root: RESERVATIONS.prop,
    __stack: RESERVATIONS.prop,
    hasChild: RESERVATIONS.func_ctx,
    hasSubtree: RESERVATIONS.func_ctx,
    ensure: RESERVATIONS.func_ctx,
    addChild: RESERVATIONS.func_ctx,
    addSubtree: RESERVATIONS.func_ctx,
    toJSON: RESERVATIONS.func_ctx,
    toObject: RESERVATIONS.func_ctx,
    fork: RESERVATIONS.func_this,
    get: RESERVATIONS.func_this,
    allContexts: RESERVATIONS.func_this,
};
class Context {
    static ensure(_config) {
        if (Context.isContext(_config)) {
            return _config;
        }
        else {
            if (typeof _config === 'object' && _config !== null) {
                return this.create(_config);
            }
            else {
                return this.create();
            }
        }
    }
    static create(input) {
        return new Context((input !== null && input !== void 0 ? input : {}));
    }
    static isContext(obj) {
        return typeof obj == 'object' && obj !== null ? obj[exports.ContextSymbol] : false;
    }
    get original() {
        return this.ctx;
    }
    constructor(config) {
        this.ctx = config;
        this.id = count++;
        allContexts[this.id] = this;
        const res = new Proxy(this, {
            get(target, key, _proxy) {
                var _a;
                if (key == exports.ContextSymbol)
                    return true;
                if (key == exports.ProxySymbol)
                    return _proxy;
                if (key == 'allContexts')
                    return allContexts;
                if (!(key in exports.RESERVED)) {
                    if (key in target.ctx) {
                        return target.ctx[key];
                    }
                    else {
                        return (_a = target.__parent) === null || _a === void 0 ? void 0 : _a[key];
                    }
                }
                else {
                    if (exports.RESERVED[key] == RESERVATIONS.func_ctx) {
                        return target[key].bind(target);
                    }
                    if (exports.RESERVED[key] == RESERVATIONS.func_this) {
                        return target[key].bind(target);
                    }
                    else
                        return target[key];
                }
            },
            set(target, key, value) {
                if (!(key in exports.RESERVED)) {
                    target.ctx[key] = value;
                    return true;
                }
                else if (typeof key == 'string' &&
                    key in exports.RESERVED &&
                    exports.RESERVED[key] != RESERVATIONS.prop) {
                    return false;
                }
                else {
                    target[key] = value;
                    return true;
                }
            },
            deleteProperty(target, key) {
                if (!(key in exports.RESERVED)) {
                    return delete target.ctx[key];
                }
                else {
                    return false;
                }
            },
            has(target, key) {
                if (!(key in exports.RESERVED)) {
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
                    return [...Reflect.ownKeys(target.ctx), ...Reflect.ownKeys(target.__parent)];
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
        if (Context.isContext(child)) {
            if (!this.hasChild(child)) {
                child.setParent(this.proxy);
            }
            return child;
        }
        else
            return child;
    }
    get(path) {
        var root = (0, lodash_1.get)(this.ctx, path);
        if (root instanceof Object) {
            var result = root;
            if (!Context.isContext(result)) {
                var lctx = Context.ensure(result);
                this.addSubtree(lctx);
                (0, lodash_1.set)(this.original, path, lctx);
                result = lctx;
            }
            return result;
        }
        else {
            return root;
        }
    }
    addSubtree(lctx) {
        if (Context.isContext(lctx)) {
            if (!this.hasSubtree(lctx)) {
                lctx.setRoot(this.proxy);
            }
            return lctx;
        }
        else {
            return lctx;
        }
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
            return ctx.__parent == this.proxy || this.proxy == ctx;
        }
        else {
            return false;
        }
    }
    hasSubtree(ctx) {
        if (Context.isContext(ctx) && ctx.__root) {
            return ctx.__root == this.proxy || this.proxy == ctx;
        }
        else {
            return false;
        }
    }
    toObject() {
        const obj = {};
        (0, lodash_1.defaultsDeep)(obj, this.ctx);
        if (this.__parent) {
            (0, lodash_1.defaultsDeep)(obj, this.__parent.toObject());
        }
        return obj;
    }
    toJSON() {
        return JSON.stringify(this.toObject());
    }
    toString() {
        return '[pipeline Context]';
    }
}
exports.Context = Context;
//# sourceMappingURL=Context.js.map