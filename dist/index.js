'use strict';

var lodash = require('lodash');
var Ajv = require('ajv');
var ajvErrors = require('ajv-errors');
var ajvFormats = require('ajv-formats');
var ajvKeywords = require('ajv-keywords');

function _interopDefault (e) { return e && e.__esModule ? e : { default: e }; }

var Ajv__default = /*#__PURE__*/_interopDefault(Ajv);
var ajvErrors__default = /*#__PURE__*/_interopDefault(ajvErrors);
var ajvFormats__default = /*#__PURE__*/_interopDefault(ajvFormats);
var ajvKeywords__default = /*#__PURE__*/_interopDefault(ajvKeywords);

const ContextSymbol = Symbol('Context');
const OriginalObject = Symbol('OriginalObject');
const ProxySymbol = Symbol('Handler');
exports.RESERVATIONS = void 0;
(function(RESERVATIONS) {
    RESERVATIONS[RESERVATIONS["prop"] = 0] = "prop";
    RESERVATIONS[RESERVATIONS["func_this"] = 1] = "func_this";
    RESERVATIONS[RESERVATIONS["func_ctx"] = 2] = "func_ctx";
})(exports.RESERVATIONS || (exports.RESERVATIONS = {}));
const RESERVED = {
    getParent: exports.RESERVATIONS.func_ctx,
    getRoot: exports.RESERVATIONS.func_ctx,
    setParent: exports.RESERVATIONS.func_ctx,
    setRoot: exports.RESERVATIONS.func_ctx,
    toString: exports.RESERVATIONS.func_ctx,
    original: exports.RESERVATIONS.prop,
    __parent: exports.RESERVATIONS.prop,
    __root: exports.RESERVATIONS.prop,
    __stack: exports.RESERVATIONS.prop,
    hasChild: exports.RESERVATIONS.func_ctx,
    hasSubtree: exports.RESERVATIONS.func_ctx,
    ensure: exports.RESERVATIONS.func_ctx,
    addChild: exports.RESERVATIONS.func_ctx,
    addSubtree: exports.RESERVATIONS.func_ctx,
    toJSON: exports.RESERVATIONS.func_ctx,
    toObject: exports.RESERVATIONS.func_ctx,
    fork: exports.RESERVATIONS.func_this,
    get: exports.RESERVATIONS.func_this,
    allContexts: exports.RESERVATIONS.func_this
};
var count = 0;
var allContexts = {};
/**
 *  The **Context** itself
 *  @param {Object} config The object that is the source for the **Context**.
 */ class Context {
    static ensure(_config) {
        if (Context.isContext(_config)) {
            return _config;
        } else {
            return new Context(_config !== null && _config !== void 0 ? _config : {});
        }
    }
    static isContext(obj) {
        return obj ? obj[ContextSymbol] : false;
    }
    get original() {
        return this.ctx;
    }
    /**
   * Makes fork of current context and add it to current as a child context
   * @api public
   * @param {Object|Context} [config] new properties that must exists in new fork
   * @retrun {Context}
   */ fork(ctx) {
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
    /**
   * Same but different as a fork. it make possible get piece of context as context;
   * @param path String path to context object that need to be a Context instance
   * @return {Context} | {Primitive type}
   */ get(path) {
        var root = lodash.get(this.ctx, path);
        if (root instanceof Object) {
            var result = root;
            if (!Context.isContext(result)) {
                var lctx = Context.ensure(result);
                this.addSubtree(lctx);
                lodash.set(this, path, lctx);
                result = lctx;
            }
            return result;
        } else {
            return root;
        }
    }
    addSubtree(lctx) {
        if (!this.hasSubtree(lctx)) {
            lctx.setRoot(this.proxy);
        }
        return lctx;
    }
    /**
   * Return parent Context
   * @api public
   * @return {Context}
   */ getParent() {
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
    /**
   * checks wheater or not context has specific child context
   * it return `true` also if `ctx` is `this`;
   * @api public
   * @return {Boolean}
   */ hasChild(ctx) {
        if (Context.isContext(ctx) && ctx.__parent) {
            return ctx.__parent == this.proxy || this.proxy == ctx;
        } else {
            return false;
        }
    }
    hasSubtree(ctx) {
        if (Context.isContext(ctx) && ctx.__root) {
            return ctx.__root == this.proxy || this.proxy == ctx;
        } else {
            return false;
        }
    }
    /**
   * Convert context to raw Object;
   * @api public
   * @param {Boolean} [clean]  `true` it need to clean object from referenced Types except Function and raw Object(js hash)
   * @return {Object}
   */ toObject() {
        const obj = {};
        lodash.defaultsDeep(obj, this.ctx);
        if (this.__parent) {
            // TODO: взять весь объект по всей структуре дерева
            lodash.defaultsDeep(obj, this.__parent.toObject());
        }
        return obj;
    }
    /**
   * Conterts context to JSON
   * @api public
   * @return {String}
   */ toJSON() {
        // always cleaning the object
        return JSON.stringify(this.toObject());
    }
    /**
   * toString
   */ toString() {
        return '[pipeline Context]';
    }
    constructor(config){
        this.ctx = config;
        this.id = count++;
        allContexts[this.id] = this;
        const res = new Proxy(this, {
            get (target, key, _proxy) {
                if (key == ContextSymbol) return true;
                if (key == ProxySymbol) return _proxy;
                if (key == 'allContexts') return allContexts;
                if (!(key in RESERVED)) {
                    if (key in target.ctx) {
                        return target.ctx[key];
                    } else {
                        var _target___parent;
                        return (_target___parent = target.__parent) === null || _target___parent === void 0 ? void 0 : _target___parent[key];
                    }
                // return (target.ctx as any)[key]
                } else {
                    if (RESERVED[key] == exports.RESERVATIONS.func_ctx) {
                        return target[key].bind(target);
                    }
                    if (RESERVED[key] == exports.RESERVATIONS.func_this) {
                        return target[key].bind(target);
                    } else return target[key] // just props
                    ;
                }
            },
            set (target, key, value) {
                if (!(key in RESERVED)) {
                    target.ctx[key] = value;
                    return true;
                } else if (typeof key == 'string' && key in RESERVED && RESERVED[key] != exports.RESERVATIONS.prop) {
                    return false;
                } else {
                    target[key] = value;
                    return true;
                }
            },
            deleteProperty (target, key) {
                if (!(key in RESERVED)) {
                    return delete target.ctx[key];
                } else {
                    return false;
                }
            },
            has (target, key) {
                if (!(key in RESERVED)) {
                    if (target.__parent) {
                        return key in target.ctx || key in target.__parent;
                    } else {
                        return key in target.ctx;
                    }
                } else {
                    return false;
                }
            },
            ownKeys (target) {
                if (target.__parent) {
                    return [
                        ...Reflect.ownKeys(target.ctx),
                        ...Reflect.ownKeys(target.__parent)
                    ];
                } else {
                    return Reflect.ownKeys(target.ctx);
                }
            }
        });
        this.proxy = res;
        return res;
    }
}

function CreateError(err) {
    if (typeof err == 'string') {
        return new ComplexError(new Error(err));
    }
    if (typeof err == 'object' && err !== null) {
        if (Array.isArray(err)) {
            let result = [];
            err.filter((e)=>e).forEach((ler)=>{
                const res = CreateError(ler);
                if (res) {
                    if (res.payload) {
                        result.push(...res.payload);
                    } else {
                        result.push(res);
                    }
                }
            });
            if (result.length > 1) {
                return new ComplexError(...result);
            }
            if (result.length === 1) {
                return result[0];
            }
        } else if (err) {
            if (isComplexError(err)) {
                return err;
            } else {
                return new ComplexError(err);
            }
        }
    }
// throw new Error('unknown error, see console for details')
}
function isComplexError(inp) {
    return inp.isComplex && Array.isArray(inp.payload);
}
class ComplexError extends Error {
    // to store all details of single error
    constructor(...payload){
        debugger;
        super();
        this.payload = payload;
        this.isComplex = true;
    }
}

function empty_run(err, context, done) {
    done(err, context);
}

function isCallback(inp) {
    if (typeof inp === 'function' && !is_async_function(inp)) {
        return inp.length <= 2;
    } else return false;
}
function isExternalCallback(inp) {
    if (typeof inp === 'function' && !is_async_function(inp)) {
        return inp.length <= 2;
    } else return false;
}
function is_async_function(inp) {
    var _inp_constructor;
    if (typeof inp == 'function') return (inp === null || inp === void 0 ? void 0 : (_inp_constructor = inp.constructor) === null || _inp_constructor === void 0 ? void 0 : _inp_constructor.name) == 'AsyncFunction';
    else return false;
}
function is_func1Callbacl(inp) {
    return (inp === null || inp === void 0 ? void 0 : inp.length) == 1;
}
function is_async(// inp: Func<R, P1, P2, P3>,
inp) {
    return is_async_function(inp);
}
function is_func0(inp) {
    return (inp === null || inp === void 0 ? void 0 : inp.length) == 0;
}
function is_func1(inp) {
    return (inp === null || inp === void 0 ? void 0 : inp.length) == 1;
}
function is_func2(inp) {
    return (inp === null || inp === void 0 ? void 0 : inp.length) == 2;
}
function is_func3(inp) {
    return (inp === null || inp === void 0 ? void 0 : inp.length) == 3;
}
function is_func0_async(inp) {
    return is_async(inp) && is_func0(inp);
}
function is_func1_async(inp) {
    return is_async(inp) && is_func1(inp);
}
function is_func2_async(inp) {
    return is_async(inp) && is_func2(inp);
}
function is_func3_async(inp) {
    return is_async(inp) && is_func3(inp);
}
function is_thenable(inp) {
    return typeof inp == 'object' && 'then' in inp;
}
function isSingleStageFunction(inp) {
    return is_func2_async(inp) || is_func3(inp);
}
function isRunPipelineFunction(inp) {
    return is_func0(inp) || is_func0_async(inp) || is_func1(inp) || is_func1_async(inp) || is_func2(inp) || is_func2_async(inp) || is_func3(inp);
}
function isRescue(inp) {
    return is_func1(inp) || is_func1_async(inp) || is_func2(inp) || is_func2_async(inp) || is_func3(inp);
}
function isValidateFunction(inp) {
    return is_func1(inp) || is_func1_async(inp) || is_func2(inp);
}
function isEnsureFunction(inp) {
    return is_func1(inp) || is_func1_async(inp) || is_func2(inp);
}
function isStageRun(inp) {
    return (inp === null || inp === void 0 ? void 0 : inp.length) == 3;
}
function isAllowedStage(inp) {
    return isRunPipelineFunction(inp) || isAnyStage(inp) || typeof inp == 'object' || typeof inp == 'string';
}
function getStageConfig(config) {
    let result = {};
    if (typeof config == 'string') {
        result.name = config;
    } else if (isAnyStage(config)) {
        return config;
    } else if (isRunPipelineFunction(config)) {
        result.run = config;
        result.name = getNameFrom(result);
    } else {
        if (config.name) {
            result.name = config.name;
        }
        if (isRescue(config.rescue)) {
            result.rescue = config.rescue;
        }
        if (isRunPipelineFunction(config.run)) {
            result.run = config.run;
        }
        if (config.validate && config.schema) {
            throw CreateError('use only one `validate` or `schema`');
        }
        if (config.ensure && config.schema) {
            throw CreateError('use only one `ensure` or `schema`');
        }
        if (config.ensure && config.validate) {
            throw CreateError('use only one `ensure` or `validate`');
        }
        if (isValidateFunction(config.validate)) {
            result.validate = config.validate;
        }
        if (isEnsureFunction(config.ensure)) {
            result.ensure = config.ensure;
        }
        if (config.compile) {
            result.compile = config.compile;
        }
        if (config.precompile) {
            result.precompile = config.precompile;
        }
        if (config.schema) {
            result.schema = config.schema;
            const ajv = new Ajv__default.default({
                allErrors: true
            });
            ajvFormats__default.default(ajv);
            ajvErrors__default.default(ajv, {
                singleError: true
            });
            ajvKeywords__default.default(ajv);
            const validate = ajv.compile(result.schema);
            result.validate = (ctx)=>{
                if (!validate(ctx) && validate.errors) {
                    throw CreateError(ajv.errorsText(validate.errors));
                } else return true;
            };
        }
        if (!config.name) {
            result.name = getNameFrom(config);
        }
    }
    return result;
}
function getNameFrom(config) {
    let result = '';
    if (!config.name && config.run) {
        var match = config.run.toString().match(/function\s*(\w+)\s*\(/);
        if (match && match[1]) {
            result = match[1];
        } else {
            result = config.run.toString();
        }
    } else {
        var _config_name;
        result = (_config_name = config.name) !== null && _config_name !== void 0 ? _config_name : '';
    }
    return result;
}
function getPipelinConfig(config) {
    if (Array.isArray(config)) {
        return {
            stages: config.map((item)=>{
                if (isRunPipelineFunction(item)) {
                    return item;
                } else if (isAnyStage(item)) {
                    return item;
                } else {
                    throw CreateError('not suitable type for array in pipeline');
                }
            })
        };
    } else {
        const res = getStageConfig(config);
        if (isAnyStage(res)) {
            return {
                stages: [
                    res
                ]
            };
        } else if (typeof config == 'object' && !isAnyStage(config)) {
            var _config_stages;
            if (config.run && ((_config_stages = config.stages) === null || _config_stages === void 0 ? void 0 : _config_stages.length) > 0) {
                throw CreateError(" don't use run and stage both ");
            }
            if (config.run) {
                res.stages = [
                    config.run
                ];
            }
            if (config.stages) {
                res.stages = config.stages;
            }
        } else if (typeof config == 'function' && res.run) {
            res.stages = [
                res.run
            ];
            delete res.run;
        }
        if (!res.stages) res.stages = [];
        return res;
    }
}
function getParallelConfig(config) {
    const res = getStageConfig(config);
    if (isAnyStage(res) || isRunPipelineFunction(res)) {
        return {
            stage: res
        };
    } else if (typeof config == 'object' && !isAnyStage(config)) {
        const r = res;
        if (config.run && config.stage) {
            throw CreateError("don't use run and stage both");
        }
        if (config.split) {
            r.split = config.split;
        }
        if (config.combine) {
            r.combine = config.combine;
        }
        if (config.stage) {
            r.stage = config.stage;
        }
        if (config.run) {
            r.stage = config.run;
        }
    } else if (typeof config == 'function' && res.run) {
        res.stage = res.run;
        delete res.run;
    }
    return res;
}
function getEmptyConfig(config) {
    const res = getStageConfig(config);
    if (isAnyStage(res)) {
        return res;
    } else {
        res.run = empty_run;
    }
    return res;
}
function getWrapConfig(config) {
    const res = getStageConfig(config);
    if (isAnyStage(res)) {
        return {
            stage: res
        };
    } else if (typeof config == 'object' && !isAnyStage(config)) {
        if (config.run && config.stage) {
            throw CreateError("don't use run and stage both");
        }
        if (config.run) {
            res.stage = config.run;
        }
        if (config.stage) {
            res.stage = config.stage;
        }
        if (config.finalize) {
            res.finalize = config.finalize;
        }
        if (config.prepare) {
            res.prepare = config.prepare;
        }
        res.prepare = config.prepare;
    }
    return res;
}
function getTimeoutConfig(config) {
    const res = getStageConfig(config);
    if (isAnyStage(res)) {
        return {
            stage: res
        };
    } else if (typeof config == 'object' && !isAnyStage(config)) {
        if (config.run && config.stage) {
            throw CreateError("don't use run and stage both");
        }
        if (config.run) {
            res.stage = config.run;
        }
        if (config.stage) {
            res.stage = config.stage;
        }
        res.timeout = config.timeout;
        res.overdue = config.overdue;
    } else if (typeof config == 'function' && res.run) {
        res.stage = res.run;
        delete res.run;
    }
    return res;
}
function getIfElseConfig(config) {
    const res = getStageConfig(config);
    if (isAnyStage(res)) {
        return {
            success: res
        };
    } else if (typeof config == 'object' && !isAnyStage(config)) {
        if (config.run && config.success) {
            throw CreateError("don't use run and stage both");
        }
        if (config.run) {
            res.success = config.run;
        }
        if (config.success) {
            res.success = config.success;
        }
        if (config.condition) {
            res.condition = config.condition;
        } else {
            res.condition = true;
        }
        if (config.failed) {
            res.failed = config.failed;
        } else {
            res.failed = empty_run;
        }
    } else if (typeof config == 'function' && res.run) {
        res.success = res.run;
        res.failed = empty_run;
        res.condition = true;
        delete res.run;
    } else {
        res.success = empty_run;
    }
    return res;
}
function isAnyStage(obj) {
    return isStage(obj);
}

function can_fix_error({ run  }) {
    return is_func2_async(run) || is_func3(run) && !is_func3_async(run);
}

const ERROR = {
    signature: 'unacceptable run method signature',
    invalid_context: 'context is invalid'
};

function process_error(err, done) {
    if (isComplexError(err)) {
        done(err);
    } else if (err instanceof Error) {
        done(new ComplexError(err));
    } else if (typeof err == 'string') {
        done(CreateError(err));
    } else {
        done(CreateError(String(err)));
    }
}

function run_callback_once(wrapee) {
    let done_call = 0;
    const c = function(err, ctx) {
        if (done_call == 0) {
            done_call += 1;
            wrapee(err, ctx);
        } else if (err) {
            throw err;
        } else {
            throw CreateError([
                err,
                'callback called more than once'
            ]);
        }
    };
    return c;
}

// может не являться async funciton но может вернуть промис, тогда тоже должен отработать как промис
function execute_callback(err, run, context, _done) {
    const done = run_callback_once(_done);
    switch(run.length){
        // this is the context of the run function
        case 0:
            if (is_func0_async(run)) {
                try {
                    const res = run.call(context);
                    res.then((res)=>done(undefined, res !== null && res !== void 0 ? res : context)).catch((err)=>done(err));
                } catch (err) {
                    process_error(err, done);
                }
            } else if (is_func0(run)) {
                try {
                    const res = run.apply(context);
                    if (res instanceof Promise) {
                        res.then((_)=>done(undefined, res !== null && res !== void 0 ? res : context)).catch((err)=>done(err));
                    } else if (is_thenable(res)) {
                        res.then((_)=>done(undefined, res !== null && res !== void 0 ? res : context)).catch((err)=>done(err));
                    } else {
                        done(undefined, res !== null && res !== void 0 ? res : context);
                    }
                } catch (err) {
                    process_error(err, done);
                }
            }
            break;
        case 1:
            if (is_func1_async(run)) {
                try {
                    run(context).then((ctx)=>done(undefined, ctx)).catch((err)=>done(err));
                } catch (err) {
                    process_error(err, done);
                }
            } else if (is_func1(run)) {
                try {
                    const res = run(context);
                    if (res instanceof Promise) {
                        res.then((r)=>done(undefined, r !== null && r !== void 0 ? r : context)).catch((err)=>done(err));
                    } else if (is_thenable(res)) {
                        res.then((r)=>done(undefined, r !== null && r !== void 0 ? r : context)).catch((err)=>done(err));
                    } else {
                        done(undefined, res);
                    }
                } catch (err) {
                    process_error(err, done);
                }
            } else {
                done(CreateError(ERROR.signature));
            }
            break;
        case 2:
            if (is_func2_async(run)) {
                try {
                    run(err, context).then((ctx)=>done(undefined, ctx)).catch((err)=>done(err));
                } catch (err) {
                    process_error(err, done);
                }
            } else if (is_func2(run)) {
                try {
                    run(context, done);
                } catch (err) {
                    process_error(err, done);
                }
            } else {
                done(CreateError(ERROR.signature));
            }
            break;
        case 3:
            if (is_func3(run) && !is_func3_async(run)) {
                try {
                    run(err, context, done);
                } catch (err) {
                    process_error(err, done);
                }
            } else {
                done(CreateError(ERROR.signature));
            }
            break;
        default:
            done(CreateError(ERROR.signature));
    }
}

// может не являться async funciton но может вернуть промис, тогда тоже должен отработать как промис
function execute_custom_run(run) {
    return function(err, context, _done) {
        const done = run_callback_once(_done);
        switch(run.length){
            // this is the context of the run function
            case 0:
                if (is_func0_async(run)) {
                    try {
                        const res = run.call(context);
                        res.then((r)=>done(undefined, r)).catch((err)=>done(err));
                    } catch (err) {
                        process_error(err, done);
                    }
                } else if (is_func0(run)) {
                    try {
                        const res = run.apply(context);
                        if (res instanceof Promise) {
                            res.then((r)=>done(undefined, r)).catch((err)=>done(err));
                        } else if (is_thenable(res)) {
                            res.then((r)=>done(undefined, r)).catch((err)=>done(err));
                        } else {
                            done(undefined, res);
                        }
                    } catch (err) {
                        process_error(err, done);
                    }
                }
                break;
            case 1:
                if (is_func1_async(run)) {
                    try {
                        run(context).then((ctx)=>done(undefined, ctx)).catch((err)=>done(err));
                    } catch (err) {
                        process_error(err, done);
                    }
                } else if (is_func1(run)) {
                    try {
                        const res = run.call(this, context);
                        if (res instanceof Promise) {
                            res.then((r)=>done(undefined, r)).catch((err)=>done(err));
                        } else if (is_thenable(res)) {
                            res.then((r)=>done(undefined, r)).catch((err)=>done(err));
                        } else {
                            done(undefined, res);
                        }
                    } catch (err) {
                        process_error(err, done);
                    }
                } else {
                    done(CreateError(ERROR.signature));
                }
                break;
            case 2:
                if (is_func2_async(run)) {
                    try {
                        run.call(this, err, context).then((ctx)=>done(undefined, ctx)).catch((err)=>done(err));
                    } catch (err) {
                        process_error(err, done);
                    }
                } else if (is_func2(run)) {
                    try {
                        run.call(this, context, done);
                    } catch (err) {
                        process_error(err, done);
                    }
                } else {
                    done(CreateError(ERROR.signature));
                }
                break;
            case 3:
                if (is_func3(run) && !is_func3_async(run)) {
                    try {
                        run.call(this, err, context, done);
                    } catch (err) {
                        process_error(err, done);
                    }
                } else {
                    done(CreateError(ERROR.signature));
                }
                break;
            default:
                done(CreateError(ERROR.signature));
        }
    };
}

function execute_ensure(ensure, context, done) {
    switch(ensure.length){
        case 1:
            if (is_func1_async(ensure)) {
                try {
                    ensure(context).then((res)=>done(undefined, res)).catch((err)=>done(err));
                } catch (err) {
                    process_error(err, done);
                }
            } else if (is_func1(ensure)) {
                try {
                    const res = ensure(context);
                    if (res instanceof Promise) {
                        res.then((res)=>done(undefined, res)).catch((err)=>done(err));
                    } else if (is_thenable(res)) {
                        res.then((res)=>done(undefined, res)).catch((err)=>done(err));
                    } else {
                        done(undefined, res);
                    }
                } catch (err) {
                    process_error(err, done);
                }
            } else {
                done(CreateError(ERROR.signature));
            }
            break;
        case 2:
            if (is_func2(ensure)) {
                try {
                    ensure(context, (err, ctx)=>{
                        done(err, ctx);
                    });
                } catch (err) {
                    process_error(err, done);
                }
            } else {
                done(CreateError(ERROR.signature));
            }
            break;
        default:
            done(CreateError(ERROR.signature));
    }
}

function execute_rescue(rescue, err, context, done) {
    switch(rescue.length){
        case 1:
            if (is_func1_async(rescue)) {
                try {
                    rescue(err).then((_)=>done(undefined)).catch((err)=>done(err));
                } catch (err) {
                    process_error(err, done);
                }
            } else if (is_func1(rescue)) {
                try {
                    const res = rescue(err);
                    if (res instanceof Promise) {
                        res.then((_)=>done()).catch((err)=>done(err));
                    } else if (is_thenable(res)) {
                        res.then((_)=>done()).catch((err)=>done(err));
                    } else {
                        done();
                    }
                } catch (err) {
                    process_error(err, done);
                }
            } else {
                done(CreateError(ERROR.signature));
            }
            break;
        case 2:
            if (is_func2_async(rescue)) {
                try {
                    rescue(err, context).then((_)=>done()).catch((err)=>done(err));
                } catch (err) {
                    process_error(err, done);
                }
            } else if (is_func2(rescue)) {
                try {
                    const res = rescue(err, context);
                    if (res instanceof Promise) {
                        res.then((_)=>done()).catch((err)=>done(err));
                    } else if (is_thenable(res)) {
                        res.then((_)=>done()).catch((err)=>done(err));
                    } else {
                        done();
                    }
                } catch (err) {
                    process_error(err, done);
                }
            } else {
                done(CreateError(ERROR.signature));
            }
            break;
        case 3:
            if (is_func3(rescue) && !is_func3_async(rescue)) {
                try {
                    rescue(err, context, done);
                } catch (err) {
                    process_error(err, done);
                }
            } else {
                done(CreateError(ERROR.signature));
            }
            break;
        default:
            done(CreateError(ERROR.signature));
    }
}

function execute_validate(validate, context, done) {
    switch(validate.length){
        case 1:
            if (is_func1_async(validate)) {
                try {
                    validate(context).then((res)=>done(undefined, res)).catch((err)=>done(err));
                } catch (err) {
                    process_error(err, done);
                }
            } else if (is_func1(validate)) {
                try {
                    const res = validate(context);
                    if (res instanceof Promise) {
                        res.then((res)=>done(undefined, res)).catch((err)=>done(err));
                    } else if (is_thenable(res)) {
                        res.then((res)=>done(undefined, res)).catch((err)=>done(err));
                    } else if (typeof res == 'boolean') {
                        if (res) {
                            done(undefined, res);
                        } else {
                            done(CreateError(ERROR.invalid_context));
                        }
                    } else {
                        done(res);
                    }
                } catch (err) {
                    process_error(err, done);
                }
            } else {
                done(CreateError(ERROR.signature));
            }
            break;
        case 2:
            if (is_func2(validate)) {
                try {
                    validate(context, (err, res)=>{
                        if (err) done(CreateError(err), res);
                        else done(err, res);
                    });
                } catch (err) {
                    process_error(err, done);
                }
            } else {
                done(CreateError(ERROR.signature));
            }
            break;
        default:
            done(CreateError(ERROR.signature));
    }
}

const StageSymbol = Symbol('stage');
// make possibility to context be immutable for debug purposes
function isStage(obj) {
    return !!obj[StageSymbol];
}
class Stage {
    get config() {
        return this._config;
    }
    get reportName() {
        return `STG:${this._config.name ? this._config.name : ''}`;
    }
    get name() {
        var _this__config_name;
        return (_this__config_name = this._config.name) !== null && _this__config_name !== void 0 ? _this__config_name : '';
    }
    runStageMethod(err_, err, ctx, context, stageToRun, callback) {
        if (err || err_) {
            if (this.config.run && !can_fix_error({
                run: this.config.run
            })) {
                this.rescue(CreateError([
                    err,
                    err_
                ]), ctx !== null && ctx !== void 0 ? ctx : context, callback, (rescuedContext)=>{
                    // ошибка обработана все хорошо, продолжаем
                    stageToRun(undefined, rescuedContext, callback);
                });
            } else {
                // обработка ошибок может происходить внутри функции
                stageToRun(CreateError([
                    err,
                    err_
                ]), ctx !== null && ctx !== void 0 ? ctx : context, callback);
            }
        } else {
            stageToRun(undefined, ctx !== null && ctx !== void 0 ? ctx : context, callback);
        }
    }
    execute(_err, _context, _callback) {
        var _this_config;
        // discover arguments
        let err, not_ensured_context, __callback;
        if (arguments.length == 1) {
            not_ensured_context = _err;
        // promise
        } else if (arguments.length == 2) {
            if (typeof _context == 'function') {
                // callback
                not_ensured_context = _err;
                err = undefined;
                __callback = _context;
            } else {
                // promise
                err = _err;
                not_ensured_context = _context;
            }
        } else {
            // callback
            err = _err;
            not_ensured_context = _context;
            __callback = _callback;
        }
        if (!this.run) {
            this.run = this.compile();
        } else if (!((_this_config = this.config) === null || _this_config === void 0 ? void 0 : _this_config.run)) {
            // legacy run
            if (!isStageRun(this.run)) {
                var legacy = this.run;
                this.run = execute_custom_run(legacy);
            }
        }
        const stageToRun = this.run.bind(this);
        const input_is_context = Context.isContext(not_ensured_context);
        let context = Context.ensure(not_ensured_context);
        if (input_is_context) {
            context[OriginalObject] = true;
        }
        if (!__callback) {
            return new Promise((res, rej)=>{
                this.execute(err, context, (err, ctx)=>{
                    if (err) rej(err);
                    else {
                        if (input_is_context) {
                            res(ctx);
                        } else {
                            if (Context.isContext(ctx)) {
                                res(ctx.original);
                            } else {
                                res(ctx);
                            }
                        }
                    }
                });
            });
        } else {
            const back = (err, _ctx)=>{
                if (input_is_context) {
                    __callback === null || __callback === void 0 ? void 0 : __callback(err, _ctx);
                } else {
                    if (Context.isContext(_ctx)) {
                        __callback === null || __callback === void 0 ? void 0 : __callback(err, _ctx.original);
                    } else {
                        __callback === null || __callback === void 0 ? void 0 : __callback(CreateError([
                            err,
                            new Error('context is always context object')
                        ]), _ctx);
                    }
                }
            };
            process.nextTick(()=>{
                const sucess = (ret)=>back(undefined, ret !== null && ret !== void 0 ? ret : context);
                const fail = (err)=>back(err, context);
                const callback = (err, _ctx)=>{
                    if (err) {
                        this.rescue(err, _ctx, fail, sucess);
                    } else {
                        back(err, _ctx);
                    }
                };
                if (err && this._config.run && !can_fix_error({
                    run: this._config.run
                })) {
                    this.rescue(err, context, fail, sucess);
                } else {
                    if (this.config.ensure) {
                        this.ensure(this.config.ensure, context, (err_, ctx)=>{
                            this.runStageMethod(err, err_, ctx, context, stageToRun, callback);
                        });
                    } else if (this._config.validate) {
                        this.validate(this._config.validate, context, (err_, ctx)=>{
                            this.runStageMethod(err, err_, ctx, context, stageToRun, callback);
                        });
                    } else {
                        stageToRun(undefined, context, callback);
                    }
                }
            });
        }
    }
    stage(err, context, callback) {
        const back = callback;
        const sucess = (ret)=>back(undefined, ret !== null && ret !== void 0 ? ret : context);
        const fail = (err)=>back(err, context);
        if (this._config.run) {
            if (context) {
                execute_callback(err, this._config.run, context, (err, ctx)=>{
                    if (err) {
                        this.rescue(err, ctx !== null && ctx !== void 0 ? ctx : context, fail, sucess);
                    } else {
                        callback(undefined, ctx !== null && ctx !== void 0 ? ctx : context);
                    }
                });
            } else {
                // возвращаем управление
                callback(null, context);
            }
        } else {
            const retErr = [
                this.reportName + ' reports: run is not a function'
            ];
            if (err) retErr.push(err);
            this.rescue(CreateError(retErr), context, fail, sucess);
        }
    }
    compile(rebuild = false) {
        let res;
        if (this.config.precompile) {
            this.config.precompile();
        }
        if (this._config.compile) {
            res = this._config.compile.call(this, rebuild);
        } else if (!this.run || rebuild) {
            res = this.stage;
        } else {
            if (isStageRun(this.run)) {
                res = this.run;
            } else {
                res = execute_custom_run(this.run);
            }
        }
        return res;
    }
    // объединение ошибок сделать
    // посмотреть что нужно сделать чтобы вызвать ошибку правильно!!!
    // в начале выполнения важен правильный callback, возможно без контекста
    // в конце важен и контекст ошибки? или не важен
    rescue(_err, context, fail, success) {
        let err;
        if (_err) {
            if (!(_err instanceof Error)) {
                err = CreateError(_err);
            } else {
                err = CreateError(_err);
            }
        } else {
            err = null;
        }
        if (err && this._config.rescue) {
            execute_rescue(this._config.rescue, err, context, (_err)=>{
                // здесь может быть исправлена ошибка, и контекст передается дальше на выполнение
                if (_err) {
                    fail(_err);
                } else {
                    success(context);
                }
            });
        } else {
            // отправить ошибку дальше
            // окончателная ошибка и выходим из выполнения
            if (err) {
                fail(err);
            } else {
                success(context);
            }
        }
    }
    toString() {
        return '[pipeline Stage]';
    }
    validate(validate, context, callback) {
        execute_validate(validate, context, (err, result)=>{
            if (err) {
                callback(err, context);
            } else {
                if (result) {
                    if ('boolean' === typeof result) {
                        callback(undefined, context);
                    } else if (Array.isArray(result)) {
                        callback(CreateError(result));
                    }
                } else {
                    callback(CreateError(this.reportName + ' reports: T is invalid'));
                }
            }
        });
    }
    ensure(ensure, context, callback) {
        execute_ensure(ensure, context, (err, result)=>{
            callback(err, result !== null && result !== void 0 ? result : context);
        });
    }
    constructor(config){
        this[StageSymbol] = true;
        if (config) {
            let res = getStageConfig(config);
            if (isAnyStage(res)) {
                return res;
            } else {
                this._config = res;
            }
        } else {
            this._config = {};
        }
    }
}

function run_or_execute(stage, err, context, _done) {
    const done = (err, ctx)=>{
        _done(err, ctx !== null && ctx !== void 0 ? ctx : context);
    };
    if (isAnyStage(stage)) {
        stage.execute(err, context, done);
    } else {
        execute_callback(err, stage, context, done);
    }
}

class DoWhile extends Stage {
    get reportName() {
        return `WHI:${this.config.name ? this.config.name : ''}`;
    }
    toString() {
        return '[pipeline DoWhile]';
    }
    reachEnd(err, ctx, iter) {
        if (this.config.reachEnd) {
            return this.config.reachEnd(err, ctx, iter);
        } else return true;
    }
    split(ctx, iter) {
        if (this.config.split) {
            return this.config.split(ctx, iter);
        } else return ctx;
    }
    compile(rebuild = false) {
        let run = (err, context, done)=>{
            let iter = -1;
            let next = (err)=>{
                iter++;
                if (this.reachEnd(err, context, iter)) {
                    return done(err, context);
                } else {
                    run_or_execute(this.config.stage, err, this.split(context, iter), next);
                }
            };
            next(err);
        };
        this.run = run;
        return super.compile(rebuild);
    }
    constructor(_config){
        let config = {};
        if (isAnyStage(_config)) {
            config.stage = _config;
        } else if (typeof _config == 'function') {
            config.stage = _config;
        } else {
            if ((_config === null || _config === void 0 ? void 0 : _config.run) && (_config === null || _config === void 0 ? void 0 : _config.stage)) {
                throw CreateError('use or run or stage, not both');
            }
            if (_config === null || _config === void 0 ? void 0 : _config.stage) {
                config.stage = _config.stage;
            }
            if ((_config === null || _config === void 0 ? void 0 : _config.split) instanceof Function) {
                config.split = _config.split;
            }
            if ((_config === null || _config === void 0 ? void 0 : _config.reachEnd) instanceof Function) {
                config.reachEnd = _config.reachEnd;
            }
        }
        super(config);
        this._config = {
            ...this._config,
            ...config
        };
    }
}

class Empty extends Stage {
    toString() {
        return '[pipeline Empty]';
    }
    constructor(config){
        super();
        const res = getEmptyConfig(config);
        if (isAnyStage(res)) {
            return res;
        } else {
            this._config = res;
        }
    }
}

class IfElse extends Stage {
    get reportName() {
        return `Templ:${this.config.name ? this.config.name : ''}`;
    }
    toString() {
        return '[pipeline IfElse]';
    }
    compile(rebuild = false) {
        let run = (err, context, done)=>{
            if (typeof this.config.condition == 'function') {
                execute_validate(this.config.condition, context, (err, condition)=>{
                    if (condition) {
                        if (this.config.success) {
                            run_or_execute(this.config.success, err, context, done);
                        }
                    } else {
                        if (this.config.failed) {
                            run_or_execute(this.config.failed, err, context, done);
                        }
                    }
                });
            } else if (typeof this.config.condition == 'boolean') {
                if (this.config.condition) {
                    if (this.config.success) {
                        run_or_execute(this.config.success, err, context, done);
                    }
                } else {
                    if (this.config.failed) {
                        run_or_execute(this.config.failed, err, context, done);
                    }
                }
            } else {
                if (this.config.success) {
                    run_or_execute(this.config.success, err, context, done);
                } else if (this.config.failed) {
                    run_or_execute(this.config.failed, err, context, done);
                } else {
                    done(err, context);
                }
            }
        };
        this.run = run;
        return super.compile(rebuild);
    }
    constructor(config){
        super();
        if (config) {
            this._config = getIfElseConfig(config);
        }
    }
}

function isMultiWaySwitch(inp) {
    return typeof inp == 'object' && inp != null && 'stage' in inp && isRunPipelineFunction(inp['stage']);
}
function getMultWaySwitchConfig(config) {
    if (Array.isArray(config)) {
        return {
            cases: config.map((item)=>{
                let res;
                if (isRunPipelineFunction(item)) {
                    res = {
                        stage: item,
                        evaluate: true
                    };
                } else if (isAnyStage(item)) {
                    res = {
                        stage: item,
                        evaluate: true
                    };
                } else if (isMultiWaySwitch(item)) {
                    res = item;
                } else {
                    throw CreateError('not suitable type for array in pipelin');
                }
                return res;
            })
        };
    } else {
        const res = getStageConfig(config);
        if (isAnyStage(res)) {
            return {
                cases: [
                    {
                        stage: res,
                        evaluate: true
                    }
                ]
            };
        } else if (typeof config == 'object' && !isAnyStage(config)) {
            if ((config === null || config === void 0 ? void 0 : config.run) && config.cases && config.cases.length > 0) {
                throw CreateError(" don't use run and stage both ");
            }
            if (config.run) {
                res.cases = [
                    {
                        stage: config.run,
                        evaluate: true
                    }
                ];
            }
            if (config.cases) {
                res.cases = config.cases;
            }
            if (config.split) {
                res.split = config.split;
            }
            if (config.combine) {
                res.combine = config.combine;
            }
        } else if (typeof config == 'function' && res.run) {
            res.cases = [
                {
                    stage: res.run,
                    evaluate: true
                }
            ];
            delete res.run;
        }
        if (typeof res.cases == 'undefined') res.cases = [];
        return res;
    }
}
class MultiWaySwitch extends Stage {
    get reportName() {
        return `Templ:${this.config.name ? this.config.name : ''}`;
    }
    toString() {
        return '[pipeline MultWaySwitch]';
    }
    combine(ctx, retCtx) {
        if (this.config.combine) {
            return this.config.combine(ctx, retCtx);
        } else {
            return ctx;
        }
    }
    combineCase(item, ctx, retCtx) {
        if (item.combine) {
            return item.combine(ctx, retCtx);
        } else {
            return this.combine(ctx, retCtx);
        }
    }
    split(ctx) {
        if (this.config.split) {
            return this.config.split(ctx);
        } else {
            return ctx;
        }
    }
    splitCase(item, ctx) {
        if (item.split) {
            return item.split(ctx);
        } else {
            return this.split(ctx);
        }
    }
    compile(rebuild = false) {
        var _this_config, _this_config_cases;
        let i;
        let statics = [];
        let dynamics = [];
        // Apply to each stage own environment: evaluate, split, combine
        for(i = 0; i < ((_this_config = this.config) === null || _this_config === void 0 ? void 0 : (_this_config_cases = _this_config.cases) === null || _this_config_cases === void 0 ? void 0 : _this_config_cases.length); i++){
            let caseItem;
            caseItem = this.config.cases[i];
            if (caseItem instanceof Function) {
                caseItem = {
                    stage: new Stage(caseItem),
                    evaluate: true
                };
            }
            if (isAnyStage(caseItem)) {
                caseItem = {
                    stage: caseItem,
                    evaluate: true
                };
            }
            if (caseItem.stage) {
                if (caseItem.stage instanceof Function) {
                    caseItem.stage = caseItem.stage;
                }
                if (!isAnyStage(caseItem.stage) && typeof caseItem.stage == 'object') {
                    caseItem.stage = new Stage(caseItem.stage);
                }
                if (!(caseItem.split instanceof Function)) {
                    caseItem.split = this.config.split;
                }
                if (!(caseItem.combine instanceof Function)) {
                    caseItem.combine = this.config.combine;
                }
                if (!('evaluate' in caseItem)) {
                    // by default is evaluate
                    caseItem.evaluate = true;
                }
                if (typeof caseItem.evaluate === 'function') {
                    caseItem.evaluate;
                    dynamics.push(caseItem);
                } else if (typeof caseItem.evaluate === 'boolean' && caseItem.evaluate) {
                    statics.push(caseItem);
                }
            }
        }
        let run = (err, ctx, done)=>{
            let actuals = [];
            actuals.push.apply(actuals, statics);
            for(let i = 0; i < dynamics.length; i++){
                if (dynamics[i].evaluate(ctx)) {
                    actuals.push(dynamics[i]);
                }
            }
            let iter = 0;
            let errors = [];
            let hasError = false;
            let next = (index)=>{
                return (err, retCtx)=>{
                    iter++;
                    let cur = actuals[index];
                    let res = null;
                    if (err) {
                        if (!hasError) hasError = true;
                        errors.push(err);
                    } else {
                        res = this.combineCase(cur, ctx, retCtx);
                    }
                    if (iter >= actuals.length) {
                        return done(hasError ? CreateError(errors) : undefined, res !== null && res !== void 0 ? res : ctx);
                    }
                };
            };
            let stg;
            let lctx;
            for(i = 0; i < actuals.length; i++){
                stg = actuals[i];
                lctx = this.splitCase(stg, ctx);
                run_or_execute(stg.stage, err, lctx, next(i));
            // не хватает явной передачи контекста
            }
            if (actuals.length === 0) {
                return done(err);
            }
        };
        this.run = run;
        return super.compile(rebuild);
    }
    constructor(config){
        super();
        if (config) {
            this._config = getMultWaySwitchConfig(config);
        }
    }
}

/**
 * Process staging in parallel way
 * ### config as _Object_
 *
 * - `stage`
 * 		evaluating stage
 * - `split`
 * 		function that split existing stage into smalls parts, it needed
 * - `combine`
 * 		if any result combining is need, this can be used to combine splited parts and update context
 *
 * > **Note**
 * 		`split` does not require `combine` it will return parent context;
 * 		in cases that have no declaration for `split` configured or default will be used
 *
 * @param {Object} config configuration object
 */ class Parallel extends Stage {
    split(ctx) {
        return this._config.split ? this._config.split(ctx) : [
            ctx
        ];
    }
    combine(ctx, children) {
        let res;
        if (this.config.combine) {
            let c = this.config.combine(ctx, children);
            res = c !== null && c !== void 0 ? c : ctx;
        } else {
            res = ctx;
        }
        return res;
    }
    get reportName() {
        return `PLL:${this.config.name ? this.config.name : ''}`;
    }
    toString() {
        return '[pipeline Pipeline]';
    }
    get name() {
        var _this__config_stage;
        var _this__config_name, _ref;
        return (_ref = (_this__config_name = this._config.name) !== null && _this__config_name !== void 0 ? _this__config_name : (_this__config_stage = this._config.stage) === null || _this__config_stage === void 0 ? void 0 : _this__config_stage.name) !== null && _ref !== void 0 ? _ref : '';
    }
    compile(rebuild = false) {
        if (this.config.stage) {
            var run = (err, ctx, done)=>{
                var iter = 0;
                var children = this.split(ctx);
                var len = children ? children.length : 0;
                let errors;
                let hasError = false;
                var next = (index)=>{
                    return (err, retCtx)=>{
                        if (!err) {
                            children[index] = retCtx !== null && retCtx !== void 0 ? retCtx : children[index];
                        } else {
                            if (!hasError) {
                                hasError = true;
                                errors = [];
                            }
                            const error = new ParallelError({
                                stage: this.name,
                                index: index,
                                err: err,
                                ctx: children[index]
                            });
                            if (error) errors.push(error);
                        }
                        iter += 1;
                        if (iter >= len) {
                            if (!hasError) {
                                let result = this.combine(ctx, children);
                                return done(undefined, result);
                            } else {
                                return done(CreateError(errors), ctx);
                            }
                        }
                    };
                };
                if (len === 0) {
                    return done(err, ctx);
                } else {
                    for(var i = 0; i < len; i++){
                        run_or_execute(this.config.stage, err, children[i], next(i));
                    }
                }
            };
            this.run = run;
        } else {
            this.run = empty_run;
        }
        return super.compile();
    }
    constructor(config){
        super();
        if (config) {
            this._config = getParallelConfig(config);
        }
    }
}
class ParallelError extends Error {
    toString() {
        return `${this.name}: at stage ${this.stage} error occured:
    iteration ${this.index}
    ${this.err.message}
    stack is: ${this.err.stack}`;
    }
    constructor(init){
        super(init.err.message);
        this.name = 'ParallerStageError';
        this.stage = init.stage;
        this.ctx = init.ctx;
        this.err = init.err;
        this.index = init.index;
    }
}

/**
 * it make possible to choose which stage to run according to result of `condition` evaluation
 *  - config as
 		- `Function` --- first Stage for pipeline
 * 		- `Stage` --- first Stage
 * 		- `Array` --- list of stages
 * 		- `Object` --- config for Pipeline
 *			  - `stages` list of stages
 *			  - `name` name of pipeline
 * 		- `Empty` --- empty pipeline
 *
 * @param {Object} config configuration object
 */ class Pipeline extends Stage {
    get reportName() {
        return `PIPE:${this.config.name ? this.config.name : ''}`;
    }
    addStage(_stage) {
        let stage;
        if (typeof _stage === 'function') {
            stage = _stage;
        } else {
            if (typeof _stage === 'object') {
                if (isAnyStage(_stage)) {
                    stage = _stage;
                } else {
                    stage = new Stage(_stage);
                }
            }
        }
        if (stage) {
            this.config.stages.push(stage);
            this.run = undefined;
        }
    }
    toString() {
        return '[pipeline Pipeline]';
    }
    compile(rebuild = false) {
        let run = (err, context, done)=>{
            let i = -1;
            // sequential run;
            let next = (err, ctx)=>{
                i += 1;
                if (!err && i < this.config.stages.length) {
                    const st = this.config.stages[i];
                    run_or_execute(st, err, ctx !== null && ctx !== void 0 ? ctx : context, next);
                } else if (i >= this.config.stages.length || err) {
                    done(err, ctx !== null && ctx !== void 0 ? ctx : context);
                }
            };
            next(err, context);
        };
        if (this.config.stages.length > 0) {
            this.run = run;
        } else {
            this.run = empty_run;
        }
        return super.compile(rebuild);
    }
    constructor(config){
        super();
        if (config) {
            this._config = getPipelinConfig(config);
        } else {
            this._config.stages = [];
        }
    }
}

function getRetryOnErrorConfig(config) {
    const res = getStageConfig(config);
    if (isAnyStage(res)) {
        return {
            stage: res
        };
    } else if (typeof config == 'object' && !isAnyStage(config)) {
        if (config.run && config.stage) {
            throw CreateError("don't use run and stage both");
        }
        if (config.run) {
            res.stage = config.run;
        }
        if (config.stage) {
            res.stage = config.stage;
        }
        if (config.backup) {
            res.backup = config.backup;
        }
        if (config.restore) {
            res.restore = config.restore;
        }
        if (config.retry) {
            if (typeof config.retry !== 'function') {
                config.retry *= 1 // To get NaN is wrong type
                ;
            }
            res.retry = config.retry;
        }
        if (!res.retry) res.retry = 1;
    } else if (typeof config == 'function' && res.run) {
        res.stage = res.run;
        delete res.run;
    }
    return res;
}
class RetryOnError extends Stage {
    get reportName() {
        return `Templ:${this.config.name ? this.config.name : ''}`;
    }
    toString() {
        return '[pipeline RetryOnError]';
    }
    backupContext(ctx) {
        if (this.config.backup) {
            return this.config.backup(ctx);
        } else {
            if (Context.isContext(ctx)) {
                return ctx.fork({});
            } else {
                return ctx;
            }
        }
    }
    restoreContext(ctx, backup) {
        if (this.config.restore) {
            return this.config.restore(ctx, backup);
        } else {
            if (Context.isContext(ctx)) {
                for(let key in backup){
                    ctx[key] = backup[key];
                }
                return ctx;
            } else {
                return backup;
            }
        }
    }
    compile(rebuild = false) {
        let run = (err, ctx, done)=>{
            /// ловить ошибки
            // backup context object to overwrite if needed
            let backup = this.backupContext(ctx);
            const reachEnd = (err, iter)=>{
                if (err) {
                    if (this.config.retry instanceof Function) {
                        return !this.config.retry(err, ctx, iter);
                    } else {
                        // number
                        return iter > this.config.retry;
                    }
                } else {
                    return true;
                }
            };
            let iter = -1;
            let next = (err, _ctx)=>{
                iter++;
                if (reachEnd(err, iter)) {
                    return done(err, _ctx !== null && _ctx !== void 0 ? _ctx : ctx);
                } else {
                    // clean changes of existing before values.
                    // may be will need to clear at all and rewrite ? i don't know yet.
                    const res = this.restoreContext(_ctx !== null && _ctx !== void 0 ? _ctx : ctx, backup);
                    run_or_execute(this.config.stage, err, res !== null && res !== void 0 ? res : ctx, next);
                }
            };
            run_or_execute(this.config.stage, err, ctx, next);
        };
        this.run = run;
        return super.compile(rebuild);
    }
    constructor(config){
        super();
        if (config) {
            this._config = getRetryOnErrorConfig(config);
        }
    }
}

/**
 * Process staging in Sequential way
 * ### config as _Object_
 *
 * - `stage`
 * 		evaluating stage
 * - `split`
 * 		function that split existing stage into smalls parts, it needed
 * - `combine`
 * 		if any result combining is need, this can be used to combine splited parts and update context
 *
 * > **Note**
 * 		`split` does not require `combine` it will return parent context;
 * 		in cases that have no declaration for `split` configured or default will be used
 *
 * @param {Object} config configuration object
 */ class Sequential extends Stage {
    split(ctx) {
        return this._config.split ? this._config.split(ctx) : [
            ctx
        ];
    }
    combine(ctx, children) {
        let res;
        if (this.config.combine) {
            let c = this.config.combine(ctx, children);
            res = c !== null && c !== void 0 ? c : ctx;
        } else {
            res = ctx;
        }
        return res;
    }
    get reportName() {
        return `PLL:${this.config.name ? this.config.name : ''}`;
    }
    toString() {
        return '[pipeline Pipeline]';
    }
    get name() {
        var _this__config_stage;
        var _this__config_name, _ref;
        return (_ref = (_this__config_name = this._config.name) !== null && _this__config_name !== void 0 ? _this__config_name : (_this__config_stage = this._config.stage) === null || _this__config_stage === void 0 ? void 0 : _this__config_stage.name) !== null && _ref !== void 0 ? _ref : '';
    }
    compile(rebuild = false) {
        if (this.config.stage) {
            var run = (err, ctx, done)=>{
                var iter = -1;
                var children = this.split ? this.split(ctx) : [
                    ctx
                ];
                var len = children ? children.length : 0;
                var next = (err, retCtx)=>{
                    if (err) {
                        return done(err);
                    }
                    if (retCtx) {
                        children[iter] = retCtx;
                    }
                    iter += 1;
                    if (iter >= len) {
                        let result = this.combine(ctx, children);
                        return done(undefined, result);
                    } else {
                        run_or_execute(this.config.stage, err, children[iter], next);
                    }
                };
                if (len === 0) {
                    return done(err, ctx);
                } else {
                    next(err);
                }
            };
            this.run = run;
        } else {
            this.run = empty_run;
        }
        return super.compile();
    }
    constructor(config){
        super();
        if (config) {
            this._config = getParallelConfig(config);
        }
    }
}

class Timeout extends Stage {
    get reportName() {
        return `Templ:${this.config.name ? this.config.name : ''}`;
    }
    toString() {
        return '[pipeline Timeout]';
    }
    compile(rebuild = false) {
        let run = (err, ctx, done)=>{
            let to;
            let localDone = (err, retCtx)=>{
                if (to) {
                    clearTimeout(to);
                    to = null;
                    return done(err, retCtx);
                }
            };
            let waitFor;
            if (this.config.timeout instanceof Function) {
                waitFor = this.config.timeout(ctx);
            } else {
                waitFor = this.config.timeout;
            }
            if (waitFor) {
                to = setTimeout(()=>{
                    if (to) {
                        if (this.config.overdue) {
                            run_or_execute(this.config.overdue, err, ctx, localDone);
                        }
                    }
                /* else {
            here can be some sort of caching operation
          }*/ }, waitFor);
                if (this.config.stage) {
                    run_or_execute(this.config.stage, err, ctx, localDone);
                }
            } else {
                if (this.config.stage) {
                    run_or_execute(this.config.stage, err, ctx, done);
                }
            }
        };
        this.run = run;
        return super.compile(rebuild);
    }
    constructor(config){
        super();
        if (config) {
            this._config = getTimeoutConfig(config);
        }
    }
}

class Wrap extends Stage {
    get reportName() {
        return `Wrap:${this.config.name ? this.config.name : ''}`;
    }
    toString() {
        return '[pipeline Wrap]';
    }
    compile(rebuild = false) {
        let run = (err, context, done)=>{
            const ctx = this.prepare(context);
            if (this.config.stage) {
                run_or_execute(this.config.stage, err, ctx, (err, retCtx)=>{
                    if (!err) {
                        const result = this.finalize(context, retCtx !== null && retCtx !== void 0 ? retCtx : ctx);
                        done(undefined, result !== null && result !== void 0 ? result : context);
                    } else {
                        done(err, context);
                    }
                });
            }
        };
        this.run = run;
        return super.compile(rebuild);
    }
    prepare(ctx) {
        if (this.config.prepare) {
            var _this_config_prepare;
            return (_this_config_prepare = this.config.prepare(ctx)) !== null && _this_config_prepare !== void 0 ? _this_config_prepare : ctx;
        } else {
            return ctx;
        }
    }
    finalize(ctx, retCtx) {
        // by default the main context will be used to return;
        if (this.config.finalize) {
            return this.config.finalize(ctx, retCtx);
        } else {
            // so we do nothing here
            return ctx;
        }
    }
    constructor(config){
        super();
        if (config) {
            this._config = getWrapConfig(config);
        }
    }
}

exports.ComplexError = ComplexError;
exports.Context = Context;
exports.ContextSymbol = ContextSymbol;
exports.CreateError = CreateError;
exports.DoWhile = DoWhile;
exports.Empty = Empty;
exports.IfElse = IfElse;
exports.MultiWaySwitch = MultiWaySwitch;
exports.OriginalObject = OriginalObject;
exports.Parallel = Parallel;
exports.ParallelError = ParallelError;
exports.Pipeline = Pipeline;
exports.ProxySymbol = ProxySymbol;
exports.RetryOnError = RetryOnError;
exports.Sequential = Sequential;
exports.Stage = Stage;
exports.StageSymbol = StageSymbol;
exports.Timeout = Timeout;
exports.Wrap = Wrap;
exports.getEmptyConfig = getEmptyConfig;
exports.getIfElseConfig = getIfElseConfig;
exports.getMultWaySwitchConfig = getMultWaySwitchConfig;
exports.getNameFrom = getNameFrom;
exports.getParallelConfig = getParallelConfig;
exports.getPipelinConfig = getPipelinConfig;
exports.getRetryOnErrorConfig = getRetryOnErrorConfig;
exports.getStageConfig = getStageConfig;
exports.getTimeoutConfig = getTimeoutConfig;
exports.getWrapConfig = getWrapConfig;
exports.isAllowedStage = isAllowedStage;
exports.isAnyStage = isAnyStage;
exports.isCallback = isCallback;
exports.isComplexError = isComplexError;
exports.isEnsureFunction = isEnsureFunction;
exports.isExternalCallback = isExternalCallback;
exports.isMultiWaySwitch = isMultiWaySwitch;
exports.isRescue = isRescue;
exports.isRunPipelineFunction = isRunPipelineFunction;
exports.isSingleStageFunction = isSingleStageFunction;
exports.isStage = isStage;
exports.isStageRun = isStageRun;
exports.isValidateFunction = isValidateFunction;
exports.is_async = is_async;
exports.is_async_function = is_async_function;
exports.is_func0 = is_func0;
exports.is_func0_async = is_func0_async;
exports.is_func1 = is_func1;
exports.is_func1Callbacl = is_func1Callbacl;
exports.is_func1_async = is_func1_async;
exports.is_func2 = is_func2;
exports.is_func2_async = is_func2_async;
exports.is_func3 = is_func3;
exports.is_func3_async = is_func3_async;
exports.is_thenable = is_thenable;
module.exports = Object.assign(exports.default, exports);
//# sourceMappingURL=index.js.map
