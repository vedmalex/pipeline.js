"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
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
    getRoot: RESERVATIONS.func_ctx,
    setParent: RESERVATIONS.func_ctx,
    setRoot: RESERVATIONS.func_ctx,
    toString: RESERVATIONS.func_ctx,
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
var count = 0;
var allContexts = {};
var Context = (function () {
    function Context(config) {
        this.ctx = config;
        this.id = count++;
        allContexts[this.id] = this;
        var res = new Proxy(this, {
            get: function (target, key, _proxy) {
                var _a;
                if (key == exports.ContextSymbol)
                    return true;
                if (key == exports.ProxySymbol)
                    return _proxy;
                if (key == 'allContexts')
                    return allContexts;
                if (!(key in RESERVED)) {
                    if (key in target.ctx) {
                        return target.ctx[key];
                    }
                    else {
                        return (_a = target.__parent) === null || _a === void 0 ? void 0 : _a[key];
                    }
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
                if (!(key in RESERVED)) {
                    ;
                    target.ctx[key] = value;
                    return true;
                }
                else if (typeof key == 'string' &&
                    key in RESERVED &&
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
                if (!(key in RESERVED)) {
                    return delete target.ctx[key];
                }
                else {
                    return false;
                }
            },
            has: function (target, key) {
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
            ownKeys: function (target) {
                if (target.__parent) {
                    return __spreadArray(__spreadArray([], Reflect.ownKeys(target.ctx), true), Reflect.ownKeys(target.__parent), true);
                }
                else {
                    return Reflect.ownKeys(target.ctx);
                }
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
    Context.prototype.fork = function (ctx) {
        var child = Context.ensure(ctx);
        this.addChild(child);
        return child;
    };
    Context.prototype.addChild = function (child) {
        if (!this.hasChild(child)) {
            child.setParent(this.proxy);
        }
        return child;
    };
    Context.prototype.get = function (path) {
        var root = (0, lodash_1.get)(this, path);
        if (root instanceof Object) {
            var result = root;
            if (!Context.isContext(result)) {
                var lctx = Context.ensure(result);
                this.addSubtree(lctx);
                (0, lodash_1.set)(this, path, lctx);
                result = lctx;
            }
            return result;
        }
    };
    Context.prototype.addSubtree = function (lctx) {
        if (!this.hasSubtree(lctx)) {
            lctx.setRoot(this.proxy);
        }
        return lctx;
    };
    Context.prototype.getParent = function () {
        return this.__parent;
    };
    Context.prototype.getRoot = function () {
        return this.__root;
    };
    Context.prototype.setParent = function (parent) {
        this.__parent = parent;
    };
    Context.prototype.setRoot = function (root) {
        this.__root = root;
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
    Context.prototype.hasSubtree = function (ctx) {
        if (Context.isContext(ctx) && ctx.__root) {
            return (ctx.__root == this.proxy ||
                this.proxy == ctx);
        }
        else {
            return false;
        }
    };
    Context.prototype.toObject = function () {
        var obj = {};
        (0, lodash_1.defaultsDeep)(obj, this.ctx);
        if (this.__parent) {
            (0, lodash_1.defaultsDeep)(obj, this.__parent.toObject());
        }
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