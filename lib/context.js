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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Context = exports.RESERVATIONS = exports.CurrentStage = exports.ProxySymbol = exports.OriginalObject = exports.ContextSymbol = void 0;
var lodash_1 = require("lodash");
var TypeDetectors_1 = require("./utils/TypeDetectors");
var JSON_1 = __importDefault(require("./JSON"));
exports.ContextSymbol = Symbol('Context');
exports.OriginalObject = Symbol('OriginalObject');
exports.ProxySymbol = Symbol('Handler');
exports.CurrentStage = Symbol('CurrentStage');
exports.RESERVATIONS = {
    prop: 0,
    func_this: 1,
    func_ctx: 2,
};
var RESERVED = {
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
var Context = (function () {
    function Context(config) {
        this.ctx = config;
        this.__id = count++;
        allContexts[this.__id] = this;
        var res = new Proxy(this, {
            get: function (target, key, _proxy) {
                var _a;
                if (key == exports.ContextSymbol)
                    return true;
                if (key == exports.CurrentStage)
                    return target.__current;
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
            set: function (target, key, value) {
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
                    var ownKeys = Reflect.ownKeys(target.ctx);
                    var parentKeys = Reflect.ownKeys(target.__parent);
                    var allKeys = __spreadArray([], ownKeys, true);
                    for (var _i = 0, parentKeys_1 = parentKeys; _i < parentKeys_1.length; _i++) {
                        var key = parentKeys_1[_i];
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
    Context.ensure = function (_config) {
        if (Context.isContext(_config)) {
            return _config;
        }
        else {
            return new Context(_config !== null && _config !== void 0 ? _config : {});
        }
    };
    Context.isContext = function (obj) {
        var _a;
        return obj ? ((_a = obj[exports.ContextSymbol]) !== null && _a !== void 0 ? _a : false) : false;
    };
    Object.defineProperty(Context.prototype, "original", {
        get: function () {
            return this.ctx;
        },
        enumerable: false,
        configurable: true
    });
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
    Context.prototype.toObject = function (visited) {
        if (!visited) {
            visited = new Set();
        }
        if (visited.has(this)) {
            return { __circularRef: true, id: this.__id };
        }
        visited.add(this);
        var obj = {};
        if (this.__parent && !visited.has(this.__parent)) {
            obj = this.__parent.toObject(visited);
        }
        for (var key in this.ctx) {
            if (this.ctx.hasOwnProperty(key)) {
                obj[key] = this.ctx[key];
            }
        }
        return obj;
    };
    Context.prototype.toJSON = function () {
        try {
            return JSON.stringify(this.toObject());
        }
        catch (error) {
            if (error instanceof TypeError &&
                (error.message.includes('circular') ||
                    error.message.includes('cyclic'))) {
                return JSON_1.default.stringify(this.toObject());
            }
            throw error;
        }
    };
    Context.prototype.toJSONSafe = function () {
        return JSON_1.default.stringify(this.toObject());
    };
    Context.prototype.toString = function () {
        return '[pipeline Context]';
    };
    return Context;
}());
exports.Context = Context;
//# sourceMappingURL=context.js.map