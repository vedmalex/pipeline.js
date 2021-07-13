"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Context = exports.RESERVATIONS = exports.ProxySymbol = exports.ContextSymbol = void 0;
var lodash_1 = require("lodash");
exports.ContextSymbol = Symbol('Context');
exports.ProxySymbol = Symbol('Handler');
var RESERVATIONS;
(function (RESERVATIONS) {
    RESERVATIONS[RESERVATIONS["prop"] = 0] = "prop";
    RESERVATIONS[RESERVATIONS["func_this"] = 1] = "func_this";
    RESERVATIONS[RESERVATIONS["func_ctx"] = 2] = "func_ctx";
})(RESERVATIONS = exports.RESERVATIONS || (exports.RESERVATIONS = {}));
var RESERVED = {
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
var Context = (function () {
    function Context(config) {
        this.ctx = config;
        var res = new Proxy(this, {
            get: function (target, key, _proxy) {
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
            set: function (target, key, value) {
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
            deleteProperty: function (target, key) {
                if (!RESERVED.hasOwnProperty(key)) {
                    return delete target.ctx[key];
                }
                else {
                    return false;
                }
            },
            has: function (target, key) {
                if (!RESERVED.hasOwnProperty(key)) {
                    return key in target.ctx;
                }
                else {
                    return false;
                }
            },
            ownKeys: function (target) {
                return Reflect.ownKeys(target.ctx);
            },
        });
        this.proxy = res;
        return res;
    }
    Context.ensure = function (_config) {
        if (Context.isContext(_config)) {
            return _config;
        }
        else {
            return new Context(_config !== null && _config !== void 0 ? _config : {});
        }
    };
    Context.isContext = function (obj) {
        return obj ? obj[exports.ContextSymbol] : false;
    };
    Context.prototype.fork = function (config) {
        var child = Context.ensure(config);
        this.addChild(child);
        (0, lodash_1.defaultsDeep)(child, this.toObject());
        return child;
    };
    Context.prototype.get = function (path) {
        var root = (0, lodash_1.get)(this, path);
        if (root instanceof Object) {
            var result = root;
            if (!Context.isContext(result)) {
                result = this.ensureIsChild(result);
                (0, lodash_1.set)(this, path, result);
            }
            return result;
        }
    };
    Context.prototype.getParent = function () {
        return this.__parent;
    };
    Context.prototype.setParent = function (parent) {
        this.__parent = parent;
    };
    Context.prototype.hasChild = function (ctx) {
        if (Context.isContext(ctx) && ctx.__parent) {
            return (ctx.__parent == this.proxy ||
                this.proxy == ctx);
        }
        else {
            return false;
        }
    };
    Context.prototype.ensureIsChild = function (ctx) {
        var lctx = Context.ensure(ctx);
        this.addChild(lctx);
        return lctx;
    };
    Context.prototype.addChild = function (ctx) {
        if (!this.hasChild(ctx)) {
            var child = Context.ensure(ctx);
            child.setParent(this.proxy);
        }
    };
    Context.prototype.toObject = function () {
        var obj = {};
        (0, lodash_1.defaultsDeep)(obj, this.ctx);
        return obj;
    };
    Context.prototype.toJSON = function () {
        return JSON.stringify(this.toObject());
    };
    Context.prototype.toString = function () {
        return '[pipeline Context]';
    };
    return Context;
}());
exports.Context = Context;
//# sourceMappingURL=context.js.map