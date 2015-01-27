(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
global.pipelinejs = require('./index');
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./index":2}],2:[function(require,module,exports){
exports.Stage = require('./lib/stage').Stage;
exports.Pipeline = require('./lib/pipeline').Pipeline;
exports.Sequential = require('./lib/sequential').Sequential;
exports.IfElse = require('./lib/ifelse').IfElse;
exports.MultiWaySwitch = require('./lib/multywayswitch').MultiWaySwitch;
exports.Parallel = require('./lib/parallel').Parallel;
exports.Context = require('./lib/context').Context;
exports.Util = require('./lib/util').Util;
exports.Timeout = require('./lib/timeout').Timeout;
exports.Wrap = require('./lib/wrap').Wrap;
exports.RetryOnError = require('./lib/retryonerror').RetryOnError;
},{"./lib/context":3,"./lib/ifelse":4,"./lib/multywayswitch":5,"./lib/parallel":6,"./lib/pipeline":7,"./lib/retryonerror":8,"./lib/sequential":9,"./lib/stage":10,"./lib/timeout":11,"./lib/util":12,"./lib/wrap":13}],3:[function(require,module,exports){
/*!
 * Module dependency
 */
var cmp = require('comparator.js');
var get = cmp.get;
var set = cmp.set;

/*!
 * List of reserver words for context.
 * Used to check wheater or not property is the Context-class property
 */

var reserved = {
	"getChilds": 1,
	"getParent": 1,
	"__children": 1,
	"__parent": 1,
	"__signWith": 1,
	"__setCurrentStackName": 1,
	"__stack": 1,
	"__trace": 1,
	"addToStack": 1,
	"hasChild": 1,
	"ensure": 1,
	"ensureIsChild": 1,
	"addChild": 1,
	"toJSON": 1,
	"toObject": 1,
	"fork": 1,
	"overwrite": 1,
	"get": 1,
};

/**
 *  The **Context** itself
 *  not allowed to use as a function
 *  @param {Object} name the object that is the source for the **Context**.
 */

function Context(config) {
	var self = this;

	if (!(self instanceof Context)) {
		throw new Error('constructor is not a function');
	}
	self.overwrite(config);
}

/**
 * Used to apply changes to context;
 */

Context.prototype.overwrite = function(config) {
	var self = this;
	if (config) {
		var val;
		for (var prop in config) {
			val = config[prop];
			if (!reserved[prop]) {
				if (val !== undefined && val !== null)
					self[prop] = config[prop];
			}
		}
		// ensure that traceability is also copied
		self.__trace = config.trace || config.__trace;
	}
};

/**
 * Reference to parent
 * @api private
 */
Context.prototype.__parent = undefined;

/**
 * Reference to list of childs
 * @api private
 */
Context.prototype.__children = undefined;

/**
 * Reference to list of errors
 * @api private
 */
Context.prototype.__errors = undefined;

/**
 * Reference to stack trace information
 * @api private
 */
Context.prototype.__stack = undefined;

/**
 * Reference to trace-switch
 * @api private
 */
Context.prototype.__trace = undefined;

/**
 * Add specific stage to stack list of the context
 * @param {String} name name of the stage for tracing
 * @api private
 */
Context.prototype.__signWith = function(name) {
	var self = this;
	if (self.__trace) {
		if (!self.__stack) self.__stack = [];
		self.__stack.push(name);
	}
};

/**
 * Allow to sign current stack
 * @param {String} name name of the stack
 * @api private
 */
Context.prototype.__setCurrentStackName = function(name) {
	var self = this;
	if (self.__trace) {
		if (!self.__stack) {
			self.__stack = [];
			self.__stack.push(name);
		} else {
			var current = self.__stack.pop();
			if ('object' !== typeof current || null == current) {
				current = {
					name: name,
					forks: []
				};
			} else {
				current.name = name;
			}
			self.__stack.push(current);
		}
	}
};

/**
 * Allow to add some object to stack with specific name
 * @param {String} name name of stored object
 * @param {Object|any} obj containment
 * @api public
 */
Context.prototype.addToStack = function(name, obj) {
	var self = this;
	if (self.__trace) {
		var current = self.__stack.pop();
		if ('object' !== typeof current || null == current) {
			current = {
				name: current,
				forks: []
			};
		}
		current[name] = obj;
		self.__stack.push(current);
	}
};

/**	
 * Returns list of child contexts.
 * @return {Array of Context}
 * @api public
 */
Context.prototype.getChilds = function() {
	var self = this;
	if (!self.__children) {
		self.__children = [];
	}
	return self.__children;
};

/**
 * Return parent Context
 * @api public
 * @return {Context}
 */
Context.prototype.getParent = function() {
	var self = this;
	return self.__parent;
};

/**
 * checks wheater or not context has specific child context
 * it return `true` also if `ctx` is `self`;
 * @api public
 * @return {Boolean}
 */
Context.prototype.hasChild = function(ctx) {
	var self = this;
	if (ctx instanceof Context) {
		return ctx.__parent === self || self === ctx;
	}
};

/**	
 * static function which ensures that the object is proper Type
 * @api public
 * @param {Object|Context} ctx verified context
 * @return {Context};
 */
Context.ensure = function(ctx) {
	if (!(ctx instanceof Context)) {
		return new Context(ctx);
	} else {
		return ctx;
	}
};

/**
 * Ensures that the context is the child of current context, and returns right context
 * @api public
 * @param {Object|Context} ctx
 * @return {Context}
 */
Context.prototype.ensureIsChild = function(ctx) {
	var self = this;
	var lctx = Context.ensure(ctx);
	if (!self.hasChild(lctx)) {
		self.addChild(lctx);
	}
	return lctx;
};

/**
 * Add child Context to current
 * !Note! All children contexts has parent list of error. This allow to be sure that any fork
 * @api public
 * @param {Context} ctx new child context
 */
Context.prototype.addChild = function(ctx) {
	var self = this;
	if (!self.hasChild(ctx)) {
		var child = Context.ensure(ctx);
		child.__parent = self;
		child.__trace = self.__trace;
		if (!self.__children) {
			self.__children = [];
		}
		// if (!self.__errors) {
		// 	self.__errors = [];
		// }
		if (self.__trace) {
			if (!self.__stack) {
				self.__stack = [];
			}
			child.__stack = [];

			var current = self.__stack.pop();
			if ('object' !== typeof current || null == current) {
				current = {
					name: current,
					forks: []
				};
			}
			self.__stack.push(current);
			child.__stack.push(current.name);
			current.forks.push(child.__stack);
		}

		// child context did't have own error list at all
		// child.__errors = self.__errors;
		self.__children.push(child);
	}
};

/**
 * Makes fork of current context and add it to current as a child context
 * @api public
 * @param {Object|Context} [config] new properties that must exists in new fork
 * @retrun {Context}
 */
Context.prototype.fork = function(config) {
	var self = this;
	var child = new Context(self);
	self.addChild(child);
	for (var p in config) {
		child[p] = config[p];
	}
	child.__trace = self.__trace;
	return child;
};
/**
 * Same but different as a fork. it make possible get piece of context as context;
 * @param path String path to context object that need to be a Context instance
 * @return Context | Primitive type
 */

Context.prototype.get = function(path) {
	var root = get(this, path);
	if (root instanceof Object) {
		var result = root;
		if (!(result instanceof Context)) {
			result = this.ensureIsChild(result);
			set(this, path, result);
		}
		result.__trace = this.__trace;
		return result;
	}
};

/**
 * Extracts symbolic name of the class if exists
 * @api private
 * @param {Object} v source object
 * @return {String}
 */
function extractType(v) {
	var ts = Object.prototype.toString;
	return ts.call(v).match(/\[object (.+)\]/)[1];
}

/**
 * Make clone of object and optionally clean it from not direct descendants of `Object`
 * @api private
 * @param {Object|any} src source
 * @param {Boolean} [clean] wheather or not to clean object
 * @return {Object|any}
 */
function clone(src, clean) {
	var type = extractType(src);
	switch (type) {
		case 'Boolean':
		case 'String':
		case 'Number':
			return src;
		case 'RegExp':
			return new RegExp(src.toString());
		case 'Date':
			return new Date(Number(src));
		case 'Object':
			if (src.toObject instanceof Function) {
				return src.toObject();
			} else {
				if (src.constructor === Object) {
					var obj = {};
					for (var p in src) {
						obj[p] = clone(src[p]);
					}
					return obj;
				} else {
					return clean ? undefined : src;
				}
			}
			break;
		case 'Array':
			var res = [];
			for (var i = 0, len = src.length; i < len; i++) {
				res.push(clone(src[i], clean));
			}
			return res;
		case 'Undefined':
		case 'Null':
			return src;
		default:
	}
}

/**
 * Convert context to raw Object;
 * @api public
 * @param {Boolean} [clean]  `true` it need to clean object from referenced Types except Function and raw Object(js hash)
 * @return {Object}
 */
Context.prototype.toObject = function(clean) {
	var self = this;
	var obj = {};
	for (var p in self) {
		if (!reserved[p]) {
			obj[p] = clone(self[p], clean);
		}
	}
	return obj;
};

/**
 * Conterts context to JSON
 * @api public
 * @return {String}
 */
Context.prototype.toJSON = function() {
	var self = this;
	// always cleaning the object
	return JSON.stringify(self.toObject(true));
};
/*!
 * exports
 */
exports.Context = Context;
},{"comparator.js":14}],4:[function(require,module,exports){
/*! 
 * Module dependency
 */
var Stage = require('./stage').Stage;
var util = require('./util').Util;

/**
 * it make possible to choose which stage to run according to result of `condition` evaluation
 * ### config as _Object_
 *
 * - `condition`
 * desicion function or boolean condition
 * used to decide what way to go.
 *
 * - `success`
 * `Stage` or stage `function` to run in case of _successful_ evaluation of `condition`
 *
 * - `failed`
 * `Stage` or stage `function` to run in case of _failure_ evaluation of `condition`
 *
 * other confguration as Stage because it is its child Class.
 *
 * @param config Object configuration object
 */
function IfElse(config) {

	var self = this;

	if (!(self instanceof IfElse)) {
		throw new Error('constructor is not a function');
	}

	if (config && config.run instanceof Function) {
		config.stage = new Stage(config.run);
		delete config.run;
	}

	Stage.apply(self, arguments);

	if (!config) {
		config = {};
	}

	if (config.condition instanceof Function) {
		self.condition = config.condition;
	}

	if (config.success instanceof Stage) {
		self.success = config.success;
	} else {
		if (config.success instanceof Function) {
			self.success = new Stage(config.success);
		} else {
			self.success = new Stage();
		}
	}

	if (config.failed instanceof Stage) {
		self.failed = config.failed;
	} else {
		if (config.failed instanceof Function) {
			self.failed = new Stage(config.failed);
		} else {
			self.failed = new Stage();
		}
	}

	self.name = config.name;
}

/*!
 * Inherited from Stage
 */
util.inherits(IfElse, Stage);

/**
 * internal declaration fo `success`
 */
IfElse.prototype.success = undefined;

/**
 * internal declaration fo `failure`
 */
IfElse.prototype.failure = undefined;

/**
 * internal declaration fo `condition`
 */
IfElse.prototype.condition = function(ctx) {
	return true;
};

/**
 * override of `reportName`
 * @api protected
 */
IfElse.prototype.reportName = function() {
	var self = this;
	return "IFELSE:" + self.name;
};

/**
 * override of compile
 * @api protected
 */
IfElse.prototype.compile = function() {
	var self = this;
	if (!self.name) {
		self.name = "success: " + self.success.reportName() + " failure: " + self.failed.reportName();
	}
	var run = function(ctx, done) {
		if (self.condition(ctx)) {
			self.success.execute(ctx, done);
		} else {
			self.failed.execute(ctx, done);
		}
	};
	self.run = run;
};

/**
 * override of execute
 * @api protected
 */
IfElse.prototype.execute = function(context, callback) {
	var self = this;
	if (!self.run) {
		self.compile();
	}
	IfElse.super_.prototype.execute.apply(self, arguments);
};

/*!
 * exports
 */
exports.IfElse = IfElse;
},{"./stage":10,"./util":12}],5:[function(require,module,exports){
/*! 
 * Module dependency
 */

var Stage = require('./stage').Stage;
var util = require('./util').Util;
var ErrorList = require('./util').ErrorList;

/**
 * Each time split context for current step and use it in current stage
 * ### config as _Object_
 *
 * - `condition`
 * desicion function or boolean condition
 * used to decide what way to go.
 *
 * - `success`
 * `Stage` or stage `function` to run in case of _successful_ evaluation of `condition`
 *
 * - `failed`
 * `Stage` or stage `function` to run in case of _failure_ evaluation of `condition`
 *
 * other confguration as Stage because it is its child Class.
 *
 * if cases have no declaration for `split` configured or default will be used
 *
 * @param config Object configuration object
 */
function MultiWaySwitch(config) {

	var self = this;

	if (!(self instanceof MultiWaySwitch)) {
		throw new Error('constructor is not a function');
	}

	if (config && config.run instanceof Function) {
		config.stage = new Stage(config.run);
		delete config.run;
	}

	Stage.apply(self, arguments);

	if (!config) {
		config = {};
	}

	if (config instanceof Array) {
		config = {
			cases: config
		};
	}
	self.cases = config.cases ? config.cases : [];

	if (config.split instanceof Function) {
		self.split = config.split;
	}

	if (config.combine instanceof Function) {
		self.combine = config.combine;
	}

	self.name = config.name;
	if (!self.name) {
		self.name = [];
	}
}

/*!
 * Inherited from Stage
 */
util.inherits(MultiWaySwitch, Stage);

/**
 * internal declaration fo store different `cases`
 * @api protected
 */
MultiWaySwitch.prototype.cases = undefined;

/**
 * default implementation fo `split` for `case`
 * @api protected
 * @param ctx Context soure context to be splitted
 */
MultiWaySwitch.prototype.split = function(ctx) {
	return ctx;
};

/**
 * default implementation fo `combine` for `case`
 * @api protected
 * @param ctx Context original contect
 * @param ctx Context case-stage resulting context
 */
MultiWaySwitch.prototype.combine = function(ctx, resCtx) {
	return resCtx;
};

/**
 * internal declaration fo `reportName`
 * @api protected
 */
MultiWaySwitch.prototype.reportName = function() {
	var self = this;
	return "MWS:" + self.name;
};

/**
 * overrides inherited `compile`
 * @api protected
 */
MultiWaySwitch.prototype.compile = function() {
	var self = this;
	var i;

	var len = self.cases.length;
	var caseItem;
	var statics = [];
	var dynamics = [];
	var nameUndefined = (Array.isArray(self.name) || !self.name);
	if (nameUndefined) {
		self.name = [];
	}

	// Apply to each stage own environment: evaluate, split, combine
	for (i = 0; i < len; i++) {
		caseItem = self.cases[i];
		if (caseItem instanceof Stage) {
			caseItem = {
				stage: caseItem,
				evaluate: true
			};
		}

		if (caseItem.stage) {
			if (caseItem.stage instanceof Function) {
				caseItem.stage = new Stage(caseItem.stage);
			}
			if (!(caseItem.stage instanceof Stage) && (caseItem.stage instanceof Object)) {
				caseItem.stage = new Stage(caseItem.stage);
			}
			if (!(caseItem.split instanceof Function)) {
				caseItem.split = self.split;
			}
			if (!(caseItem.combine instanceof Function)) {
				caseItem.combine = self.combine;
			}
			if (typeof caseItem.evaluate === 'function') {
				dynamics.push(caseItem);
			} else {
				if (typeof caseItem.evaluate === 'boolean' && caseItem.evaluate) {
					statics.push(caseItem);
				}
			}
		}
		if (nameUndefined) {
			self.name.push(caseItem.stage.reportName());
		}
	}

	if (nameUndefined) self.name = self.name.join('|');

	var run = function(err, ctx, done) {
		var i;
		var len = dynamics.length;
		var actuals = [];
		actuals.push.apply(actuals, statics);

		for (i = 0; i < len; i++) {
			if (dynamics[i].evaluate(ctx)) {
				actuals.push(dynamics[i]);
			}
		}
		len = actuals.length;
		var iter = 0;

		var errors = [];

		function finish() {
			if (errors.length > 0) {
				done(new ErrorList(errors));
			} else {
				done();
			}
		}
		
		var next = function(index) {

			function logError(err) {
				errors.push({
					index: index,
					err: err
				});
			}

			return function(err, retCtx) {
				iter++;
				var cur = actuals[index];
				if (err) {
					logError(err);
				} else {
					cur.combine(ctx, retCtx);
				}
				if (iter >= len) {
					finish();
				}
			};
		};
		var stg;
		for (i = 0; i < len; i++) {
			stg = actuals[i];
			stg.stage.execute(ctx.ensureIsChild(stg.split(ctx)), next(i));
		}

		if (len === 0) {
			finish();
		}
	};
	self.run = run;
};

/**
 * override of execute
 * !!!Note!!! Errors that will be returned to callback will be stored in array
 * @api protected
 * @param context Context executing Context
 * @param [callback] function if it is specified the it will be used to return resulting context or error
 */
MultiWaySwitch.prototype.execute = function(context, callback) {
	var self = this;
	if (!self.run) {
		self.compile();
	}
	MultiWaySwitch.super_.prototype.execute.apply(self, arguments);
};

/*!
 * exports
 */
exports.MultiWaySwitch = MultiWaySwitch;
},{"./stage":10,"./util":12}],6:[function(require,module,exports){
/*! 
 * Module dependency
 */
var Stage = require('./stage').Stage;
var Context = require('./context').Context;
var util = require('./util').Util;
var ErrorList = require('./util').ErrorList;

/**
 * Process staging in parallel way
 * ### config as _Object_
 *
 * - `stage` evaluating stage
 * - `split` function that split existing stage into smalls parts, it needed
 * - `combine` if any result combining is need, this can be used to combine splited parts and update context
 *
 * !!!Note!!!Split does not require combine --- b/c it will return parent context;
 * if cases have no declaration for `split` configured or default will be used
 *
 * @param config Object configuration object
 */
function Parallel(config) {

	var self = this;

	if (!(self instanceof Parallel)) {
		throw new Error('constructor is not a function');
	}

	if (config && config.run instanceof Function) {
		config.stage = new Stage(config.run);
		delete config.run;
	}

	Stage.apply(self, arguments);

	if (!config) {
		config = {};
	}

	if (config instanceof Stage) {
		config = {
			stage: config
		};
	}

	if (config.stage instanceof Stage) {
		self.stage = config.stage;
	} else {
		if (config.stage instanceof Function) {
			self.stage = new Stage(config.stage);
		} else {
			self.stage = new Stage();
		}
	}

	if (config.split instanceof Function) {
		self.split = config.split;
	}

	if (config.combine instanceof Function) {
		self.combine = config.combine;
	}

	self.name = config.name;
}

/*!
 * Inherited from Stage
 */
util.inherits(Parallel, Stage);

/**
 * internal declaration fo `success`
 */
Parallel.prototype.stage = undefined;

/**
 * internal declaration fo `success`
 */
Parallel.prototype.split = function(ctx) {
	return [ctx];
};

/**
 * internal declaration fo `combine`
 * @param ctx Context main context
 * @param children Context[] list of all children contexts
 */
Parallel.prototype.combine = function(ctx, children) {
};

/**
 * override of `reportName`
 * @api protected
 */
Parallel.prototype.reportName = function() {
	var self = this;
	return "PLL:" + self.name;
};

/**
 * override of compile
 * split all and run all
 * @api protected
 */
Parallel.prototype.compile = function() {
	var self = this;
	if (!self.name) {
		self.name = self.stage.reportName();
	}
	var run = function(err, ctx, done) {
		var iter = 0;
		var children = self.split(ctx);
		var len = children ? children.length : 0;
		var errors = [];

		function finish() {
			if (errors.length > 0) {
				done(new ErrorList(errors));
			} else {
				self.combine(ctx, children);
				done();
			}
		}

		function logError(err, index) {
			errors.push({
				stage: self.name,
				index: index,
				err: err,
				stack: err.stack,
				ctx: children[index]
			});
		}

		var next = function(index) {
			return function(err, retCtx) {
				iter++;
				if (err) {
					logError(err, index);
				} else {
					children[index] = retCtx;
				}
				if (iter >= len) {
					finish();
				}
			};
		};

		if (len === 0) {
			finish();
		} else {
			for (var i = 0; i < len; i++) {
				self.stage.execute(ctx.ensureIsChild(children[i]), next(i));
			}
		}
	};
	self.run = run;
};

/**
 * override of execute
 * @api protected
 */
Parallel.prototype.execute = function(context, callback) {
	var self = this;
	if (!self.run) {
		self.compile();
	}
	Parallel.super_.prototype.execute.apply(self, arguments);
};

/*!
 * exports
 */
exports.Parallel = Parallel;
},{"./context":3,"./stage":10,"./util":12}],7:[function(require,module,exports){
/*!
 * Module dependency
 */
var Stage = require('./stage').Stage;
var util = require('./util.js').Util;

/**
 * it make possible to choose which stage to run according to result of `condition` evaluation
 * config as `Function` --- first Stage for pipeline
 * config as `Stage` --- first Stage 
 * config as `Array` --- list of stages
 * config as `Object` --- config for Pipeline
 * config as `Empty` --- empty pipeline
 * 
 * ### config as _Object_
 *
 * - `stages` list of stages
 *
 * - `name` name of pipeline
 *
 * other confguration as Stage because it is its child Class.
 * 
 * @param config Object configuration object
 */
function Pipeline(config) {

	var self = this;

	if (!(self instanceof Pipeline)) {
		throw new Error('constructor is not a function');
	}

	self.stages = [];
	var stages = [];

	if (config) {

		if (config.run instanceof Function) {
			config.stage = new Stage(config.run);
			delete config.run;
		}

		if (Array.isArray(config.stages)) {
			stages.push.apply(stages, config.stages);
			delete config.stages;
		}

		if (config instanceof Array) {
			stages.push.apply(stages, config);
		}

		if (typeof(config.run) === 'function') {
			stages.push(config.run);
			var stg = config.run;
			delete config.run;
		}

		if (typeof(config) instanceof Stage) {
			stages.push(config);
		}

		if (typeof(config) === 'object') {
			Stage.call(self, config);
		}
		if (typeof(config) === 'string') {
			Stage.call(self);
			self.name = config;
		}

	} else {
		Stage.call(self);
	}

	if (config && config.name) {
		self.name = config.name;
	}

	if (!self.name) {
		self.name = [];
	}

	var len = stages.length;
	for (var i = 0; i < len; i++) {
		self.addStage(stages[i]);
	}
}

/*!
 * Inherited from Stage
 */
util.inherits(Pipeline, Stage);

/**
 * internal declaration for stage store
 */
Pipeline.prototype.stages = undefined;

/**
 * override of `reportName`
 * @api protected
 */
Pipeline.prototype.reportName = function() {
	var self = this;
	return "PIPE:" + self.name;
};

/**
 * add Stages to Pipeline
 * it reset run method to compile it again
 * @api public
 * @param stage new Stage to evaluate in pipeline
 */
Pipeline.prototype.addStage = function(stage) {
	var self = this;
	var empty = false;
	if (!(stage instanceof Stage)) {
		if (typeof(stage) === 'function') {
			stage = new Stage(stage);
		} else {
			if (typeof(stage) === 'object') {
				stage = new Stage(stage);
			} else {
				empty = true;
			}
		}
	}
	if (!empty) {
		self.stages.push(stage);
		if (self.run) {
			//reset run method
			self.run = 0;
		}
	}
};

/**
 * override of compile
 * run different stages one after another one
 * @api protected
 */
Pipeline.prototype.compile = function() {
	var self = this;
	var len = self.stages.length;
	var nameUndefined = (Array.isArray(self.name) || !self.name);
	if (nameUndefined) {
		self.name = self.stages.map(function(st) {
			return st.reportName();
		}).join('->');
	}

	var run = function(context, done) {
		var i = -1;
		var stlen = len; // hack to avoid upper context search;
		var stList = self.stages; // the same hack
		//sequential run;
		var next = function(err, context) {
			if (++i >= stlen || err) {
				if (!err && i > stlen) {
					err = new Error(' the method \'done\' of pipeline is called more that ones');
				}
				done(err);
			} else {
				stList[i].execute(context, next);
			}
		};
		next(null, context);
	};

	if (len > 0) {
		self.run = run;
	} else {
		self.run = function() {};
	}
};

/**
 * override of execute
 * @api protected
 */
Pipeline.prototype.execute = function(context, callback) {
	var self = this;
	if (!self.run) {
		self.compile();
	}
	Pipeline.super_.prototype.execute.apply(self, arguments);
};

/*!
 * exports
 */
exports.Pipeline = Pipeline;
},{"./stage":10,"./util.js":12}],8:[function(require,module,exports){
/*!
 * Module dependency
 */
var Context = require('./context').Context;
var Stage = require('./stage').Stage;
var util = require('./util').Util;

/**
 * Retries to run, if error occures specified number of times
 * ### config as _Object_
 *
 * - `stage` evaluating stage
 *
 * - `retry` number that limits number of retries
 *
 * - `retry` Function that decide either to run or to stop trying
 *
 * @param config Object configuration object
 */
function RetryOnError(config) {

	var self = this;

	if (!(self instanceof RetryOnError)) {
		throw new Error('constructor is not a function');
	}

	if (config && config.run instanceof Function) {
		config.stage = new Stage(config.run);
		delete config.run;
	}

	Stage.apply(self, arguments);

	if (config.stage instanceof Stage) {
		self.stage = config.stage;
	} else if (config.stage instanceof Function) {
		self.stage = new Stage(config.stage);
	} else {
		self.stage = new Stage();
	}

	if (config) {
		if (config.retry) {
			// function, count
			if (typeof config.retry !== 'function') {
				config.retry *= 1; // To get NaN is wrong type
			}
			if (config.retry)
				self.retry = config.retry;
		}
	} else {
		self.retry = 1;
	}
}

/*!
 * Inherited from Stage
 */
util.inherits(RetryOnError, Stage);

/**
 * internal declaration fo `combine`
 * @param err Error|Object|any error that is examined
 * @param ctx Context main context
 * @param iter Number current iteration: 0 is the run, but 1... retry couner
  */
RetryOnError.prototype.retry = function(err, ctx, iter) {
	// 0 means that run once 1 and more than one;
	return iter <= 1;
};

/**
 * override of `reportName`
 * @api protected
 */
RetryOnError.prototype.reportName = function() {
	return "RetryOnError:" + this.name;
};

RetryOnError.prototype.backupContext = function(ctx) {
	return ctx.toObject();
};

RetryOnError.prototype.restoreContext = function(ctx, backup) {
	ctx.overwrite(backup);
	// ctx.__errors.length = 0;
};

/**
 * override of compile
 * provide a way to compose retry run.
 * @api protected
 */
RetryOnError.prototype.compile = function() {

	var self = this;

	if (!self.name) {
		self.name = "stage: " + self.stage.reportName() + " with retry " + self.retry + " times";
	}

	var run = function(ctx, done) {
		// backup context object to overwrite if needed
		var backup = self.backupContext(ctx);

		reachEnd = function(err, iter) {
			if (err) {
				if (self.retry instanceof Function) {
					return !self.retry(err, ctx, iter);
				} else { // number
					return iter > self.retry;
				}
			} else {
				return true;
			}
		};
		var iter = -1;
		var next = function(err, ctx) {
			iter++;
			if (reachEnd(err, iter)) {
				done(err);
			} else {
				// clean changes of existing before values.
				// may be will need to clear at all and rewrite ? i don't know yet.
				self.restoreContext(ctx, backup);
				self.stage.execute(ctx, next);
			}
		};
		self.stage.execute(ctx, next);
	};

	self.run = run;
};

/**
 * override of execute
 * @api protected
 */
RetryOnError.prototype.execute = function(context, callback) {
	var self = this;
	if (!self.run) {
		self.compile();
	}
	RetryOnError.super_.prototype.execute.apply(self, arguments);
};

/*!
 * exports
 */
exports.RetryOnError = RetryOnError;
},{"./context":3,"./stage":10,"./util":12}],9:[function(require,module,exports){
/*! 
 * Module dependency
 */
var Stage = require('./stage').Stage;
var Context = require('./context').Context;
var util = require('./util').Util;
var ErrorList = require('./util').ErrorList;

/**
 * Process staging in sequential way
 * ### config as _Object_
 *
 * - `stage` evaluating stage
 * - `split` function that split existing stage into smalls parts, it needed
 * - `combine` if any result combining is need, this can be used to combine splited parts and update context
 *
 * !!!Note!!!Split does not require combine --- b/c it will return parent context;
 * if cases have no declaration for `split` configured or default will be used
 *
 * @param config Object configuration object
 */
function Sequential(config) {

	var self = this;

	if (!(self instanceof Sequential)) {
		throw new Error('constructor is not a function');
	}

	if (config && config.run instanceof Function) {
		config.stage = new Stage(config.run);
		delete config.run;
	}

	Stage.apply(self, arguments);

	if (!config) {
		config = {};
	}

	if (config instanceof Stage) {
		config = {
			stage: config
		};
	}

	if (config.stage instanceof Stage) {
		self.stage = config.stage;
	} else {
		if (config.stage instanceof Function) {
			self.stage = new Stage(config.stage);
		} else {
			self.stage = new Stage();
		}
	}

	if (config.split instanceof Function) {
		self.split = config.split;
	}

	if (config.combine instanceof Function) {
		self.combine = config.combine;
	}

	self.name = config.name;
}

/*!
 * Inherited from Stage
 */
util.inherits(Sequential, Stage);

/**
 * internal declaration fo `stage`
 */
Sequential.prototype.stage = undefined;

/**
 * internal declaration fo `split`
 */
Sequential.prototype.split = function(ctx) {
	return [ctx];
};

/**
 * internal declaration fo `combine`
 * @param ctx Context main context
 * @param children Context[] list of all children contexts
 */
Sequential.prototype.combine = function(ctx, children) {
};

/**
 * override of `reportName`
 * @api protected
 */
Sequential.prototype.reportName = function() {
	var self = this;
	return "SEQ:" + self.name;
};

/**
 * override of compile
 * split all and run all
 * @api protected
 */
Sequential.prototype.compile = function() {
	var self = this;
	if (!self.name) {
		self.name = self.stage.reportName();
	}
	var run = function(err, ctx, done) {
		var iter = -1;
		var children = self.split(ctx);
		var len = children ? children.length : 0;
		var errors = [];

		function finish() {
			if (errors.length > 0) {
				done(new ErrorList(errors));
			} else {
				self.combine(ctx, children);
				done();
			}
		}

		function logError(err, index) {
			errors.push({
				stage: self.name,
				index: index,
				err: err,
				stack: err.stack,
				ctx: children[index]
			});
		}

		var next = function(err, retCtx) {
			iter++;
			if (err) {
				logError(err, iter-1);
			} else if (iter > 0) {
				children[iter-1] = retCtx;
			}

			if (iter >= len) {
				finish();
			} else {
				self.stage.execute(ctx.ensureIsChild(children[iter]), next);
			}
		};

		if (len === 0) {
			finish();
		} else {
			next();
		}
	};
	self.run = run;
};

/**
 * override of execute
 * @api protected
 */
Sequential.prototype.execute = function(context, callback) {
	var self = this;
	if (!self.run) {
		self.compile();
	}
	Sequential.super_.prototype.execute.apply(self, arguments);
};

/*!
 * exports
 */
exports.Sequential = Sequential;
},{"./context":3,"./stage":10,"./util":12}],10:[function(require,module,exports){
/*!
 * Module dependency
 */
var Context = require('./context').Context;
var EventEmitter = require("events").EventEmitter;

var schema = require('js-schema');
var util = require('./util').Util;

/** 
 * ##events:
 *
 * - `error` -- error whiule executing stage
 * - `done` -- resulting context of staging
 * - `end` -- examine that stage executing is complete
 
 * General Stage definition
 * ##Configuration
 *
 * ###config as `Object`
 *
 * ####ensure
 *
 * ####rescue
 *
 * ####validate
 *
 * ####schema
 *
 * ####run
 *
 * ###config as Function
 *
 *  `config` is the `run` method of the stage
 *
 * ###config as String
 *
 *  `config` is the `name` of the stage
 *
 * @param config {Object|Function|String} Stage configuration
 * @api public
 */
function Stage(config) {

	var self = this;

	if (!(self instanceof Stage)) {
		throw new Error('constructor is not a function');
	}

	if (config) {

		if (typeof(config) === 'object') {

			if (typeof(config.ensure) === 'function') {
				self.ensure = config.ensure;
			}

			if (typeof(config.rescue) === 'function') {
				self.rescue = config.rescue;
			}

			if (config.validate && config.schema) {
				throw new Error('use either validate or schema');
			}

			if (typeof(config.validate) === 'function') {
				self.validate = config.validate;
			}

			if (typeof(config.schema) === 'object') {
				self.validate = schema(config.schema);
			}

			if (typeof(config.run) === 'function') {
				self.run = config.run;
			}
		} else {

			if (typeof(config) === 'function') {
				self.run = config;
			}
		}

		if (typeof(config) === 'string') {
			self.name = config;
		} else {

			if (config.name) {
				self.name = config.name;
			} else {
				var match = self.run.toString().match(/function\s*(\w+)\s*\(/);

				if (match && match[1]) {
					self.name = match[1];
				} else {
					self.name = self.run.toString();
				}
			}
		}
	}
	EventEmitter.call(self);
}

/*!
 * Inherited from Event Emitter
 */
util.inherits(Stage, EventEmitter);

/**
 * provaide a way to get stage name for reports used for tracing
 * @return String
 */
Stage.prototype.reportName = function() {
	var self = this;
	return 'STG:' + (self.name ? (' ' + self.name) : '');
};

/**
 * Ensures context validity
 * this can be overridden by user
 * in sync or async way
 * in sync way it has signature
 * `function(context):Error` so it must return error if context is invalid
 * sync signature
 * @param context context
 * @param callback Function
 */
Stage.prototype.ensure = function(context, callback) {
	var self = this;
	var validation = self.validate(context);

	if (validation) {
		if ('boolean' === typeof validation) {
			callback(null);
		} else {
			callback(validation);
		}
	} else {
		callback(new Error(self.reportName() + ' reports: Context is invalid'));
	}
};

/**
 * internal storage for name
 */
Stage.prototype.name = undefined;

/**
 * default `validate` implementation
 */
Stage.prototype.validate = function(context) {
	return true;
};

/**
 * Allpurpose Error handler for stage
 * @param err Error|null
 * @param context Context
 * @param [callback] Function callback for async rescue process
 * return Error|undefined|null
 */

// потестировать разные rescue

Stage.prototype.rescue = function(err, context, callback) {
	if (typeof callback === 'function') {
		callback(err);
	} else {
		return err;
	}
};

/** it can be also sync like this */
/*	Stage.prototype.rescue = function(err, context) {
		// verys simple error check with context ot without it
		return err;
	};*/
/**/

/**
 * sing context with stage name.
 * used for tracing
 * @api internal
 */
Stage.prototype.sign = function(context) {
	var self = this;
	if (context instanceof Context) {
		context.__signWith(self.reportName());
	}
};

/**
 * run function, can be assigned by child class
 * Singature
 * function(err, ctx, done) -- async wit custom error handler! deprecated. err always null.
 * function(ctx, done) -- async
 * function(ctx) -- sync call
 * function() -- sync call `context` applyed as this for function.
 */
Stage.prototype.run = 0;
var failproofSyncCall = require('./util.js').failproofSyncCall;
var failproofAsyncCall = require('./util.js').failproofAsyncCall;
/**
 * executes stage and return result to callback
 * always async
 * @param _context Context|Object incoming context
 * @param callback Function incoming callback function function(err, ctx)
 */
Stage.prototype.execute = function(_context, callback) {
	var self = this;

	var context = Context.ensure(_context);
	var hasCallback = typeof(callback) === 'function';

	function handleError(_err) {
		function processError(err) {
			if (err) {
				if (self.listeners('error').length > 0) {
					// поскольку код вызывается в домене, 
					// то без листенера код вызовет рекурсию...
					self.emit('error', err, context);
				}
			}
			finishIt(err);
		}
		var len = self.rescue.length;
		switch (len) {
			case 0:
				processError(self.rescue());
				break;
			case 1:
				processError(self.rescue(_err));
				break;

			case 2:
				processError(self.rescue(_err, context));
				break;

			case 3:
				self.rescue(_err, context, processError);
				break;

			default:
				processError(_err);
		}
	};

	var ensureAsync = failproofAsyncCall.bind(undefined, handleError);
	var ensureSync = failproofSyncCall.bind(undefined, handleError);

	function finishIt(err) {
		self.emit('end', context);
		if (hasCallback) {
			setImmediate(function(err, context) {
				callback(err, context);
			}, err, context);
		}
	};
	//wrap it with errorcheck
	var doneIt = function(err) {
		if (err) {
			handleError(err);
		} else {
			self.emit('done', context);
			finishIt();
		}
	};

	runStage = function(err) {
		if (err) {
			handleError(err);
		} else {

			if (typeof(self.run) == 'function') {
				if (context.__trace) {
					context.addToStack('context', context.toObject());
					// console.log(self.name);
				}
				var hasError = null;
				switch (self.run.length) {
					case 0:
						ensureSync(context, self.run, doneIt)();
						break;
					case 1:
						ensureSync(self, self.run, doneIt)(context);
						break;
					case 2:
						ensureAsync(self, self.run)(context, doneIt);
						break;
					case 3:
						ensureAsync(self, self.run)(null, context, doneIt);
						break;
					default:
						handleError(new Error('unacceptable signature'));
				}
			} else {
				handleError(new Error(self.reportName() + ' reports: run is not a function'));
			}
		}
	};

	self.sign(context);
	switch (self.ensure.length) {
		case 2:
			self.ensure(context, runStage);
			break;
		case 1:
			runStage(self.ensure(context));
			break;
		default:
			handleError(new Error('unknown ensure signature'));
	}
};

/*!
 * exports
 */
exports.Stage = Stage;
},{"./context":3,"./util":12,"./util.js":12,"events":38,"js-schema":19}],11:[function(require,module,exports){
(function (process){
/*!
 * Module dependency
 */
var Stage = require('./stage').Stage;
var util = require('./util').Util;

/**
 * Timeout: run **stage** and wait **timeout** ms for and run overdue stage
 * configuration
 *  - timeout --- timeout in ms
 * 	- stage --- main stage
 * 	- overdue --- overdue stage optional. if no overdue is configured.
 */
function Timeout(config) {

	var self = this;

	if (!(self instanceof Timeout)) {
		throw new Error('constructor is not a function');
	}

	if (config && config.run instanceof Function) {
		config.stage = new Stage(config.run);
		delete config.run;
	}

	Stage.apply(self, arguments);

	if (!config) {
		config = {};
	}

	self.timeout = config.timeout || 1000;

	if (config.stage instanceof Stage) {
		self.stage = config.stage;
	} else if (config.stage instanceof Function) {
		self.stage = new Stage(config.stage);
	} else {
		self.stage = new Stage();
	}

	if (config.overdue instanceof Stage) {
		self.overdue = config.overdue;
	} else if (config.overdue instanceof Function) {
		self.overdue = config.overdue;
	}
	
	self.overdue = new Stage(self.overdue);
	self.name = config.name;
}

/*!
 * Inherited from Stage
 */
util.inherits(Timeout, Stage);

/**
 * internal declaration fo `timeout`
 */
Timeout.prototype.timeout = undefined;

/**
 * internal declaration fo `stage`
 */
Timeout.prototype.stage = undefined;

/**
 * default implementation of overdue;
 */
Timeout.prototype.overdue = function(ctx, done) {
	done(new Error('overdue'));
};

/**
 * override of `reportName`
 * @api protected
 */
Timeout.prototype.reportName = function() {
	return "Timeout:" + this.name;
};

/**
 * override of compile
 * @api protected
 */
Timeout.prototype.compile = function() {

	var self = this;

	if (!self.name) {
		self.name = "success: " + self.stage.reportName() + " failure: " + self.overdue.reportName();
	}

	var run = function(err, ctx, done) {
		process.nextTick(function() {
			var to;
			var localDone = function(err) {

				if (to) {
					clearTimeout(to);
					to = null;
					done(err);
				}
			};

			if (!err) {
				to = setTimeout(function() {
					if (to) {
						self.overdue.execute(ctx, localDone);
					}
				}, self.timeout);
				self.stage.execute(ctx, localDone);
			} else {
				done(err);
			}
		});
	};
	self.run = run;
};

/**
 * override of execute
 * @api protected
 */
Timeout.prototype.execute = function(context, callback) {
	var self = this;
	if (!self.run) {
		self.compile();
	}
	Timeout.super_.prototype.execute.apply(self, arguments);
};

/*!
 * exports
 */
exports.Timeout = Timeout;
}).call(this,require('_process'))
},{"./stage":10,"./util":12,"_process":39}],12:[function(require,module,exports){
(function (global){
/*!
 * Module dependency
 */
exports.Util = {};
exports.Util.getClass = function(obj) {
  if (obj && typeof obj === 'object' && Object.prototype.toString.call(obj) !== '[object Array]' && obj.constructor && obj !== global) {
    var res = obj.constructor.toString().match(/function\s*(\w+)\s*\(/);
    if (res && res.length === 2) {
      return res[1];
    }
  }
  return false;
};
exports.Util.inherits = function(ctor, superCtor) {
  ctor.super_ = superCtor;
  ctor.prototype = Object.create(superCtor.prototype, {
    constructor: {
      value: ctor,
      enumerable: false
    }
  });
};

/*!
 * failproff wrapper for Sync call
 */
function failproofSyncCall(handleError, _this, _fn, finalize) {
  var fn = function() {
    var failed = false;
    var args = Array.prototype.slice.call(arguments);
    try {
      _fn.apply(_this, args);
    } catch (err) {
      failed = true;
      handleError(err);
    }
    if (!failed) {
      finalize();
    }
  };
  return function() {
    // посмотреть может быть нужно убрать setImmediate?!
    var args = Array.prototype.slice.call(arguments);
    args.unshift(fn);
    setImmediate.apply(null, args);
  };
}

exports.failproofSyncCall = failproofSyncCall

/*!
 * failproff wrapper for Async call
 */
function failproofAsyncCall(handleError, _this, _fn) {
  var fn = function() {
    var args = Array.prototype.slice.call(arguments);
    try {
      _fn.apply(_this, args);
    } catch (err) {
      handleError(err)
    }
  };
  return function() {
    // посмотреть может быть нужно убрать setImmediate?!
    var args = Array.prototype.slice.call(arguments);
    args.unshift(fn);
    setImmediate.apply(null, args);
  };
}

exports.failproofAsyncCall = failproofAsyncCall;

function ErrorList(list) {
  var self = this;
  if (!(self instanceof ErrorList)) {
    throw new Error('constructor is not a function');
  }
  Error.apply(self);
  self.message = "Complex Error";
  self.errors = list;
}

ErrorList.prototype.errors = undefined;
exports.Util.inherits(ErrorList, Error);

exports.ErrorList = ErrorList;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],13:[function(require,module,exports){
/*!
 * Module dependency
 */
var Context = require('./context').Context;
var Stage = require('./stage').Stage;
var util = require('./util').Util;

/**
 * Wrap stage
 * configuration:
 * 	- prepare --- used to prepera new context that fits wrapped stage 
 * 	- finalize --- used to write fill main context with result
 */
function Wrap(config) {

	var self = this;

	if (!(self instanceof Wrap)) {
		throw new Error('constructor is not a function');
	}

	if (config && config.run instanceof Function) {
		config.stage = new Stage(config.run);
		delete config.run;
	}

	Stage.apply(self, arguments);

	if (config.stage instanceof Stage) {
		self.stage = config.stage;
	} else if (config.stage instanceof Function) {
		self.stage = new Stage(config.stage);
	} else {
		self.stage = new Stage();
	}

	if (config) {

		if (config.prepare instanceof Function) {
			self.prepare = config.prepare;
		}

		if (config.finalize instanceof Function) {
			self.finalize = config.finalize;
		}
	}
}

/*!
 * Inherited from Stage
 */
util.inherits(Wrap, Stage);

/**
 * default prepare implementation
 * @param {Context} ctx
 * @return {Context}
 */
Wrap.prototype.prepare = function(ctx) {
	return ctx;
};

/**
 * default finalize implementation
 * @param {Context} ctx
 * @param {Context} 
 */
Wrap.prototype.finalize = function(ctx, retCtx) {
	// by default the main context will be used to return;
	// so we do nothing here
};

/**
 * override of `reportName`
 * @api protected
 */
Wrap.prototype.reportName = function() {
	return "Wrap:" + this.name;
};

/**
 * override of compile
 * @api protected
 */
Wrap.prototype.compile = function() {
	var self = this;

	if (!self.name) {
		self.name = "success: " + self.stage.reportName() + " failure: " + self.overdue.reportName();
	}

	var run = function(ctx, done) {
		self.stage.execute(ctx, done);
	};

	self.run = run;
};

/**
 * override of execute
 * @api protected
 */
Wrap.prototype.execute = function(_context, callback) {
	var self = this;

	_context = Context.ensure(_context);
	var context = self.prepare(_context);
	_context.ensureIsChild(context);

	if (!self.run) {
		self.compile();
	}

	var cb = function(err, context) {
		if (!err) {
			self.finalize(_context, context);
			callback(null, _context);
		} else {
			callback(err);
		}
	};

	Wrap.super_.prototype.execute.apply(self, [context, cb]);
};

/*!
 * exports
 */
exports.Wrap = Wrap;
},{"./context":3,"./stage":10,"./util":12}],14:[function(require,module,exports){
var comparator = require('./lib/comparator.js');
var foldunfold = require('./lib/foldunfold.js');
exports.getComparator = comparator.getComparator;
exports.strictEq = comparator.strictEq;
exports.looseEq = comparator.looseEq;
exports.structureEq = comparator.structureEq;
exports.diff = comparator.diff;
exports.fold = foldunfold.fold;
exports.unfold = foldunfold.unfold;
exports.get = foldunfold.get;
exports.set = foldunfold.set;
},{"./lib/comparator.js":15,"./lib/foldunfold.js":16}],15:[function(require,module,exports){
function Equality() {}

Equality.false = function() {
	return false;
};

Equality.true = function() {
	return true;
};

/*
	0 - notEqual,
	1 - strict
	2 - loose
	3 - structure
*/

Equality.diffValue = function(a, b, comprator) {
	if (a === b) return {
		result: 1,
		value: b
	};
	if (a != null && b != null && a.valueOf() == b.valueOf()) return {
		result: 2,
		from: a,
		to: b
	};
	return {
		result: 0,
		from: a,
		to: b
	};
};

Equality.diffString = function(a, b, comprator) {
	if (a === b) return {
		result: 1,
		value: b
	};
	if (a.toString() == b.toString()) return {
		result: 2,
		from: a,
		to: b
	};
	return {
		result: 0,
		from: a,
		to: b
	};
};

// diff содержит только поля которые изменились ??
Equality.eqObject = function(config) {
	if (config.strict) {
		// строгое равенство структура + данные
		return function(source, dest, compare) {
			if (source == dest) return true;
			var ks = Object.keys(source);
			var kd = Object.keys(dest);
			var ret, key;
			var so = ks.toString() == kd.toString();
			if (so) {
				for (var i = 0, len = ks.length; i < len; i++) {
					key = ks[i];
					if (!compare(source[key], dest[key]))
						return false;
				}
			} else {
				return false;
			}
			return true;
		};
	}

	if (config.loose) {
		// второй объект может содержать дополнительные поля, но мы их не рассматриваем.
		// структура и равенство*(compare) того что есть с тем что дали
		return function(source, dest, compare) {
			if (source == dest) return true;
			var ks = Object.keys(source);
			var kd = Object.keys(dest);
			var ret, key;
			for (var i = 0, len = ks.length; i < len; i++) {
				key = ks[i];
				if (!compare(source[key], dest[key])) return false;
			}
			return true;
		};
	}

	if (config.structure) {
		// проверяем что структура объекта такая же
		// второй объект может содержать новые поля, 
		// и новые данные, но структура та же
		return function(source, dest, compare) {
			if (source == dest) return true;
			var ks = Object.keys(source);
			var kd = Object.keys(dest);
			var ret, i, len, key;
			if (ks.length > kd.length) return false;
			var so = ks.toString() == kd.toString();
			if (so) {
				for (i = 0, len = ks.length; i < len; i++) {
					key = ks[i];
					if (!compare(source[key], dest[key])) return false;
				}
			} else {
				var ksd = Object.keys(source).sort();
				var kss = Object.keys(dest).sort();
				var passed = {};
				for (i = 0, len = ksd.length; i < len; i++) {
					key = ksd[i];
					passed[key] = 1;
					if (!compare(source[key], dest[key])) return false;
				}
				if (Object.keys(passed).sort().toString() != ksd.toString()) return false;
			}
			return true;
		};
	}

	if (config.diff) {
		// full processing
		// здесь мы должны получить все варианты сразу
		// strict
		// loose
		// structure
		// diff
		return function(source, dest, compare) {
			if (source == dest) return {
				result: 1,
				value: dest
			};
			var result = {};
			var i, len, key, ret;
			var ks = Object.keys(source);
			var kd = Object.keys(dest);
			var so = ks.toString() == kd.toString();
			if (so) {
				result.result = 1;
				for (i = 0, len = ks.length; i < len; i++) {
					key = ks[i];
					ret = result[key] = compare(source[key], dest[key]);
					if (ret.result === 0) ret.result = 3;
					if (ret.result > 0 && result.result < ret.result)
						result.result = ret.result;
				}
			} else {
				result.result = 1;
				var ksd = Object.keys(source).sort();
				var kss = Object.keys(dest).sort();
				result.reorder = ks.toString() != kd.toString();
				var passed = {};
				var srcI, dstI;
				for (i = 0, len = ksd.length; i < len; i++) {
					key = ksd[i];
					passed[key] = true;
					srcI = ks.indexOf(key);
					dstI = kd.indexOf(key);
					if (dstI >= 0) {
						result[key] = {};
						if (srcI != dstI)
							result[key].order = {
								from: ks.indexOf(key),
								to: kd.indexOf(key)
							};
						ret = result[key].value = compare(source[key], dest[key]);
						if (ret.result === 0) ret.result = 3;
						// structure of current object isn't changed
						if (ret.result > 0 && result.result < ret.result)
							result.result = ret.result;
					} else {
						// removed items
						result.result = 0;
						if (!result.removed) result.removed = {};
						result.removed[key] = {
							order: ks.indexOf(key),
							value: source[key]
						};
					}
				}
				// new items
				for (i = 0, len = kss.length; i < len; i++) {
					key = kss[i];
					if (passed[key] === true) continue;
					// if (result.result > 0) result.result = 2;
					passed[key] = true;
					if (!result.inserted) result.inserted = {};
					result.inserted[key] = {
						order: kd.indexOf(key),
						value: dest[key]
					};
				}
			}
			return result;
		};
	}
};

Equality.eqArray = function(config) {
	// strict -- полное равенство
	// loose -- объекты перемешаны, пересортированы, но все на месте
	// structure -- объекты на своих местах и каждый имеет свою структуру.
	// diff
	// diff reorder массивы простых значений только если 
	// нужно придумать условия
	// 1. когда длинна одинаковая
	// 2. когда меншье стала
	// 3. когда больше стала
	// или забить :)
	// сделать для каждого типа свою функцию как в объекте
	if (config.strict || config.structure) {
		return function(source, dest, compare) {
			if (source == dest) return {
				result: 1,
				value: dest
			};
			if ((source && dest && source.length == dest.length)) {
				for (var i = 0, len = source.length; i < len; i++) {
					if (!compare(source[i], dest[i])) return false;
				}
				return true;
			} else
				return false;
		};
	}
	if (config.loose) {
		return function(source, dest, compare) {
			if (source == dest) return {
				result: 1,
				value: dest
			};
			var val, i, len;
			var foundItems = [];
			foundItems.length = source.length > dest.length ? source.length : dest.length;
			if ((source && dest && source.length <= dest.length)) {
				for (i = 0, len = source.length; i < len; i++) {
					val = source[i];
					var rec, cmpRes, found;
					for (var j = 0, dstlen = dest.length; j < dstlen; j++) {
						rec = dest[j];
						cmpRes = compare(val, rec);
						if (cmpRes) {
							found = rec;
							if (!foundItems[j])
								break;
						} else {
							found = undefined;
							dstI = -1;
						}
					}
					if (!found) return false;
				}
				return true;

			} else
				return false;
		};
	}
	if (config.diff) {
		return function(source, dest, compare) {
			if (source == dest) return {
				result: 1,
				value: dest
			};

			if (JSON.stringify(source) == JSON.stringify(dest)) return {
				result: 1,
				value: dest
			};

			var result = {
				result: 1,
				reorder: true,
			};

			function compareRatings(a, b) {
				return a.cmpRes.changeRating < b.cmpRes.changeRating;
			}
			var val, i, len;
			var foundItems = [];
			foundItems.length = source.length > dest.length ? source.length : dest.length;
			var srcI, dstI;
			for (i = 0, len = source.length; i < len; i++) {
				val = source[i];
				var rec, cmpRes, found, approx = [];
				for (var j = 0, dstlen = dest.length; j < dstlen; j++) {
					rec = dest[j];
					cmpRes = compare(val, rec);
					if (cmpRes.result > 0 && cmpRes.result < 3) {
						found = rec;
						dstI = dest.indexOf(rec);
						if (!foundItems[j])
							break;
					} else if (cmpRes.result === 3) {
						approx.push({
							found: rec,
							dstI: dest.indexOf(rec),
							cmpRes: cmpRes
						});
					} else {
						found = undefined;
						dstI = -1;
					}
				}
				srcI = source.indexOf(val);

				if (!found && approx.length > 0) {
					debugger;
					approx.sort(compareRatings);
					var aFound = approx.shift();
					found = aFound.found;
					dstI = aFound.dstI;
					cmpRes = aFound.cmpRes;
					approx.length = 0;
				}

				if (found) {
					result[i] = {};
					if (srcI != dstI) {
						result[i].order = {
							from: srcI,
							to: dstI
						};
					}
					foundItems[dstI] = true;
					result[i].value = cmpRes;
					if (cmpRes.result > 1 && result.result !== 0) result.result = cmpRes.result;
				} else {
					result.result = 0;
					if (!result.removed) result.removed = {};
					result.removed[i] = {
						order: dstI,
						value: val
					};
				}
			}
			for (i = 0, len = dest.length; i < len; i++) {
				val = dest[i];
				if (foundItems[i] === true) continue;
				if (!result.inserted) result.inserted = {};
				// if (result.result > 0) result.result = 2;
				result.inserted[i] = {
					order: i,
					value: val
				};
			}

			if (!config.diff) {
				var res = true;
				for (var v in result) {
					res = res && result[v];
					if (!res) break;
				}
				return res;
			} else
				return result;
		};
	}
};

var Compariable = require('./mapping.js').cmp(Equality);

function getComparator(a, b, type) {
	var cmpr = Compariable[a][b];
	var res = cmpr ? cmpr[type] : null;
	if (!res) {
		cmpr = Compariable[b][a];
		res = cmpr ? cmpr[type] : null;
	}
	if (!res) {
		switch (type) {
			case 'strict':
				return Equality.false;
			case 'loose':
				return Equality.false;
			case 'structure':
				return Equality.false;
			case 'diff':
				return Equality.diffValue;
		}
	} else return res;
}

function getType(v) {
	return Object.prototype.toString.call(v).match(/\[object (.+)\]/)[1];
}

function strictEq(a, b) {
	var t0 = getType(a);
	var t1 = getType(b);
	var fnc = getComparator(t0, t1, 'strict');
	return fnc(a, b, strictEq);
}

function looseEq(a, b) {
	var t0 = getType(a);
	var t1 = getType(b);
	var fnc = getComparator(t0, t1, 'loose');
	return fnc(a, b, looseEq);
}

function structureEq(a, b) {
	var t0 = getType(a);
	var t1 = getType(b);
	var fnc = getComparator(t0, t1, 'structure');
	return fnc(a, b, structureEq);
}

function diff(a, b) {
	var t0 = getType(a);
	var t1 = getType(b);
	var fnc = getComparator(t0, t1, 'diff');
	return fnc(a, b, diff);
}

exports.getComparator = getComparator;
exports.strictEq = strictEq;
exports.looseEq = looseEq;
exports.structureEq = structureEq;
exports.diff = diff;
},{"./mapping.js":17}],16:[function(require,module,exports){
function unfold(data, _result, _propName) {
	var result = _result ? _result : {};
	var propName = _propName ? _propName : '';
	var i, len;
	if (Array.isArray(data)) {
		for (i = 0, len = data.length; i < len; i++) {
			unfold(data[i], result, (propName ? (propName + '.') : '') + i);
		}
	} else if ('object' == typeof data) {
		var keys = Object.keys(data);
		for (i = 0, len = keys.length; i < len; i++) {
			unfold(data[keys[i]], result, (propName ? (propName + '.') : '') + keys[i]);
		}
	} else {
		result[propName] = data;
	}
	return result;
}

function fold(data) {
	var result = {};
	var keys = Object.keys(data);
	for (var i = 0, len = keys.length; i < len; i++) {
		set(result, keys[i], data[keys[i]]);
	}
	return result;
}

function set(data, path, value) {
	if ('object' === typeof data) {
		var parts = path.split('.');
		if (Array.isArray(parts)) {
			var curr = parts.shift();
			if (parts.length > 0) {
				if (!data[curr]) {
					if (isNaN(parts[0]))
						data[curr] = {};
					else data[curr] = [];
				}
				set(data[curr], parts.join('.'), value);
			} else data[path] = value;
		} else {
			data[path] = value;
		}
	}
}

function get(data, path) {
	if ('object' === typeof data) {
		if (data[path] === undefined) {
			var parts = path.split('.');
			if (Array.isArray(parts)) {
				var curr = parts.shift();
				if (parts.length > 0) {
					return get(data[curr], parts.join('.'));
				}
				return data[curr];
			}
		}
		return data[path];
	}
	return data;
}

exports.get = get;
exports.set = set;
exports.fold = fold;
exports.unfold = unfold;
},{}],17:[function(require,module,exports){
// default strict = eq.false;
// default loose = eq.false;
// default structure = eq.false;
// default diff =eq.diffValue

// проверить работу, посде доделать адресно для каждого типа 
// так чтобы знать какой параметр каким приходит
// чтобы было меньше проверок
var jsdiff = require('diff');

exports.cmp = function(eq) {
	return {
		"Boolean": {
			"Boolean": {
				strict: function(a, b) {
					return a === b;
				},
				loose: function(a, b) {
					return a == b;
				},
				structure: eq.true,
			},
			"Number": {
				loose: function(a, b) {
					return a == b;
				}
			},
			"String": {
				loose: function(a, b) {
					var bFalse = /false/i.test(b) || /0/.test(b);
					var bTrue = /true/i.test(b) || /1/.test(b);
					if (a) return a === bTrue;
					else return a === !bFalse;
				},
				diff: function(a, b) {
					var res;
					var bFalse = /false/i.test(b) || /0/.test(b);
					var bTrue = /true/i.test(b) || /1/.test(b);
					if (a) res = a === bTrue;
					else res = a === !bFalse;
					if (res) return {
						result: 2,
						from: a,
						to: b
					};
					return {
						result: 0,
						from: a,
						to: b
					};
				}
			},
			"Undefined": {
				loose: function(a, b) {
					return !a == !b;
				}
			},
			"Null": {
				loose: function(a, b) {
					return !a == !b;
				}
			}
		},
		"Number": {
			"Number": {
				strict: function(a, b) {
					return a === b;
				},
				loose: function(a, b) {
					return a == b;
				},
				structure: eq.true,
			},
			"String": {
				loose: function(a, b) {
					return a == b;
				},
			},
			"Date": {
				strict: function(a, b) {
					return a == b;
				},
				loose: function(a, b) {
					return a.valueOf() == b.valueOf();
				},
				structure: eq.true
			},
			"Null": {
				loose: function(a, b) {
					return !a == !b;
				}
			},
			"Undefined": {
				loose: function(a, b) {
					return !a == !b;
				},
			},
			"Object": {
				loose: function(a, b) {
					return a.toString() == b.toString();
				},
			},
			"Function": {
				loose: function(a, b) {
					return a.toString() == b.toString();
				},
			}
		},
		"String": {
			"Boolean": {
				loose: function(a, b) {
					var aFalse = /false/i.test(a) || /0/.test(a);
					var aTrue = /true/i.test(a) || /1/.test(a);
					if (b) return b === aTrue;
					else return b === !aFalse;
				},
				diff: function(a, b) {
					var res;
					var aFalse = /false/i.test(a) || /0/.test(a);
					var aTrue = /true/i.test(a) || /1/.test(a);
					if (b) res = b === aTrue;
					else res = b === !aFalse;
					if (res) return {
						result: 2,
						from: a,
						to: b
					};
					return {
						result: 0,
						from: a,
						to: b
					};
				}
			},
			"String": {
				strict: function(a, b) {
					return a == b;
				},
				loose: function(a, b) {
					return a == b;
				},
				structure: eq.true,
				diff: function(a, b) {
					if (a == b) return {
						result: 1,
						value: b
					};
					var result = jsdiff.diffLines(a, b);
					var srcLen = a.length;
					var dstLen = b.length;
					var unchangedCnt = 0;
					var unchangedLen = 0;
					var removedCnt = 0;
					var removedLen = 0;
					var addedCnt = 0;
					var addedLen = 0;

					result.forEach(function(part) {
						if (part.added) {
							addedCnt++;
							addedLen += part.value.length;
						} else
						if (part.removed) {
							removedCnt++;
							removedLen += part.value.length;
						} else {
							unchangedCnt++;
							unchangedLen += part.value.length;
						}
					});
					if (unchangedCnt === 1 && addedCnt === 0 && removedCnt === 0) {
						return {
							result: 2,
							diff: "lines",
							changes: result
						};
					}
					if (unchangedCnt > 0 && (addedCnt > 0 || removedCnt > 0)) {
						return {
							result: 3,
							diff: "lines",
							changes: result,
							/*srcLen: ((addedLen > removedLen) ? dstLen : srcLen),
							removedLen: removedLen,
							addedLen: addedLen,*/
							changeRating: Math.abs(addedLen - removedLen) / ((addedLen > removedLen) ? dstLen : srcLen)
						};
					}

					return {
						result: 0,
						diff: "lines",
						from: a,
						to: b
					};
				}
			},
			"RegExp": {
				strict: function(a, b) {
					return a == b;
				},
				loose: function(a, b) {
					return a.toString() == b.toString();
				},
				structure: eq.false
			},
			"Date": {
				strict: function(a, b) {
					if (a.toString() == b.toString()) return true;

					if (a.toJSON || b.toJSON) {
						var v0, v1;
						if (a.toJSON) v0 = a.toJSON();
						else v0 = value.toString();

						if (b.toJSON) v1 = b.toJSON();
						else v1 = value.toString();
						return v0 == v1;
					} else return false;
				},
				loose: function(a, b) {
					if (a.toString() == b.toString()) return true;

					if (a.toJSON || b.toJSON) {
						var v0, v1;
						if (a.toJSON) v0 = a.toJSON();
						else v0 = value.toString();

						if (b.toJSON) v1 = b.toJSON();
						else v1 = value.toString();
						return v0 == v1;
					} else return false;
				},
				structure: eq.true,
				diff: function(a, b) {
					if (a.toString() == b.toString()) return {
						result: 1,
						value: b.toString()
					};

					if (a.toJSON || b.toJSON) {
						var v0, v1;
						if (a.toJSON) v0 = a.toJSON();
						else v0 = value.toString();

						if (b.toJSON) v1 = b.toJSON();
						else v1 = value.toString();

						if (v0 == v1) return {
							result: 2,
							from: a,
							to: b
						};
					}

					return {
						result: 0,
						from: a,
						to: b
					};
				}
			},
			"Null": {
				loose: function(a, b) {
					return !a == !b;
				},
			},
			"Undefined": {
				loose: function(a, b) {
					return !a == !b;
				},
			},
			"Array": {
				strict: function(a, b) {
					return a == b;
				},
				loose: function(a, b) {
					return a.toString() == b.toString();
				},
				structure: eq.true
			},
			"Object": {
				strict: function(a, b) {
					return a.toString() == b.toString();
				},
				loose: function(a, b) {
					return a.toString() == b.toString();
				},
				structure: eq.false,
			},
			"Function": {
				strict: function(a, b) {
					return a.toString() == b.toString();
				},
				loose: function(a, b) {
					return a.toString() == b.toString();
				},
				structure: eq.true,
			}
		},
		"RegExp": {
			// ввести сравнение регулярок с json версией mongoosejs
			"RegExp": {
				strict: function(a, b) {
					if (a === b) return true;
				},
				loose: function(a, b) {
					return a.toString() == b.toString();
				},
				structure: eq.true,
				diff: eq.diffString
			},
			"Undefined": {
				loose: function(a, b) {
					if (a instanceof RegExp)
						return a.test(b);
					else
						return b.test(a);

				}
			},
			"Null": {
				loose: function(a, b) {
					if (a instanceof RegExp) {
						return a.test(b);
					} else
						return b.test(a);
				},
			},
			"Object": {
				strict: function(a, b) {
					return a.toString() == b.toString();
				},
				loose: function(a, b) {
					return a.toString() == b.toString();
				}
			},
		},
		"Date": {
			"Date": {
				strict: function(a, b) {
					if (a === b) return true;
					return a.toString() == b.toString();
				},
				loose: function(a, b) {
					return a.toString() == b.toString();
				},
				structure: eq.true
			},
			"Object": {
				strict: function(a, b) {
					return a.toString() == b.toString();
				},
				loose: function(a, b) {
					return a.toString() == b.toString();
				},
				structure: eq.false,
				diff: eq.diffString
			},
		},
		"Undefined": {
			"Undefined": {
				strict: eq.true,
				loose: eq.true,
				structure: eq.true,
				diff: function() {
					return {
						result: 1
					};
				}
			},
			"Null": {
				strict: eq.true,
				loose: eq.true,
				structure: eq.true,
				diff: function() {
					return {
						result: 1,
						value: null
					};
				}
			}
		},
		"Null": {
			"Null": {
				strict: eq.true,
				loose: eq.true,
				structure: eq.true,
				diff: function() {
					return {
						result: 1,
						value: null
					};
				}
			}
		},
		"Array": {
			"Array": {
				strict: eq.eqArray({
					strict: true
				}),
				loose: eq.eqArray({
					loose: true
				}),
				structure: eq.eqArray({
					structure: true
				}),
				diff: eq.eqArray({
					diff: true
				})
			},
			"Object": {
				strict: eq.eqObject({
					strict: true
				}),
				loose: eq.eqObject({
					loose: true
				}),
				structure: eq.eqObject({
					structure: true
				}),
				diff: eq.eqObject({
					diff: true
				})
			}
		},
		"Object": {
			"Object": {
				// возможно нужны будут Другие операции
				strict: eq.eqObject({
					strict: true
				}),
				loose: eq.eqObject({
					loose: true
				}),
				structure: eq.eqObject({
					structure: true
				}),
				diff: eq.eqObject({
					diff: true
				})
			},
		},
		"Function": {
			"Function": {
				strict: function(a, b) {
					return a === b;
				},
				loose: function(a, b) {
					return a.toString() == b.toString();
				},
				structure: eq.true,
				diff: eq.diffString
			}
		}
	};
};
},{"diff":18}],18:[function(require,module,exports){
/* See LICENSE file for terms of use */

/*
 * Text diff implementation.
 *
 * This library supports the following APIS:
 * JsDiff.diffChars: Character by character diff
 * JsDiff.diffWords: Word (as defined by \b regex) diff which ignores whitespace
 * JsDiff.diffLines: Line based diff
 *
 * JsDiff.diffCss: Diff targeted at CSS content
 *
 * These methods are based on the implementation proposed in
 * "An O(ND) Difference Algorithm and its Variations" (Myers, 1986).
 * http://citeseerx.ist.psu.edu/viewdoc/summary?doi=10.1.1.4.6927
 */
var JsDiff = (function() {
  /*jshint maxparams: 5*/
  function clonePath(path) {
    return { newPos: path.newPos, components: path.components.slice(0) };
  }
  function removeEmpty(array) {
    var ret = [];
    for (var i = 0; i < array.length; i++) {
      if (array[i]) {
        ret.push(array[i]);
      }
    }
    return ret;
  }
  function escapeHTML(s) {
    var n = s;
    n = n.replace(/&/g, '&amp;');
    n = n.replace(/</g, '&lt;');
    n = n.replace(/>/g, '&gt;');
    n = n.replace(/"/g, '&quot;');

    return n;
  }

  var Diff = function(ignoreWhitespace) {
    this.ignoreWhitespace = ignoreWhitespace;
  };
  Diff.prototype = {
      diff: function(oldString, newString) {
        // Handle the identity case (this is due to unrolling editLength == 0
        if (newString === oldString) {
          return [{ value: newString }];
        }
        if (!newString) {
          return [{ value: oldString, removed: true }];
        }
        if (!oldString) {
          return [{ value: newString, added: true }];
        }

        newString = this.tokenize(newString);
        oldString = this.tokenize(oldString);

        var newLen = newString.length, oldLen = oldString.length;
        var maxEditLength = newLen + oldLen;
        var bestPath = [{ newPos: -1, components: [] }];

        // Seed editLength = 0
        var oldPos = this.extractCommon(bestPath[0], newString, oldString, 0);
        if (bestPath[0].newPos+1 >= newLen && oldPos+1 >= oldLen) {
          return bestPath[0].components;
        }

        for (var editLength = 1; editLength <= maxEditLength; editLength++) {
          for (var diagonalPath = -1*editLength; diagonalPath <= editLength; diagonalPath+=2) {
            var basePath;
            var addPath = bestPath[diagonalPath-1],
                removePath = bestPath[diagonalPath+1];
            oldPos = (removePath ? removePath.newPos : 0) - diagonalPath;
            if (addPath) {
              // No one else is going to attempt to use this value, clear it
              bestPath[diagonalPath-1] = undefined;
            }

            var canAdd = addPath && addPath.newPos+1 < newLen;
            var canRemove = removePath && 0 <= oldPos && oldPos < oldLen;
            if (!canAdd && !canRemove) {
              bestPath[diagonalPath] = undefined;
              continue;
            }

            // Select the diagonal that we want to branch from. We select the prior
            // path whose position in the new string is the farthest from the origin
            // and does not pass the bounds of the diff graph
            if (!canAdd || (canRemove && addPath.newPos < removePath.newPos)) {
              basePath = clonePath(removePath);
              this.pushComponent(basePath.components, oldString[oldPos], undefined, true);
            } else {
              basePath = clonePath(addPath);
              basePath.newPos++;
              this.pushComponent(basePath.components, newString[basePath.newPos], true, undefined);
            }

            var oldPos = this.extractCommon(basePath, newString, oldString, diagonalPath);

            if (basePath.newPos+1 >= newLen && oldPos+1 >= oldLen) {
              return basePath.components;
            } else {
              bestPath[diagonalPath] = basePath;
            }
          }
        }
      },

      pushComponent: function(components, value, added, removed) {
        var last = components[components.length-1];
        if (last && last.added === added && last.removed === removed) {
          // We need to clone here as the component clone operation is just
          // as shallow array clone
          components[components.length-1] =
            {value: this.join(last.value, value), added: added, removed: removed };
        } else {
          components.push({value: value, added: added, removed: removed });
        }
      },
      extractCommon: function(basePath, newString, oldString, diagonalPath) {
        var newLen = newString.length,
            oldLen = oldString.length,
            newPos = basePath.newPos,
            oldPos = newPos - diagonalPath;
        while (newPos+1 < newLen && oldPos+1 < oldLen && this.equals(newString[newPos+1], oldString[oldPos+1])) {
          newPos++;
          oldPos++;

          this.pushComponent(basePath.components, newString[newPos], undefined, undefined);
        }
        basePath.newPos = newPos;
        return oldPos;
      },

      equals: function(left, right) {
        var reWhitespace = /\S/;
        if (this.ignoreWhitespace && !reWhitespace.test(left) && !reWhitespace.test(right)) {
          return true;
        } else {
          return left === right;
        }
      },
      join: function(left, right) {
        return left + right;
      },
      tokenize: function(value) {
        return value;
      }
  };

  var CharDiff = new Diff();

  var WordDiff = new Diff(true);
  var WordWithSpaceDiff = new Diff();
  WordDiff.tokenize = WordWithSpaceDiff.tokenize = function(value) {
    return removeEmpty(value.split(/(\s+|\b)/));
  };

  var CssDiff = new Diff(true);
  CssDiff.tokenize = function(value) {
    return removeEmpty(value.split(/([{}:;,]|\s+)/));
  };

  var LineDiff = new Diff();
  LineDiff.tokenize = function(value) {
    var retLines = [],
        lines = value.split(/^/m);

    for(var i = 0; i < lines.length; i++) {
      var line = lines[i],
          lastLine = lines[i - 1];

      // Merge lines that may contain windows new lines
      if (line == '\n' && lastLine && lastLine[lastLine.length - 1] === '\r') {
        retLines[retLines.length - 1] += '\n';
      } else if (line) {
        retLines.push(line);
      }
    }

    return retLines;
  };

  return {
    Diff: Diff,

    diffChars: function(oldStr, newStr) { return CharDiff.diff(oldStr, newStr); },
    diffWords: function(oldStr, newStr) { return WordDiff.diff(oldStr, newStr); },
    diffWordsWithSpace: function(oldStr, newStr) { return WordWithSpaceDiff.diff(oldStr, newStr); },
    diffLines: function(oldStr, newStr) { return LineDiff.diff(oldStr, newStr); },

    diffCss: function(oldStr, newStr) { return CssDiff.diff(oldStr, newStr); },

    createPatch: function(fileName, oldStr, newStr, oldHeader, newHeader) {
      var ret = [];

      ret.push('Index: ' + fileName);
      ret.push('===================================================================');
      ret.push('--- ' + fileName + (typeof oldHeader === 'undefined' ? '' : '\t' + oldHeader));
      ret.push('+++ ' + fileName + (typeof newHeader === 'undefined' ? '' : '\t' + newHeader));

      var diff = LineDiff.diff(oldStr, newStr);
      if (!diff[diff.length-1].value) {
        diff.pop();   // Remove trailing newline add
      }
      diff.push({value: '', lines: []});   // Append an empty value to make cleanup easier

      function contextLines(lines) {
        return lines.map(function(entry) { return ' ' + entry; });
      }
      function eofNL(curRange, i, current) {
        var last = diff[diff.length-2],
            isLast = i === diff.length-2,
            isLastOfType = i === diff.length-3 && (current.added !== last.added || current.removed !== last.removed);

        // Figure out if this is the last line for the given file and missing NL
        if (!/\n$/.test(current.value) && (isLast || isLastOfType)) {
          curRange.push('\\ No newline at end of file');
        }
      }

      var oldRangeStart = 0, newRangeStart = 0, curRange = [],
          oldLine = 1, newLine = 1;
      for (var i = 0; i < diff.length; i++) {
        var current = diff[i],
            lines = current.lines || current.value.replace(/\n$/, '').split('\n');
        current.lines = lines;

        if (current.added || current.removed) {
          if (!oldRangeStart) {
            var prev = diff[i-1];
            oldRangeStart = oldLine;
            newRangeStart = newLine;

            if (prev) {
              curRange = contextLines(prev.lines.slice(-4));
              oldRangeStart -= curRange.length;
              newRangeStart -= curRange.length;
            }
          }
          curRange.push.apply(curRange, lines.map(function(entry) { return (current.added?'+':'-') + entry; }));
          eofNL(curRange, i, current);

          if (current.added) {
            newLine += lines.length;
          } else {
            oldLine += lines.length;
          }
        } else {
          if (oldRangeStart) {
            // Close out any changes that have been output (or join overlapping)
            if (lines.length <= 8 && i < diff.length-2) {
              // Overlapping
              curRange.push.apply(curRange, contextLines(lines));
            } else {
              // end the range and output
              var contextSize = Math.min(lines.length, 4);
              ret.push(
                  '@@ -' + oldRangeStart + ',' + (oldLine-oldRangeStart+contextSize)
                  + ' +' + newRangeStart + ',' + (newLine-newRangeStart+contextSize)
                  + ' @@');
              ret.push.apply(ret, curRange);
              ret.push.apply(ret, contextLines(lines.slice(0, contextSize)));
              if (lines.length <= 4) {
                eofNL(ret, i, current);
              }

              oldRangeStart = 0;  newRangeStart = 0; curRange = [];
            }
          }
          oldLine += lines.length;
          newLine += lines.length;
        }
      }

      return ret.join('\n') + '\n';
    },

    applyPatch: function(oldStr, uniDiff) {
      var diffstr = uniDiff.split('\n');
      var diff = [];
      var remEOFNL = false,
          addEOFNL = false;

      for (var i = (diffstr[0][0]==='I'?4:0); i < diffstr.length; i++) {
        if(diffstr[i][0] === '@') {
          var meh = diffstr[i].split(/@@ -(\d+),(\d+) \+(\d+),(\d+) @@/);
          diff.unshift({
            start:meh[3],
            oldlength:meh[2],
            oldlines:[],
            newlength:meh[4],
            newlines:[]
          });
        } else if(diffstr[i][0] === '+') {
          diff[0].newlines.push(diffstr[i].substr(1));
        } else if(diffstr[i][0] === '-') {
          diff[0].oldlines.push(diffstr[i].substr(1));
        } else if(diffstr[i][0] === ' ') {
          diff[0].newlines.push(diffstr[i].substr(1));
          diff[0].oldlines.push(diffstr[i].substr(1));
        } else if(diffstr[i][0] === '\\') {
          if (diffstr[i-1][0] === '+') {
            remEOFNL = true;
          } else if(diffstr[i-1][0] === '-') {
            addEOFNL = true;
          }
        }
      }

      var str = oldStr.split('\n');
      for (var i = diff.length - 1; i >= 0; i--) {
        var d = diff[i];
        for (var j = 0; j < d.oldlength; j++) {
          if(str[d.start-1+j] !== d.oldlines[j]) {
            return false;
          }
        }
        Array.prototype.splice.apply(str,[d.start-1,+d.oldlength].concat(d.newlines));
      }

      if (remEOFNL) {
        while (!str[str.length-1]) {
          str.pop();
        }
      } else if (addEOFNL) {
        str.push('');
      }
      return str.join('\n');
    },

    convertChangesToXML: function(changes){
      var ret = [];
      for ( var i = 0; i < changes.length; i++) {
        var change = changes[i];
        if (change.added) {
          ret.push('<ins>');
        } else if (change.removed) {
          ret.push('<del>');
        }

        ret.push(escapeHTML(change.value));

        if (change.added) {
          ret.push('</ins>');
        } else if (change.removed) {
          ret.push('</del>');
        }
      }
      return ret.join('');
    },

    // See: http://code.google.com/p/google-diff-match-patch/wiki/API
    convertChangesToDMP: function(changes){
      var ret = [], change;
      for ( var i = 0; i < changes.length; i++) {
        change = changes[i];
        ret.push([(change.added ? 1 : change.removed ? -1 : 0), change.value]);
      }
      return ret;
    }
  };
})();

if (typeof module !== 'undefined') {
    module.exports = JsDiff;
}

},{}],19:[function(require,module,exports){
module.exports = require('./lib/schema')

// Patterns
require('./lib/patterns/reference')
require('./lib/patterns/nothing')
require('./lib/patterns/anything')
require('./lib/patterns/object')
require('./lib/patterns/or')
require('./lib/patterns/equality')
require('./lib/patterns/regexp')
require('./lib/patterns/class')
require('./lib/patterns/schema')

// Extensions
require('./lib/extensions/Boolean')
require('./lib/extensions/Number')
require('./lib/extensions/String')
require('./lib/extensions/Object')
require('./lib/extensions/Array')
require('./lib/extensions/Function')
require('./lib/extensions/Schema')

},{"./lib/extensions/Array":21,"./lib/extensions/Boolean":22,"./lib/extensions/Function":23,"./lib/extensions/Number":24,"./lib/extensions/Object":25,"./lib/extensions/Schema":26,"./lib/extensions/String":27,"./lib/patterns/anything":28,"./lib/patterns/class":29,"./lib/patterns/equality":30,"./lib/patterns/nothing":31,"./lib/patterns/object":32,"./lib/patterns/or":33,"./lib/patterns/reference":34,"./lib/patterns/regexp":35,"./lib/patterns/schema":36,"./lib/schema":37}],20:[function(require,module,exports){
var Schema =  module.exports = function() {}

Schema.prototype = {
  wrap : function() {
    if (this.wrapped) return this.validate
    this.wrapped = true

    var publicFunctions = [ 'toJSON', 'unwrap' ]
    publicFunctions = publicFunctions.concat(this.publicFunctions || [])

    for (var i = 0; i < publicFunctions.length; i++) {
      if (!this[publicFunctions[i]]) continue
      this.validate[publicFunctions[i]] = this[publicFunctions[i]].bind(this)
    }

    return this.validate
  },

  unwrap : function() {
    return this
  },

  toJSON : session(function(makeReference) {
    var json, session = Schema.session

    // Initializing session if it isnt
    if (!session.serialized) session.serialized = { objects: [], jsons: [], ids: [] }

    var index = session.serialized.objects.indexOf(this)
    if (makeReference && index !== -1) {
      // This was already serialized, returning a JSON schema reference ($ref)
      json = session.serialized.jsons[index]

      // If there was no id given, generating one now
      if (json.id == null) {
        do {
          json.id = 'id-' + Math.floor(Math.random()*100000)
        } while (session.serialized.ids.indexOf(json.id) !== -1)
        session.serialized.ids.push(json.id)
      }

      json = { '$ref': json.id }

    } else {
      // This was not serialized yet, serializing now
      json = {}

      if (this.doc != null) json.description = this.doc

      // Registering that this was serialized and storing the json
      session.serialized.objects.push(this)
      session.serialized.jsons.push(json)
    }

    return json
  })
}

Schema.extend = function(descriptor) {
  if (!descriptor.validate) {
    throw new Error('Schema objects must have a validate function.')
  }

  var constructor = function() {
    if (this.initialize) this.initialize.apply(this, arguments)

    this.validate = this.validate.bind(this)

    this.validate.schema = this.validate
  }

  var prototype = Object.create(Schema.prototype)
  for (var key in descriptor) prototype[key] = descriptor[key]
  constructor.prototype = prototype

  return constructor
}


var active = false
function session(f) {
  return function() {
    if (active) {
      // There's an active session, just forwarding to the original function
      return f.apply(this, arguments)

    } else {
      // The initiator is the one who handles the active flag, and clears the session when it's over
      active = true

      var result = f.apply(this, arguments)

      // Cleanup
      for (var i in session) delete session[i]
      active = false

      return result
    }
  }
}
Schema.session = session

function lastDefinedResult(functions, arg) {
  var i = functions.length, result;
  while (i--) {
    result = functions[i](arg)
    if (result != null) return result
  }
}

var fromJSdefs = []
Schema.fromJS = lastDefinedResult.bind(null, fromJSdefs)
Schema.fromJS.def = Array.prototype.push.bind(fromJSdefs)

var fromJSONdefs = []
Schema.fromJSON = session(lastDefinedResult.bind(null, fromJSONdefs))
Schema.fromJSON.def = Array.prototype.push.bind(fromJSONdefs)

Schema.patterns = {}
Schema.extensions = {}

},{}],21:[function(require,module,exports){
var Schema = require('../BaseSchema')
  , EqualitySchema = require('../patterns/equality')
  , anything = require('../patterns/anything').instance

var ArraySchema = module.exports = Schema.extensions.ArraySchema = Schema.extend({
  initialize : function(itemSchema, max, min) {
    this.itemSchema = itemSchema || anything
    this.min = min || 0
    this.max = max || Infinity
  },

  validate : function(instance) {
    // Instance must be an instance of Array
    if (!(instance instanceof Array)) return false

    // Checking length
    if (this.min === this.max) {
      if (instance.length !== this.min) return false

    } else {
      if (this.min > 0        && instance.length < this.min) return false
      if (this.max < Infinity && instance.length > this.max) return false
    }

    // Checking conformance to the given item schema
    for (var i = 0; i < instance.length; i++) {
      if (!this.itemSchema.validate(instance[i])) return false;
    }

    return true
  },

  toJSON : Schema.session(function() {
    var json = Schema.prototype.toJSON.call(this, true)

    if (json['$ref'] != null) return json

    json.type = 'array'

    if (this.min > 0) json.minItems = this.min
    if (this.max < Infinity) json.maxItems = this.max
    if (this.itemSchema !== anything) json.items = this.itemSchema.toJSON()

    return json
  })
})

Schema.fromJSON.def(function(sch) {
  if (!sch || sch.type !== 'array') return

  // Tuple typing is not yet supported
  if (sch.items instanceof Array) return

  return new ArraySchema(Schema.fromJSON(sch.items), sch.maxItems, sch.minItems)
})

Array.of = function() {
  // Possible signatures : (schema)
  //                       (length, schema)
  //                       (minLength, maxLength, schema)
  var args = Array.prototype.slice.call(arguments).reverse()
  if (args.length === 2) args[2] = args[1]
  return new ArraySchema(Schema.fromJS(args[0]), args[1], args[2]).wrap()
}

Array.like = function(other) {
  return new EqualitySchema(other).wrap()
}

Array.schema = new ArraySchema().wrap()

},{"../BaseSchema":20,"../patterns/anything":28,"../patterns/equality":30}],22:[function(require,module,exports){
var Schema = require('../BaseSchema')

var BooleanSchema = module.exports = Schema.extensions.BooleanSchema =  new Schema.extend({
  validate : function(instance) {
    return Object(instance) instanceof Boolean
  },

  toJSON : function() {
    return { type : 'boolean' }
  }
})

var booleanSchema = module.exports = new BooleanSchema().wrap()

Schema.fromJSON.def(function(sch) {
  if (!sch || sch.type !== 'boolean') return

  return booleanSchema
})

Boolean.schema = booleanSchema

},{"../BaseSchema":20}],23:[function(require,module,exports){
var ReferenceSchema = require('../patterns/reference')

Function.reference = function(f) {
  return new ReferenceSchema(f).wrap()
}

},{"../patterns/reference":34}],24:[function(require,module,exports){
var Schema = require('../BaseSchema')

var NumberSchema = module.exports = Schema.extensions.NumberSchema = Schema.extend({
  initialize : function(minimum, exclusiveMinimum, maximum, exclusiveMaximum, divisibleBy) {
    this.minimum = minimum != null ? minimum : -Infinity
    this.exclusiveMinimum = exclusiveMinimum
    this.maximum = minimum != null ? maximum : Infinity
    this.exclusiveMaximum = exclusiveMaximum
    this.divisibleBy = divisibleBy || 0
  },

  min : function(minimum) {
    return new NumberSchema( minimum, false
                           , this.maximum, this.exclusiveMaximum
                           , this.divisibleBy
                           ).wrap()
  },

  above : function(minimum) {
    return new NumberSchema( minimum, true
                           , this.maximum, this.exclusiveMaximum
                           , this.divisibleBy
                           ).wrap()
  },

  max : function(maximum) {
    return new NumberSchema( this.minimum, this.exclusiveMinimum
                           , maximum, false
                           , this.divisibleBy
                           ).wrap()
  },

  below : function(maximum) {
    return new NumberSchema( this.minimum, this.exclusiveMinimum
                           , maximum, true
                           , this.divisibleBy
                           ).wrap()
  },

  step : function(divisibleBy) {
    return new NumberSchema( this.minimum, this.exclusiveMinimum
                           , this.maximum, this.exclusiveMaximum
                           , divisibleBy
                           ).wrap()
  },

  publicFunctions : [ 'min', 'above', 'max', 'below', 'step' ],

  validate : function(instance) {
    return (Object(instance) instanceof Number) &&
           (this.exclusiveMinimum ? instance >  this.minimum
                                  : instance >= this.minimum) &&
           (this.exclusiveMaximum ? instance <  this.maximum
                                  : instance <= this.maximum) &&
           (this.divisibleBy === 0 || instance % this.divisibleBy === 0)
  },

  toJSON : function() {
    var json = Schema.prototype.toJSON.call(this)

    json.type = ( this.divisibleBy !== 0 && this.divisibleBy % 1 === 0 ) ? 'integer' : 'number'

    if (this.divisibleBy !== 0 && this.divisibleBy !== 1) json.divisibleBy = this.divisibleBy

    if (this.minimum !== -Infinity) {
      json.minimum = this.minimum
      if (this.exclusiveMinimum === true) json.exclusiveMinimum = true
    }

    if (this.maximum !== Infinity) {
      json.maximum = this.maximum
      if (this.exclusiveMaximum === true) json.exclusiveMaximum = true
    }

    return json
  }
})

Schema.fromJSON.def(function(sch) {
  if (!sch || (sch.type !== 'number' && sch.type !== 'integer')) return

  return new NumberSchema( sch.minimum, sch.exclusiveMinimum
                         , sch.maximum, sch.exclusiveMaximum
                         , sch.divisibleBy || (sch.type === 'integer' ? 1 : 0)
                         )
})

Number.schema     = new NumberSchema().wrap()
Number.min        = Number.schema.min
Number.above      = Number.schema.above
Number.max        = Number.schema.max
Number.below      = Number.schema.below
Number.step       = Number.schema.step

Number.Integer = Number.step(1)

},{"../BaseSchema":20}],25:[function(require,module,exports){
var ReferenceSchema = require('../patterns/reference')
  , EqualitySchema = require('../patterns/equality')
  , ObjectSchema = require('../patterns/object')

Object.like = function(other) {
  return new EqualitySchema(other).wrap()
}

Object.reference = function(o) {
  return new ReferenceSchema(o).wrap()
}

Object.schema = new ObjectSchema().wrap()

},{"../patterns/equality":30,"../patterns/object":32,"../patterns/reference":34}],26:[function(require,module,exports){
var Schema = require('../BaseSchema')
  , schema = require('../schema')

var SchemaReference = module.exports = Schema.extensions.SchemaReference = Schema.extend({
  validate : function() {
    throw new Error('Trying to validate unresolved schema reference.')
  },

  resolve : function(schemaDescriptor) {
    var schemaObject = Schema.fromJS(schemaDescriptor)

    for (var key in schemaObject) {
      if (schemaObject[key] instanceof Function) {
        this[key] = schemaObject[key].bind(schemaObject)
      } else {
        this[key] = schemaObject[key]
      }
    }

    delete this.resolve
  },

  publicFunctions : [ 'resolve' ]
})

schema.reference = function(schemaDescriptor) {
  return new SchemaReference()
}

function renewing(ref) {
  ref.resolve = function() {
    Schema.self = schema.self = renewing(new SchemaReference())
    return SchemaReference.prototype.resolve.apply(this, arguments)
  }
  return ref
}

Schema.self = schema.self = renewing(new SchemaReference())

Schema.fromJSON.def(function(sch) {
  if (sch.id == null && sch['$ref'] == null) return

  var id, session = Schema.session

  if (!session.deserialized) session.deserialized = { references: {}, subscribers: {} }

  if (sch.id != null) {
    // This schema can be referenced in the future with the given ID
    id = sch.id

    // Deserializing:
    delete sch.id
    var schemaObject = Schema.fromJSON(sch)
    sch.id = id

    // Storing the schema object and notifying subscribers
    session.deserialized.references[id] = schemaObject
    ;(session.deserialized.subscribers[id] || []).forEach(function(callback) {
      callback(schemaObject)
    })

    return schemaObject

  } else {
    // Referencing a schema given somewhere else with the given ID
    id = sch['$ref']

    // If the referenced schema is already known, we are ready
    if (session.deserialized.references[id]) return session.deserialized.references[id]

    // If not, returning a reference, and when the schema gets known, resolving the reference
    if (!session.deserialized.subscribers[id]) session.deserialized.subscribers[id] = []
    var reference = new SchemaReference()
    session.deserialized.subscribers[id].push(reference.resolve.bind(reference))

    return reference
  }
})

},{"../BaseSchema":20,"../schema":37}],27:[function(require,module,exports){
var RegexpSchema = require('../patterns/regexp')

String.of = function() {
  // Possible signatures : (charset)
  //                       (length, charset)
  //                       (minLength, maxLength, charset)
  var args = Array.prototype.slice.call(arguments).reverse()
    , charset = args[0] ? ('[' + args[0] + ']') : '[a-zA-Z0-9]'
    , max =  args[1]
    , min = (args.length > 2) ? args[2] : args[1]
    , regexp = '^' + charset + '{' + (min || 0) + ',' + (max || '') + '}$'

  return new RegexpSchema(RegExp(regexp)).wrap()
}

String.schema = new RegexpSchema().wrap()

},{"../patterns/regexp":35}],28:[function(require,module,exports){
var Schema = require('../BaseSchema')

var AnythingSchema = module.exports = Schema.patterns.AnythingSchema = Schema.extend({
  validate : function(instance) {
    return instance != null
  },

  toJSON : function() {
    return { type : 'any' }
  }
})

var anything = AnythingSchema.instance = new AnythingSchema()

Schema.fromJS.def(function(sch) {
  if (sch === undefined) return anything
})

Schema.fromJSON.def(function(sch) {
  if (sch.type === 'any') return anything
})

},{"../BaseSchema":20}],29:[function(require,module,exports){
var Schema = require('../BaseSchema')

var ClassSchema = module.exports = Schema.patterns.ClassSchema = Schema.extend({
  initialize : function(constructor) {
    this.constructor = constructor
  },

  validate : function(instance) {
    return instance instanceof this.constructor
  }
})


Schema.fromJS.def(function(constructor) {
  if (!(constructor instanceof Function)) return

  if (constructor.schema instanceof Function) {
    return constructor.schema.unwrap()
  } else {
    return new ClassSchema(constructor)
  }
})

},{"../BaseSchema":20}],30:[function(require,module,exports){
var Schema = require('../BaseSchema')

// Object deep equality
var equal = function(a, b) {
  // if a or b is primitive, simple comparison
  if (Object(a) !== a || Object(b) !== b) return a === b

  // both a and b must be Array, or none of them
  if ((a instanceof Array) !== (b instanceof Array)) return false

  // they must have the same number of properties
  if (Object.keys(a).length !== Object.keys(b).length) return false

  // and every property should be equal
  for (var key in a) {
    if (!equal(a[key], b[key])) return false
  }

  // if every check succeeded, they are deep equal
  return true
}

var EqualitySchema = module.exports = Schema.patterns.EqualitySchema = Schema.extend({
  initialize : function(object) {
    this.object = object
  },

  validate : function(instance) {
    return equal(instance, this.object)
  },

  toJSON : function() {
    var json = Schema.prototype.toJSON.call(this)

    json['enum'] = [this.object]

    return json
  }
})


Schema.fromJS.def(function(sch) {
  if (sch instanceof Array && sch.length === 1) return new EqualitySchema(sch[0])
})

},{"../BaseSchema":20}],31:[function(require,module,exports){
var Schema = require('../BaseSchema')

var NothingSchema = module.exports = Schema.patterns.NothingSchema = Schema.extend({
  validate : function(instance) {
    return instance == null
  },

  toJSON : function() {
    return { type : 'null' }
  }
})

var nothing = NothingSchema.instance = new NothingSchema()

Schema.fromJS.def(function(sch) {
  if (sch === null) return nothing
})

Schema.fromJSON.def(function(sch) {
  if (sch.type === 'null') return nothing
})

},{"../BaseSchema":20}],32:[function(require,module,exports){
var Schema = require('../BaseSchema')
  , anything = require('./anything').instance
  , nothing = require('./nothing').instance

var ObjectSchema = module.exports = Schema.patterns.ObjectSchema = Schema.extend({
  initialize : function(properties, other) {
    var self = this

    this.other = other || anything
    this.properties = properties || []

    // Sorting properties into two groups
    this.stringProps = {}, this.regexpProps = []
    this.properties.forEach(function(property) {
      if (typeof property.key === 'string') {
        self.stringProps[property.key] = property
      } else {
        self.regexpProps.push(property)
      }
    })
  },

  validate : function(instance) {
    var self = this

    if (instance == null) return false

    // Simple string properties
    var stringPropsValid = Object.keys(this.stringProps).every(function(key) {
      return (self.stringProps[key].min === 0 && !(key in instance)) ||
             (self.stringProps[key].value.validate(instance[key]))
    })
    if (!stringPropsValid) return false

    // If there are no RegExp and other validator, that's all
    if (!this.regexpProps.length && this.other === anything) return true

    // Regexp and other properties
    var checked
    for (var key in instance) {

      // Checking the key against every key regexps
      checked = false
      var regexpPropsValid = Object.keys(this.regexpProps).every(function(key) {
        return (!self.regexpProps[key].key.test(key) ||
                ((checked = true) && self.regexpProps[key].value.validate(instance[key]))
               )
      })
      if (!regexpPropsValid) return false

      // If the key is not matched by regexps and by simple string checks
      // then check it against this.other
      if (!checked && !(key in this.stringProps) && !this.other.validate(instance[key])) return false

    }

    // If all checks passed, the instance conforms to the schema
    return true
  },

  toJSON : Schema.session(function() {
    var i, property, regexp, json = Schema.prototype.toJSON.call(this, true)

    if (json['$ref'] != null) return json

    json.type = 'object'

    for (i in this.stringProps) {
      property = this.stringProps[i]
      json.properties = json.properties || {}
      json.properties[property.key] = property.value.toJSON()
      if (property.min === 1) json.properties[property.key].required = true
      if (property.title) json.properties[property.key].title = property.title
    }

    for (i = 0; i < this.regexpProps.length; i++) {
      property = this.regexpProps[i]
      json.patternProperties = json.patternProperties || {}
      regexp = property.key.toString()
      regexp = regexp.substr(2, regexp.length - 4)
      json.patternProperties[regexp] = property.value.toJSON()
      if (property.title) json.patternProperties[regexp].title = property.title
    }

    if (this.other !== anything) {
      json.additionalProperties = (this.other === nothing) ? false : this.other.toJSON()
    }

    return json
  })
})

// Testing if a given string is a real regexp or just a single string escaped
// If it is just a string escaped, return the string. Otherwise return the regexp
var regexpString = (function() {
  // Special characters that should be escaped when describing a regular string in regexp
  var shouldBeEscaped = '[](){}^$?*+.'.split('').map(function(element) {
        return RegExp('(\\\\)*\\' + element, 'g')
      })
  // Special characters that shouldn't be escaped when describing a regular string in regexp
  var shouldntBeEscaped = 'bBwWdDsS'.split('').map(function(element) {
        return RegExp('(\\\\)*' + element, 'g')
      })

  return function(string) {
    var i, j, match

    for (i = 0; i < shouldBeEscaped.length; i++) {
      match = string.match(shouldBeEscaped[i])
      if (!match) continue
      for (j = 0; j < match.length; j++) {
        // If it is not escaped, it must be a regexp (e.g. [, \\[, \\\\[, etc.)
        if (match[j].length % 2 === 1) return RegExp('^' + string + '$')
      }
    }
    for (i = 0; i < shouldntBeEscaped.length; i++) {
      match = string.match(shouldntBeEscaped[i])
      if (!match) continue
      for (j = 0; j < match.length; j++) {
        // If it is escaped, it must be a regexp (e.g. \b, \\\b, \\\\\b, etc.)
        if (match[j].length % 2 === 0) return RegExp('^' + string + '$')
      }
    }

    // It is not a real regexp. Removing the escaping.
    for (i = 0; i < shouldBeEscaped.length; i++) {
      string = string.replace(shouldBeEscaped[i], function(match) {
        return match.substr(1)
      })
    }

    return string
  }
})()

Schema.fromJS.def(function(object) {
  if (!(object instanceof Object)) return

  var other, property, properties = []
  for (var key in object) {
    property = { value : Schema.fromJS(object[key]) }

    // '*' as property name means 'every other property should match this schema'
    if (key === '*') {
      other = property.value
      continue
    }

    // Handling special chars at the beginning of the property name
    property.min = (key[0] === '*' || key[0] === '?') ? 0 : 1
    property.max = (key[0] === '*' || key[0] === '+') ? Infinity : 1
    key = key.replace(/^[*?+]/, '')

    // Handling property title that looks like: { 'a : an important property' : Number }
    key = key.replace(/\s*:[^:]+$/, function(match) {
      property.title = match.replace(/^\s*:\s*/, '')
      return ''
    })

    // Testing if it is regexp-like or not. If it is, then converting to a regexp object
    property.key = regexpString(key)

    properties.push(property)
  }

  return new ObjectSchema(properties, other)
})

Schema.fromJSON.def(function(json) {
  if (!json || json.type !== 'object') return

  var key, properties = []
  for (key in json.properties) {
    properties.push({ min : json.properties[key].required ? 1 : 0
                    , max : 1
                    , key : key
                    , value : Schema.fromJSON(json.properties[key])
                    , title : json.properties[key].title
                    })
  }
  for (key in json.patternProperties) {
    properties.push({ min : 0
                    , max : Infinity
                    , key : RegExp('^' + key + '$')
                    , value : Schema.fromJSON(json.patternProperties[key])
                    , title : json.patternProperties[key].title
                    })
  }

  var other
  if (json.additionalProperties !== undefined) {
    other = json.additionalProperties === false ? nothing : Schema.fromJSON(json.additionalProperties)
  }

  return new ObjectSchema(properties, other)
})

},{"../BaseSchema":20,"./anything":28,"./nothing":31}],33:[function(require,module,exports){
var Schema = require('../BaseSchema')
  , EqualitySchema = require('../patterns/equality')

var OrSchema = module.exports = Schema.patterns.OrSchema = Schema.extend({
  initialize : function(schemas) {
    this.schemas = schemas
  },

  validate : function(instance) {
    return this.schemas.some(function(sch) {
      return sch.validate(instance)
    })
  },

  toJSON : Schema.session(function() {
    var json = Schema.prototype.toJSON.call(this, true)
      , subjsons = this.schemas.map(function(sch) { return sch.toJSON() })
      , onlyEquality = subjsons.every(function(json) {
          return json['enum'] instanceof Array && json['enum'].length === 1
        })

    if (json['$ref'] != null) return json

    if (onlyEquality) {
      json['enum'] = subjsons.map(function(json) {
        return json['enum'][0]
      })

    } else {
      json['type'] = subjsons.map(function(json) {
        var simpleType = typeof json.type === 'string' && Object.keys(json).length === 1
        return simpleType ? json.type : json
      })
    }

    return json
  })
})


Schema.fromJS.def(function(schemas) {
  if (schemas instanceof Array) return new OrSchema(schemas.map(function(sch) {
    return sch === undefined ? Schema.self : Schema.fromJS(sch)
  }))
})

Schema.fromJSON.def(function(sch) {
  if (!sch) return

  if (sch['enum'] instanceof Array) {
    return new OrSchema(sch['enum'].map(function(object) {
      return new EqualitySchema(object)
    }))
  }

  if (sch['type'] instanceof Array) {
    return new OrSchema(sch['type'].map(function(type) {
      return Schema.fromJSON(typeof type === 'string' ? { type : type } : type)
    }))
  }
})

},{"../BaseSchema":20,"../patterns/equality":30}],34:[function(require,module,exports){
var Schema = require('../BaseSchema')

var ReferenceSchema = module.exports = Schema.patterns.ReferenceSchema = Schema.extend({
  initialize : function(value) {
    this.value = value
  },

  validate : function(instance) {
    return instance === this.value
  },

  toJSON : function() {
    var json = Schema.prototype.toJSON.call(this)

    json['enum'] = [this.value]

    return json
  }
})


Schema.fromJS.def(function(value) {
  return new ReferenceSchema(value)
})

},{"../BaseSchema":20}],35:[function(require,module,exports){
var Schema = require('../BaseSchema')

var RegexpSchema = module.exports = Schema.patterns.RegexpSchema = Schema.extend({
  initialize : function(regexp) {
    this.regexp = regexp
  },

  validate : function(instance) {
    return Object(instance) instanceof String && (!this.regexp || this.regexp.test(instance))
  },

  toJSON : function() {
    var json = Schema.prototype.toJSON.call(this)

    json.type = 'string'

    if (this.regexp) {
      json.pattern = this.regexp.toString()
      json.pattern = json.pattern.substr(1, json.pattern.length - 2)
    }

    return json
  }
})

Schema.fromJSON.def(function(sch) {
  if (!sch || sch.type !== 'string') return

  if ('pattern' in sch) {
    return new RegexpSchema(RegExp('^' + sch.pattern + '$'))
  } else if ('minLength' in sch || 'maxLength' in sch) {
    return new RegexpSchema(RegExp('^.{' + [ sch.minLength || 0, sch.maxLength ].join(',') + '}$'))
  } else {
    return new RegexpSchema()
  }
})

Schema.fromJS.def(function(regexp) {
  if (regexp instanceof RegExp) return new RegexpSchema(regexp)
})

},{"../BaseSchema":20}],36:[function(require,module,exports){
var Schema = require('../BaseSchema')

Schema.fromJS.def(function(sch) {
  if (sch instanceof Schema) return sch
})

},{"../BaseSchema":20}],37:[function(require,module,exports){
var Schema = require('./BaseSchema')

var schema = module.exports = function(schemaDescription) {
  var doc, schemaObject

  if (arguments.length === 2) {
    doc = schemaDescription
    schemaDescription = arguments[1]
  }

  if (this instanceof schema) {
    // When called with new, create a schema object and then return the schema function
    var constructor = Schema.extend(schemaDescription)
    schemaObject = new constructor()
    if (doc) schemaObject.doc = doc
    return schemaObject.wrap()

  } else {
    // When called as simple function, forward everything to fromJS
    // and then resolve schema.self to the resulting schema object
    schemaObject = Schema.fromJS(schemaDescription)
    schema.self.resolve(schemaObject)
    if (doc) schemaObject.doc = doc
    return schemaObject.wrap()
  }
}

schema.Schema = Schema

schema.toJSON = function(sch) {
  return Schema.fromJS(sch).toJSON()
}

schema.fromJS = function(sch) {
  return Schema.fromJS(sch).wrap()
}

schema.fromJSON = function(sch) {
  return Schema.fromJSON(sch).wrap()
}


},{"./BaseSchema":20}],38:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],39:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;

function drainQueue() {
    if (draining) {
        return;
    }
    draining = true;
    var currentQueue;
    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        var i = -1;
        while (++i < len) {
            currentQueue[i]();
        }
        len = queue.length;
    }
    draining = false;
}
process.nextTick = function (fun) {
    queue.push(fun);
    if (!draining) {
        setTimeout(drainQueue, 0);
    }
};

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}]},{},[1]);
