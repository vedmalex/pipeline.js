"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextFactory = exports.RESERVATIONS = exports.ProxySymbol = exports.ContextSymbol = void 0;
const lodash_1 = require("lodash");
exports.ContextSymbol = Symbol('Context');
exports.ProxySymbol = Symbol('Handler');
var RESERVATIONS;
(function (RESERVATIONS) {
    RESERVATIONS[RESERVATIONS["prop"] = 0] = "prop";
    RESERVATIONS[RESERVATIONS["func_this"] = 1] = "func_this";
    RESERVATIONS[RESERVATIONS["func_ctx"] = 2] = "func_ctx";
})(RESERVATIONS = exports.RESERVATIONS || (exports.RESERVATIONS = {}));
const RESERVED = {
    getParent: RESERVATIONS.func_ctx,
    setParent: RESERVATIONS.func_ctx,
    toString: RESERVATIONS.func_ctx,
    __parent: RESERVATIONS.prop,
    __stack: RESERVATIONS.prop,
    hasChild: RESERVATIONS.func_ctx,
    ensure: RESERVATIONS.func_ctx,
    ensureIsChild: RESERVATIONS.func_ctx,
    addChild: RESERVATIONS.func_ctx,
    toJSON: RESERVATIONS.func_ctx,
    toObject: RESERVATIONS.func_ctx,
    fork: RESERVATIONS.func_this,
    overwrite: RESERVATIONS.func_ctx,
    get: RESERVATIONS.func_this,
};
class ContextFactory {
    constructor(config) {
        this.ctx = config;
        const res = new Proxy(this, {
            get(target, key, _proxy) {
                if (key == exports.ContextSymbol)
                    return true;
                if (key == exports.ProxySymbol)
                    return _proxy;
                if (!RESERVED.hasOwnProperty(key)) {
                    return target.ctx[key];
                }
                else {
                    if (RESERVED[key] == RESERVATIONS.func_ctx) {
                        return target[key].bind(target);
                    }
                    if (RESERVED[key] == RESERVATIONS.func_this) {
                        return target[key];
                    }
                    else
                        return target[key];
                }
            },
            set(target, key, value) {
                if (!RESERVED.hasOwnProperty(key)) {
                    ;
                    target.ctx[key] = value;
                    return true;
                }
                else if (typeof key == 'string' &&
                    RESERVED.hasOwnProperty(key) &&
                    RESERVED[key] != RESERVATIONS.prop) {
                    return false;
                }
                else {
                    ;
                    target[key] = value;
                    return true;
                }
            },
            deleteProperty(target, key) {
                if (!RESERVED.hasOwnProperty(key)) {
                    return delete target.ctx[key];
                }
                else {
                    return false;
                }
            },
            has(target, key) {
                if (!RESERVED.hasOwnProperty(key)) {
                    return key in target.ctx;
                }
                else {
                    return false;
                }
            },
            ownKeys(target) {
                return Reflect.ownKeys(target.ctx);
            },
        });
        this.proxy = res;
        return res;
    }
    static ensure(_config) {
        if (ContextFactory.isContext(_config)) {
            return _config;
        }
        else {
            return new ContextFactory(_config !== null && _config !== void 0 ? _config : {});
        }
    }
    static isContext(obj) {
        return obj ? obj[exports.ContextSymbol] : false;
    }
    fork(config) {
        var child = ContextFactory.ensure(config);
        this.addChild(child);
        lodash_1.defaultsDeep(child, this.toObject());
        return child;
    }
    get(path) {
        var root = lodash_1.get(this, path);
        if (root instanceof Object) {
            var result = root;
            if (!ContextFactory.isContext(result)) {
                result = this.ensureIsChild(result);
                lodash_1.set(this, path, result);
            }
            return result;
        }
    }
    getParent() {
        return this.__parent;
    }
    setParent(parent) {
        this.__parent = parent;
    }
    hasChild(ctx) {
        if (ContextFactory.isContext(ctx) && ctx.__parent) {
            return (ctx.__parent == this.proxy ||
                this.proxy == ctx);
        }
        else {
            return false;
        }
    }
    ensureIsChild(ctx) {
        var lctx = ContextFactory.ensure(ctx);
        this.addChild(lctx);
        return lctx;
    }
    addChild(ctx) {
        if (!this.hasChild(ctx)) {
            var child = ContextFactory.ensure(ctx);
            child.setParent(this.proxy);
        }
    }
    toObject() {
        const obj = {};
        lodash_1.defaultsDeep(obj, this.ctx);
        return obj;
    }
    toJSON() {
        return JSON.stringify(this.toObject());
    }
    toString() {
        return '[pipeline Context]';
    }
}
exports.ContextFactory = ContextFactory;
//# sourceMappingURL=context.js.map