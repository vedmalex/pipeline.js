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

},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3Vzci9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImJyb3dzZXIuanMiLCJpbmRleC5qcyIsImxpYi9jb250ZXh0LmpzIiwibGliL2lmZWxzZS5qcyIsImxpYi9tdWx0eXdheXN3aXRjaC5qcyIsImxpYi9wYXJhbGxlbC5qcyIsImxpYi9waXBlbGluZS5qcyIsImxpYi9yZXRyeW9uZXJyb3IuanMiLCJsaWIvc2VxdWVudGlhbC5qcyIsImxpYi9zdGFnZS5qcyIsImxpYi90aW1lb3V0LmpzIiwibGliL3V0aWwuanMiLCJsaWIvd3JhcC5qcyIsIm5vZGVfbW9kdWxlcy9jb21wYXJhdG9yLmpzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2NvbXBhcmF0b3IuanMvbGliL2NvbXBhcmF0b3IuanMiLCJub2RlX21vZHVsZXMvY29tcGFyYXRvci5qcy9saWIvZm9sZHVuZm9sZC5qcyIsIm5vZGVfbW9kdWxlcy9jb21wYXJhdG9yLmpzL2xpYi9tYXBwaW5nLmpzIiwibm9kZV9tb2R1bGVzL2NvbXBhcmF0b3IuanMvbm9kZV9tb2R1bGVzL2RpZmYvZGlmZi5qcyIsIm5vZGVfbW9kdWxlcy9qcy1zY2hlbWEvaW5kZXguanMiLCJub2RlX21vZHVsZXMvanMtc2NoZW1hL2xpYi9CYXNlU2NoZW1hLmpzIiwibm9kZV9tb2R1bGVzL2pzLXNjaGVtYS9saWIvZXh0ZW5zaW9ucy9BcnJheS5qcyIsIm5vZGVfbW9kdWxlcy9qcy1zY2hlbWEvbGliL2V4dGVuc2lvbnMvQm9vbGVhbi5qcyIsIm5vZGVfbW9kdWxlcy9qcy1zY2hlbWEvbGliL2V4dGVuc2lvbnMvRnVuY3Rpb24uanMiLCJub2RlX21vZHVsZXMvanMtc2NoZW1hL2xpYi9leHRlbnNpb25zL051bWJlci5qcyIsIm5vZGVfbW9kdWxlcy9qcy1zY2hlbWEvbGliL2V4dGVuc2lvbnMvT2JqZWN0LmpzIiwibm9kZV9tb2R1bGVzL2pzLXNjaGVtYS9saWIvZXh0ZW5zaW9ucy9TY2hlbWEuanMiLCJub2RlX21vZHVsZXMvanMtc2NoZW1hL2xpYi9leHRlbnNpb25zL1N0cmluZy5qcyIsIm5vZGVfbW9kdWxlcy9qcy1zY2hlbWEvbGliL3BhdHRlcm5zL2FueXRoaW5nLmpzIiwibm9kZV9tb2R1bGVzL2pzLXNjaGVtYS9saWIvcGF0dGVybnMvY2xhc3MuanMiLCJub2RlX21vZHVsZXMvanMtc2NoZW1hL2xpYi9wYXR0ZXJucy9lcXVhbGl0eS5qcyIsIm5vZGVfbW9kdWxlcy9qcy1zY2hlbWEvbGliL3BhdHRlcm5zL25vdGhpbmcuanMiLCJub2RlX21vZHVsZXMvanMtc2NoZW1hL2xpYi9wYXR0ZXJucy9vYmplY3QuanMiLCJub2RlX21vZHVsZXMvanMtc2NoZW1hL2xpYi9wYXR0ZXJucy9vci5qcyIsIm5vZGVfbW9kdWxlcy9qcy1zY2hlbWEvbGliL3BhdHRlcm5zL3JlZmVyZW5jZS5qcyIsIm5vZGVfbW9kdWxlcy9qcy1zY2hlbWEvbGliL3BhdHRlcm5zL3JlZ2V4cC5qcyIsIm5vZGVfbW9kdWxlcy9qcy1zY2hlbWEvbGliL3BhdHRlcm5zL3NjaGVtYS5qcyIsIm5vZGVfbW9kdWxlcy9qcy1zY2hlbWEvbGliL3NjaGVtYS5qcyIsIi4uLy4uLy4uLy4uL3Vzci9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2V2ZW50cy9ldmVudHMuanMiLCIuLi8uLi8uLi8uLi91c3IvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FDQUE7Ozs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25ZQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9PQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9LQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDOVRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDeElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNyRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BhQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Y0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDalhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3U0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiZ2xvYmFsLnBpcGVsaW5lanMgPSByZXF1aXJlKCcuL2luZGV4Jyk7IiwiZXhwb3J0cy5TdGFnZSA9IHJlcXVpcmUoJy4vbGliL3N0YWdlJykuU3RhZ2U7XG5leHBvcnRzLlBpcGVsaW5lID0gcmVxdWlyZSgnLi9saWIvcGlwZWxpbmUnKS5QaXBlbGluZTtcbmV4cG9ydHMuU2VxdWVudGlhbCA9IHJlcXVpcmUoJy4vbGliL3NlcXVlbnRpYWwnKS5TZXF1ZW50aWFsO1xuZXhwb3J0cy5JZkVsc2UgPSByZXF1aXJlKCcuL2xpYi9pZmVsc2UnKS5JZkVsc2U7XG5leHBvcnRzLk11bHRpV2F5U3dpdGNoID0gcmVxdWlyZSgnLi9saWIvbXVsdHl3YXlzd2l0Y2gnKS5NdWx0aVdheVN3aXRjaDtcbmV4cG9ydHMuUGFyYWxsZWwgPSByZXF1aXJlKCcuL2xpYi9wYXJhbGxlbCcpLlBhcmFsbGVsO1xuZXhwb3J0cy5Db250ZXh0ID0gcmVxdWlyZSgnLi9saWIvY29udGV4dCcpLkNvbnRleHQ7XG5leHBvcnRzLlV0aWwgPSByZXF1aXJlKCcuL2xpYi91dGlsJykuVXRpbDtcbmV4cG9ydHMuVGltZW91dCA9IHJlcXVpcmUoJy4vbGliL3RpbWVvdXQnKS5UaW1lb3V0O1xuZXhwb3J0cy5XcmFwID0gcmVxdWlyZSgnLi9saWIvd3JhcCcpLldyYXA7XG5leHBvcnRzLlJldHJ5T25FcnJvciA9IHJlcXVpcmUoJy4vbGliL3JldHJ5b25lcnJvcicpLlJldHJ5T25FcnJvcjsiLCIvKiFcbiAqIE1vZHVsZSBkZXBlbmRlbmN5XG4gKi9cbnZhciBjbXAgPSByZXF1aXJlKCdjb21wYXJhdG9yLmpzJyk7XG52YXIgZ2V0ID0gY21wLmdldDtcbnZhciBzZXQgPSBjbXAuc2V0O1xuXG4vKiFcbiAqIExpc3Qgb2YgcmVzZXJ2ZXIgd29yZHMgZm9yIGNvbnRleHQuXG4gKiBVc2VkIHRvIGNoZWNrIHdoZWF0ZXIgb3Igbm90IHByb3BlcnR5IGlzIHRoZSBDb250ZXh0LWNsYXNzIHByb3BlcnR5XG4gKi9cblxudmFyIHJlc2VydmVkID0ge1xuXHRcImdldENoaWxkc1wiOiAxLFxuXHRcImdldFBhcmVudFwiOiAxLFxuXHRcIl9fY2hpbGRyZW5cIjogMSxcblx0XCJfX3BhcmVudFwiOiAxLFxuXHRcIl9fc2lnbldpdGhcIjogMSxcblx0XCJfX3NldEN1cnJlbnRTdGFja05hbWVcIjogMSxcblx0XCJfX3N0YWNrXCI6IDEsXG5cdFwiX190cmFjZVwiOiAxLFxuXHRcImFkZFRvU3RhY2tcIjogMSxcblx0XCJoYXNDaGlsZFwiOiAxLFxuXHRcImVuc3VyZVwiOiAxLFxuXHRcImVuc3VyZUlzQ2hpbGRcIjogMSxcblx0XCJhZGRDaGlsZFwiOiAxLFxuXHRcInRvSlNPTlwiOiAxLFxuXHRcInRvT2JqZWN0XCI6IDEsXG5cdFwiZm9ya1wiOiAxLFxuXHRcIm92ZXJ3cml0ZVwiOiAxLFxuXHRcImdldFwiOiAxLFxufTtcblxuLyoqXG4gKiAgVGhlICoqQ29udGV4dCoqIGl0c2VsZlxuICogIG5vdCBhbGxvd2VkIHRvIHVzZSBhcyBhIGZ1bmN0aW9uXG4gKiAgQHBhcmFtIHtPYmplY3R9IG5hbWUgdGhlIG9iamVjdCB0aGF0IGlzIHRoZSBzb3VyY2UgZm9yIHRoZSAqKkNvbnRleHQqKi5cbiAqL1xuXG5mdW5jdGlvbiBDb250ZXh0KGNvbmZpZykge1xuXHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0aWYgKCEoc2VsZiBpbnN0YW5jZW9mIENvbnRleHQpKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKCdjb25zdHJ1Y3RvciBpcyBub3QgYSBmdW5jdGlvbicpO1xuXHR9XG5cdHNlbGYub3ZlcndyaXRlKGNvbmZpZyk7XG59XG5cbi8qKlxuICogVXNlZCB0byBhcHBseSBjaGFuZ2VzIHRvIGNvbnRleHQ7XG4gKi9cblxuQ29udGV4dC5wcm90b3R5cGUub3ZlcndyaXRlID0gZnVuY3Rpb24oY29uZmlnKSB7XG5cdHZhciBzZWxmID0gdGhpcztcblx0aWYgKGNvbmZpZykge1xuXHRcdHZhciB2YWw7XG5cdFx0Zm9yICh2YXIgcHJvcCBpbiBjb25maWcpIHtcblx0XHRcdHZhbCA9IGNvbmZpZ1twcm9wXTtcblx0XHRcdGlmICghcmVzZXJ2ZWRbcHJvcF0pIHtcblx0XHRcdFx0aWYgKHZhbCAhPT0gdW5kZWZpbmVkICYmIHZhbCAhPT0gbnVsbClcblx0XHRcdFx0XHRzZWxmW3Byb3BdID0gY29uZmlnW3Byb3BdO1xuXHRcdFx0fVxuXHRcdH1cblx0XHQvLyBlbnN1cmUgdGhhdCB0cmFjZWFiaWxpdHkgaXMgYWxzbyBjb3BpZWRcblx0XHRzZWxmLl9fdHJhY2UgPSBjb25maWcudHJhY2UgfHwgY29uZmlnLl9fdHJhY2U7XG5cdH1cbn07XG5cbi8qKlxuICogUmVmZXJlbmNlIHRvIHBhcmVudFxuICogQGFwaSBwcml2YXRlXG4gKi9cbkNvbnRleHQucHJvdG90eXBlLl9fcGFyZW50ID0gdW5kZWZpbmVkO1xuXG4vKipcbiAqIFJlZmVyZW5jZSB0byBsaXN0IG9mIGNoaWxkc1xuICogQGFwaSBwcml2YXRlXG4gKi9cbkNvbnRleHQucHJvdG90eXBlLl9fY2hpbGRyZW4gPSB1bmRlZmluZWQ7XG5cbi8qKlxuICogUmVmZXJlbmNlIHRvIGxpc3Qgb2YgZXJyb3JzXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuQ29udGV4dC5wcm90b3R5cGUuX19lcnJvcnMgPSB1bmRlZmluZWQ7XG5cbi8qKlxuICogUmVmZXJlbmNlIHRvIHN0YWNrIHRyYWNlIGluZm9ybWF0aW9uXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuQ29udGV4dC5wcm90b3R5cGUuX19zdGFjayA9IHVuZGVmaW5lZDtcblxuLyoqXG4gKiBSZWZlcmVuY2UgdG8gdHJhY2Utc3dpdGNoXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuQ29udGV4dC5wcm90b3R5cGUuX190cmFjZSA9IHVuZGVmaW5lZDtcblxuLyoqXG4gKiBBZGQgc3BlY2lmaWMgc3RhZ2UgdG8gc3RhY2sgbGlzdCBvZiB0aGUgY29udGV4dFxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgbmFtZSBvZiB0aGUgc3RhZ2UgZm9yIHRyYWNpbmdcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5Db250ZXh0LnByb3RvdHlwZS5fX3NpZ25XaXRoID0gZnVuY3Rpb24obmFtZSkge1xuXHR2YXIgc2VsZiA9IHRoaXM7XG5cdGlmIChzZWxmLl9fdHJhY2UpIHtcblx0XHRpZiAoIXNlbGYuX19zdGFjaykgc2VsZi5fX3N0YWNrID0gW107XG5cdFx0c2VsZi5fX3N0YWNrLnB1c2gobmFtZSk7XG5cdH1cbn07XG5cbi8qKlxuICogQWxsb3cgdG8gc2lnbiBjdXJyZW50IHN0YWNrXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZSBuYW1lIG9mIHRoZSBzdGFja1xuICogQGFwaSBwcml2YXRlXG4gKi9cbkNvbnRleHQucHJvdG90eXBlLl9fc2V0Q3VycmVudFN0YWNrTmFtZSA9IGZ1bmN0aW9uKG5hbWUpIHtcblx0dmFyIHNlbGYgPSB0aGlzO1xuXHRpZiAoc2VsZi5fX3RyYWNlKSB7XG5cdFx0aWYgKCFzZWxmLl9fc3RhY2spIHtcblx0XHRcdHNlbGYuX19zdGFjayA9IFtdO1xuXHRcdFx0c2VsZi5fX3N0YWNrLnB1c2gobmFtZSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHZhciBjdXJyZW50ID0gc2VsZi5fX3N0YWNrLnBvcCgpO1xuXHRcdFx0aWYgKCdvYmplY3QnICE9PSB0eXBlb2YgY3VycmVudCB8fCBudWxsID09IGN1cnJlbnQpIHtcblx0XHRcdFx0Y3VycmVudCA9IHtcblx0XHRcdFx0XHRuYW1lOiBuYW1lLFxuXHRcdFx0XHRcdGZvcmtzOiBbXVxuXHRcdFx0XHR9O1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Y3VycmVudC5uYW1lID0gbmFtZTtcblx0XHRcdH1cblx0XHRcdHNlbGYuX19zdGFjay5wdXNoKGN1cnJlbnQpO1xuXHRcdH1cblx0fVxufTtcblxuLyoqXG4gKiBBbGxvdyB0byBhZGQgc29tZSBvYmplY3QgdG8gc3RhY2sgd2l0aCBzcGVjaWZpYyBuYW1lXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZSBuYW1lIG9mIHN0b3JlZCBvYmplY3RcbiAqIEBwYXJhbSB7T2JqZWN0fGFueX0gb2JqIGNvbnRhaW5tZW50XG4gKiBAYXBpIHB1YmxpY1xuICovXG5Db250ZXh0LnByb3RvdHlwZS5hZGRUb1N0YWNrID0gZnVuY3Rpb24obmFtZSwgb2JqKSB7XG5cdHZhciBzZWxmID0gdGhpcztcblx0aWYgKHNlbGYuX190cmFjZSkge1xuXHRcdHZhciBjdXJyZW50ID0gc2VsZi5fX3N0YWNrLnBvcCgpO1xuXHRcdGlmICgnb2JqZWN0JyAhPT0gdHlwZW9mIGN1cnJlbnQgfHwgbnVsbCA9PSBjdXJyZW50KSB7XG5cdFx0XHRjdXJyZW50ID0ge1xuXHRcdFx0XHRuYW1lOiBjdXJyZW50LFxuXHRcdFx0XHRmb3JrczogW11cblx0XHRcdH07XG5cdFx0fVxuXHRcdGN1cnJlbnRbbmFtZV0gPSBvYmo7XG5cdFx0c2VsZi5fX3N0YWNrLnB1c2goY3VycmVudCk7XG5cdH1cbn07XG5cbi8qKlx0XG4gKiBSZXR1cm5zIGxpc3Qgb2YgY2hpbGQgY29udGV4dHMuXG4gKiBAcmV0dXJuIHtBcnJheSBvZiBDb250ZXh0fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuQ29udGV4dC5wcm90b3R5cGUuZ2V0Q2hpbGRzID0gZnVuY3Rpb24oKSB7XG5cdHZhciBzZWxmID0gdGhpcztcblx0aWYgKCFzZWxmLl9fY2hpbGRyZW4pIHtcblx0XHRzZWxmLl9fY2hpbGRyZW4gPSBbXTtcblx0fVxuXHRyZXR1cm4gc2VsZi5fX2NoaWxkcmVuO1xufTtcblxuLyoqXG4gKiBSZXR1cm4gcGFyZW50IENvbnRleHRcbiAqIEBhcGkgcHVibGljXG4gKiBAcmV0dXJuIHtDb250ZXh0fVxuICovXG5Db250ZXh0LnByb3RvdHlwZS5nZXRQYXJlbnQgPSBmdW5jdGlvbigpIHtcblx0dmFyIHNlbGYgPSB0aGlzO1xuXHRyZXR1cm4gc2VsZi5fX3BhcmVudDtcbn07XG5cbi8qKlxuICogY2hlY2tzIHdoZWF0ZXIgb3Igbm90IGNvbnRleHQgaGFzIHNwZWNpZmljIGNoaWxkIGNvbnRleHRcbiAqIGl0IHJldHVybiBgdHJ1ZWAgYWxzbyBpZiBgY3R4YCBpcyBgc2VsZmA7XG4gKiBAYXBpIHB1YmxpY1xuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqL1xuQ29udGV4dC5wcm90b3R5cGUuaGFzQ2hpbGQgPSBmdW5jdGlvbihjdHgpIHtcblx0dmFyIHNlbGYgPSB0aGlzO1xuXHRpZiAoY3R4IGluc3RhbmNlb2YgQ29udGV4dCkge1xuXHRcdHJldHVybiBjdHguX19wYXJlbnQgPT09IHNlbGYgfHwgc2VsZiA9PT0gY3R4O1xuXHR9XG59O1xuXG4vKipcdFxuICogc3RhdGljIGZ1bmN0aW9uIHdoaWNoIGVuc3VyZXMgdGhhdCB0aGUgb2JqZWN0IGlzIHByb3BlciBUeXBlXG4gKiBAYXBpIHB1YmxpY1xuICogQHBhcmFtIHtPYmplY3R8Q29udGV4dH0gY3R4IHZlcmlmaWVkIGNvbnRleHRcbiAqIEByZXR1cm4ge0NvbnRleHR9O1xuICovXG5Db250ZXh0LmVuc3VyZSA9IGZ1bmN0aW9uKGN0eCkge1xuXHRpZiAoIShjdHggaW5zdGFuY2VvZiBDb250ZXh0KSkge1xuXHRcdHJldHVybiBuZXcgQ29udGV4dChjdHgpO1xuXHR9IGVsc2Uge1xuXHRcdHJldHVybiBjdHg7XG5cdH1cbn07XG5cbi8qKlxuICogRW5zdXJlcyB0aGF0IHRoZSBjb250ZXh0IGlzIHRoZSBjaGlsZCBvZiBjdXJyZW50IGNvbnRleHQsIGFuZCByZXR1cm5zIHJpZ2h0IGNvbnRleHRcbiAqIEBhcGkgcHVibGljXG4gKiBAcGFyYW0ge09iamVjdHxDb250ZXh0fSBjdHhcbiAqIEByZXR1cm4ge0NvbnRleHR9XG4gKi9cbkNvbnRleHQucHJvdG90eXBlLmVuc3VyZUlzQ2hpbGQgPSBmdW5jdGlvbihjdHgpIHtcblx0dmFyIHNlbGYgPSB0aGlzO1xuXHR2YXIgbGN0eCA9IENvbnRleHQuZW5zdXJlKGN0eCk7XG5cdGlmICghc2VsZi5oYXNDaGlsZChsY3R4KSkge1xuXHRcdHNlbGYuYWRkQ2hpbGQobGN0eCk7XG5cdH1cblx0cmV0dXJuIGxjdHg7XG59O1xuXG4vKipcbiAqIEFkZCBjaGlsZCBDb250ZXh0IHRvIGN1cnJlbnRcbiAqICFOb3RlISBBbGwgY2hpbGRyZW4gY29udGV4dHMgaGFzIHBhcmVudCBsaXN0IG9mIGVycm9yLiBUaGlzIGFsbG93IHRvIGJlIHN1cmUgdGhhdCBhbnkgZm9ya1xuICogQGFwaSBwdWJsaWNcbiAqIEBwYXJhbSB7Q29udGV4dH0gY3R4IG5ldyBjaGlsZCBjb250ZXh0XG4gKi9cbkNvbnRleHQucHJvdG90eXBlLmFkZENoaWxkID0gZnVuY3Rpb24oY3R4KSB7XG5cdHZhciBzZWxmID0gdGhpcztcblx0aWYgKCFzZWxmLmhhc0NoaWxkKGN0eCkpIHtcblx0XHR2YXIgY2hpbGQgPSBDb250ZXh0LmVuc3VyZShjdHgpO1xuXHRcdGNoaWxkLl9fcGFyZW50ID0gc2VsZjtcblx0XHRjaGlsZC5fX3RyYWNlID0gc2VsZi5fX3RyYWNlO1xuXHRcdGlmICghc2VsZi5fX2NoaWxkcmVuKSB7XG5cdFx0XHRzZWxmLl9fY2hpbGRyZW4gPSBbXTtcblx0XHR9XG5cdFx0Ly8gaWYgKCFzZWxmLl9fZXJyb3JzKSB7XG5cdFx0Ly8gXHRzZWxmLl9fZXJyb3JzID0gW107XG5cdFx0Ly8gfVxuXHRcdGlmIChzZWxmLl9fdHJhY2UpIHtcblx0XHRcdGlmICghc2VsZi5fX3N0YWNrKSB7XG5cdFx0XHRcdHNlbGYuX19zdGFjayA9IFtdO1xuXHRcdFx0fVxuXHRcdFx0Y2hpbGQuX19zdGFjayA9IFtdO1xuXG5cdFx0XHR2YXIgY3VycmVudCA9IHNlbGYuX19zdGFjay5wb3AoKTtcblx0XHRcdGlmICgnb2JqZWN0JyAhPT0gdHlwZW9mIGN1cnJlbnQgfHwgbnVsbCA9PSBjdXJyZW50KSB7XG5cdFx0XHRcdGN1cnJlbnQgPSB7XG5cdFx0XHRcdFx0bmFtZTogY3VycmVudCxcblx0XHRcdFx0XHRmb3JrczogW11cblx0XHRcdFx0fTtcblx0XHRcdH1cblx0XHRcdHNlbGYuX19zdGFjay5wdXNoKGN1cnJlbnQpO1xuXHRcdFx0Y2hpbGQuX19zdGFjay5wdXNoKGN1cnJlbnQubmFtZSk7XG5cdFx0XHRjdXJyZW50LmZvcmtzLnB1c2goY2hpbGQuX19zdGFjayk7XG5cdFx0fVxuXG5cdFx0Ly8gY2hpbGQgY29udGV4dCBkaWQndCBoYXZlIG93biBlcnJvciBsaXN0IGF0IGFsbFxuXHRcdC8vIGNoaWxkLl9fZXJyb3JzID0gc2VsZi5fX2Vycm9ycztcblx0XHRzZWxmLl9fY2hpbGRyZW4ucHVzaChjaGlsZCk7XG5cdH1cbn07XG5cbi8qKlxuICogTWFrZXMgZm9yayBvZiBjdXJyZW50IGNvbnRleHQgYW5kIGFkZCBpdCB0byBjdXJyZW50IGFzIGEgY2hpbGQgY29udGV4dFxuICogQGFwaSBwdWJsaWNcbiAqIEBwYXJhbSB7T2JqZWN0fENvbnRleHR9IFtjb25maWddIG5ldyBwcm9wZXJ0aWVzIHRoYXQgbXVzdCBleGlzdHMgaW4gbmV3IGZvcmtcbiAqIEByZXRydW4ge0NvbnRleHR9XG4gKi9cbkNvbnRleHQucHJvdG90eXBlLmZvcmsgPSBmdW5jdGlvbihjb25maWcpIHtcblx0dmFyIHNlbGYgPSB0aGlzO1xuXHR2YXIgY2hpbGQgPSBuZXcgQ29udGV4dChzZWxmKTtcblx0c2VsZi5hZGRDaGlsZChjaGlsZCk7XG5cdGZvciAodmFyIHAgaW4gY29uZmlnKSB7XG5cdFx0Y2hpbGRbcF0gPSBjb25maWdbcF07XG5cdH1cblx0Y2hpbGQuX190cmFjZSA9IHNlbGYuX190cmFjZTtcblx0cmV0dXJuIGNoaWxkO1xufTtcbi8qKlxuICogU2FtZSBidXQgZGlmZmVyZW50IGFzIGEgZm9yay4gaXQgbWFrZSBwb3NzaWJsZSBnZXQgcGllY2Ugb2YgY29udGV4dCBhcyBjb250ZXh0O1xuICogQHBhcmFtIHBhdGggU3RyaW5nIHBhdGggdG8gY29udGV4dCBvYmplY3QgdGhhdCBuZWVkIHRvIGJlIGEgQ29udGV4dCBpbnN0YW5jZVxuICogQHJldHVybiBDb250ZXh0IHwgUHJpbWl0aXZlIHR5cGVcbiAqL1xuXG5Db250ZXh0LnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbihwYXRoKSB7XG5cdHZhciByb290ID0gZ2V0KHRoaXMsIHBhdGgpO1xuXHRpZiAocm9vdCBpbnN0YW5jZW9mIE9iamVjdCkge1xuXHRcdHZhciByZXN1bHQgPSByb290O1xuXHRcdGlmICghKHJlc3VsdCBpbnN0YW5jZW9mIENvbnRleHQpKSB7XG5cdFx0XHRyZXN1bHQgPSB0aGlzLmVuc3VyZUlzQ2hpbGQocmVzdWx0KTtcblx0XHRcdHNldCh0aGlzLCBwYXRoLCByZXN1bHQpO1xuXHRcdH1cblx0XHRyZXN1bHQuX190cmFjZSA9IHRoaXMuX190cmFjZTtcblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9XG59O1xuXG4vKipcbiAqIEV4dHJhY3RzIHN5bWJvbGljIG5hbWUgb2YgdGhlIGNsYXNzIGlmIGV4aXN0c1xuICogQGFwaSBwcml2YXRlXG4gKiBAcGFyYW0ge09iamVjdH0gdiBzb3VyY2Ugb2JqZWN0XG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKi9cbmZ1bmN0aW9uIGV4dHJhY3RUeXBlKHYpIHtcblx0dmFyIHRzID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblx0cmV0dXJuIHRzLmNhbGwodikubWF0Y2goL1xcW29iamVjdCAoLispXFxdLylbMV07XG59XG5cbi8qKlxuICogTWFrZSBjbG9uZSBvZiBvYmplY3QgYW5kIG9wdGlvbmFsbHkgY2xlYW4gaXQgZnJvbSBub3QgZGlyZWN0IGRlc2NlbmRhbnRzIG9mIGBPYmplY3RgXG4gKiBAYXBpIHByaXZhdGVcbiAqIEBwYXJhbSB7T2JqZWN0fGFueX0gc3JjIHNvdXJjZVxuICogQHBhcmFtIHtCb29sZWFufSBbY2xlYW5dIHdoZWF0aGVyIG9yIG5vdCB0byBjbGVhbiBvYmplY3RcbiAqIEByZXR1cm4ge09iamVjdHxhbnl9XG4gKi9cbmZ1bmN0aW9uIGNsb25lKHNyYywgY2xlYW4pIHtcblx0dmFyIHR5cGUgPSBleHRyYWN0VHlwZShzcmMpO1xuXHRzd2l0Y2ggKHR5cGUpIHtcblx0XHRjYXNlICdCb29sZWFuJzpcblx0XHRjYXNlICdTdHJpbmcnOlxuXHRcdGNhc2UgJ051bWJlcic6XG5cdFx0XHRyZXR1cm4gc3JjO1xuXHRcdGNhc2UgJ1JlZ0V4cCc6XG5cdFx0XHRyZXR1cm4gbmV3IFJlZ0V4cChzcmMudG9TdHJpbmcoKSk7XG5cdFx0Y2FzZSAnRGF0ZSc6XG5cdFx0XHRyZXR1cm4gbmV3IERhdGUoTnVtYmVyKHNyYykpO1xuXHRcdGNhc2UgJ09iamVjdCc6XG5cdFx0XHRpZiAoc3JjLnRvT2JqZWN0IGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcblx0XHRcdFx0cmV0dXJuIHNyYy50b09iamVjdCgpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0aWYgKHNyYy5jb25zdHJ1Y3RvciA9PT0gT2JqZWN0KSB7XG5cdFx0XHRcdFx0dmFyIG9iaiA9IHt9O1xuXHRcdFx0XHRcdGZvciAodmFyIHAgaW4gc3JjKSB7XG5cdFx0XHRcdFx0XHRvYmpbcF0gPSBjbG9uZShzcmNbcF0pO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRyZXR1cm4gb2JqO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHJldHVybiBjbGVhbiA/IHVuZGVmaW5lZCA6IHNyYztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0YnJlYWs7XG5cdFx0Y2FzZSAnQXJyYXknOlxuXHRcdFx0dmFyIHJlcyA9IFtdO1xuXHRcdFx0Zm9yICh2YXIgaSA9IDAsIGxlbiA9IHNyYy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuXHRcdFx0XHRyZXMucHVzaChjbG9uZShzcmNbaV0sIGNsZWFuKSk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gcmVzO1xuXHRcdGNhc2UgJ1VuZGVmaW5lZCc6XG5cdFx0Y2FzZSAnTnVsbCc6XG5cdFx0XHRyZXR1cm4gc3JjO1xuXHRcdGRlZmF1bHQ6XG5cdH1cbn1cblxuLyoqXG4gKiBDb252ZXJ0IGNvbnRleHQgdG8gcmF3IE9iamVjdDtcbiAqIEBhcGkgcHVibGljXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtjbGVhbl0gIGB0cnVlYCBpdCBuZWVkIHRvIGNsZWFuIG9iamVjdCBmcm9tIHJlZmVyZW5jZWQgVHlwZXMgZXhjZXB0IEZ1bmN0aW9uIGFuZCByYXcgT2JqZWN0KGpzIGhhc2gpXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKi9cbkNvbnRleHQucHJvdG90eXBlLnRvT2JqZWN0ID0gZnVuY3Rpb24oY2xlYW4pIHtcblx0dmFyIHNlbGYgPSB0aGlzO1xuXHR2YXIgb2JqID0ge307XG5cdGZvciAodmFyIHAgaW4gc2VsZikge1xuXHRcdGlmICghcmVzZXJ2ZWRbcF0pIHtcblx0XHRcdG9ialtwXSA9IGNsb25lKHNlbGZbcF0sIGNsZWFuKTtcblx0XHR9XG5cdH1cblx0cmV0dXJuIG9iajtcbn07XG5cbi8qKlxuICogQ29udGVydHMgY29udGV4dCB0byBKU09OXG4gKiBAYXBpIHB1YmxpY1xuICogQHJldHVybiB7U3RyaW5nfVxuICovXG5Db250ZXh0LnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbigpIHtcblx0dmFyIHNlbGYgPSB0aGlzO1xuXHQvLyBhbHdheXMgY2xlYW5pbmcgdGhlIG9iamVjdFxuXHRyZXR1cm4gSlNPTi5zdHJpbmdpZnkoc2VsZi50b09iamVjdCh0cnVlKSk7XG59O1xuLyohXG4gKiBleHBvcnRzXG4gKi9cbmV4cG9ydHMuQ29udGV4dCA9IENvbnRleHQ7IiwiLyohIFxuICogTW9kdWxlIGRlcGVuZGVuY3lcbiAqL1xudmFyIFN0YWdlID0gcmVxdWlyZSgnLi9zdGFnZScpLlN0YWdlO1xudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKS5VdGlsO1xuXG4vKipcbiAqIGl0IG1ha2UgcG9zc2libGUgdG8gY2hvb3NlIHdoaWNoIHN0YWdlIHRvIHJ1biBhY2NvcmRpbmcgdG8gcmVzdWx0IG9mIGBjb25kaXRpb25gIGV2YWx1YXRpb25cbiAqICMjIyBjb25maWcgYXMgX09iamVjdF9cbiAqXG4gKiAtIGBjb25kaXRpb25gXG4gKiBkZXNpY2lvbiBmdW5jdGlvbiBvciBib29sZWFuIGNvbmRpdGlvblxuICogdXNlZCB0byBkZWNpZGUgd2hhdCB3YXkgdG8gZ28uXG4gKlxuICogLSBgc3VjY2Vzc2BcbiAqIGBTdGFnZWAgb3Igc3RhZ2UgYGZ1bmN0aW9uYCB0byBydW4gaW4gY2FzZSBvZiBfc3VjY2Vzc2Z1bF8gZXZhbHVhdGlvbiBvZiBgY29uZGl0aW9uYFxuICpcbiAqIC0gYGZhaWxlZGBcbiAqIGBTdGFnZWAgb3Igc3RhZ2UgYGZ1bmN0aW9uYCB0byBydW4gaW4gY2FzZSBvZiBfZmFpbHVyZV8gZXZhbHVhdGlvbiBvZiBgY29uZGl0aW9uYFxuICpcbiAqIG90aGVyIGNvbmZndXJhdGlvbiBhcyBTdGFnZSBiZWNhdXNlIGl0IGlzIGl0cyBjaGlsZCBDbGFzcy5cbiAqXG4gKiBAcGFyYW0gY29uZmlnIE9iamVjdCBjb25maWd1cmF0aW9uIG9iamVjdFxuICovXG5mdW5jdGlvbiBJZkVsc2UoY29uZmlnKSB7XG5cblx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdGlmICghKHNlbGYgaW5zdGFuY2VvZiBJZkVsc2UpKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKCdjb25zdHJ1Y3RvciBpcyBub3QgYSBmdW5jdGlvbicpO1xuXHR9XG5cblx0aWYgKGNvbmZpZyAmJiBjb25maWcucnVuIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcblx0XHRjb25maWcuc3RhZ2UgPSBuZXcgU3RhZ2UoY29uZmlnLnJ1bik7XG5cdFx0ZGVsZXRlIGNvbmZpZy5ydW47XG5cdH1cblxuXHRTdGFnZS5hcHBseShzZWxmLCBhcmd1bWVudHMpO1xuXG5cdGlmICghY29uZmlnKSB7XG5cdFx0Y29uZmlnID0ge307XG5cdH1cblxuXHRpZiAoY29uZmlnLmNvbmRpdGlvbiBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG5cdFx0c2VsZi5jb25kaXRpb24gPSBjb25maWcuY29uZGl0aW9uO1xuXHR9XG5cblx0aWYgKGNvbmZpZy5zdWNjZXNzIGluc3RhbmNlb2YgU3RhZ2UpIHtcblx0XHRzZWxmLnN1Y2Nlc3MgPSBjb25maWcuc3VjY2Vzcztcblx0fSBlbHNlIHtcblx0XHRpZiAoY29uZmlnLnN1Y2Nlc3MgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuXHRcdFx0c2VsZi5zdWNjZXNzID0gbmV3IFN0YWdlKGNvbmZpZy5zdWNjZXNzKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0c2VsZi5zdWNjZXNzID0gbmV3IFN0YWdlKCk7XG5cdFx0fVxuXHR9XG5cblx0aWYgKGNvbmZpZy5mYWlsZWQgaW5zdGFuY2VvZiBTdGFnZSkge1xuXHRcdHNlbGYuZmFpbGVkID0gY29uZmlnLmZhaWxlZDtcblx0fSBlbHNlIHtcblx0XHRpZiAoY29uZmlnLmZhaWxlZCBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG5cdFx0XHRzZWxmLmZhaWxlZCA9IG5ldyBTdGFnZShjb25maWcuZmFpbGVkKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0c2VsZi5mYWlsZWQgPSBuZXcgU3RhZ2UoKTtcblx0XHR9XG5cdH1cblxuXHRzZWxmLm5hbWUgPSBjb25maWcubmFtZTtcbn1cblxuLyohXG4gKiBJbmhlcml0ZWQgZnJvbSBTdGFnZVxuICovXG51dGlsLmluaGVyaXRzKElmRWxzZSwgU3RhZ2UpO1xuXG4vKipcbiAqIGludGVybmFsIGRlY2xhcmF0aW9uIGZvIGBzdWNjZXNzYFxuICovXG5JZkVsc2UucHJvdG90eXBlLnN1Y2Nlc3MgPSB1bmRlZmluZWQ7XG5cbi8qKlxuICogaW50ZXJuYWwgZGVjbGFyYXRpb24gZm8gYGZhaWx1cmVgXG4gKi9cbklmRWxzZS5wcm90b3R5cGUuZmFpbHVyZSA9IHVuZGVmaW5lZDtcblxuLyoqXG4gKiBpbnRlcm5hbCBkZWNsYXJhdGlvbiBmbyBgY29uZGl0aW9uYFxuICovXG5JZkVsc2UucHJvdG90eXBlLmNvbmRpdGlvbiA9IGZ1bmN0aW9uKGN0eCkge1xuXHRyZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogb3ZlcnJpZGUgb2YgYHJlcG9ydE5hbWVgXG4gKiBAYXBpIHByb3RlY3RlZFxuICovXG5JZkVsc2UucHJvdG90eXBlLnJlcG9ydE5hbWUgPSBmdW5jdGlvbigpIHtcblx0dmFyIHNlbGYgPSB0aGlzO1xuXHRyZXR1cm4gXCJJRkVMU0U6XCIgKyBzZWxmLm5hbWU7XG59O1xuXG4vKipcbiAqIG92ZXJyaWRlIG9mIGNvbXBpbGVcbiAqIEBhcGkgcHJvdGVjdGVkXG4gKi9cbklmRWxzZS5wcm90b3R5cGUuY29tcGlsZSA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgc2VsZiA9IHRoaXM7XG5cdGlmICghc2VsZi5uYW1lKSB7XG5cdFx0c2VsZi5uYW1lID0gXCJzdWNjZXNzOiBcIiArIHNlbGYuc3VjY2Vzcy5yZXBvcnROYW1lKCkgKyBcIiBmYWlsdXJlOiBcIiArIHNlbGYuZmFpbGVkLnJlcG9ydE5hbWUoKTtcblx0fVxuXHR2YXIgcnVuID0gZnVuY3Rpb24oY3R4LCBkb25lKSB7XG5cdFx0aWYgKHNlbGYuY29uZGl0aW9uKGN0eCkpIHtcblx0XHRcdHNlbGYuc3VjY2Vzcy5leGVjdXRlKGN0eCwgZG9uZSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHNlbGYuZmFpbGVkLmV4ZWN1dGUoY3R4LCBkb25lKTtcblx0XHR9XG5cdH07XG5cdHNlbGYucnVuID0gcnVuO1xufTtcblxuLyoqXG4gKiBvdmVycmlkZSBvZiBleGVjdXRlXG4gKiBAYXBpIHByb3RlY3RlZFxuICovXG5JZkVsc2UucHJvdG90eXBlLmV4ZWN1dGUgPSBmdW5jdGlvbihjb250ZXh0LCBjYWxsYmFjaykge1xuXHR2YXIgc2VsZiA9IHRoaXM7XG5cdGlmICghc2VsZi5ydW4pIHtcblx0XHRzZWxmLmNvbXBpbGUoKTtcblx0fVxuXHRJZkVsc2Uuc3VwZXJfLnByb3RvdHlwZS5leGVjdXRlLmFwcGx5KHNlbGYsIGFyZ3VtZW50cyk7XG59O1xuXG4vKiFcbiAqIGV4cG9ydHNcbiAqL1xuZXhwb3J0cy5JZkVsc2UgPSBJZkVsc2U7IiwiLyohIFxuICogTW9kdWxlIGRlcGVuZGVuY3lcbiAqL1xuXG52YXIgU3RhZ2UgPSByZXF1aXJlKCcuL3N0YWdlJykuU3RhZ2U7XG52YXIgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpLlV0aWw7XG52YXIgRXJyb3JMaXN0ID0gcmVxdWlyZSgnLi91dGlsJykuRXJyb3JMaXN0O1xuXG4vKipcbiAqIEVhY2ggdGltZSBzcGxpdCBjb250ZXh0IGZvciBjdXJyZW50IHN0ZXAgYW5kIHVzZSBpdCBpbiBjdXJyZW50IHN0YWdlXG4gKiAjIyMgY29uZmlnIGFzIF9PYmplY3RfXG4gKlxuICogLSBgY29uZGl0aW9uYFxuICogZGVzaWNpb24gZnVuY3Rpb24gb3IgYm9vbGVhbiBjb25kaXRpb25cbiAqIHVzZWQgdG8gZGVjaWRlIHdoYXQgd2F5IHRvIGdvLlxuICpcbiAqIC0gYHN1Y2Nlc3NgXG4gKiBgU3RhZ2VgIG9yIHN0YWdlIGBmdW5jdGlvbmAgdG8gcnVuIGluIGNhc2Ugb2YgX3N1Y2Nlc3NmdWxfIGV2YWx1YXRpb24gb2YgYGNvbmRpdGlvbmBcbiAqXG4gKiAtIGBmYWlsZWRgXG4gKiBgU3RhZ2VgIG9yIHN0YWdlIGBmdW5jdGlvbmAgdG8gcnVuIGluIGNhc2Ugb2YgX2ZhaWx1cmVfIGV2YWx1YXRpb24gb2YgYGNvbmRpdGlvbmBcbiAqXG4gKiBvdGhlciBjb25mZ3VyYXRpb24gYXMgU3RhZ2UgYmVjYXVzZSBpdCBpcyBpdHMgY2hpbGQgQ2xhc3MuXG4gKlxuICogaWYgY2FzZXMgaGF2ZSBubyBkZWNsYXJhdGlvbiBmb3IgYHNwbGl0YCBjb25maWd1cmVkIG9yIGRlZmF1bHQgd2lsbCBiZSB1c2VkXG4gKlxuICogQHBhcmFtIGNvbmZpZyBPYmplY3QgY29uZmlndXJhdGlvbiBvYmplY3RcbiAqL1xuZnVuY3Rpb24gTXVsdGlXYXlTd2l0Y2goY29uZmlnKSB7XG5cblx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdGlmICghKHNlbGYgaW5zdGFuY2VvZiBNdWx0aVdheVN3aXRjaCkpIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ2NvbnN0cnVjdG9yIGlzIG5vdCBhIGZ1bmN0aW9uJyk7XG5cdH1cblxuXHRpZiAoY29uZmlnICYmIGNvbmZpZy5ydW4gaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuXHRcdGNvbmZpZy5zdGFnZSA9IG5ldyBTdGFnZShjb25maWcucnVuKTtcblx0XHRkZWxldGUgY29uZmlnLnJ1bjtcblx0fVxuXG5cdFN0YWdlLmFwcGx5KHNlbGYsIGFyZ3VtZW50cyk7XG5cblx0aWYgKCFjb25maWcpIHtcblx0XHRjb25maWcgPSB7fTtcblx0fVxuXG5cdGlmIChjb25maWcgaW5zdGFuY2VvZiBBcnJheSkge1xuXHRcdGNvbmZpZyA9IHtcblx0XHRcdGNhc2VzOiBjb25maWdcblx0XHR9O1xuXHR9XG5cdHNlbGYuY2FzZXMgPSBjb25maWcuY2FzZXMgPyBjb25maWcuY2FzZXMgOiBbXTtcblxuXHRpZiAoY29uZmlnLnNwbGl0IGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcblx0XHRzZWxmLnNwbGl0ID0gY29uZmlnLnNwbGl0O1xuXHR9XG5cblx0aWYgKGNvbmZpZy5jb21iaW5lIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcblx0XHRzZWxmLmNvbWJpbmUgPSBjb25maWcuY29tYmluZTtcblx0fVxuXG5cdHNlbGYubmFtZSA9IGNvbmZpZy5uYW1lO1xuXHRpZiAoIXNlbGYubmFtZSkge1xuXHRcdHNlbGYubmFtZSA9IFtdO1xuXHR9XG59XG5cbi8qIVxuICogSW5oZXJpdGVkIGZyb20gU3RhZ2VcbiAqL1xudXRpbC5pbmhlcml0cyhNdWx0aVdheVN3aXRjaCwgU3RhZ2UpO1xuXG4vKipcbiAqIGludGVybmFsIGRlY2xhcmF0aW9uIGZvIHN0b3JlIGRpZmZlcmVudCBgY2FzZXNgXG4gKiBAYXBpIHByb3RlY3RlZFxuICovXG5NdWx0aVdheVN3aXRjaC5wcm90b3R5cGUuY2FzZXMgPSB1bmRlZmluZWQ7XG5cbi8qKlxuICogZGVmYXVsdCBpbXBsZW1lbnRhdGlvbiBmbyBgc3BsaXRgIGZvciBgY2FzZWBcbiAqIEBhcGkgcHJvdGVjdGVkXG4gKiBAcGFyYW0gY3R4IENvbnRleHQgc291cmUgY29udGV4dCB0byBiZSBzcGxpdHRlZFxuICovXG5NdWx0aVdheVN3aXRjaC5wcm90b3R5cGUuc3BsaXQgPSBmdW5jdGlvbihjdHgpIHtcblx0cmV0dXJuIGN0eDtcbn07XG5cbi8qKlxuICogZGVmYXVsdCBpbXBsZW1lbnRhdGlvbiBmbyBgY29tYmluZWAgZm9yIGBjYXNlYFxuICogQGFwaSBwcm90ZWN0ZWRcbiAqIEBwYXJhbSBjdHggQ29udGV4dCBvcmlnaW5hbCBjb250ZWN0XG4gKiBAcGFyYW0gY3R4IENvbnRleHQgY2FzZS1zdGFnZSByZXN1bHRpbmcgY29udGV4dFxuICovXG5NdWx0aVdheVN3aXRjaC5wcm90b3R5cGUuY29tYmluZSA9IGZ1bmN0aW9uKGN0eCwgcmVzQ3R4KSB7XG5cdHJldHVybiByZXNDdHg7XG59O1xuXG4vKipcbiAqIGludGVybmFsIGRlY2xhcmF0aW9uIGZvIGByZXBvcnROYW1lYFxuICogQGFwaSBwcm90ZWN0ZWRcbiAqL1xuTXVsdGlXYXlTd2l0Y2gucHJvdG90eXBlLnJlcG9ydE5hbWUgPSBmdW5jdGlvbigpIHtcblx0dmFyIHNlbGYgPSB0aGlzO1xuXHRyZXR1cm4gXCJNV1M6XCIgKyBzZWxmLm5hbWU7XG59O1xuXG4vKipcbiAqIG92ZXJyaWRlcyBpbmhlcml0ZWQgYGNvbXBpbGVgXG4gKiBAYXBpIHByb3RlY3RlZFxuICovXG5NdWx0aVdheVN3aXRjaC5wcm90b3R5cGUuY29tcGlsZSA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgc2VsZiA9IHRoaXM7XG5cdHZhciBpO1xuXG5cdHZhciBsZW4gPSBzZWxmLmNhc2VzLmxlbmd0aDtcblx0dmFyIGNhc2VJdGVtO1xuXHR2YXIgc3RhdGljcyA9IFtdO1xuXHR2YXIgZHluYW1pY3MgPSBbXTtcblx0dmFyIG5hbWVVbmRlZmluZWQgPSAoQXJyYXkuaXNBcnJheShzZWxmLm5hbWUpIHx8ICFzZWxmLm5hbWUpO1xuXHRpZiAobmFtZVVuZGVmaW5lZCkge1xuXHRcdHNlbGYubmFtZSA9IFtdO1xuXHR9XG5cblx0Ly8gQXBwbHkgdG8gZWFjaCBzdGFnZSBvd24gZW52aXJvbm1lbnQ6IGV2YWx1YXRlLCBzcGxpdCwgY29tYmluZVxuXHRmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcblx0XHRjYXNlSXRlbSA9IHNlbGYuY2FzZXNbaV07XG5cdFx0aWYgKGNhc2VJdGVtIGluc3RhbmNlb2YgU3RhZ2UpIHtcblx0XHRcdGNhc2VJdGVtID0ge1xuXHRcdFx0XHRzdGFnZTogY2FzZUl0ZW0sXG5cdFx0XHRcdGV2YWx1YXRlOiB0cnVlXG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdGlmIChjYXNlSXRlbS5zdGFnZSkge1xuXHRcdFx0aWYgKGNhc2VJdGVtLnN0YWdlIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcblx0XHRcdFx0Y2FzZUl0ZW0uc3RhZ2UgPSBuZXcgU3RhZ2UoY2FzZUl0ZW0uc3RhZ2UpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKCEoY2FzZUl0ZW0uc3RhZ2UgaW5zdGFuY2VvZiBTdGFnZSkgJiYgKGNhc2VJdGVtLnN0YWdlIGluc3RhbmNlb2YgT2JqZWN0KSkge1xuXHRcdFx0XHRjYXNlSXRlbS5zdGFnZSA9IG5ldyBTdGFnZShjYXNlSXRlbS5zdGFnZSk7XG5cdFx0XHR9XG5cdFx0XHRpZiAoIShjYXNlSXRlbS5zcGxpdCBpbnN0YW5jZW9mIEZ1bmN0aW9uKSkge1xuXHRcdFx0XHRjYXNlSXRlbS5zcGxpdCA9IHNlbGYuc3BsaXQ7XG5cdFx0XHR9XG5cdFx0XHRpZiAoIShjYXNlSXRlbS5jb21iaW5lIGluc3RhbmNlb2YgRnVuY3Rpb24pKSB7XG5cdFx0XHRcdGNhc2VJdGVtLmNvbWJpbmUgPSBzZWxmLmNvbWJpbmU7XG5cdFx0XHR9XG5cdFx0XHRpZiAodHlwZW9mIGNhc2VJdGVtLmV2YWx1YXRlID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRcdGR5bmFtaWNzLnB1c2goY2FzZUl0ZW0pO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0aWYgKHR5cGVvZiBjYXNlSXRlbS5ldmFsdWF0ZSA9PT0gJ2Jvb2xlYW4nICYmIGNhc2VJdGVtLmV2YWx1YXRlKSB7XG5cdFx0XHRcdFx0c3RhdGljcy5wdXNoKGNhc2VJdGVtKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0XHRpZiAobmFtZVVuZGVmaW5lZCkge1xuXHRcdFx0c2VsZi5uYW1lLnB1c2goY2FzZUl0ZW0uc3RhZ2UucmVwb3J0TmFtZSgpKTtcblx0XHR9XG5cdH1cblxuXHRpZiAobmFtZVVuZGVmaW5lZCkgc2VsZi5uYW1lID0gc2VsZi5uYW1lLmpvaW4oJ3wnKTtcblxuXHR2YXIgcnVuID0gZnVuY3Rpb24oZXJyLCBjdHgsIGRvbmUpIHtcblx0XHR2YXIgaTtcblx0XHR2YXIgbGVuID0gZHluYW1pY3MubGVuZ3RoO1xuXHRcdHZhciBhY3R1YWxzID0gW107XG5cdFx0YWN0dWFscy5wdXNoLmFwcGx5KGFjdHVhbHMsIHN0YXRpY3MpO1xuXG5cdFx0Zm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG5cdFx0XHRpZiAoZHluYW1pY3NbaV0uZXZhbHVhdGUoY3R4KSkge1xuXHRcdFx0XHRhY3R1YWxzLnB1c2goZHluYW1pY3NbaV0pO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRsZW4gPSBhY3R1YWxzLmxlbmd0aDtcblx0XHR2YXIgaXRlciA9IDA7XG5cblx0XHR2YXIgZXJyb3JzID0gW107XG5cblx0XHRmdW5jdGlvbiBmaW5pc2goKSB7XG5cdFx0XHRpZiAoZXJyb3JzLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0ZG9uZShuZXcgRXJyb3JMaXN0KGVycm9ycykpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0ZG9uZSgpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRcblx0XHR2YXIgbmV4dCA9IGZ1bmN0aW9uKGluZGV4KSB7XG5cblx0XHRcdGZ1bmN0aW9uIGxvZ0Vycm9yKGVycikge1xuXHRcdFx0XHRlcnJvcnMucHVzaCh7XG5cdFx0XHRcdFx0aW5kZXg6IGluZGV4LFxuXHRcdFx0XHRcdGVycjogZXJyXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gZnVuY3Rpb24oZXJyLCByZXRDdHgpIHtcblx0XHRcdFx0aXRlcisrO1xuXHRcdFx0XHR2YXIgY3VyID0gYWN0dWFsc1tpbmRleF07XG5cdFx0XHRcdGlmIChlcnIpIHtcblx0XHRcdFx0XHRsb2dFcnJvcihlcnIpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGN1ci5jb21iaW5lKGN0eCwgcmV0Q3R4KTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoaXRlciA+PSBsZW4pIHtcblx0XHRcdFx0XHRmaW5pc2goKTtcblx0XHRcdFx0fVxuXHRcdFx0fTtcblx0XHR9O1xuXHRcdHZhciBzdGc7XG5cdFx0Zm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG5cdFx0XHRzdGcgPSBhY3R1YWxzW2ldO1xuXHRcdFx0c3RnLnN0YWdlLmV4ZWN1dGUoY3R4LmVuc3VyZUlzQ2hpbGQoc3RnLnNwbGl0KGN0eCkpLCBuZXh0KGkpKTtcblx0XHR9XG5cblx0XHRpZiAobGVuID09PSAwKSB7XG5cdFx0XHRmaW5pc2goKTtcblx0XHR9XG5cdH07XG5cdHNlbGYucnVuID0gcnVuO1xufTtcblxuLyoqXG4gKiBvdmVycmlkZSBvZiBleGVjdXRlXG4gKiAhISFOb3RlISEhIEVycm9ycyB0aGF0IHdpbGwgYmUgcmV0dXJuZWQgdG8gY2FsbGJhY2sgd2lsbCBiZSBzdG9yZWQgaW4gYXJyYXlcbiAqIEBhcGkgcHJvdGVjdGVkXG4gKiBAcGFyYW0gY29udGV4dCBDb250ZXh0IGV4ZWN1dGluZyBDb250ZXh0XG4gKiBAcGFyYW0gW2NhbGxiYWNrXSBmdW5jdGlvbiBpZiBpdCBpcyBzcGVjaWZpZWQgdGhlIGl0IHdpbGwgYmUgdXNlZCB0byByZXR1cm4gcmVzdWx0aW5nIGNvbnRleHQgb3IgZXJyb3JcbiAqL1xuTXVsdGlXYXlTd2l0Y2gucHJvdG90eXBlLmV4ZWN1dGUgPSBmdW5jdGlvbihjb250ZXh0LCBjYWxsYmFjaykge1xuXHR2YXIgc2VsZiA9IHRoaXM7XG5cdGlmICghc2VsZi5ydW4pIHtcblx0XHRzZWxmLmNvbXBpbGUoKTtcblx0fVxuXHRNdWx0aVdheVN3aXRjaC5zdXBlcl8ucHJvdG90eXBlLmV4ZWN1dGUuYXBwbHkoc2VsZiwgYXJndW1lbnRzKTtcbn07XG5cbi8qIVxuICogZXhwb3J0c1xuICovXG5leHBvcnRzLk11bHRpV2F5U3dpdGNoID0gTXVsdGlXYXlTd2l0Y2g7IiwiLyohIFxuICogTW9kdWxlIGRlcGVuZGVuY3lcbiAqL1xudmFyIFN0YWdlID0gcmVxdWlyZSgnLi9zdGFnZScpLlN0YWdlO1xudmFyIENvbnRleHQgPSByZXF1aXJlKCcuL2NvbnRleHQnKS5Db250ZXh0O1xudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKS5VdGlsO1xudmFyIEVycm9yTGlzdCA9IHJlcXVpcmUoJy4vdXRpbCcpLkVycm9yTGlzdDtcblxuLyoqXG4gKiBQcm9jZXNzIHN0YWdpbmcgaW4gcGFyYWxsZWwgd2F5XG4gKiAjIyMgY29uZmlnIGFzIF9PYmplY3RfXG4gKlxuICogLSBgc3RhZ2VgIGV2YWx1YXRpbmcgc3RhZ2VcbiAqIC0gYHNwbGl0YCBmdW5jdGlvbiB0aGF0IHNwbGl0IGV4aXN0aW5nIHN0YWdlIGludG8gc21hbGxzIHBhcnRzLCBpdCBuZWVkZWRcbiAqIC0gYGNvbWJpbmVgIGlmIGFueSByZXN1bHQgY29tYmluaW5nIGlzIG5lZWQsIHRoaXMgY2FuIGJlIHVzZWQgdG8gY29tYmluZSBzcGxpdGVkIHBhcnRzIGFuZCB1cGRhdGUgY29udGV4dFxuICpcbiAqICEhIU5vdGUhISFTcGxpdCBkb2VzIG5vdCByZXF1aXJlIGNvbWJpbmUgLS0tIGIvYyBpdCB3aWxsIHJldHVybiBwYXJlbnQgY29udGV4dDtcbiAqIGlmIGNhc2VzIGhhdmUgbm8gZGVjbGFyYXRpb24gZm9yIGBzcGxpdGAgY29uZmlndXJlZCBvciBkZWZhdWx0IHdpbGwgYmUgdXNlZFxuICpcbiAqIEBwYXJhbSBjb25maWcgT2JqZWN0IGNvbmZpZ3VyYXRpb24gb2JqZWN0XG4gKi9cbmZ1bmN0aW9uIFBhcmFsbGVsKGNvbmZpZykge1xuXG5cdHZhciBzZWxmID0gdGhpcztcblxuXHRpZiAoIShzZWxmIGluc3RhbmNlb2YgUGFyYWxsZWwpKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKCdjb25zdHJ1Y3RvciBpcyBub3QgYSBmdW5jdGlvbicpO1xuXHR9XG5cblx0aWYgKGNvbmZpZyAmJiBjb25maWcucnVuIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcblx0XHRjb25maWcuc3RhZ2UgPSBuZXcgU3RhZ2UoY29uZmlnLnJ1bik7XG5cdFx0ZGVsZXRlIGNvbmZpZy5ydW47XG5cdH1cblxuXHRTdGFnZS5hcHBseShzZWxmLCBhcmd1bWVudHMpO1xuXG5cdGlmICghY29uZmlnKSB7XG5cdFx0Y29uZmlnID0ge307XG5cdH1cblxuXHRpZiAoY29uZmlnIGluc3RhbmNlb2YgU3RhZ2UpIHtcblx0XHRjb25maWcgPSB7XG5cdFx0XHRzdGFnZTogY29uZmlnXG5cdFx0fTtcblx0fVxuXG5cdGlmIChjb25maWcuc3RhZ2UgaW5zdGFuY2VvZiBTdGFnZSkge1xuXHRcdHNlbGYuc3RhZ2UgPSBjb25maWcuc3RhZ2U7XG5cdH0gZWxzZSB7XG5cdFx0aWYgKGNvbmZpZy5zdGFnZSBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG5cdFx0XHRzZWxmLnN0YWdlID0gbmV3IFN0YWdlKGNvbmZpZy5zdGFnZSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHNlbGYuc3RhZ2UgPSBuZXcgU3RhZ2UoKTtcblx0XHR9XG5cdH1cblxuXHRpZiAoY29uZmlnLnNwbGl0IGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcblx0XHRzZWxmLnNwbGl0ID0gY29uZmlnLnNwbGl0O1xuXHR9XG5cblx0aWYgKGNvbmZpZy5jb21iaW5lIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcblx0XHRzZWxmLmNvbWJpbmUgPSBjb25maWcuY29tYmluZTtcblx0fVxuXG5cdHNlbGYubmFtZSA9IGNvbmZpZy5uYW1lO1xufVxuXG4vKiFcbiAqIEluaGVyaXRlZCBmcm9tIFN0YWdlXG4gKi9cbnV0aWwuaW5oZXJpdHMoUGFyYWxsZWwsIFN0YWdlKTtcblxuLyoqXG4gKiBpbnRlcm5hbCBkZWNsYXJhdGlvbiBmbyBgc3VjY2Vzc2BcbiAqL1xuUGFyYWxsZWwucHJvdG90eXBlLnN0YWdlID0gdW5kZWZpbmVkO1xuXG4vKipcbiAqIGludGVybmFsIGRlY2xhcmF0aW9uIGZvIGBzdWNjZXNzYFxuICovXG5QYXJhbGxlbC5wcm90b3R5cGUuc3BsaXQgPSBmdW5jdGlvbihjdHgpIHtcblx0cmV0dXJuIFtjdHhdO1xufTtcblxuLyoqXG4gKiBpbnRlcm5hbCBkZWNsYXJhdGlvbiBmbyBgY29tYmluZWBcbiAqIEBwYXJhbSBjdHggQ29udGV4dCBtYWluIGNvbnRleHRcbiAqIEBwYXJhbSBjaGlsZHJlbiBDb250ZXh0W10gbGlzdCBvZiBhbGwgY2hpbGRyZW4gY29udGV4dHNcbiAqL1xuUGFyYWxsZWwucHJvdG90eXBlLmNvbWJpbmUgPSBmdW5jdGlvbihjdHgsIGNoaWxkcmVuKSB7XG59O1xuXG4vKipcbiAqIG92ZXJyaWRlIG9mIGByZXBvcnROYW1lYFxuICogQGFwaSBwcm90ZWN0ZWRcbiAqL1xuUGFyYWxsZWwucHJvdG90eXBlLnJlcG9ydE5hbWUgPSBmdW5jdGlvbigpIHtcblx0dmFyIHNlbGYgPSB0aGlzO1xuXHRyZXR1cm4gXCJQTEw6XCIgKyBzZWxmLm5hbWU7XG59O1xuXG4vKipcbiAqIG92ZXJyaWRlIG9mIGNvbXBpbGVcbiAqIHNwbGl0IGFsbCBhbmQgcnVuIGFsbFxuICogQGFwaSBwcm90ZWN0ZWRcbiAqL1xuUGFyYWxsZWwucHJvdG90eXBlLmNvbXBpbGUgPSBmdW5jdGlvbigpIHtcblx0dmFyIHNlbGYgPSB0aGlzO1xuXHRpZiAoIXNlbGYubmFtZSkge1xuXHRcdHNlbGYubmFtZSA9IHNlbGYuc3RhZ2UucmVwb3J0TmFtZSgpO1xuXHR9XG5cdHZhciBydW4gPSBmdW5jdGlvbihlcnIsIGN0eCwgZG9uZSkge1xuXHRcdHZhciBpdGVyID0gMDtcblx0XHR2YXIgY2hpbGRyZW4gPSBzZWxmLnNwbGl0KGN0eCk7XG5cdFx0dmFyIGxlbiA9IGNoaWxkcmVuID8gY2hpbGRyZW4ubGVuZ3RoIDogMDtcblx0XHR2YXIgZXJyb3JzID0gW107XG5cblx0XHRmdW5jdGlvbiBmaW5pc2goKSB7XG5cdFx0XHRpZiAoZXJyb3JzLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0ZG9uZShuZXcgRXJyb3JMaXN0KGVycm9ycykpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0c2VsZi5jb21iaW5lKGN0eCwgY2hpbGRyZW4pO1xuXHRcdFx0XHRkb25lKCk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gbG9nRXJyb3IoZXJyLCBpbmRleCkge1xuXHRcdFx0ZXJyb3JzLnB1c2goe1xuXHRcdFx0XHRzdGFnZTogc2VsZi5uYW1lLFxuXHRcdFx0XHRpbmRleDogaW5kZXgsXG5cdFx0XHRcdGVycjogZXJyLFxuXHRcdFx0XHRzdGFjazogZXJyLnN0YWNrLFxuXHRcdFx0XHRjdHg6IGNoaWxkcmVuW2luZGV4XVxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0dmFyIG5leHQgPSBmdW5jdGlvbihpbmRleCkge1xuXHRcdFx0cmV0dXJuIGZ1bmN0aW9uKGVyciwgcmV0Q3R4KSB7XG5cdFx0XHRcdGl0ZXIrKztcblx0XHRcdFx0aWYgKGVycikge1xuXHRcdFx0XHRcdGxvZ0Vycm9yKGVyciwgaW5kZXgpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGNoaWxkcmVuW2luZGV4XSA9IHJldEN0eDtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoaXRlciA+PSBsZW4pIHtcblx0XHRcdFx0XHRmaW5pc2goKTtcblx0XHRcdFx0fVxuXHRcdFx0fTtcblx0XHR9O1xuXG5cdFx0aWYgKGxlbiA9PT0gMCkge1xuXHRcdFx0ZmluaXNoKCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcblx0XHRcdFx0c2VsZi5zdGFnZS5leGVjdXRlKGN0eC5lbnN1cmVJc0NoaWxkKGNoaWxkcmVuW2ldKSwgbmV4dChpKSk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9O1xuXHRzZWxmLnJ1biA9IHJ1bjtcbn07XG5cbi8qKlxuICogb3ZlcnJpZGUgb2YgZXhlY3V0ZVxuICogQGFwaSBwcm90ZWN0ZWRcbiAqL1xuUGFyYWxsZWwucHJvdG90eXBlLmV4ZWN1dGUgPSBmdW5jdGlvbihjb250ZXh0LCBjYWxsYmFjaykge1xuXHR2YXIgc2VsZiA9IHRoaXM7XG5cdGlmICghc2VsZi5ydW4pIHtcblx0XHRzZWxmLmNvbXBpbGUoKTtcblx0fVxuXHRQYXJhbGxlbC5zdXBlcl8ucHJvdG90eXBlLmV4ZWN1dGUuYXBwbHkoc2VsZiwgYXJndW1lbnRzKTtcbn07XG5cbi8qIVxuICogZXhwb3J0c1xuICovXG5leHBvcnRzLlBhcmFsbGVsID0gUGFyYWxsZWw7IiwiLyohXG4gKiBNb2R1bGUgZGVwZW5kZW5jeVxuICovXG52YXIgU3RhZ2UgPSByZXF1aXJlKCcuL3N0YWdlJykuU3RhZ2U7XG52YXIgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbC5qcycpLlV0aWw7XG5cbi8qKlxuICogaXQgbWFrZSBwb3NzaWJsZSB0byBjaG9vc2Ugd2hpY2ggc3RhZ2UgdG8gcnVuIGFjY29yZGluZyB0byByZXN1bHQgb2YgYGNvbmRpdGlvbmAgZXZhbHVhdGlvblxuICogY29uZmlnIGFzIGBGdW5jdGlvbmAgLS0tIGZpcnN0IFN0YWdlIGZvciBwaXBlbGluZVxuICogY29uZmlnIGFzIGBTdGFnZWAgLS0tIGZpcnN0IFN0YWdlIFxuICogY29uZmlnIGFzIGBBcnJheWAgLS0tIGxpc3Qgb2Ygc3RhZ2VzXG4gKiBjb25maWcgYXMgYE9iamVjdGAgLS0tIGNvbmZpZyBmb3IgUGlwZWxpbmVcbiAqIGNvbmZpZyBhcyBgRW1wdHlgIC0tLSBlbXB0eSBwaXBlbGluZVxuICogXG4gKiAjIyMgY29uZmlnIGFzIF9PYmplY3RfXG4gKlxuICogLSBgc3RhZ2VzYCBsaXN0IG9mIHN0YWdlc1xuICpcbiAqIC0gYG5hbWVgIG5hbWUgb2YgcGlwZWxpbmVcbiAqXG4gKiBvdGhlciBjb25mZ3VyYXRpb24gYXMgU3RhZ2UgYmVjYXVzZSBpdCBpcyBpdHMgY2hpbGQgQ2xhc3MuXG4gKiBcbiAqIEBwYXJhbSBjb25maWcgT2JqZWN0IGNvbmZpZ3VyYXRpb24gb2JqZWN0XG4gKi9cbmZ1bmN0aW9uIFBpcGVsaW5lKGNvbmZpZykge1xuXG5cdHZhciBzZWxmID0gdGhpcztcblxuXHRpZiAoIShzZWxmIGluc3RhbmNlb2YgUGlwZWxpbmUpKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKCdjb25zdHJ1Y3RvciBpcyBub3QgYSBmdW5jdGlvbicpO1xuXHR9XG5cblx0c2VsZi5zdGFnZXMgPSBbXTtcblx0dmFyIHN0YWdlcyA9IFtdO1xuXG5cdGlmIChjb25maWcpIHtcblxuXHRcdGlmIChjb25maWcucnVuIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcblx0XHRcdGNvbmZpZy5zdGFnZSA9IG5ldyBTdGFnZShjb25maWcucnVuKTtcblx0XHRcdGRlbGV0ZSBjb25maWcucnVuO1xuXHRcdH1cblxuXHRcdGlmIChBcnJheS5pc0FycmF5KGNvbmZpZy5zdGFnZXMpKSB7XG5cdFx0XHRzdGFnZXMucHVzaC5hcHBseShzdGFnZXMsIGNvbmZpZy5zdGFnZXMpO1xuXHRcdFx0ZGVsZXRlIGNvbmZpZy5zdGFnZXM7XG5cdFx0fVxuXG5cdFx0aWYgKGNvbmZpZyBpbnN0YW5jZW9mIEFycmF5KSB7XG5cdFx0XHRzdGFnZXMucHVzaC5hcHBseShzdGFnZXMsIGNvbmZpZyk7XG5cdFx0fVxuXG5cdFx0aWYgKHR5cGVvZihjb25maWcucnVuKSA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0c3RhZ2VzLnB1c2goY29uZmlnLnJ1bik7XG5cdFx0XHR2YXIgc3RnID0gY29uZmlnLnJ1bjtcblx0XHRcdGRlbGV0ZSBjb25maWcucnVuO1xuXHRcdH1cblxuXHRcdGlmICh0eXBlb2YoY29uZmlnKSBpbnN0YW5jZW9mIFN0YWdlKSB7XG5cdFx0XHRzdGFnZXMucHVzaChjb25maWcpO1xuXHRcdH1cblxuXHRcdGlmICh0eXBlb2YoY29uZmlnKSA9PT0gJ29iamVjdCcpIHtcblx0XHRcdFN0YWdlLmNhbGwoc2VsZiwgY29uZmlnKTtcblx0XHR9XG5cdFx0aWYgKHR5cGVvZihjb25maWcpID09PSAnc3RyaW5nJykge1xuXHRcdFx0U3RhZ2UuY2FsbChzZWxmKTtcblx0XHRcdHNlbGYubmFtZSA9IGNvbmZpZztcblx0XHR9XG5cblx0fSBlbHNlIHtcblx0XHRTdGFnZS5jYWxsKHNlbGYpO1xuXHR9XG5cblx0aWYgKGNvbmZpZyAmJiBjb25maWcubmFtZSkge1xuXHRcdHNlbGYubmFtZSA9IGNvbmZpZy5uYW1lO1xuXHR9XG5cblx0aWYgKCFzZWxmLm5hbWUpIHtcblx0XHRzZWxmLm5hbWUgPSBbXTtcblx0fVxuXG5cdHZhciBsZW4gPSBzdGFnZXMubGVuZ3RoO1xuXHRmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG5cdFx0c2VsZi5hZGRTdGFnZShzdGFnZXNbaV0pO1xuXHR9XG59XG5cbi8qIVxuICogSW5oZXJpdGVkIGZyb20gU3RhZ2VcbiAqL1xudXRpbC5pbmhlcml0cyhQaXBlbGluZSwgU3RhZ2UpO1xuXG4vKipcbiAqIGludGVybmFsIGRlY2xhcmF0aW9uIGZvciBzdGFnZSBzdG9yZVxuICovXG5QaXBlbGluZS5wcm90b3R5cGUuc3RhZ2VzID0gdW5kZWZpbmVkO1xuXG4vKipcbiAqIG92ZXJyaWRlIG9mIGByZXBvcnROYW1lYFxuICogQGFwaSBwcm90ZWN0ZWRcbiAqL1xuUGlwZWxpbmUucHJvdG90eXBlLnJlcG9ydE5hbWUgPSBmdW5jdGlvbigpIHtcblx0dmFyIHNlbGYgPSB0aGlzO1xuXHRyZXR1cm4gXCJQSVBFOlwiICsgc2VsZi5uYW1lO1xufTtcblxuLyoqXG4gKiBhZGQgU3RhZ2VzIHRvIFBpcGVsaW5lXG4gKiBpdCByZXNldCBydW4gbWV0aG9kIHRvIGNvbXBpbGUgaXQgYWdhaW5cbiAqIEBhcGkgcHVibGljXG4gKiBAcGFyYW0gc3RhZ2UgbmV3IFN0YWdlIHRvIGV2YWx1YXRlIGluIHBpcGVsaW5lXG4gKi9cblBpcGVsaW5lLnByb3RvdHlwZS5hZGRTdGFnZSA9IGZ1bmN0aW9uKHN0YWdlKSB7XG5cdHZhciBzZWxmID0gdGhpcztcblx0dmFyIGVtcHR5ID0gZmFsc2U7XG5cdGlmICghKHN0YWdlIGluc3RhbmNlb2YgU3RhZ2UpKSB7XG5cdFx0aWYgKHR5cGVvZihzdGFnZSkgPT09ICdmdW5jdGlvbicpIHtcblx0XHRcdHN0YWdlID0gbmV3IFN0YWdlKHN0YWdlKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0aWYgKHR5cGVvZihzdGFnZSkgPT09ICdvYmplY3QnKSB7XG5cdFx0XHRcdHN0YWdlID0gbmV3IFN0YWdlKHN0YWdlKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGVtcHR5ID0gdHJ1ZTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblx0aWYgKCFlbXB0eSkge1xuXHRcdHNlbGYuc3RhZ2VzLnB1c2goc3RhZ2UpO1xuXHRcdGlmIChzZWxmLnJ1bikge1xuXHRcdFx0Ly9yZXNldCBydW4gbWV0aG9kXG5cdFx0XHRzZWxmLnJ1biA9IDA7XG5cdFx0fVxuXHR9XG59O1xuXG4vKipcbiAqIG92ZXJyaWRlIG9mIGNvbXBpbGVcbiAqIHJ1biBkaWZmZXJlbnQgc3RhZ2VzIG9uZSBhZnRlciBhbm90aGVyIG9uZVxuICogQGFwaSBwcm90ZWN0ZWRcbiAqL1xuUGlwZWxpbmUucHJvdG90eXBlLmNvbXBpbGUgPSBmdW5jdGlvbigpIHtcblx0dmFyIHNlbGYgPSB0aGlzO1xuXHR2YXIgbGVuID0gc2VsZi5zdGFnZXMubGVuZ3RoO1xuXHR2YXIgbmFtZVVuZGVmaW5lZCA9IChBcnJheS5pc0FycmF5KHNlbGYubmFtZSkgfHwgIXNlbGYubmFtZSk7XG5cdGlmIChuYW1lVW5kZWZpbmVkKSB7XG5cdFx0c2VsZi5uYW1lID0gc2VsZi5zdGFnZXMubWFwKGZ1bmN0aW9uKHN0KSB7XG5cdFx0XHRyZXR1cm4gc3QucmVwb3J0TmFtZSgpO1xuXHRcdH0pLmpvaW4oJy0+Jyk7XG5cdH1cblxuXHR2YXIgcnVuID0gZnVuY3Rpb24oY29udGV4dCwgZG9uZSkge1xuXHRcdHZhciBpID0gLTE7XG5cdFx0dmFyIHN0bGVuID0gbGVuOyAvLyBoYWNrIHRvIGF2b2lkIHVwcGVyIGNvbnRleHQgc2VhcmNoO1xuXHRcdHZhciBzdExpc3QgPSBzZWxmLnN0YWdlczsgLy8gdGhlIHNhbWUgaGFja1xuXHRcdC8vc2VxdWVudGlhbCBydW47XG5cdFx0dmFyIG5leHQgPSBmdW5jdGlvbihlcnIsIGNvbnRleHQpIHtcblx0XHRcdGlmICgrK2kgPj0gc3RsZW4gfHwgZXJyKSB7XG5cdFx0XHRcdGlmICghZXJyICYmIGkgPiBzdGxlbikge1xuXHRcdFx0XHRcdGVyciA9IG5ldyBFcnJvcignIHRoZSBtZXRob2QgXFwnZG9uZVxcJyBvZiBwaXBlbGluZSBpcyBjYWxsZWQgbW9yZSB0aGF0IG9uZXMnKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRkb25lKGVycik7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRzdExpc3RbaV0uZXhlY3V0ZShjb250ZXh0LCBuZXh0KTtcblx0XHRcdH1cblx0XHR9O1xuXHRcdG5leHQobnVsbCwgY29udGV4dCk7XG5cdH07XG5cblx0aWYgKGxlbiA+IDApIHtcblx0XHRzZWxmLnJ1biA9IHJ1bjtcblx0fSBlbHNlIHtcblx0XHRzZWxmLnJ1biA9IGZ1bmN0aW9uKCkge307XG5cdH1cbn07XG5cbi8qKlxuICogb3ZlcnJpZGUgb2YgZXhlY3V0ZVxuICogQGFwaSBwcm90ZWN0ZWRcbiAqL1xuUGlwZWxpbmUucHJvdG90eXBlLmV4ZWN1dGUgPSBmdW5jdGlvbihjb250ZXh0LCBjYWxsYmFjaykge1xuXHR2YXIgc2VsZiA9IHRoaXM7XG5cdGlmICghc2VsZi5ydW4pIHtcblx0XHRzZWxmLmNvbXBpbGUoKTtcblx0fVxuXHRQaXBlbGluZS5zdXBlcl8ucHJvdG90eXBlLmV4ZWN1dGUuYXBwbHkoc2VsZiwgYXJndW1lbnRzKTtcbn07XG5cbi8qIVxuICogZXhwb3J0c1xuICovXG5leHBvcnRzLlBpcGVsaW5lID0gUGlwZWxpbmU7IiwiLyohXG4gKiBNb2R1bGUgZGVwZW5kZW5jeVxuICovXG52YXIgQ29udGV4dCA9IHJlcXVpcmUoJy4vY29udGV4dCcpLkNvbnRleHQ7XG52YXIgU3RhZ2UgPSByZXF1aXJlKCcuL3N0YWdlJykuU3RhZ2U7XG52YXIgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpLlV0aWw7XG5cbi8qKlxuICogUmV0cmllcyB0byBydW4sIGlmIGVycm9yIG9jY3VyZXMgc3BlY2lmaWVkIG51bWJlciBvZiB0aW1lc1xuICogIyMjIGNvbmZpZyBhcyBfT2JqZWN0X1xuICpcbiAqIC0gYHN0YWdlYCBldmFsdWF0aW5nIHN0YWdlXG4gKlxuICogLSBgcmV0cnlgIG51bWJlciB0aGF0IGxpbWl0cyBudW1iZXIgb2YgcmV0cmllc1xuICpcbiAqIC0gYHJldHJ5YCBGdW5jdGlvbiB0aGF0IGRlY2lkZSBlaXRoZXIgdG8gcnVuIG9yIHRvIHN0b3AgdHJ5aW5nXG4gKlxuICogQHBhcmFtIGNvbmZpZyBPYmplY3QgY29uZmlndXJhdGlvbiBvYmplY3RcbiAqL1xuZnVuY3Rpb24gUmV0cnlPbkVycm9yKGNvbmZpZykge1xuXG5cdHZhciBzZWxmID0gdGhpcztcblxuXHRpZiAoIShzZWxmIGluc3RhbmNlb2YgUmV0cnlPbkVycm9yKSkge1xuXHRcdHRocm93IG5ldyBFcnJvcignY29uc3RydWN0b3IgaXMgbm90IGEgZnVuY3Rpb24nKTtcblx0fVxuXG5cdGlmIChjb25maWcgJiYgY29uZmlnLnJ1biBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG5cdFx0Y29uZmlnLnN0YWdlID0gbmV3IFN0YWdlKGNvbmZpZy5ydW4pO1xuXHRcdGRlbGV0ZSBjb25maWcucnVuO1xuXHR9XG5cblx0U3RhZ2UuYXBwbHkoc2VsZiwgYXJndW1lbnRzKTtcblxuXHRpZiAoY29uZmlnLnN0YWdlIGluc3RhbmNlb2YgU3RhZ2UpIHtcblx0XHRzZWxmLnN0YWdlID0gY29uZmlnLnN0YWdlO1xuXHR9IGVsc2UgaWYgKGNvbmZpZy5zdGFnZSBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG5cdFx0c2VsZi5zdGFnZSA9IG5ldyBTdGFnZShjb25maWcuc3RhZ2UpO1xuXHR9IGVsc2Uge1xuXHRcdHNlbGYuc3RhZ2UgPSBuZXcgU3RhZ2UoKTtcblx0fVxuXG5cdGlmIChjb25maWcpIHtcblx0XHRpZiAoY29uZmlnLnJldHJ5KSB7XG5cdFx0XHQvLyBmdW5jdGlvbiwgY291bnRcblx0XHRcdGlmICh0eXBlb2YgY29uZmlnLnJldHJ5ICE9PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRcdGNvbmZpZy5yZXRyeSAqPSAxOyAvLyBUbyBnZXQgTmFOIGlzIHdyb25nIHR5cGVcblx0XHRcdH1cblx0XHRcdGlmIChjb25maWcucmV0cnkpXG5cdFx0XHRcdHNlbGYucmV0cnkgPSBjb25maWcucmV0cnk7XG5cdFx0fVxuXHR9IGVsc2Uge1xuXHRcdHNlbGYucmV0cnkgPSAxO1xuXHR9XG59XG5cbi8qIVxuICogSW5oZXJpdGVkIGZyb20gU3RhZ2VcbiAqL1xudXRpbC5pbmhlcml0cyhSZXRyeU9uRXJyb3IsIFN0YWdlKTtcblxuLyoqXG4gKiBpbnRlcm5hbCBkZWNsYXJhdGlvbiBmbyBgY29tYmluZWBcbiAqIEBwYXJhbSBlcnIgRXJyb3J8T2JqZWN0fGFueSBlcnJvciB0aGF0IGlzIGV4YW1pbmVkXG4gKiBAcGFyYW0gY3R4IENvbnRleHQgbWFpbiBjb250ZXh0XG4gKiBAcGFyYW0gaXRlciBOdW1iZXIgY3VycmVudCBpdGVyYXRpb246IDAgaXMgdGhlIHJ1biwgYnV0IDEuLi4gcmV0cnkgY291bmVyXG4gICovXG5SZXRyeU9uRXJyb3IucHJvdG90eXBlLnJldHJ5ID0gZnVuY3Rpb24oZXJyLCBjdHgsIGl0ZXIpIHtcblx0Ly8gMCBtZWFucyB0aGF0IHJ1biBvbmNlIDEgYW5kIG1vcmUgdGhhbiBvbmU7XG5cdHJldHVybiBpdGVyIDw9IDE7XG59O1xuXG4vKipcbiAqIG92ZXJyaWRlIG9mIGByZXBvcnROYW1lYFxuICogQGFwaSBwcm90ZWN0ZWRcbiAqL1xuUmV0cnlPbkVycm9yLnByb3RvdHlwZS5yZXBvcnROYW1lID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiBcIlJldHJ5T25FcnJvcjpcIiArIHRoaXMubmFtZTtcbn07XG5cblJldHJ5T25FcnJvci5wcm90b3R5cGUuYmFja3VwQ29udGV4dCA9IGZ1bmN0aW9uKGN0eCkge1xuXHRyZXR1cm4gY3R4LnRvT2JqZWN0KCk7XG59O1xuXG5SZXRyeU9uRXJyb3IucHJvdG90eXBlLnJlc3RvcmVDb250ZXh0ID0gZnVuY3Rpb24oY3R4LCBiYWNrdXApIHtcblx0Y3R4Lm92ZXJ3cml0ZShiYWNrdXApO1xuXHQvLyBjdHguX19lcnJvcnMubGVuZ3RoID0gMDtcbn07XG5cbi8qKlxuICogb3ZlcnJpZGUgb2YgY29tcGlsZVxuICogcHJvdmlkZSBhIHdheSB0byBjb21wb3NlIHJldHJ5IHJ1bi5cbiAqIEBhcGkgcHJvdGVjdGVkXG4gKi9cblJldHJ5T25FcnJvci5wcm90b3R5cGUuY29tcGlsZSA9IGZ1bmN0aW9uKCkge1xuXG5cdHZhciBzZWxmID0gdGhpcztcblxuXHRpZiAoIXNlbGYubmFtZSkge1xuXHRcdHNlbGYubmFtZSA9IFwic3RhZ2U6IFwiICsgc2VsZi5zdGFnZS5yZXBvcnROYW1lKCkgKyBcIiB3aXRoIHJldHJ5IFwiICsgc2VsZi5yZXRyeSArIFwiIHRpbWVzXCI7XG5cdH1cblxuXHR2YXIgcnVuID0gZnVuY3Rpb24oY3R4LCBkb25lKSB7XG5cdFx0Ly8gYmFja3VwIGNvbnRleHQgb2JqZWN0IHRvIG92ZXJ3cml0ZSBpZiBuZWVkZWRcblx0XHR2YXIgYmFja3VwID0gc2VsZi5iYWNrdXBDb250ZXh0KGN0eCk7XG5cblx0XHRyZWFjaEVuZCA9IGZ1bmN0aW9uKGVyciwgaXRlcikge1xuXHRcdFx0aWYgKGVycikge1xuXHRcdFx0XHRpZiAoc2VsZi5yZXRyeSBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG5cdFx0XHRcdFx0cmV0dXJuICFzZWxmLnJldHJ5KGVyciwgY3R4LCBpdGVyKTtcblx0XHRcdFx0fSBlbHNlIHsgLy8gbnVtYmVyXG5cdFx0XHRcdFx0cmV0dXJuIGl0ZXIgPiBzZWxmLnJldHJ5O1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdH1cblx0XHR9O1xuXHRcdHZhciBpdGVyID0gLTE7XG5cdFx0dmFyIG5leHQgPSBmdW5jdGlvbihlcnIsIGN0eCkge1xuXHRcdFx0aXRlcisrO1xuXHRcdFx0aWYgKHJlYWNoRW5kKGVyciwgaXRlcikpIHtcblx0XHRcdFx0ZG9uZShlcnIpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Ly8gY2xlYW4gY2hhbmdlcyBvZiBleGlzdGluZyBiZWZvcmUgdmFsdWVzLlxuXHRcdFx0XHQvLyBtYXkgYmUgd2lsbCBuZWVkIHRvIGNsZWFyIGF0IGFsbCBhbmQgcmV3cml0ZSA/IGkgZG9uJ3Qga25vdyB5ZXQuXG5cdFx0XHRcdHNlbGYucmVzdG9yZUNvbnRleHQoY3R4LCBiYWNrdXApO1xuXHRcdFx0XHRzZWxmLnN0YWdlLmV4ZWN1dGUoY3R4LCBuZXh0KTtcblx0XHRcdH1cblx0XHR9O1xuXHRcdHNlbGYuc3RhZ2UuZXhlY3V0ZShjdHgsIG5leHQpO1xuXHR9O1xuXG5cdHNlbGYucnVuID0gcnVuO1xufTtcblxuLyoqXG4gKiBvdmVycmlkZSBvZiBleGVjdXRlXG4gKiBAYXBpIHByb3RlY3RlZFxuICovXG5SZXRyeU9uRXJyb3IucHJvdG90eXBlLmV4ZWN1dGUgPSBmdW5jdGlvbihjb250ZXh0LCBjYWxsYmFjaykge1xuXHR2YXIgc2VsZiA9IHRoaXM7XG5cdGlmICghc2VsZi5ydW4pIHtcblx0XHRzZWxmLmNvbXBpbGUoKTtcblx0fVxuXHRSZXRyeU9uRXJyb3Iuc3VwZXJfLnByb3RvdHlwZS5leGVjdXRlLmFwcGx5KHNlbGYsIGFyZ3VtZW50cyk7XG59O1xuXG4vKiFcbiAqIGV4cG9ydHNcbiAqL1xuZXhwb3J0cy5SZXRyeU9uRXJyb3IgPSBSZXRyeU9uRXJyb3I7IiwiLyohIFxuICogTW9kdWxlIGRlcGVuZGVuY3lcbiAqL1xudmFyIFN0YWdlID0gcmVxdWlyZSgnLi9zdGFnZScpLlN0YWdlO1xudmFyIENvbnRleHQgPSByZXF1aXJlKCcuL2NvbnRleHQnKS5Db250ZXh0O1xudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKS5VdGlsO1xudmFyIEVycm9yTGlzdCA9IHJlcXVpcmUoJy4vdXRpbCcpLkVycm9yTGlzdDtcblxuLyoqXG4gKiBQcm9jZXNzIHN0YWdpbmcgaW4gc2VxdWVudGlhbCB3YXlcbiAqICMjIyBjb25maWcgYXMgX09iamVjdF9cbiAqXG4gKiAtIGBzdGFnZWAgZXZhbHVhdGluZyBzdGFnZVxuICogLSBgc3BsaXRgIGZ1bmN0aW9uIHRoYXQgc3BsaXQgZXhpc3Rpbmcgc3RhZ2UgaW50byBzbWFsbHMgcGFydHMsIGl0IG5lZWRlZFxuICogLSBgY29tYmluZWAgaWYgYW55IHJlc3VsdCBjb21iaW5pbmcgaXMgbmVlZCwgdGhpcyBjYW4gYmUgdXNlZCB0byBjb21iaW5lIHNwbGl0ZWQgcGFydHMgYW5kIHVwZGF0ZSBjb250ZXh0XG4gKlxuICogISEhTm90ZSEhIVNwbGl0IGRvZXMgbm90IHJlcXVpcmUgY29tYmluZSAtLS0gYi9jIGl0IHdpbGwgcmV0dXJuIHBhcmVudCBjb250ZXh0O1xuICogaWYgY2FzZXMgaGF2ZSBubyBkZWNsYXJhdGlvbiBmb3IgYHNwbGl0YCBjb25maWd1cmVkIG9yIGRlZmF1bHQgd2lsbCBiZSB1c2VkXG4gKlxuICogQHBhcmFtIGNvbmZpZyBPYmplY3QgY29uZmlndXJhdGlvbiBvYmplY3RcbiAqL1xuZnVuY3Rpb24gU2VxdWVudGlhbChjb25maWcpIHtcblxuXHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0aWYgKCEoc2VsZiBpbnN0YW5jZW9mIFNlcXVlbnRpYWwpKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKCdjb25zdHJ1Y3RvciBpcyBub3QgYSBmdW5jdGlvbicpO1xuXHR9XG5cblx0aWYgKGNvbmZpZyAmJiBjb25maWcucnVuIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcblx0XHRjb25maWcuc3RhZ2UgPSBuZXcgU3RhZ2UoY29uZmlnLnJ1bik7XG5cdFx0ZGVsZXRlIGNvbmZpZy5ydW47XG5cdH1cblxuXHRTdGFnZS5hcHBseShzZWxmLCBhcmd1bWVudHMpO1xuXG5cdGlmICghY29uZmlnKSB7XG5cdFx0Y29uZmlnID0ge307XG5cdH1cblxuXHRpZiAoY29uZmlnIGluc3RhbmNlb2YgU3RhZ2UpIHtcblx0XHRjb25maWcgPSB7XG5cdFx0XHRzdGFnZTogY29uZmlnXG5cdFx0fTtcblx0fVxuXG5cdGlmIChjb25maWcuc3RhZ2UgaW5zdGFuY2VvZiBTdGFnZSkge1xuXHRcdHNlbGYuc3RhZ2UgPSBjb25maWcuc3RhZ2U7XG5cdH0gZWxzZSB7XG5cdFx0aWYgKGNvbmZpZy5zdGFnZSBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG5cdFx0XHRzZWxmLnN0YWdlID0gbmV3IFN0YWdlKGNvbmZpZy5zdGFnZSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHNlbGYuc3RhZ2UgPSBuZXcgU3RhZ2UoKTtcblx0XHR9XG5cdH1cblxuXHRpZiAoY29uZmlnLnNwbGl0IGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcblx0XHRzZWxmLnNwbGl0ID0gY29uZmlnLnNwbGl0O1xuXHR9XG5cblx0aWYgKGNvbmZpZy5jb21iaW5lIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcblx0XHRzZWxmLmNvbWJpbmUgPSBjb25maWcuY29tYmluZTtcblx0fVxuXG5cdHNlbGYubmFtZSA9IGNvbmZpZy5uYW1lO1xufVxuXG4vKiFcbiAqIEluaGVyaXRlZCBmcm9tIFN0YWdlXG4gKi9cbnV0aWwuaW5oZXJpdHMoU2VxdWVudGlhbCwgU3RhZ2UpO1xuXG4vKipcbiAqIGludGVybmFsIGRlY2xhcmF0aW9uIGZvIGBzdGFnZWBcbiAqL1xuU2VxdWVudGlhbC5wcm90b3R5cGUuc3RhZ2UgPSB1bmRlZmluZWQ7XG5cbi8qKlxuICogaW50ZXJuYWwgZGVjbGFyYXRpb24gZm8gYHNwbGl0YFxuICovXG5TZXF1ZW50aWFsLnByb3RvdHlwZS5zcGxpdCA9IGZ1bmN0aW9uKGN0eCkge1xuXHRyZXR1cm4gW2N0eF07XG59O1xuXG4vKipcbiAqIGludGVybmFsIGRlY2xhcmF0aW9uIGZvIGBjb21iaW5lYFxuICogQHBhcmFtIGN0eCBDb250ZXh0IG1haW4gY29udGV4dFxuICogQHBhcmFtIGNoaWxkcmVuIENvbnRleHRbXSBsaXN0IG9mIGFsbCBjaGlsZHJlbiBjb250ZXh0c1xuICovXG5TZXF1ZW50aWFsLnByb3RvdHlwZS5jb21iaW5lID0gZnVuY3Rpb24oY3R4LCBjaGlsZHJlbikge1xufTtcblxuLyoqXG4gKiBvdmVycmlkZSBvZiBgcmVwb3J0TmFtZWBcbiAqIEBhcGkgcHJvdGVjdGVkXG4gKi9cblNlcXVlbnRpYWwucHJvdG90eXBlLnJlcG9ydE5hbWUgPSBmdW5jdGlvbigpIHtcblx0dmFyIHNlbGYgPSB0aGlzO1xuXHRyZXR1cm4gXCJTRVE6XCIgKyBzZWxmLm5hbWU7XG59O1xuXG4vKipcbiAqIG92ZXJyaWRlIG9mIGNvbXBpbGVcbiAqIHNwbGl0IGFsbCBhbmQgcnVuIGFsbFxuICogQGFwaSBwcm90ZWN0ZWRcbiAqL1xuU2VxdWVudGlhbC5wcm90b3R5cGUuY29tcGlsZSA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgc2VsZiA9IHRoaXM7XG5cdGlmICghc2VsZi5uYW1lKSB7XG5cdFx0c2VsZi5uYW1lID0gc2VsZi5zdGFnZS5yZXBvcnROYW1lKCk7XG5cdH1cblx0dmFyIHJ1biA9IGZ1bmN0aW9uKGVyciwgY3R4LCBkb25lKSB7XG5cdFx0dmFyIGl0ZXIgPSAtMTtcblx0XHR2YXIgY2hpbGRyZW4gPSBzZWxmLnNwbGl0KGN0eCk7XG5cdFx0dmFyIGxlbiA9IGNoaWxkcmVuID8gY2hpbGRyZW4ubGVuZ3RoIDogMDtcblx0XHR2YXIgZXJyb3JzID0gW107XG5cblx0XHRmdW5jdGlvbiBmaW5pc2goKSB7XG5cdFx0XHRpZiAoZXJyb3JzLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0ZG9uZShuZXcgRXJyb3JMaXN0KGVycm9ycykpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0c2VsZi5jb21iaW5lKGN0eCwgY2hpbGRyZW4pO1xuXHRcdFx0XHRkb25lKCk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gbG9nRXJyb3IoZXJyLCBpbmRleCkge1xuXHRcdFx0ZXJyb3JzLnB1c2goe1xuXHRcdFx0XHRzdGFnZTogc2VsZi5uYW1lLFxuXHRcdFx0XHRpbmRleDogaW5kZXgsXG5cdFx0XHRcdGVycjogZXJyLFxuXHRcdFx0XHRzdGFjazogZXJyLnN0YWNrLFxuXHRcdFx0XHRjdHg6IGNoaWxkcmVuW2luZGV4XVxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0dmFyIG5leHQgPSBmdW5jdGlvbihlcnIsIHJldEN0eCkge1xuXHRcdFx0aXRlcisrO1xuXHRcdFx0aWYgKGVycikge1xuXHRcdFx0XHRsb2dFcnJvcihlcnIsIGl0ZXItMSk7XG5cdFx0XHR9IGVsc2UgaWYgKGl0ZXIgPiAwKSB7XG5cdFx0XHRcdGNoaWxkcmVuW2l0ZXItMV0gPSByZXRDdHg7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChpdGVyID49IGxlbikge1xuXHRcdFx0XHRmaW5pc2goKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHNlbGYuc3RhZ2UuZXhlY3V0ZShjdHguZW5zdXJlSXNDaGlsZChjaGlsZHJlbltpdGVyXSksIG5leHQpO1xuXHRcdFx0fVxuXHRcdH07XG5cblx0XHRpZiAobGVuID09PSAwKSB7XG5cdFx0XHRmaW5pc2goKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0bmV4dCgpO1xuXHRcdH1cblx0fTtcblx0c2VsZi5ydW4gPSBydW47XG59O1xuXG4vKipcbiAqIG92ZXJyaWRlIG9mIGV4ZWN1dGVcbiAqIEBhcGkgcHJvdGVjdGVkXG4gKi9cblNlcXVlbnRpYWwucHJvdG90eXBlLmV4ZWN1dGUgPSBmdW5jdGlvbihjb250ZXh0LCBjYWxsYmFjaykge1xuXHR2YXIgc2VsZiA9IHRoaXM7XG5cdGlmICghc2VsZi5ydW4pIHtcblx0XHRzZWxmLmNvbXBpbGUoKTtcblx0fVxuXHRTZXF1ZW50aWFsLnN1cGVyXy5wcm90b3R5cGUuZXhlY3V0ZS5hcHBseShzZWxmLCBhcmd1bWVudHMpO1xufTtcblxuLyohXG4gKiBleHBvcnRzXG4gKi9cbmV4cG9ydHMuU2VxdWVudGlhbCA9IFNlcXVlbnRpYWw7IiwiLyohXG4gKiBNb2R1bGUgZGVwZW5kZW5jeVxuICovXG52YXIgQ29udGV4dCA9IHJlcXVpcmUoJy4vY29udGV4dCcpLkNvbnRleHQ7XG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZShcImV2ZW50c1wiKS5FdmVudEVtaXR0ZXI7XG5cbnZhciBzY2hlbWEgPSByZXF1aXJlKCdqcy1zY2hlbWEnKTtcbnZhciB1dGlsID0gcmVxdWlyZSgnLi91dGlsJykuVXRpbDtcblxuLyoqIFxuICogIyNldmVudHM6XG4gKlxuICogLSBgZXJyb3JgIC0tIGVycm9yIHdoaXVsZSBleGVjdXRpbmcgc3RhZ2VcbiAqIC0gYGRvbmVgIC0tIHJlc3VsdGluZyBjb250ZXh0IG9mIHN0YWdpbmdcbiAqIC0gYGVuZGAgLS0gZXhhbWluZSB0aGF0IHN0YWdlIGV4ZWN1dGluZyBpcyBjb21wbGV0ZVxuIFxuICogR2VuZXJhbCBTdGFnZSBkZWZpbml0aW9uXG4gKiAjI0NvbmZpZ3VyYXRpb25cbiAqXG4gKiAjIyNjb25maWcgYXMgYE9iamVjdGBcbiAqXG4gKiAjIyMjZW5zdXJlXG4gKlxuICogIyMjI3Jlc2N1ZVxuICpcbiAqICMjIyN2YWxpZGF0ZVxuICpcbiAqICMjIyNzY2hlbWFcbiAqXG4gKiAjIyMjcnVuXG4gKlxuICogIyMjY29uZmlnIGFzIEZ1bmN0aW9uXG4gKlxuICogIGBjb25maWdgIGlzIHRoZSBgcnVuYCBtZXRob2Qgb2YgdGhlIHN0YWdlXG4gKlxuICogIyMjY29uZmlnIGFzIFN0cmluZ1xuICpcbiAqICBgY29uZmlnYCBpcyB0aGUgYG5hbWVgIG9mIHRoZSBzdGFnZVxuICpcbiAqIEBwYXJhbSBjb25maWcge09iamVjdHxGdW5jdGlvbnxTdHJpbmd9IFN0YWdlIGNvbmZpZ3VyYXRpb25cbiAqIEBhcGkgcHVibGljXG4gKi9cbmZ1bmN0aW9uIFN0YWdlKGNvbmZpZykge1xuXG5cdHZhciBzZWxmID0gdGhpcztcblxuXHRpZiAoIShzZWxmIGluc3RhbmNlb2YgU3RhZ2UpKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKCdjb25zdHJ1Y3RvciBpcyBub3QgYSBmdW5jdGlvbicpO1xuXHR9XG5cblx0aWYgKGNvbmZpZykge1xuXG5cdFx0aWYgKHR5cGVvZihjb25maWcpID09PSAnb2JqZWN0Jykge1xuXG5cdFx0XHRpZiAodHlwZW9mKGNvbmZpZy5lbnN1cmUpID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRcdHNlbGYuZW5zdXJlID0gY29uZmlnLmVuc3VyZTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKHR5cGVvZihjb25maWcucmVzY3VlKSA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0XHRzZWxmLnJlc2N1ZSA9IGNvbmZpZy5yZXNjdWU7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChjb25maWcudmFsaWRhdGUgJiYgY29uZmlnLnNjaGVtYSkge1xuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ3VzZSBlaXRoZXIgdmFsaWRhdGUgb3Igc2NoZW1hJyk7XG5cdFx0XHR9XG5cblx0XHRcdGlmICh0eXBlb2YoY29uZmlnLnZhbGlkYXRlKSA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0XHRzZWxmLnZhbGlkYXRlID0gY29uZmlnLnZhbGlkYXRlO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAodHlwZW9mKGNvbmZpZy5zY2hlbWEpID09PSAnb2JqZWN0Jykge1xuXHRcdFx0XHRzZWxmLnZhbGlkYXRlID0gc2NoZW1hKGNvbmZpZy5zY2hlbWEpO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAodHlwZW9mKGNvbmZpZy5ydW4pID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRcdHNlbGYucnVuID0gY29uZmlnLnJ1bjtcblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXG5cdFx0XHRpZiAodHlwZW9mKGNvbmZpZykgPT09ICdmdW5jdGlvbicpIHtcblx0XHRcdFx0c2VsZi5ydW4gPSBjb25maWc7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKHR5cGVvZihjb25maWcpID09PSAnc3RyaW5nJykge1xuXHRcdFx0c2VsZi5uYW1lID0gY29uZmlnO1xuXHRcdH0gZWxzZSB7XG5cblx0XHRcdGlmIChjb25maWcubmFtZSkge1xuXHRcdFx0XHRzZWxmLm5hbWUgPSBjb25maWcubmFtZTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHZhciBtYXRjaCA9IHNlbGYucnVuLnRvU3RyaW5nKCkubWF0Y2goL2Z1bmN0aW9uXFxzKihcXHcrKVxccypcXCgvKTtcblxuXHRcdFx0XHRpZiAobWF0Y2ggJiYgbWF0Y2hbMV0pIHtcblx0XHRcdFx0XHRzZWxmLm5hbWUgPSBtYXRjaFsxXTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRzZWxmLm5hbWUgPSBzZWxmLnJ1bi50b1N0cmluZygpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cdEV2ZW50RW1pdHRlci5jYWxsKHNlbGYpO1xufVxuXG4vKiFcbiAqIEluaGVyaXRlZCBmcm9tIEV2ZW50IEVtaXR0ZXJcbiAqL1xudXRpbC5pbmhlcml0cyhTdGFnZSwgRXZlbnRFbWl0dGVyKTtcblxuLyoqXG4gKiBwcm92YWlkZSBhIHdheSB0byBnZXQgc3RhZ2UgbmFtZSBmb3IgcmVwb3J0cyB1c2VkIGZvciB0cmFjaW5nXG4gKiBAcmV0dXJuIFN0cmluZ1xuICovXG5TdGFnZS5wcm90b3R5cGUucmVwb3J0TmFtZSA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgc2VsZiA9IHRoaXM7XG5cdHJldHVybiAnU1RHOicgKyAoc2VsZi5uYW1lID8gKCcgJyArIHNlbGYubmFtZSkgOiAnJyk7XG59O1xuXG4vKipcbiAqIEVuc3VyZXMgY29udGV4dCB2YWxpZGl0eVxuICogdGhpcyBjYW4gYmUgb3ZlcnJpZGRlbiBieSB1c2VyXG4gKiBpbiBzeW5jIG9yIGFzeW5jIHdheVxuICogaW4gc3luYyB3YXkgaXQgaGFzIHNpZ25hdHVyZVxuICogYGZ1bmN0aW9uKGNvbnRleHQpOkVycm9yYCBzbyBpdCBtdXN0IHJldHVybiBlcnJvciBpZiBjb250ZXh0IGlzIGludmFsaWRcbiAqIHN5bmMgc2lnbmF0dXJlXG4gKiBAcGFyYW0gY29udGV4dCBjb250ZXh0XG4gKiBAcGFyYW0gY2FsbGJhY2sgRnVuY3Rpb25cbiAqL1xuU3RhZ2UucHJvdG90eXBlLmVuc3VyZSA9IGZ1bmN0aW9uKGNvbnRleHQsIGNhbGxiYWNrKSB7XG5cdHZhciBzZWxmID0gdGhpcztcblx0dmFyIHZhbGlkYXRpb24gPSBzZWxmLnZhbGlkYXRlKGNvbnRleHQpO1xuXG5cdGlmICh2YWxpZGF0aW9uKSB7XG5cdFx0aWYgKCdib29sZWFuJyA9PT0gdHlwZW9mIHZhbGlkYXRpb24pIHtcblx0XHRcdGNhbGxiYWNrKG51bGwpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRjYWxsYmFjayh2YWxpZGF0aW9uKTtcblx0XHR9XG5cdH0gZWxzZSB7XG5cdFx0Y2FsbGJhY2sobmV3IEVycm9yKHNlbGYucmVwb3J0TmFtZSgpICsgJyByZXBvcnRzOiBDb250ZXh0IGlzIGludmFsaWQnKSk7XG5cdH1cbn07XG5cbi8qKlxuICogaW50ZXJuYWwgc3RvcmFnZSBmb3IgbmFtZVxuICovXG5TdGFnZS5wcm90b3R5cGUubmFtZSA9IHVuZGVmaW5lZDtcblxuLyoqXG4gKiBkZWZhdWx0IGB2YWxpZGF0ZWAgaW1wbGVtZW50YXRpb25cbiAqL1xuU3RhZ2UucHJvdG90eXBlLnZhbGlkYXRlID0gZnVuY3Rpb24oY29udGV4dCkge1xuXHRyZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogQWxscHVycG9zZSBFcnJvciBoYW5kbGVyIGZvciBzdGFnZVxuICogQHBhcmFtIGVyciBFcnJvcnxudWxsXG4gKiBAcGFyYW0gY29udGV4dCBDb250ZXh0XG4gKiBAcGFyYW0gW2NhbGxiYWNrXSBGdW5jdGlvbiBjYWxsYmFjayBmb3IgYXN5bmMgcmVzY3VlIHByb2Nlc3NcbiAqIHJldHVybiBFcnJvcnx1bmRlZmluZWR8bnVsbFxuICovXG5cbi8vINC/0L7RgtC10YHRgtC40YDQvtCy0LDRgtGMINGA0LDQt9C90YvQtSByZXNjdWVcblxuU3RhZ2UucHJvdG90eXBlLnJlc2N1ZSA9IGZ1bmN0aW9uKGVyciwgY29udGV4dCwgY2FsbGJhY2spIHtcblx0aWYgKHR5cGVvZiBjYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdGNhbGxiYWNrKGVycik7XG5cdH0gZWxzZSB7XG5cdFx0cmV0dXJuIGVycjtcblx0fVxufTtcblxuLyoqIGl0IGNhbiBiZSBhbHNvIHN5bmMgbGlrZSB0aGlzICovXG4vKlx0U3RhZ2UucHJvdG90eXBlLnJlc2N1ZSA9IGZ1bmN0aW9uKGVyciwgY29udGV4dCkge1xuXHRcdC8vIHZlcnlzIHNpbXBsZSBlcnJvciBjaGVjayB3aXRoIGNvbnRleHQgb3Qgd2l0aG91dCBpdFxuXHRcdHJldHVybiBlcnI7XG5cdH07Ki9cbi8qKi9cblxuLyoqXG4gKiBzaW5nIGNvbnRleHQgd2l0aCBzdGFnZSBuYW1lLlxuICogdXNlZCBmb3IgdHJhY2luZ1xuICogQGFwaSBpbnRlcm5hbFxuICovXG5TdGFnZS5wcm90b3R5cGUuc2lnbiA9IGZ1bmN0aW9uKGNvbnRleHQpIHtcblx0dmFyIHNlbGYgPSB0aGlzO1xuXHRpZiAoY29udGV4dCBpbnN0YW5jZW9mIENvbnRleHQpIHtcblx0XHRjb250ZXh0Ll9fc2lnbldpdGgoc2VsZi5yZXBvcnROYW1lKCkpO1xuXHR9XG59O1xuXG4vKipcbiAqIHJ1biBmdW5jdGlvbiwgY2FuIGJlIGFzc2lnbmVkIGJ5IGNoaWxkIGNsYXNzXG4gKiBTaW5nYXR1cmVcbiAqIGZ1bmN0aW9uKGVyciwgY3R4LCBkb25lKSAtLSBhc3luYyB3aXQgY3VzdG9tIGVycm9yIGhhbmRsZXIhIGRlcHJlY2F0ZWQuIGVyciBhbHdheXMgbnVsbC5cbiAqIGZ1bmN0aW9uKGN0eCwgZG9uZSkgLS0gYXN5bmNcbiAqIGZ1bmN0aW9uKGN0eCkgLS0gc3luYyBjYWxsXG4gKiBmdW5jdGlvbigpIC0tIHN5bmMgY2FsbCBgY29udGV4dGAgYXBwbHllZCBhcyB0aGlzIGZvciBmdW5jdGlvbi5cbiAqL1xuU3RhZ2UucHJvdG90eXBlLnJ1biA9IDA7XG52YXIgZmFpbHByb29mU3luY0NhbGwgPSByZXF1aXJlKCcuL3V0aWwuanMnKS5mYWlscHJvb2ZTeW5jQ2FsbDtcbnZhciBmYWlscHJvb2ZBc3luY0NhbGwgPSByZXF1aXJlKCcuL3V0aWwuanMnKS5mYWlscHJvb2ZBc3luY0NhbGw7XG4vKipcbiAqIGV4ZWN1dGVzIHN0YWdlIGFuZCByZXR1cm4gcmVzdWx0IHRvIGNhbGxiYWNrXG4gKiBhbHdheXMgYXN5bmNcbiAqIEBwYXJhbSBfY29udGV4dCBDb250ZXh0fE9iamVjdCBpbmNvbWluZyBjb250ZXh0XG4gKiBAcGFyYW0gY2FsbGJhY2sgRnVuY3Rpb24gaW5jb21pbmcgY2FsbGJhY2sgZnVuY3Rpb24gZnVuY3Rpb24oZXJyLCBjdHgpXG4gKi9cblN0YWdlLnByb3RvdHlwZS5leGVjdXRlID0gZnVuY3Rpb24oX2NvbnRleHQsIGNhbGxiYWNrKSB7XG5cdHZhciBzZWxmID0gdGhpcztcblxuXHR2YXIgY29udGV4dCA9IENvbnRleHQuZW5zdXJlKF9jb250ZXh0KTtcblx0dmFyIGhhc0NhbGxiYWNrID0gdHlwZW9mKGNhbGxiYWNrKSA9PT0gJ2Z1bmN0aW9uJztcblxuXHRmdW5jdGlvbiBoYW5kbGVFcnJvcihfZXJyKSB7XG5cdFx0ZnVuY3Rpb24gcHJvY2Vzc0Vycm9yKGVycikge1xuXHRcdFx0aWYgKGVycikge1xuXHRcdFx0XHRpZiAoc2VsZi5saXN0ZW5lcnMoJ2Vycm9yJykubGVuZ3RoID4gMCkge1xuXHRcdFx0XHRcdC8vINC/0L7RgdC60L7Qu9GM0LrRgyDQutC+0LQg0LLRi9C30YvQstCw0LXRgtGB0Y8g0LIg0LTQvtC80LXQvdC1LCBcblx0XHRcdFx0XHQvLyDRgtC+INCx0LXQtyDQu9C40YHRgtC10L3QtdGA0LAg0LrQvtC0INCy0YvQt9C+0LLQtdGCINGA0LXQutGD0YDRgdC40Y4uLi5cblx0XHRcdFx0XHRzZWxmLmVtaXQoJ2Vycm9yJywgZXJyLCBjb250ZXh0KTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0ZmluaXNoSXQoZXJyKTtcblx0XHR9XG5cdFx0dmFyIGxlbiA9IHNlbGYucmVzY3VlLmxlbmd0aDtcblx0XHRzd2l0Y2ggKGxlbikge1xuXHRcdFx0Y2FzZSAwOlxuXHRcdFx0XHRwcm9jZXNzRXJyb3Ioc2VsZi5yZXNjdWUoKSk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAxOlxuXHRcdFx0XHRwcm9jZXNzRXJyb3Ioc2VsZi5yZXNjdWUoX2VycikpO1xuXHRcdFx0XHRicmVhaztcblxuXHRcdFx0Y2FzZSAyOlxuXHRcdFx0XHRwcm9jZXNzRXJyb3Ioc2VsZi5yZXNjdWUoX2VyciwgY29udGV4dCkpO1xuXHRcdFx0XHRicmVhaztcblxuXHRcdFx0Y2FzZSAzOlxuXHRcdFx0XHRzZWxmLnJlc2N1ZShfZXJyLCBjb250ZXh0LCBwcm9jZXNzRXJyb3IpO1xuXHRcdFx0XHRicmVhaztcblxuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0cHJvY2Vzc0Vycm9yKF9lcnIpO1xuXHRcdH1cblx0fTtcblxuXHR2YXIgZW5zdXJlQXN5bmMgPSBmYWlscHJvb2ZBc3luY0NhbGwuYmluZCh1bmRlZmluZWQsIGhhbmRsZUVycm9yKTtcblx0dmFyIGVuc3VyZVN5bmMgPSBmYWlscHJvb2ZTeW5jQ2FsbC5iaW5kKHVuZGVmaW5lZCwgaGFuZGxlRXJyb3IpO1xuXG5cdGZ1bmN0aW9uIGZpbmlzaEl0KGVycikge1xuXHRcdHNlbGYuZW1pdCgnZW5kJywgY29udGV4dCk7XG5cdFx0aWYgKGhhc0NhbGxiYWNrKSB7XG5cdFx0XHRzZXRJbW1lZGlhdGUoZnVuY3Rpb24oZXJyLCBjb250ZXh0KSB7XG5cdFx0XHRcdGNhbGxiYWNrKGVyciwgY29udGV4dCk7XG5cdFx0XHR9LCBlcnIsIGNvbnRleHQpO1xuXHRcdH1cblx0fTtcblx0Ly93cmFwIGl0IHdpdGggZXJyb3JjaGVja1xuXHR2YXIgZG9uZUl0ID0gZnVuY3Rpb24oZXJyKSB7XG5cdFx0aWYgKGVycikge1xuXHRcdFx0aGFuZGxlRXJyb3IoZXJyKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0c2VsZi5lbWl0KCdkb25lJywgY29udGV4dCk7XG5cdFx0XHRmaW5pc2hJdCgpO1xuXHRcdH1cblx0fTtcblxuXHRydW5TdGFnZSA9IGZ1bmN0aW9uKGVycikge1xuXHRcdGlmIChlcnIpIHtcblx0XHRcdGhhbmRsZUVycm9yKGVycik7XG5cdFx0fSBlbHNlIHtcblxuXHRcdFx0aWYgKHR5cGVvZihzZWxmLnJ1bikgPT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0XHRpZiAoY29udGV4dC5fX3RyYWNlKSB7XG5cdFx0XHRcdFx0Y29udGV4dC5hZGRUb1N0YWNrKCdjb250ZXh0JywgY29udGV4dC50b09iamVjdCgpKTtcblx0XHRcdFx0XHQvLyBjb25zb2xlLmxvZyhzZWxmLm5hbWUpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHZhciBoYXNFcnJvciA9IG51bGw7XG5cdFx0XHRcdHN3aXRjaCAoc2VsZi5ydW4ubGVuZ3RoKSB7XG5cdFx0XHRcdFx0Y2FzZSAwOlxuXHRcdFx0XHRcdFx0ZW5zdXJlU3luYyhjb250ZXh0LCBzZWxmLnJ1biwgZG9uZUl0KSgpO1xuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0Y2FzZSAxOlxuXHRcdFx0XHRcdFx0ZW5zdXJlU3luYyhzZWxmLCBzZWxmLnJ1biwgZG9uZUl0KShjb250ZXh0KTtcblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdGNhc2UgMjpcblx0XHRcdFx0XHRcdGVuc3VyZUFzeW5jKHNlbGYsIHNlbGYucnVuKShjb250ZXh0LCBkb25lSXQpO1xuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0Y2FzZSAzOlxuXHRcdFx0XHRcdFx0ZW5zdXJlQXN5bmMoc2VsZiwgc2VsZi5ydW4pKG51bGwsIGNvbnRleHQsIGRvbmVJdCk7XG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRcdFx0aGFuZGxlRXJyb3IobmV3IEVycm9yKCd1bmFjY2VwdGFibGUgc2lnbmF0dXJlJykpO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRoYW5kbGVFcnJvcihuZXcgRXJyb3Ioc2VsZi5yZXBvcnROYW1lKCkgKyAnIHJlcG9ydHM6IHJ1biBpcyBub3QgYSBmdW5jdGlvbicpKTtcblx0XHRcdH1cblx0XHR9XG5cdH07XG5cblx0c2VsZi5zaWduKGNvbnRleHQpO1xuXHRzd2l0Y2ggKHNlbGYuZW5zdXJlLmxlbmd0aCkge1xuXHRcdGNhc2UgMjpcblx0XHRcdHNlbGYuZW5zdXJlKGNvbnRleHQsIHJ1blN0YWdlKTtcblx0XHRcdGJyZWFrO1xuXHRcdGNhc2UgMTpcblx0XHRcdHJ1blN0YWdlKHNlbGYuZW5zdXJlKGNvbnRleHQpKTtcblx0XHRcdGJyZWFrO1xuXHRcdGRlZmF1bHQ6XG5cdFx0XHRoYW5kbGVFcnJvcihuZXcgRXJyb3IoJ3Vua25vd24gZW5zdXJlIHNpZ25hdHVyZScpKTtcblx0fVxufTtcblxuLyohXG4gKiBleHBvcnRzXG4gKi9cbmV4cG9ydHMuU3RhZ2UgPSBTdGFnZTsiLCIvKiFcbiAqIE1vZHVsZSBkZXBlbmRlbmN5XG4gKi9cbnZhciBTdGFnZSA9IHJlcXVpcmUoJy4vc3RhZ2UnKS5TdGFnZTtcbnZhciB1dGlsID0gcmVxdWlyZSgnLi91dGlsJykuVXRpbDtcblxuLyoqXG4gKiBUaW1lb3V0OiBydW4gKipzdGFnZSoqIGFuZCB3YWl0ICoqdGltZW91dCoqIG1zIGZvciBhbmQgcnVuIG92ZXJkdWUgc3RhZ2VcbiAqIGNvbmZpZ3VyYXRpb25cbiAqICAtIHRpbWVvdXQgLS0tIHRpbWVvdXQgaW4gbXNcbiAqIFx0LSBzdGFnZSAtLS0gbWFpbiBzdGFnZVxuICogXHQtIG92ZXJkdWUgLS0tIG92ZXJkdWUgc3RhZ2Ugb3B0aW9uYWwuIGlmIG5vIG92ZXJkdWUgaXMgY29uZmlndXJlZC5cbiAqL1xuZnVuY3Rpb24gVGltZW91dChjb25maWcpIHtcblxuXHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0aWYgKCEoc2VsZiBpbnN0YW5jZW9mIFRpbWVvdXQpKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKCdjb25zdHJ1Y3RvciBpcyBub3QgYSBmdW5jdGlvbicpO1xuXHR9XG5cblx0aWYgKGNvbmZpZyAmJiBjb25maWcucnVuIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcblx0XHRjb25maWcuc3RhZ2UgPSBuZXcgU3RhZ2UoY29uZmlnLnJ1bik7XG5cdFx0ZGVsZXRlIGNvbmZpZy5ydW47XG5cdH1cblxuXHRTdGFnZS5hcHBseShzZWxmLCBhcmd1bWVudHMpO1xuXG5cdGlmICghY29uZmlnKSB7XG5cdFx0Y29uZmlnID0ge307XG5cdH1cblxuXHRzZWxmLnRpbWVvdXQgPSBjb25maWcudGltZW91dCB8fCAxMDAwO1xuXG5cdGlmIChjb25maWcuc3RhZ2UgaW5zdGFuY2VvZiBTdGFnZSkge1xuXHRcdHNlbGYuc3RhZ2UgPSBjb25maWcuc3RhZ2U7XG5cdH0gZWxzZSBpZiAoY29uZmlnLnN0YWdlIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcblx0XHRzZWxmLnN0YWdlID0gbmV3IFN0YWdlKGNvbmZpZy5zdGFnZSk7XG5cdH0gZWxzZSB7XG5cdFx0c2VsZi5zdGFnZSA9IG5ldyBTdGFnZSgpO1xuXHR9XG5cblx0aWYgKGNvbmZpZy5vdmVyZHVlIGluc3RhbmNlb2YgU3RhZ2UpIHtcblx0XHRzZWxmLm92ZXJkdWUgPSBjb25maWcub3ZlcmR1ZTtcblx0fSBlbHNlIGlmIChjb25maWcub3ZlcmR1ZSBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG5cdFx0c2VsZi5vdmVyZHVlID0gY29uZmlnLm92ZXJkdWU7XG5cdH1cblx0XG5cdHNlbGYub3ZlcmR1ZSA9IG5ldyBTdGFnZShzZWxmLm92ZXJkdWUpO1xuXHRzZWxmLm5hbWUgPSBjb25maWcubmFtZTtcbn1cblxuLyohXG4gKiBJbmhlcml0ZWQgZnJvbSBTdGFnZVxuICovXG51dGlsLmluaGVyaXRzKFRpbWVvdXQsIFN0YWdlKTtcblxuLyoqXG4gKiBpbnRlcm5hbCBkZWNsYXJhdGlvbiBmbyBgdGltZW91dGBcbiAqL1xuVGltZW91dC5wcm90b3R5cGUudGltZW91dCA9IHVuZGVmaW5lZDtcblxuLyoqXG4gKiBpbnRlcm5hbCBkZWNsYXJhdGlvbiBmbyBgc3RhZ2VgXG4gKi9cblRpbWVvdXQucHJvdG90eXBlLnN0YWdlID0gdW5kZWZpbmVkO1xuXG4vKipcbiAqIGRlZmF1bHQgaW1wbGVtZW50YXRpb24gb2Ygb3ZlcmR1ZTtcbiAqL1xuVGltZW91dC5wcm90b3R5cGUub3ZlcmR1ZSA9IGZ1bmN0aW9uKGN0eCwgZG9uZSkge1xuXHRkb25lKG5ldyBFcnJvcignb3ZlcmR1ZScpKTtcbn07XG5cbi8qKlxuICogb3ZlcnJpZGUgb2YgYHJlcG9ydE5hbWVgXG4gKiBAYXBpIHByb3RlY3RlZFxuICovXG5UaW1lb3V0LnByb3RvdHlwZS5yZXBvcnROYW1lID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiBcIlRpbWVvdXQ6XCIgKyB0aGlzLm5hbWU7XG59O1xuXG4vKipcbiAqIG92ZXJyaWRlIG9mIGNvbXBpbGVcbiAqIEBhcGkgcHJvdGVjdGVkXG4gKi9cblRpbWVvdXQucHJvdG90eXBlLmNvbXBpbGUgPSBmdW5jdGlvbigpIHtcblxuXHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0aWYgKCFzZWxmLm5hbWUpIHtcblx0XHRzZWxmLm5hbWUgPSBcInN1Y2Nlc3M6IFwiICsgc2VsZi5zdGFnZS5yZXBvcnROYW1lKCkgKyBcIiBmYWlsdXJlOiBcIiArIHNlbGYub3ZlcmR1ZS5yZXBvcnROYW1lKCk7XG5cdH1cblxuXHR2YXIgcnVuID0gZnVuY3Rpb24oZXJyLCBjdHgsIGRvbmUpIHtcblx0XHRwcm9jZXNzLm5leHRUaWNrKGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHRvO1xuXHRcdFx0dmFyIGxvY2FsRG9uZSA9IGZ1bmN0aW9uKGVycikge1xuXG5cdFx0XHRcdGlmICh0bykge1xuXHRcdFx0XHRcdGNsZWFyVGltZW91dCh0byk7XG5cdFx0XHRcdFx0dG8gPSBudWxsO1xuXHRcdFx0XHRcdGRvbmUoZXJyKTtcblx0XHRcdFx0fVxuXHRcdFx0fTtcblxuXHRcdFx0aWYgKCFlcnIpIHtcblx0XHRcdFx0dG8gPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGlmICh0bykge1xuXHRcdFx0XHRcdFx0c2VsZi5vdmVyZHVlLmV4ZWN1dGUoY3R4LCBsb2NhbERvbmUpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSwgc2VsZi50aW1lb3V0KTtcblx0XHRcdFx0c2VsZi5zdGFnZS5leGVjdXRlKGN0eCwgbG9jYWxEb25lKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGRvbmUoZXJyKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fTtcblx0c2VsZi5ydW4gPSBydW47XG59O1xuXG4vKipcbiAqIG92ZXJyaWRlIG9mIGV4ZWN1dGVcbiAqIEBhcGkgcHJvdGVjdGVkXG4gKi9cblRpbWVvdXQucHJvdG90eXBlLmV4ZWN1dGUgPSBmdW5jdGlvbihjb250ZXh0LCBjYWxsYmFjaykge1xuXHR2YXIgc2VsZiA9IHRoaXM7XG5cdGlmICghc2VsZi5ydW4pIHtcblx0XHRzZWxmLmNvbXBpbGUoKTtcblx0fVxuXHRUaW1lb3V0LnN1cGVyXy5wcm90b3R5cGUuZXhlY3V0ZS5hcHBseShzZWxmLCBhcmd1bWVudHMpO1xufTtcblxuLyohXG4gKiBleHBvcnRzXG4gKi9cbmV4cG9ydHMuVGltZW91dCA9IFRpbWVvdXQ7IiwiLyohXG4gKiBNb2R1bGUgZGVwZW5kZW5jeVxuICovXG5leHBvcnRzLlV0aWwgPSB7fTtcbmV4cG9ydHMuVXRpbC5nZXRDbGFzcyA9IGZ1bmN0aW9uKG9iaikge1xuICBpZiAob2JqICYmIHR5cGVvZiBvYmogPT09ICdvYmplY3QnICYmIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopICE9PSAnW29iamVjdCBBcnJheV0nICYmIG9iai5jb25zdHJ1Y3RvciAmJiBvYmogIT09IGdsb2JhbCkge1xuICAgIHZhciByZXMgPSBvYmouY29uc3RydWN0b3IudG9TdHJpbmcoKS5tYXRjaCgvZnVuY3Rpb25cXHMqKFxcdyspXFxzKlxcKC8pO1xuICAgIGlmIChyZXMgJiYgcmVzLmxlbmd0aCA9PT0gMikge1xuICAgICAgcmV0dXJuIHJlc1sxXTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufTtcbmV4cG9ydHMuVXRpbC5pbmhlcml0cyA9IGZ1bmN0aW9uKGN0b3IsIHN1cGVyQ3Rvcikge1xuICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvcjtcbiAgY3Rvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ3Rvci5wcm90b3R5cGUsIHtcbiAgICBjb25zdHJ1Y3Rvcjoge1xuICAgICAgdmFsdWU6IGN0b3IsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZVxuICAgIH1cbiAgfSk7XG59O1xuXG4vKiFcbiAqIGZhaWxwcm9mZiB3cmFwcGVyIGZvciBTeW5jIGNhbGxcbiAqL1xuZnVuY3Rpb24gZmFpbHByb29mU3luY0NhbGwoaGFuZGxlRXJyb3IsIF90aGlzLCBfZm4sIGZpbmFsaXplKSB7XG4gIHZhciBmbiA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBmYWlsZWQgPSBmYWxzZTtcbiAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgdHJ5IHtcbiAgICAgIF9mbi5hcHBseShfdGhpcywgYXJncyk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBmYWlsZWQgPSB0cnVlO1xuICAgICAgaGFuZGxlRXJyb3IoZXJyKTtcbiAgICB9XG4gICAgaWYgKCFmYWlsZWQpIHtcbiAgICAgIGZpbmFsaXplKCk7XG4gICAgfVxuICB9O1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgLy8g0L/QvtGB0LzQvtGC0YDQtdGC0Ywg0LzQvtC20LXRgiDQsdGL0YLRjCDQvdGD0LbQvdC+INGD0LHRgNCw0YLRjCBzZXRJbW1lZGlhdGU/IVxuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICBhcmdzLnVuc2hpZnQoZm4pO1xuICAgIHNldEltbWVkaWF0ZS5hcHBseShudWxsLCBhcmdzKTtcbiAgfTtcbn1cblxuZXhwb3J0cy5mYWlscHJvb2ZTeW5jQ2FsbCA9IGZhaWxwcm9vZlN5bmNDYWxsXG5cbi8qIVxuICogZmFpbHByb2ZmIHdyYXBwZXIgZm9yIEFzeW5jIGNhbGxcbiAqL1xuZnVuY3Rpb24gZmFpbHByb29mQXN5bmNDYWxsKGhhbmRsZUVycm9yLCBfdGhpcywgX2ZuKSB7XG4gIHZhciBmbiA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICB0cnkge1xuICAgICAgX2ZuLmFwcGx5KF90aGlzLCBhcmdzKTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGhhbmRsZUVycm9yKGVycilcbiAgICB9XG4gIH07XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAvLyDQv9C+0YHQvNC+0YLRgNC10YLRjCDQvNC+0LbQtdGCINCx0YvRgtGMINC90YPQttC90L4g0YPQsdGA0LDRgtGMIHNldEltbWVkaWF0ZT8hXG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgIGFyZ3MudW5zaGlmdChmbik7XG4gICAgc2V0SW1tZWRpYXRlLmFwcGx5KG51bGwsIGFyZ3MpO1xuICB9O1xufVxuXG5leHBvcnRzLmZhaWxwcm9vZkFzeW5jQ2FsbCA9IGZhaWxwcm9vZkFzeW5jQ2FsbDtcblxuZnVuY3Rpb24gRXJyb3JMaXN0KGxpc3QpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBpZiAoIShzZWxmIGluc3RhbmNlb2YgRXJyb3JMaXN0KSkge1xuICAgIHRocm93IG5ldyBFcnJvcignY29uc3RydWN0b3IgaXMgbm90IGEgZnVuY3Rpb24nKTtcbiAgfVxuICBFcnJvci5hcHBseShzZWxmKTtcbiAgc2VsZi5tZXNzYWdlID0gXCJDb21wbGV4IEVycm9yXCI7XG4gIHNlbGYuZXJyb3JzID0gbGlzdDtcbn1cblxuRXJyb3JMaXN0LnByb3RvdHlwZS5lcnJvcnMgPSB1bmRlZmluZWQ7XG5leHBvcnRzLlV0aWwuaW5oZXJpdHMoRXJyb3JMaXN0LCBFcnJvcik7XG5cbmV4cG9ydHMuRXJyb3JMaXN0ID0gRXJyb3JMaXN0OyIsIi8qIVxuICogTW9kdWxlIGRlcGVuZGVuY3lcbiAqL1xudmFyIENvbnRleHQgPSByZXF1aXJlKCcuL2NvbnRleHQnKS5Db250ZXh0O1xudmFyIFN0YWdlID0gcmVxdWlyZSgnLi9zdGFnZScpLlN0YWdlO1xudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKS5VdGlsO1xuXG4vKipcbiAqIFdyYXAgc3RhZ2VcbiAqIGNvbmZpZ3VyYXRpb246XG4gKiBcdC0gcHJlcGFyZSAtLS0gdXNlZCB0byBwcmVwZXJhIG5ldyBjb250ZXh0IHRoYXQgZml0cyB3cmFwcGVkIHN0YWdlIFxuICogXHQtIGZpbmFsaXplIC0tLSB1c2VkIHRvIHdyaXRlIGZpbGwgbWFpbiBjb250ZXh0IHdpdGggcmVzdWx0XG4gKi9cbmZ1bmN0aW9uIFdyYXAoY29uZmlnKSB7XG5cblx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdGlmICghKHNlbGYgaW5zdGFuY2VvZiBXcmFwKSkge1xuXHRcdHRocm93IG5ldyBFcnJvcignY29uc3RydWN0b3IgaXMgbm90IGEgZnVuY3Rpb24nKTtcblx0fVxuXG5cdGlmIChjb25maWcgJiYgY29uZmlnLnJ1biBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG5cdFx0Y29uZmlnLnN0YWdlID0gbmV3IFN0YWdlKGNvbmZpZy5ydW4pO1xuXHRcdGRlbGV0ZSBjb25maWcucnVuO1xuXHR9XG5cblx0U3RhZ2UuYXBwbHkoc2VsZiwgYXJndW1lbnRzKTtcblxuXHRpZiAoY29uZmlnLnN0YWdlIGluc3RhbmNlb2YgU3RhZ2UpIHtcblx0XHRzZWxmLnN0YWdlID0gY29uZmlnLnN0YWdlO1xuXHR9IGVsc2UgaWYgKGNvbmZpZy5zdGFnZSBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG5cdFx0c2VsZi5zdGFnZSA9IG5ldyBTdGFnZShjb25maWcuc3RhZ2UpO1xuXHR9IGVsc2Uge1xuXHRcdHNlbGYuc3RhZ2UgPSBuZXcgU3RhZ2UoKTtcblx0fVxuXG5cdGlmIChjb25maWcpIHtcblxuXHRcdGlmIChjb25maWcucHJlcGFyZSBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG5cdFx0XHRzZWxmLnByZXBhcmUgPSBjb25maWcucHJlcGFyZTtcblx0XHR9XG5cblx0XHRpZiAoY29uZmlnLmZpbmFsaXplIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcblx0XHRcdHNlbGYuZmluYWxpemUgPSBjb25maWcuZmluYWxpemU7XG5cdFx0fVxuXHR9XG59XG5cbi8qIVxuICogSW5oZXJpdGVkIGZyb20gU3RhZ2VcbiAqL1xudXRpbC5pbmhlcml0cyhXcmFwLCBTdGFnZSk7XG5cbi8qKlxuICogZGVmYXVsdCBwcmVwYXJlIGltcGxlbWVudGF0aW9uXG4gKiBAcGFyYW0ge0NvbnRleHR9IGN0eFxuICogQHJldHVybiB7Q29udGV4dH1cbiAqL1xuV3JhcC5wcm90b3R5cGUucHJlcGFyZSA9IGZ1bmN0aW9uKGN0eCkge1xuXHRyZXR1cm4gY3R4O1xufTtcblxuLyoqXG4gKiBkZWZhdWx0IGZpbmFsaXplIGltcGxlbWVudGF0aW9uXG4gKiBAcGFyYW0ge0NvbnRleHR9IGN0eFxuICogQHBhcmFtIHtDb250ZXh0fSBcbiAqL1xuV3JhcC5wcm90b3R5cGUuZmluYWxpemUgPSBmdW5jdGlvbihjdHgsIHJldEN0eCkge1xuXHQvLyBieSBkZWZhdWx0IHRoZSBtYWluIGNvbnRleHQgd2lsbCBiZSB1c2VkIHRvIHJldHVybjtcblx0Ly8gc28gd2UgZG8gbm90aGluZyBoZXJlXG59O1xuXG4vKipcbiAqIG92ZXJyaWRlIG9mIGByZXBvcnROYW1lYFxuICogQGFwaSBwcm90ZWN0ZWRcbiAqL1xuV3JhcC5wcm90b3R5cGUucmVwb3J0TmFtZSA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gXCJXcmFwOlwiICsgdGhpcy5uYW1lO1xufTtcblxuLyoqXG4gKiBvdmVycmlkZSBvZiBjb21waWxlXG4gKiBAYXBpIHByb3RlY3RlZFxuICovXG5XcmFwLnByb3RvdHlwZS5jb21waWxlID0gZnVuY3Rpb24oKSB7XG5cdHZhciBzZWxmID0gdGhpcztcblxuXHRpZiAoIXNlbGYubmFtZSkge1xuXHRcdHNlbGYubmFtZSA9IFwic3VjY2VzczogXCIgKyBzZWxmLnN0YWdlLnJlcG9ydE5hbWUoKSArIFwiIGZhaWx1cmU6IFwiICsgc2VsZi5vdmVyZHVlLnJlcG9ydE5hbWUoKTtcblx0fVxuXG5cdHZhciBydW4gPSBmdW5jdGlvbihjdHgsIGRvbmUpIHtcblx0XHRzZWxmLnN0YWdlLmV4ZWN1dGUoY3R4LCBkb25lKTtcblx0fTtcblxuXHRzZWxmLnJ1biA9IHJ1bjtcbn07XG5cbi8qKlxuICogb3ZlcnJpZGUgb2YgZXhlY3V0ZVxuICogQGFwaSBwcm90ZWN0ZWRcbiAqL1xuV3JhcC5wcm90b3R5cGUuZXhlY3V0ZSA9IGZ1bmN0aW9uKF9jb250ZXh0LCBjYWxsYmFjaykge1xuXHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0X2NvbnRleHQgPSBDb250ZXh0LmVuc3VyZShfY29udGV4dCk7XG5cdHZhciBjb250ZXh0ID0gc2VsZi5wcmVwYXJlKF9jb250ZXh0KTtcblx0X2NvbnRleHQuZW5zdXJlSXNDaGlsZChjb250ZXh0KTtcblxuXHRpZiAoIXNlbGYucnVuKSB7XG5cdFx0c2VsZi5jb21waWxlKCk7XG5cdH1cblxuXHR2YXIgY2IgPSBmdW5jdGlvbihlcnIsIGNvbnRleHQpIHtcblx0XHRpZiAoIWVycikge1xuXHRcdFx0c2VsZi5maW5hbGl6ZShfY29udGV4dCwgY29udGV4dCk7XG5cdFx0XHRjYWxsYmFjayhudWxsLCBfY29udGV4dCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGNhbGxiYWNrKGVycik7XG5cdFx0fVxuXHR9O1xuXG5cdFdyYXAuc3VwZXJfLnByb3RvdHlwZS5leGVjdXRlLmFwcGx5KHNlbGYsIFtjb250ZXh0LCBjYl0pO1xufTtcblxuLyohXG4gKiBleHBvcnRzXG4gKi9cbmV4cG9ydHMuV3JhcCA9IFdyYXA7IiwidmFyIGNvbXBhcmF0b3IgPSByZXF1aXJlKCcuL2xpYi9jb21wYXJhdG9yLmpzJyk7XG52YXIgZm9sZHVuZm9sZCA9IHJlcXVpcmUoJy4vbGliL2ZvbGR1bmZvbGQuanMnKTtcbmV4cG9ydHMuZ2V0Q29tcGFyYXRvciA9IGNvbXBhcmF0b3IuZ2V0Q29tcGFyYXRvcjtcbmV4cG9ydHMuc3RyaWN0RXEgPSBjb21wYXJhdG9yLnN0cmljdEVxO1xuZXhwb3J0cy5sb29zZUVxID0gY29tcGFyYXRvci5sb29zZUVxO1xuZXhwb3J0cy5zdHJ1Y3R1cmVFcSA9IGNvbXBhcmF0b3Iuc3RydWN0dXJlRXE7XG5leHBvcnRzLmRpZmYgPSBjb21wYXJhdG9yLmRpZmY7XG5leHBvcnRzLmZvbGQgPSBmb2xkdW5mb2xkLmZvbGQ7XG5leHBvcnRzLnVuZm9sZCA9IGZvbGR1bmZvbGQudW5mb2xkO1xuZXhwb3J0cy5nZXQgPSBmb2xkdW5mb2xkLmdldDtcbmV4cG9ydHMuc2V0ID0gZm9sZHVuZm9sZC5zZXQ7IiwiZnVuY3Rpb24gRXF1YWxpdHkoKSB7fVxuXG5FcXVhbGl0eS5mYWxzZSA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gZmFsc2U7XG59O1xuXG5FcXVhbGl0eS50cnVlID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0cnVlO1xufTtcblxuLypcblx0MCAtIG5vdEVxdWFsLFxuXHQxIC0gc3RyaWN0XG5cdDIgLSBsb29zZVxuXHQzIC0gc3RydWN0dXJlXG4qL1xuXG5FcXVhbGl0eS5kaWZmVmFsdWUgPSBmdW5jdGlvbihhLCBiLCBjb21wcmF0b3IpIHtcblx0aWYgKGEgPT09IGIpIHJldHVybiB7XG5cdFx0cmVzdWx0OiAxLFxuXHRcdHZhbHVlOiBiXG5cdH07XG5cdGlmIChhICE9IG51bGwgJiYgYiAhPSBudWxsICYmIGEudmFsdWVPZigpID09IGIudmFsdWVPZigpKSByZXR1cm4ge1xuXHRcdHJlc3VsdDogMixcblx0XHRmcm9tOiBhLFxuXHRcdHRvOiBiXG5cdH07XG5cdHJldHVybiB7XG5cdFx0cmVzdWx0OiAwLFxuXHRcdGZyb206IGEsXG5cdFx0dG86IGJcblx0fTtcbn07XG5cbkVxdWFsaXR5LmRpZmZTdHJpbmcgPSBmdW5jdGlvbihhLCBiLCBjb21wcmF0b3IpIHtcblx0aWYgKGEgPT09IGIpIHJldHVybiB7XG5cdFx0cmVzdWx0OiAxLFxuXHRcdHZhbHVlOiBiXG5cdH07XG5cdGlmIChhLnRvU3RyaW5nKCkgPT0gYi50b1N0cmluZygpKSByZXR1cm4ge1xuXHRcdHJlc3VsdDogMixcblx0XHRmcm9tOiBhLFxuXHRcdHRvOiBiXG5cdH07XG5cdHJldHVybiB7XG5cdFx0cmVzdWx0OiAwLFxuXHRcdGZyb206IGEsXG5cdFx0dG86IGJcblx0fTtcbn07XG5cbi8vIGRpZmYg0YHQvtC00LXRgNC20LjRgiDRgtC+0LvRjNC60L4g0L/QvtC70Y8g0LrQvtGC0L7RgNGL0LUg0LjQt9C80LXQvdC40LvQuNGB0YwgPz9cbkVxdWFsaXR5LmVxT2JqZWN0ID0gZnVuY3Rpb24oY29uZmlnKSB7XG5cdGlmIChjb25maWcuc3RyaWN0KSB7XG5cdFx0Ly8g0YHRgtGA0L7Qs9C+0LUg0YDQsNCy0LXQvdGB0YLQstC+INGB0YLRgNGD0LrRgtGD0YDQsCArINC00LDQvdC90YvQtVxuXHRcdHJldHVybiBmdW5jdGlvbihzb3VyY2UsIGRlc3QsIGNvbXBhcmUpIHtcblx0XHRcdGlmIChzb3VyY2UgPT0gZGVzdCkgcmV0dXJuIHRydWU7XG5cdFx0XHR2YXIga3MgPSBPYmplY3Qua2V5cyhzb3VyY2UpO1xuXHRcdFx0dmFyIGtkID0gT2JqZWN0LmtleXMoZGVzdCk7XG5cdFx0XHR2YXIgcmV0LCBrZXk7XG5cdFx0XHR2YXIgc28gPSBrcy50b1N0cmluZygpID09IGtkLnRvU3RyaW5nKCk7XG5cdFx0XHRpZiAoc28pIHtcblx0XHRcdFx0Zm9yICh2YXIgaSA9IDAsIGxlbiA9IGtzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG5cdFx0XHRcdFx0a2V5ID0ga3NbaV07XG5cdFx0XHRcdFx0aWYgKCFjb21wYXJlKHNvdXJjZVtrZXldLCBkZXN0W2tleV0pKVxuXHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9O1xuXHR9XG5cblx0aWYgKGNvbmZpZy5sb29zZSkge1xuXHRcdC8vINCy0YLQvtGA0L7QuSDQvtCx0YrQtdC60YIg0LzQvtC20LXRgiDRgdC+0LTQtdGA0LbQsNGC0Ywg0LTQvtC/0L7Qu9C90LjRgtC10LvRjNC90YvQtSDQv9C+0LvRjywg0L3QviDQvNGLINC40YUg0L3QtSDRgNCw0YHRgdC80LDRgtGA0LjQstCw0LXQvC5cblx0XHQvLyDRgdGC0YDRg9C60YLRg9GA0LAg0Lgg0YDQsNCy0LXQvdGB0YLQstC+Kihjb21wYXJlKSDRgtC+0LPQviDRh9GC0L4g0LXRgdGC0Ywg0YEg0YLQtdC8INGH0YLQviDQtNCw0LvQuFxuXHRcdHJldHVybiBmdW5jdGlvbihzb3VyY2UsIGRlc3QsIGNvbXBhcmUpIHtcblx0XHRcdGlmIChzb3VyY2UgPT0gZGVzdCkgcmV0dXJuIHRydWU7XG5cdFx0XHR2YXIga3MgPSBPYmplY3Qua2V5cyhzb3VyY2UpO1xuXHRcdFx0dmFyIGtkID0gT2JqZWN0LmtleXMoZGVzdCk7XG5cdFx0XHR2YXIgcmV0LCBrZXk7XG5cdFx0XHRmb3IgKHZhciBpID0gMCwgbGVuID0ga3MubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcblx0XHRcdFx0a2V5ID0ga3NbaV07XG5cdFx0XHRcdGlmICghY29tcGFyZShzb3VyY2Vba2V5XSwgZGVzdFtrZXldKSkgcmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fTtcblx0fVxuXG5cdGlmIChjb25maWcuc3RydWN0dXJlKSB7XG5cdFx0Ly8g0L/RgNC+0LLQtdGA0Y/QtdC8INGH0YLQviDRgdGC0YDRg9C60YLRg9GA0LAg0L7QsdGK0LXQutGC0LAg0YLQsNC60LDRjyDQttC1XG5cdFx0Ly8g0LLRgtC+0YDQvtC5INC+0LHRitC10LrRgiDQvNC+0LbQtdGCINGB0L7QtNC10YDQttCw0YLRjCDQvdC+0LLRi9C1INC/0L7Qu9GPLCBcblx0XHQvLyDQuCDQvdC+0LLRi9C1INC00LDQvdC90YvQtSwg0L3QviDRgdGC0YDRg9C60YLRg9GA0LAg0YLQsCDQttC1XG5cdFx0cmV0dXJuIGZ1bmN0aW9uKHNvdXJjZSwgZGVzdCwgY29tcGFyZSkge1xuXHRcdFx0aWYgKHNvdXJjZSA9PSBkZXN0KSByZXR1cm4gdHJ1ZTtcblx0XHRcdHZhciBrcyA9IE9iamVjdC5rZXlzKHNvdXJjZSk7XG5cdFx0XHR2YXIga2QgPSBPYmplY3Qua2V5cyhkZXN0KTtcblx0XHRcdHZhciByZXQsIGksIGxlbiwga2V5O1xuXHRcdFx0aWYgKGtzLmxlbmd0aCA+IGtkLmxlbmd0aCkgcmV0dXJuIGZhbHNlO1xuXHRcdFx0dmFyIHNvID0ga3MudG9TdHJpbmcoKSA9PSBrZC50b1N0cmluZygpO1xuXHRcdFx0aWYgKHNvKSB7XG5cdFx0XHRcdGZvciAoaSA9IDAsIGxlbiA9IGtzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG5cdFx0XHRcdFx0a2V5ID0ga3NbaV07XG5cdFx0XHRcdFx0aWYgKCFjb21wYXJlKHNvdXJjZVtrZXldLCBkZXN0W2tleV0pKSByZXR1cm4gZmFsc2U7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHZhciBrc2QgPSBPYmplY3Qua2V5cyhzb3VyY2UpLnNvcnQoKTtcblx0XHRcdFx0dmFyIGtzcyA9IE9iamVjdC5rZXlzKGRlc3QpLnNvcnQoKTtcblx0XHRcdFx0dmFyIHBhc3NlZCA9IHt9O1xuXHRcdFx0XHRmb3IgKGkgPSAwLCBsZW4gPSBrc2QubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcblx0XHRcdFx0XHRrZXkgPSBrc2RbaV07XG5cdFx0XHRcdFx0cGFzc2VkW2tleV0gPSAxO1xuXHRcdFx0XHRcdGlmICghY29tcGFyZShzb3VyY2Vba2V5XSwgZGVzdFtrZXldKSkgcmV0dXJuIGZhbHNlO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChPYmplY3Qua2V5cyhwYXNzZWQpLnNvcnQoKS50b1N0cmluZygpICE9IGtzZC50b1N0cmluZygpKSByZXR1cm4gZmFsc2U7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9O1xuXHR9XG5cblx0aWYgKGNvbmZpZy5kaWZmKSB7XG5cdFx0Ly8gZnVsbCBwcm9jZXNzaW5nXG5cdFx0Ly8g0LfQtNC10YHRjCDQvNGLINC00L7Qu9C20L3RiyDQv9C+0LvRg9GH0LjRgtGMINCy0YHQtSDQstCw0YDQuNCw0L3RgtGLINGB0YDQsNC30YNcblx0XHQvLyBzdHJpY3Rcblx0XHQvLyBsb29zZVxuXHRcdC8vIHN0cnVjdHVyZVxuXHRcdC8vIGRpZmZcblx0XHRyZXR1cm4gZnVuY3Rpb24oc291cmNlLCBkZXN0LCBjb21wYXJlKSB7XG5cdFx0XHRpZiAoc291cmNlID09IGRlc3QpIHJldHVybiB7XG5cdFx0XHRcdHJlc3VsdDogMSxcblx0XHRcdFx0dmFsdWU6IGRlc3Rcblx0XHRcdH07XG5cdFx0XHR2YXIgcmVzdWx0ID0ge307XG5cdFx0XHR2YXIgaSwgbGVuLCBrZXksIHJldDtcblx0XHRcdHZhciBrcyA9IE9iamVjdC5rZXlzKHNvdXJjZSk7XG5cdFx0XHR2YXIga2QgPSBPYmplY3Qua2V5cyhkZXN0KTtcblx0XHRcdHZhciBzbyA9IGtzLnRvU3RyaW5nKCkgPT0ga2QudG9TdHJpbmcoKTtcblx0XHRcdGlmIChzbykge1xuXHRcdFx0XHRyZXN1bHQucmVzdWx0ID0gMTtcblx0XHRcdFx0Zm9yIChpID0gMCwgbGVuID0ga3MubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcblx0XHRcdFx0XHRrZXkgPSBrc1tpXTtcblx0XHRcdFx0XHRyZXQgPSByZXN1bHRba2V5XSA9IGNvbXBhcmUoc291cmNlW2tleV0sIGRlc3Rba2V5XSk7XG5cdFx0XHRcdFx0aWYgKHJldC5yZXN1bHQgPT09IDApIHJldC5yZXN1bHQgPSAzO1xuXHRcdFx0XHRcdGlmIChyZXQucmVzdWx0ID4gMCAmJiByZXN1bHQucmVzdWx0IDwgcmV0LnJlc3VsdClcblx0XHRcdFx0XHRcdHJlc3VsdC5yZXN1bHQgPSByZXQucmVzdWx0O1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXN1bHQucmVzdWx0ID0gMTtcblx0XHRcdFx0dmFyIGtzZCA9IE9iamVjdC5rZXlzKHNvdXJjZSkuc29ydCgpO1xuXHRcdFx0XHR2YXIga3NzID0gT2JqZWN0LmtleXMoZGVzdCkuc29ydCgpO1xuXHRcdFx0XHRyZXN1bHQucmVvcmRlciA9IGtzLnRvU3RyaW5nKCkgIT0ga2QudG9TdHJpbmcoKTtcblx0XHRcdFx0dmFyIHBhc3NlZCA9IHt9O1xuXHRcdFx0XHR2YXIgc3JjSSwgZHN0STtcblx0XHRcdFx0Zm9yIChpID0gMCwgbGVuID0ga3NkLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG5cdFx0XHRcdFx0a2V5ID0ga3NkW2ldO1xuXHRcdFx0XHRcdHBhc3NlZFtrZXldID0gdHJ1ZTtcblx0XHRcdFx0XHRzcmNJID0ga3MuaW5kZXhPZihrZXkpO1xuXHRcdFx0XHRcdGRzdEkgPSBrZC5pbmRleE9mKGtleSk7XG5cdFx0XHRcdFx0aWYgKGRzdEkgPj0gMCkge1xuXHRcdFx0XHRcdFx0cmVzdWx0W2tleV0gPSB7fTtcblx0XHRcdFx0XHRcdGlmIChzcmNJICE9IGRzdEkpXG5cdFx0XHRcdFx0XHRcdHJlc3VsdFtrZXldLm9yZGVyID0ge1xuXHRcdFx0XHRcdFx0XHRcdGZyb206IGtzLmluZGV4T2Yoa2V5KSxcblx0XHRcdFx0XHRcdFx0XHR0bzoga2QuaW5kZXhPZihrZXkpXG5cdFx0XHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0XHRyZXQgPSByZXN1bHRba2V5XS52YWx1ZSA9IGNvbXBhcmUoc291cmNlW2tleV0sIGRlc3Rba2V5XSk7XG5cdFx0XHRcdFx0XHRpZiAocmV0LnJlc3VsdCA9PT0gMCkgcmV0LnJlc3VsdCA9IDM7XG5cdFx0XHRcdFx0XHQvLyBzdHJ1Y3R1cmUgb2YgY3VycmVudCBvYmplY3QgaXNuJ3QgY2hhbmdlZFxuXHRcdFx0XHRcdFx0aWYgKHJldC5yZXN1bHQgPiAwICYmIHJlc3VsdC5yZXN1bHQgPCByZXQucmVzdWx0KVxuXHRcdFx0XHRcdFx0XHRyZXN1bHQucmVzdWx0ID0gcmV0LnJlc3VsdDtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0Ly8gcmVtb3ZlZCBpdGVtc1xuXHRcdFx0XHRcdFx0cmVzdWx0LnJlc3VsdCA9IDA7XG5cdFx0XHRcdFx0XHRpZiAoIXJlc3VsdC5yZW1vdmVkKSByZXN1bHQucmVtb3ZlZCA9IHt9O1xuXHRcdFx0XHRcdFx0cmVzdWx0LnJlbW92ZWRba2V5XSA9IHtcblx0XHRcdFx0XHRcdFx0b3JkZXI6IGtzLmluZGV4T2Yoa2V5KSxcblx0XHRcdFx0XHRcdFx0dmFsdWU6IHNvdXJjZVtrZXldXG5cdFx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHQvLyBuZXcgaXRlbXNcblx0XHRcdFx0Zm9yIChpID0gMCwgbGVuID0ga3NzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG5cdFx0XHRcdFx0a2V5ID0ga3NzW2ldO1xuXHRcdFx0XHRcdGlmIChwYXNzZWRba2V5XSA9PT0gdHJ1ZSkgY29udGludWU7XG5cdFx0XHRcdFx0Ly8gaWYgKHJlc3VsdC5yZXN1bHQgPiAwKSByZXN1bHQucmVzdWx0ID0gMjtcblx0XHRcdFx0XHRwYXNzZWRba2V5XSA9IHRydWU7XG5cdFx0XHRcdFx0aWYgKCFyZXN1bHQuaW5zZXJ0ZWQpIHJlc3VsdC5pbnNlcnRlZCA9IHt9O1xuXHRcdFx0XHRcdHJlc3VsdC5pbnNlcnRlZFtrZXldID0ge1xuXHRcdFx0XHRcdFx0b3JkZXI6IGtkLmluZGV4T2Yoa2V5KSxcblx0XHRcdFx0XHRcdHZhbHVlOiBkZXN0W2tleV1cblx0XHRcdFx0XHR9O1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gcmVzdWx0O1xuXHRcdH07XG5cdH1cbn07XG5cbkVxdWFsaXR5LmVxQXJyYXkgPSBmdW5jdGlvbihjb25maWcpIHtcblx0Ly8gc3RyaWN0IC0tINC/0L7Qu9C90L7QtSDRgNCw0LLQtdC90YHRgtCy0L5cblx0Ly8gbG9vc2UgLS0g0L7QsdGK0LXQutGC0Ysg0L/QtdGA0LXQvNC10YjQsNC90YssINC/0LXRgNC10YHQvtGA0YLQuNGA0L7QstCw0L3Riywg0L3QviDQstGB0LUg0L3QsCDQvNC10YHRgtC1XG5cdC8vIHN0cnVjdHVyZSAtLSDQvtCx0YrQtdC60YLRiyDQvdCwINGB0LLQvtC40YUg0LzQtdGB0YLQsNGFINC4INC60LDQttC00YvQuSDQuNC80LXQtdGCINGB0LLQvtGOINGB0YLRgNGD0LrRgtGD0YDRgy5cblx0Ly8gZGlmZlxuXHQvLyBkaWZmIHJlb3JkZXIg0LzQsNGB0YHQuNCy0Ysg0L/RgNC+0YHRgtGL0YUg0LfQvdCw0YfQtdC90LjQuSDRgtC+0LvRjNC60L4g0LXRgdC70LggXG5cdC8vINC90YPQttC90L4g0L/RgNC40LTRg9C80LDRgtGMINGD0YHQu9C+0LLQuNGPXG5cdC8vIDEuINC60L7Qs9C00LAg0LTQu9C40L3QvdCwINC+0LTQuNC90LDQutC+0LLQsNGPXG5cdC8vIDIuINC60L7Qs9C00LAg0LzQtdC90YjRjNC1INGB0YLQsNC70LBcblx0Ly8gMy4g0LrQvtCz0LTQsCDQsdC+0LvRjNGI0LUg0YHRgtCw0LvQsFxuXHQvLyDQuNC70Lgg0LfQsNCx0LjRgtGMIDopXG5cdC8vINGB0LTQtdC70LDRgtGMINC00LvRjyDQutCw0LbQtNC+0LPQviDRgtC40L/QsCDRgdCy0L7RjiDRhNGD0L3QutGG0LjRjiDQutCw0Log0LIg0L7QsdGK0LXQutGC0LVcblx0aWYgKGNvbmZpZy5zdHJpY3QgfHwgY29uZmlnLnN0cnVjdHVyZSkge1xuXHRcdHJldHVybiBmdW5jdGlvbihzb3VyY2UsIGRlc3QsIGNvbXBhcmUpIHtcblx0XHRcdGlmIChzb3VyY2UgPT0gZGVzdCkgcmV0dXJuIHtcblx0XHRcdFx0cmVzdWx0OiAxLFxuXHRcdFx0XHR2YWx1ZTogZGVzdFxuXHRcdFx0fTtcblx0XHRcdGlmICgoc291cmNlICYmIGRlc3QgJiYgc291cmNlLmxlbmd0aCA9PSBkZXN0Lmxlbmd0aCkpIHtcblx0XHRcdFx0Zm9yICh2YXIgaSA9IDAsIGxlbiA9IHNvdXJjZS5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuXHRcdFx0XHRcdGlmICghY29tcGFyZShzb3VyY2VbaV0sIGRlc3RbaV0pKSByZXR1cm4gZmFsc2U7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHR9IGVsc2Vcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH07XG5cdH1cblx0aWYgKGNvbmZpZy5sb29zZSkge1xuXHRcdHJldHVybiBmdW5jdGlvbihzb3VyY2UsIGRlc3QsIGNvbXBhcmUpIHtcblx0XHRcdGlmIChzb3VyY2UgPT0gZGVzdCkgcmV0dXJuIHtcblx0XHRcdFx0cmVzdWx0OiAxLFxuXHRcdFx0XHR2YWx1ZTogZGVzdFxuXHRcdFx0fTtcblx0XHRcdHZhciB2YWwsIGksIGxlbjtcblx0XHRcdHZhciBmb3VuZEl0ZW1zID0gW107XG5cdFx0XHRmb3VuZEl0ZW1zLmxlbmd0aCA9IHNvdXJjZS5sZW5ndGggPiBkZXN0Lmxlbmd0aCA/IHNvdXJjZS5sZW5ndGggOiBkZXN0Lmxlbmd0aDtcblx0XHRcdGlmICgoc291cmNlICYmIGRlc3QgJiYgc291cmNlLmxlbmd0aCA8PSBkZXN0Lmxlbmd0aCkpIHtcblx0XHRcdFx0Zm9yIChpID0gMCwgbGVuID0gc291cmNlLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG5cdFx0XHRcdFx0dmFsID0gc291cmNlW2ldO1xuXHRcdFx0XHRcdHZhciByZWMsIGNtcFJlcywgZm91bmQ7XG5cdFx0XHRcdFx0Zm9yICh2YXIgaiA9IDAsIGRzdGxlbiA9IGRlc3QubGVuZ3RoOyBqIDwgZHN0bGVuOyBqKyspIHtcblx0XHRcdFx0XHRcdHJlYyA9IGRlc3Rbal07XG5cdFx0XHRcdFx0XHRjbXBSZXMgPSBjb21wYXJlKHZhbCwgcmVjKTtcblx0XHRcdFx0XHRcdGlmIChjbXBSZXMpIHtcblx0XHRcdFx0XHRcdFx0Zm91bmQgPSByZWM7XG5cdFx0XHRcdFx0XHRcdGlmICghZm91bmRJdGVtc1tqXSlcblx0XHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdGZvdW5kID0gdW5kZWZpbmVkO1xuXHRcdFx0XHRcdFx0XHRkc3RJID0gLTE7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmICghZm91bmQpIHJldHVybiBmYWxzZTtcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblxuXHRcdFx0fSBlbHNlXG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9O1xuXHR9XG5cdGlmIChjb25maWcuZGlmZikge1xuXHRcdHJldHVybiBmdW5jdGlvbihzb3VyY2UsIGRlc3QsIGNvbXBhcmUpIHtcblx0XHRcdGlmIChzb3VyY2UgPT0gZGVzdCkgcmV0dXJuIHtcblx0XHRcdFx0cmVzdWx0OiAxLFxuXHRcdFx0XHR2YWx1ZTogZGVzdFxuXHRcdFx0fTtcblxuXHRcdFx0aWYgKEpTT04uc3RyaW5naWZ5KHNvdXJjZSkgPT0gSlNPTi5zdHJpbmdpZnkoZGVzdCkpIHJldHVybiB7XG5cdFx0XHRcdHJlc3VsdDogMSxcblx0XHRcdFx0dmFsdWU6IGRlc3Rcblx0XHRcdH07XG5cblx0XHRcdHZhciByZXN1bHQgPSB7XG5cdFx0XHRcdHJlc3VsdDogMSxcblx0XHRcdFx0cmVvcmRlcjogdHJ1ZSxcblx0XHRcdH07XG5cblx0XHRcdGZ1bmN0aW9uIGNvbXBhcmVSYXRpbmdzKGEsIGIpIHtcblx0XHRcdFx0cmV0dXJuIGEuY21wUmVzLmNoYW5nZVJhdGluZyA8IGIuY21wUmVzLmNoYW5nZVJhdGluZztcblx0XHRcdH1cblx0XHRcdHZhciB2YWwsIGksIGxlbjtcblx0XHRcdHZhciBmb3VuZEl0ZW1zID0gW107XG5cdFx0XHRmb3VuZEl0ZW1zLmxlbmd0aCA9IHNvdXJjZS5sZW5ndGggPiBkZXN0Lmxlbmd0aCA/IHNvdXJjZS5sZW5ndGggOiBkZXN0Lmxlbmd0aDtcblx0XHRcdHZhciBzcmNJLCBkc3RJO1xuXHRcdFx0Zm9yIChpID0gMCwgbGVuID0gc291cmNlLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG5cdFx0XHRcdHZhbCA9IHNvdXJjZVtpXTtcblx0XHRcdFx0dmFyIHJlYywgY21wUmVzLCBmb3VuZCwgYXBwcm94ID0gW107XG5cdFx0XHRcdGZvciAodmFyIGogPSAwLCBkc3RsZW4gPSBkZXN0Lmxlbmd0aDsgaiA8IGRzdGxlbjsgaisrKSB7XG5cdFx0XHRcdFx0cmVjID0gZGVzdFtqXTtcblx0XHRcdFx0XHRjbXBSZXMgPSBjb21wYXJlKHZhbCwgcmVjKTtcblx0XHRcdFx0XHRpZiAoY21wUmVzLnJlc3VsdCA+IDAgJiYgY21wUmVzLnJlc3VsdCA8IDMpIHtcblx0XHRcdFx0XHRcdGZvdW5kID0gcmVjO1xuXHRcdFx0XHRcdFx0ZHN0SSA9IGRlc3QuaW5kZXhPZihyZWMpO1xuXHRcdFx0XHRcdFx0aWYgKCFmb3VuZEl0ZW1zW2pdKVxuXHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHR9IGVsc2UgaWYgKGNtcFJlcy5yZXN1bHQgPT09IDMpIHtcblx0XHRcdFx0XHRcdGFwcHJveC5wdXNoKHtcblx0XHRcdFx0XHRcdFx0Zm91bmQ6IHJlYyxcblx0XHRcdFx0XHRcdFx0ZHN0STogZGVzdC5pbmRleE9mKHJlYyksXG5cdFx0XHRcdFx0XHRcdGNtcFJlczogY21wUmVzXG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0Zm91bmQgPSB1bmRlZmluZWQ7XG5cdFx0XHRcdFx0XHRkc3RJID0gLTE7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdHNyY0kgPSBzb3VyY2UuaW5kZXhPZih2YWwpO1xuXG5cdFx0XHRcdGlmICghZm91bmQgJiYgYXBwcm94Lmxlbmd0aCA+IDApIHtcblx0XHRcdFx0XHRkZWJ1Z2dlcjtcblx0XHRcdFx0XHRhcHByb3guc29ydChjb21wYXJlUmF0aW5ncyk7XG5cdFx0XHRcdFx0dmFyIGFGb3VuZCA9IGFwcHJveC5zaGlmdCgpO1xuXHRcdFx0XHRcdGZvdW5kID0gYUZvdW5kLmZvdW5kO1xuXHRcdFx0XHRcdGRzdEkgPSBhRm91bmQuZHN0STtcblx0XHRcdFx0XHRjbXBSZXMgPSBhRm91bmQuY21wUmVzO1xuXHRcdFx0XHRcdGFwcHJveC5sZW5ndGggPSAwO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKGZvdW5kKSB7XG5cdFx0XHRcdFx0cmVzdWx0W2ldID0ge307XG5cdFx0XHRcdFx0aWYgKHNyY0kgIT0gZHN0SSkge1xuXHRcdFx0XHRcdFx0cmVzdWx0W2ldLm9yZGVyID0ge1xuXHRcdFx0XHRcdFx0XHRmcm9tOiBzcmNJLFxuXHRcdFx0XHRcdFx0XHR0bzogZHN0SVxuXHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0Zm91bmRJdGVtc1tkc3RJXSA9IHRydWU7XG5cdFx0XHRcdFx0cmVzdWx0W2ldLnZhbHVlID0gY21wUmVzO1xuXHRcdFx0XHRcdGlmIChjbXBSZXMucmVzdWx0ID4gMSAmJiByZXN1bHQucmVzdWx0ICE9PSAwKSByZXN1bHQucmVzdWx0ID0gY21wUmVzLnJlc3VsdDtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRyZXN1bHQucmVzdWx0ID0gMDtcblx0XHRcdFx0XHRpZiAoIXJlc3VsdC5yZW1vdmVkKSByZXN1bHQucmVtb3ZlZCA9IHt9O1xuXHRcdFx0XHRcdHJlc3VsdC5yZW1vdmVkW2ldID0ge1xuXHRcdFx0XHRcdFx0b3JkZXI6IGRzdEksXG5cdFx0XHRcdFx0XHR2YWx1ZTogdmFsXG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0Zm9yIChpID0gMCwgbGVuID0gZGVzdC5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuXHRcdFx0XHR2YWwgPSBkZXN0W2ldO1xuXHRcdFx0XHRpZiAoZm91bmRJdGVtc1tpXSA9PT0gdHJ1ZSkgY29udGludWU7XG5cdFx0XHRcdGlmICghcmVzdWx0Lmluc2VydGVkKSByZXN1bHQuaW5zZXJ0ZWQgPSB7fTtcblx0XHRcdFx0Ly8gaWYgKHJlc3VsdC5yZXN1bHQgPiAwKSByZXN1bHQucmVzdWx0ID0gMjtcblx0XHRcdFx0cmVzdWx0Lmluc2VydGVkW2ldID0ge1xuXHRcdFx0XHRcdG9yZGVyOiBpLFxuXHRcdFx0XHRcdHZhbHVlOiB2YWxcblx0XHRcdFx0fTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKCFjb25maWcuZGlmZikge1xuXHRcdFx0XHR2YXIgcmVzID0gdHJ1ZTtcblx0XHRcdFx0Zm9yICh2YXIgdiBpbiByZXN1bHQpIHtcblx0XHRcdFx0XHRyZXMgPSByZXMgJiYgcmVzdWx0W3ZdO1xuXHRcdFx0XHRcdGlmICghcmVzKSBicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gcmVzO1xuXHRcdFx0fSBlbHNlXG5cdFx0XHRcdHJldHVybiByZXN1bHQ7XG5cdFx0fTtcblx0fVxufTtcblxudmFyIENvbXBhcmlhYmxlID0gcmVxdWlyZSgnLi9tYXBwaW5nLmpzJykuY21wKEVxdWFsaXR5KTtcblxuZnVuY3Rpb24gZ2V0Q29tcGFyYXRvcihhLCBiLCB0eXBlKSB7XG5cdHZhciBjbXByID0gQ29tcGFyaWFibGVbYV1bYl07XG5cdHZhciByZXMgPSBjbXByID8gY21wclt0eXBlXSA6IG51bGw7XG5cdGlmICghcmVzKSB7XG5cdFx0Y21wciA9IENvbXBhcmlhYmxlW2JdW2FdO1xuXHRcdHJlcyA9IGNtcHIgPyBjbXByW3R5cGVdIDogbnVsbDtcblx0fVxuXHRpZiAoIXJlcykge1xuXHRcdHN3aXRjaCAodHlwZSkge1xuXHRcdFx0Y2FzZSAnc3RyaWN0Jzpcblx0XHRcdFx0cmV0dXJuIEVxdWFsaXR5LmZhbHNlO1xuXHRcdFx0Y2FzZSAnbG9vc2UnOlxuXHRcdFx0XHRyZXR1cm4gRXF1YWxpdHkuZmFsc2U7XG5cdFx0XHRjYXNlICdzdHJ1Y3R1cmUnOlxuXHRcdFx0XHRyZXR1cm4gRXF1YWxpdHkuZmFsc2U7XG5cdFx0XHRjYXNlICdkaWZmJzpcblx0XHRcdFx0cmV0dXJuIEVxdWFsaXR5LmRpZmZWYWx1ZTtcblx0XHR9XG5cdH0gZWxzZSByZXR1cm4gcmVzO1xufVxuXG5mdW5jdGlvbiBnZXRUeXBlKHYpIHtcblx0cmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2KS5tYXRjaCgvXFxbb2JqZWN0ICguKylcXF0vKVsxXTtcbn1cblxuZnVuY3Rpb24gc3RyaWN0RXEoYSwgYikge1xuXHR2YXIgdDAgPSBnZXRUeXBlKGEpO1xuXHR2YXIgdDEgPSBnZXRUeXBlKGIpO1xuXHR2YXIgZm5jID0gZ2V0Q29tcGFyYXRvcih0MCwgdDEsICdzdHJpY3QnKTtcblx0cmV0dXJuIGZuYyhhLCBiLCBzdHJpY3RFcSk7XG59XG5cbmZ1bmN0aW9uIGxvb3NlRXEoYSwgYikge1xuXHR2YXIgdDAgPSBnZXRUeXBlKGEpO1xuXHR2YXIgdDEgPSBnZXRUeXBlKGIpO1xuXHR2YXIgZm5jID0gZ2V0Q29tcGFyYXRvcih0MCwgdDEsICdsb29zZScpO1xuXHRyZXR1cm4gZm5jKGEsIGIsIGxvb3NlRXEpO1xufVxuXG5mdW5jdGlvbiBzdHJ1Y3R1cmVFcShhLCBiKSB7XG5cdHZhciB0MCA9IGdldFR5cGUoYSk7XG5cdHZhciB0MSA9IGdldFR5cGUoYik7XG5cdHZhciBmbmMgPSBnZXRDb21wYXJhdG9yKHQwLCB0MSwgJ3N0cnVjdHVyZScpO1xuXHRyZXR1cm4gZm5jKGEsIGIsIHN0cnVjdHVyZUVxKTtcbn1cblxuZnVuY3Rpb24gZGlmZihhLCBiKSB7XG5cdHZhciB0MCA9IGdldFR5cGUoYSk7XG5cdHZhciB0MSA9IGdldFR5cGUoYik7XG5cdHZhciBmbmMgPSBnZXRDb21wYXJhdG9yKHQwLCB0MSwgJ2RpZmYnKTtcblx0cmV0dXJuIGZuYyhhLCBiLCBkaWZmKTtcbn1cblxuZXhwb3J0cy5nZXRDb21wYXJhdG9yID0gZ2V0Q29tcGFyYXRvcjtcbmV4cG9ydHMuc3RyaWN0RXEgPSBzdHJpY3RFcTtcbmV4cG9ydHMubG9vc2VFcSA9IGxvb3NlRXE7XG5leHBvcnRzLnN0cnVjdHVyZUVxID0gc3RydWN0dXJlRXE7XG5leHBvcnRzLmRpZmYgPSBkaWZmOyIsImZ1bmN0aW9uIHVuZm9sZChkYXRhLCBfcmVzdWx0LCBfcHJvcE5hbWUpIHtcblx0dmFyIHJlc3VsdCA9IF9yZXN1bHQgPyBfcmVzdWx0IDoge307XG5cdHZhciBwcm9wTmFtZSA9IF9wcm9wTmFtZSA/IF9wcm9wTmFtZSA6ICcnO1xuXHR2YXIgaSwgbGVuO1xuXHRpZiAoQXJyYXkuaXNBcnJheShkYXRhKSkge1xuXHRcdGZvciAoaSA9IDAsIGxlbiA9IGRhdGEubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcblx0XHRcdHVuZm9sZChkYXRhW2ldLCByZXN1bHQsIChwcm9wTmFtZSA/IChwcm9wTmFtZSArICcuJykgOiAnJykgKyBpKTtcblx0XHR9XG5cdH0gZWxzZSBpZiAoJ29iamVjdCcgPT0gdHlwZW9mIGRhdGEpIHtcblx0XHR2YXIga2V5cyA9IE9iamVjdC5rZXlzKGRhdGEpO1xuXHRcdGZvciAoaSA9IDAsIGxlbiA9IGtleXMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcblx0XHRcdHVuZm9sZChkYXRhW2tleXNbaV1dLCByZXN1bHQsIChwcm9wTmFtZSA/IChwcm9wTmFtZSArICcuJykgOiAnJykgKyBrZXlzW2ldKTtcblx0XHR9XG5cdH0gZWxzZSB7XG5cdFx0cmVzdWx0W3Byb3BOYW1lXSA9IGRhdGE7XG5cdH1cblx0cmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gZm9sZChkYXRhKSB7XG5cdHZhciByZXN1bHQgPSB7fTtcblx0dmFyIGtleXMgPSBPYmplY3Qua2V5cyhkYXRhKTtcblx0Zm9yICh2YXIgaSA9IDAsIGxlbiA9IGtleXMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcblx0XHRzZXQocmVzdWx0LCBrZXlzW2ldLCBkYXRhW2tleXNbaV1dKTtcblx0fVxuXHRyZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBzZXQoZGF0YSwgcGF0aCwgdmFsdWUpIHtcblx0aWYgKCdvYmplY3QnID09PSB0eXBlb2YgZGF0YSkge1xuXHRcdHZhciBwYXJ0cyA9IHBhdGguc3BsaXQoJy4nKTtcblx0XHRpZiAoQXJyYXkuaXNBcnJheShwYXJ0cykpIHtcblx0XHRcdHZhciBjdXJyID0gcGFydHMuc2hpZnQoKTtcblx0XHRcdGlmIChwYXJ0cy5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdGlmICghZGF0YVtjdXJyXSkge1xuXHRcdFx0XHRcdGlmIChpc05hTihwYXJ0c1swXSkpXG5cdFx0XHRcdFx0XHRkYXRhW2N1cnJdID0ge307XG5cdFx0XHRcdFx0ZWxzZSBkYXRhW2N1cnJdID0gW107XG5cdFx0XHRcdH1cblx0XHRcdFx0c2V0KGRhdGFbY3Vycl0sIHBhcnRzLmpvaW4oJy4nKSwgdmFsdWUpO1xuXHRcdFx0fSBlbHNlIGRhdGFbcGF0aF0gPSB2YWx1ZTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0ZGF0YVtwYXRoXSA9IHZhbHVlO1xuXHRcdH1cblx0fVxufVxuXG5mdW5jdGlvbiBnZXQoZGF0YSwgcGF0aCkge1xuXHRpZiAoJ29iamVjdCcgPT09IHR5cGVvZiBkYXRhKSB7XG5cdFx0aWYgKGRhdGFbcGF0aF0gPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0dmFyIHBhcnRzID0gcGF0aC5zcGxpdCgnLicpO1xuXHRcdFx0aWYgKEFycmF5LmlzQXJyYXkocGFydHMpKSB7XG5cdFx0XHRcdHZhciBjdXJyID0gcGFydHMuc2hpZnQoKTtcblx0XHRcdFx0aWYgKHBhcnRzLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0XHRyZXR1cm4gZ2V0KGRhdGFbY3Vycl0sIHBhcnRzLmpvaW4oJy4nKSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIGRhdGFbY3Vycl07XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBkYXRhW3BhdGhdO1xuXHR9XG5cdHJldHVybiBkYXRhO1xufVxuXG5leHBvcnRzLmdldCA9IGdldDtcbmV4cG9ydHMuc2V0ID0gc2V0O1xuZXhwb3J0cy5mb2xkID0gZm9sZDtcbmV4cG9ydHMudW5mb2xkID0gdW5mb2xkOyIsIi8vIGRlZmF1bHQgc3RyaWN0ID0gZXEuZmFsc2U7XG4vLyBkZWZhdWx0IGxvb3NlID0gZXEuZmFsc2U7XG4vLyBkZWZhdWx0IHN0cnVjdHVyZSA9IGVxLmZhbHNlO1xuLy8gZGVmYXVsdCBkaWZmID1lcS5kaWZmVmFsdWVcblxuLy8g0L/RgNC+0LLQtdGA0LjRgtGMINGA0LDQsdC+0YLRgywg0L/QvtGB0LTQtSDQtNC+0LTQtdC70LDRgtGMINCw0LTRgNC10YHQvdC+INC00LvRjyDQutCw0LbQtNC+0LPQviDRgtC40L/QsCBcbi8vINGC0LDQuiDRh9GC0L7QsdGLINC30L3QsNGC0Ywg0LrQsNC60L7QuSDQv9Cw0YDQsNC80LXRgtGAINC60LDQutC40Lwg0L/RgNC40YXQvtC00LjRglxuLy8g0YfRgtC+0LHRiyDQsdGL0LvQviDQvNC10L3RjNGI0LUg0L/RgNC+0LLQtdGA0L7QulxudmFyIGpzZGlmZiA9IHJlcXVpcmUoJ2RpZmYnKTtcblxuZXhwb3J0cy5jbXAgPSBmdW5jdGlvbihlcSkge1xuXHRyZXR1cm4ge1xuXHRcdFwiQm9vbGVhblwiOiB7XG5cdFx0XHRcIkJvb2xlYW5cIjoge1xuXHRcdFx0XHRzdHJpY3Q6IGZ1bmN0aW9uKGEsIGIpIHtcblx0XHRcdFx0XHRyZXR1cm4gYSA9PT0gYjtcblx0XHRcdFx0fSxcblx0XHRcdFx0bG9vc2U6IGZ1bmN0aW9uKGEsIGIpIHtcblx0XHRcdFx0XHRyZXR1cm4gYSA9PSBiO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRzdHJ1Y3R1cmU6IGVxLnRydWUsXG5cdFx0XHR9LFxuXHRcdFx0XCJOdW1iZXJcIjoge1xuXHRcdFx0XHRsb29zZTogZnVuY3Rpb24oYSwgYikge1xuXHRcdFx0XHRcdHJldHVybiBhID09IGI7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRcIlN0cmluZ1wiOiB7XG5cdFx0XHRcdGxvb3NlOiBmdW5jdGlvbihhLCBiKSB7XG5cdFx0XHRcdFx0dmFyIGJGYWxzZSA9IC9mYWxzZS9pLnRlc3QoYikgfHwgLzAvLnRlc3QoYik7XG5cdFx0XHRcdFx0dmFyIGJUcnVlID0gL3RydWUvaS50ZXN0KGIpIHx8IC8xLy50ZXN0KGIpO1xuXHRcdFx0XHRcdGlmIChhKSByZXR1cm4gYSA9PT0gYlRydWU7XG5cdFx0XHRcdFx0ZWxzZSByZXR1cm4gYSA9PT0gIWJGYWxzZTtcblx0XHRcdFx0fSxcblx0XHRcdFx0ZGlmZjogZnVuY3Rpb24oYSwgYikge1xuXHRcdFx0XHRcdHZhciByZXM7XG5cdFx0XHRcdFx0dmFyIGJGYWxzZSA9IC9mYWxzZS9pLnRlc3QoYikgfHwgLzAvLnRlc3QoYik7XG5cdFx0XHRcdFx0dmFyIGJUcnVlID0gL3RydWUvaS50ZXN0KGIpIHx8IC8xLy50ZXN0KGIpO1xuXHRcdFx0XHRcdGlmIChhKSByZXMgPSBhID09PSBiVHJ1ZTtcblx0XHRcdFx0XHRlbHNlIHJlcyA9IGEgPT09ICFiRmFsc2U7XG5cdFx0XHRcdFx0aWYgKHJlcykgcmV0dXJuIHtcblx0XHRcdFx0XHRcdHJlc3VsdDogMixcblx0XHRcdFx0XHRcdGZyb206IGEsXG5cdFx0XHRcdFx0XHR0bzogYlxuXHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRcdHJlc3VsdDogMCxcblx0XHRcdFx0XHRcdGZyb206IGEsXG5cdFx0XHRcdFx0XHR0bzogYlxuXHRcdFx0XHRcdH07XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRcIlVuZGVmaW5lZFwiOiB7XG5cdFx0XHRcdGxvb3NlOiBmdW5jdGlvbihhLCBiKSB7XG5cdFx0XHRcdFx0cmV0dXJuICFhID09ICFiO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0XCJOdWxsXCI6IHtcblx0XHRcdFx0bG9vc2U6IGZ1bmN0aW9uKGEsIGIpIHtcblx0XHRcdFx0XHRyZXR1cm4gIWEgPT0gIWI7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9LFxuXHRcdFwiTnVtYmVyXCI6IHtcblx0XHRcdFwiTnVtYmVyXCI6IHtcblx0XHRcdFx0c3RyaWN0OiBmdW5jdGlvbihhLCBiKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGEgPT09IGI7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdGxvb3NlOiBmdW5jdGlvbihhLCBiKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGEgPT0gYjtcblx0XHRcdFx0fSxcblx0XHRcdFx0c3RydWN0dXJlOiBlcS50cnVlLFxuXHRcdFx0fSxcblx0XHRcdFwiU3RyaW5nXCI6IHtcblx0XHRcdFx0bG9vc2U6IGZ1bmN0aW9uKGEsIGIpIHtcblx0XHRcdFx0XHRyZXR1cm4gYSA9PSBiO1xuXHRcdFx0XHR9LFxuXHRcdFx0fSxcblx0XHRcdFwiRGF0ZVwiOiB7XG5cdFx0XHRcdHN0cmljdDogZnVuY3Rpb24oYSwgYikge1xuXHRcdFx0XHRcdHJldHVybiBhID09IGI7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdGxvb3NlOiBmdW5jdGlvbihhLCBiKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGEudmFsdWVPZigpID09IGIudmFsdWVPZigpO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRzdHJ1Y3R1cmU6IGVxLnRydWVcblx0XHRcdH0sXG5cdFx0XHRcIk51bGxcIjoge1xuXHRcdFx0XHRsb29zZTogZnVuY3Rpb24oYSwgYikge1xuXHRcdFx0XHRcdHJldHVybiAhYSA9PSAhYjtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdFwiVW5kZWZpbmVkXCI6IHtcblx0XHRcdFx0bG9vc2U6IGZ1bmN0aW9uKGEsIGIpIHtcblx0XHRcdFx0XHRyZXR1cm4gIWEgPT0gIWI7XG5cdFx0XHRcdH0sXG5cdFx0XHR9LFxuXHRcdFx0XCJPYmplY3RcIjoge1xuXHRcdFx0XHRsb29zZTogZnVuY3Rpb24oYSwgYikge1xuXHRcdFx0XHRcdHJldHVybiBhLnRvU3RyaW5nKCkgPT0gYi50b1N0cmluZygpO1xuXHRcdFx0XHR9LFxuXHRcdFx0fSxcblx0XHRcdFwiRnVuY3Rpb25cIjoge1xuXHRcdFx0XHRsb29zZTogZnVuY3Rpb24oYSwgYikge1xuXHRcdFx0XHRcdHJldHVybiBhLnRvU3RyaW5nKCkgPT0gYi50b1N0cmluZygpO1xuXHRcdFx0XHR9LFxuXHRcdFx0fVxuXHRcdH0sXG5cdFx0XCJTdHJpbmdcIjoge1xuXHRcdFx0XCJCb29sZWFuXCI6IHtcblx0XHRcdFx0bG9vc2U6IGZ1bmN0aW9uKGEsIGIpIHtcblx0XHRcdFx0XHR2YXIgYUZhbHNlID0gL2ZhbHNlL2kudGVzdChhKSB8fCAvMC8udGVzdChhKTtcblx0XHRcdFx0XHR2YXIgYVRydWUgPSAvdHJ1ZS9pLnRlc3QoYSkgfHwgLzEvLnRlc3QoYSk7XG5cdFx0XHRcdFx0aWYgKGIpIHJldHVybiBiID09PSBhVHJ1ZTtcblx0XHRcdFx0XHRlbHNlIHJldHVybiBiID09PSAhYUZhbHNlO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRkaWZmOiBmdW5jdGlvbihhLCBiKSB7XG5cdFx0XHRcdFx0dmFyIHJlcztcblx0XHRcdFx0XHR2YXIgYUZhbHNlID0gL2ZhbHNlL2kudGVzdChhKSB8fCAvMC8udGVzdChhKTtcblx0XHRcdFx0XHR2YXIgYVRydWUgPSAvdHJ1ZS9pLnRlc3QoYSkgfHwgLzEvLnRlc3QoYSk7XG5cdFx0XHRcdFx0aWYgKGIpIHJlcyA9IGIgPT09IGFUcnVlO1xuXHRcdFx0XHRcdGVsc2UgcmVzID0gYiA9PT0gIWFGYWxzZTtcblx0XHRcdFx0XHRpZiAocmVzKSByZXR1cm4ge1xuXHRcdFx0XHRcdFx0cmVzdWx0OiAyLFxuXHRcdFx0XHRcdFx0ZnJvbTogYSxcblx0XHRcdFx0XHRcdHRvOiBiXG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdFx0cmVzdWx0OiAwLFxuXHRcdFx0XHRcdFx0ZnJvbTogYSxcblx0XHRcdFx0XHRcdHRvOiBiXG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdFwiU3RyaW5nXCI6IHtcblx0XHRcdFx0c3RyaWN0OiBmdW5jdGlvbihhLCBiKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGEgPT0gYjtcblx0XHRcdFx0fSxcblx0XHRcdFx0bG9vc2U6IGZ1bmN0aW9uKGEsIGIpIHtcblx0XHRcdFx0XHRyZXR1cm4gYSA9PSBiO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRzdHJ1Y3R1cmU6IGVxLnRydWUsXG5cdFx0XHRcdGRpZmY6IGZ1bmN0aW9uKGEsIGIpIHtcblx0XHRcdFx0XHRpZiAoYSA9PSBiKSByZXR1cm4ge1xuXHRcdFx0XHRcdFx0cmVzdWx0OiAxLFxuXHRcdFx0XHRcdFx0dmFsdWU6IGJcblx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdHZhciByZXN1bHQgPSBqc2RpZmYuZGlmZkxpbmVzKGEsIGIpO1xuXHRcdFx0XHRcdHZhciBzcmNMZW4gPSBhLmxlbmd0aDtcblx0XHRcdFx0XHR2YXIgZHN0TGVuID0gYi5sZW5ndGg7XG5cdFx0XHRcdFx0dmFyIHVuY2hhbmdlZENudCA9IDA7XG5cdFx0XHRcdFx0dmFyIHVuY2hhbmdlZExlbiA9IDA7XG5cdFx0XHRcdFx0dmFyIHJlbW92ZWRDbnQgPSAwO1xuXHRcdFx0XHRcdHZhciByZW1vdmVkTGVuID0gMDtcblx0XHRcdFx0XHR2YXIgYWRkZWRDbnQgPSAwO1xuXHRcdFx0XHRcdHZhciBhZGRlZExlbiA9IDA7XG5cblx0XHRcdFx0XHRyZXN1bHQuZm9yRWFjaChmdW5jdGlvbihwYXJ0KSB7XG5cdFx0XHRcdFx0XHRpZiAocGFydC5hZGRlZCkge1xuXHRcdFx0XHRcdFx0XHRhZGRlZENudCsrO1xuXHRcdFx0XHRcdFx0XHRhZGRlZExlbiArPSBwYXJ0LnZhbHVlLmxlbmd0aDtcblx0XHRcdFx0XHRcdH0gZWxzZVxuXHRcdFx0XHRcdFx0aWYgKHBhcnQucmVtb3ZlZCkge1xuXHRcdFx0XHRcdFx0XHRyZW1vdmVkQ250Kys7XG5cdFx0XHRcdFx0XHRcdHJlbW92ZWRMZW4gKz0gcGFydC52YWx1ZS5sZW5ndGg7XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHR1bmNoYW5nZWRDbnQrKztcblx0XHRcdFx0XHRcdFx0dW5jaGFuZ2VkTGVuICs9IHBhcnQudmFsdWUubGVuZ3RoO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdGlmICh1bmNoYW5nZWRDbnQgPT09IDEgJiYgYWRkZWRDbnQgPT09IDAgJiYgcmVtb3ZlZENudCA9PT0gMCkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRcdFx0cmVzdWx0OiAyLFxuXHRcdFx0XHRcdFx0XHRkaWZmOiBcImxpbmVzXCIsXG5cdFx0XHRcdFx0XHRcdGNoYW5nZXM6IHJlc3VsdFxuXHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKHVuY2hhbmdlZENudCA+IDAgJiYgKGFkZGVkQ250ID4gMCB8fCByZW1vdmVkQ250ID4gMCkpIHtcblx0XHRcdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0XHRcdHJlc3VsdDogMyxcblx0XHRcdFx0XHRcdFx0ZGlmZjogXCJsaW5lc1wiLFxuXHRcdFx0XHRcdFx0XHRjaGFuZ2VzOiByZXN1bHQsXG5cdFx0XHRcdFx0XHRcdC8qc3JjTGVuOiAoKGFkZGVkTGVuID4gcmVtb3ZlZExlbikgPyBkc3RMZW4gOiBzcmNMZW4pLFxuXHRcdFx0XHRcdFx0XHRyZW1vdmVkTGVuOiByZW1vdmVkTGVuLFxuXHRcdFx0XHRcdFx0XHRhZGRlZExlbjogYWRkZWRMZW4sKi9cblx0XHRcdFx0XHRcdFx0Y2hhbmdlUmF0aW5nOiBNYXRoLmFicyhhZGRlZExlbiAtIHJlbW92ZWRMZW4pIC8gKChhZGRlZExlbiA+IHJlbW92ZWRMZW4pID8gZHN0TGVuIDogc3JjTGVuKVxuXHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdFx0cmVzdWx0OiAwLFxuXHRcdFx0XHRcdFx0ZGlmZjogXCJsaW5lc1wiLFxuXHRcdFx0XHRcdFx0ZnJvbTogYSxcblx0XHRcdFx0XHRcdHRvOiBiXG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdFwiUmVnRXhwXCI6IHtcblx0XHRcdFx0c3RyaWN0OiBmdW5jdGlvbihhLCBiKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGEgPT0gYjtcblx0XHRcdFx0fSxcblx0XHRcdFx0bG9vc2U6IGZ1bmN0aW9uKGEsIGIpIHtcblx0XHRcdFx0XHRyZXR1cm4gYS50b1N0cmluZygpID09IGIudG9TdHJpbmcoKTtcblx0XHRcdFx0fSxcblx0XHRcdFx0c3RydWN0dXJlOiBlcS5mYWxzZVxuXHRcdFx0fSxcblx0XHRcdFwiRGF0ZVwiOiB7XG5cdFx0XHRcdHN0cmljdDogZnVuY3Rpb24oYSwgYikge1xuXHRcdFx0XHRcdGlmIChhLnRvU3RyaW5nKCkgPT0gYi50b1N0cmluZygpKSByZXR1cm4gdHJ1ZTtcblxuXHRcdFx0XHRcdGlmIChhLnRvSlNPTiB8fCBiLnRvSlNPTikge1xuXHRcdFx0XHRcdFx0dmFyIHYwLCB2MTtcblx0XHRcdFx0XHRcdGlmIChhLnRvSlNPTikgdjAgPSBhLnRvSlNPTigpO1xuXHRcdFx0XHRcdFx0ZWxzZSB2MCA9IHZhbHVlLnRvU3RyaW5nKCk7XG5cblx0XHRcdFx0XHRcdGlmIChiLnRvSlNPTikgdjEgPSBiLnRvSlNPTigpO1xuXHRcdFx0XHRcdFx0ZWxzZSB2MSA9IHZhbHVlLnRvU3RyaW5nKCk7XG5cdFx0XHRcdFx0XHRyZXR1cm4gdjAgPT0gdjE7XG5cdFx0XHRcdFx0fSBlbHNlIHJldHVybiBmYWxzZTtcblx0XHRcdFx0fSxcblx0XHRcdFx0bG9vc2U6IGZ1bmN0aW9uKGEsIGIpIHtcblx0XHRcdFx0XHRpZiAoYS50b1N0cmluZygpID09IGIudG9TdHJpbmcoKSkgcmV0dXJuIHRydWU7XG5cblx0XHRcdFx0XHRpZiAoYS50b0pTT04gfHwgYi50b0pTT04pIHtcblx0XHRcdFx0XHRcdHZhciB2MCwgdjE7XG5cdFx0XHRcdFx0XHRpZiAoYS50b0pTT04pIHYwID0gYS50b0pTT04oKTtcblx0XHRcdFx0XHRcdGVsc2UgdjAgPSB2YWx1ZS50b1N0cmluZygpO1xuXG5cdFx0XHRcdFx0XHRpZiAoYi50b0pTT04pIHYxID0gYi50b0pTT04oKTtcblx0XHRcdFx0XHRcdGVsc2UgdjEgPSB2YWx1ZS50b1N0cmluZygpO1xuXHRcdFx0XHRcdFx0cmV0dXJuIHYwID09IHYxO1xuXHRcdFx0XHRcdH0gZWxzZSByZXR1cm4gZmFsc2U7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdHN0cnVjdHVyZTogZXEudHJ1ZSxcblx0XHRcdFx0ZGlmZjogZnVuY3Rpb24oYSwgYikge1xuXHRcdFx0XHRcdGlmIChhLnRvU3RyaW5nKCkgPT0gYi50b1N0cmluZygpKSByZXR1cm4ge1xuXHRcdFx0XHRcdFx0cmVzdWx0OiAxLFxuXHRcdFx0XHRcdFx0dmFsdWU6IGIudG9TdHJpbmcoKVxuXHRcdFx0XHRcdH07XG5cblx0XHRcdFx0XHRpZiAoYS50b0pTT04gfHwgYi50b0pTT04pIHtcblx0XHRcdFx0XHRcdHZhciB2MCwgdjE7XG5cdFx0XHRcdFx0XHRpZiAoYS50b0pTT04pIHYwID0gYS50b0pTT04oKTtcblx0XHRcdFx0XHRcdGVsc2UgdjAgPSB2YWx1ZS50b1N0cmluZygpO1xuXG5cdFx0XHRcdFx0XHRpZiAoYi50b0pTT04pIHYxID0gYi50b0pTT04oKTtcblx0XHRcdFx0XHRcdGVsc2UgdjEgPSB2YWx1ZS50b1N0cmluZygpO1xuXG5cdFx0XHRcdFx0XHRpZiAodjAgPT0gdjEpIHJldHVybiB7XG5cdFx0XHRcdFx0XHRcdHJlc3VsdDogMixcblx0XHRcdFx0XHRcdFx0ZnJvbTogYSxcblx0XHRcdFx0XHRcdFx0dG86IGJcblx0XHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRcdHJlc3VsdDogMCxcblx0XHRcdFx0XHRcdGZyb206IGEsXG5cdFx0XHRcdFx0XHR0bzogYlxuXHRcdFx0XHRcdH07XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRcIk51bGxcIjoge1xuXHRcdFx0XHRsb29zZTogZnVuY3Rpb24oYSwgYikge1xuXHRcdFx0XHRcdHJldHVybiAhYSA9PSAhYjtcblx0XHRcdFx0fSxcblx0XHRcdH0sXG5cdFx0XHRcIlVuZGVmaW5lZFwiOiB7XG5cdFx0XHRcdGxvb3NlOiBmdW5jdGlvbihhLCBiKSB7XG5cdFx0XHRcdFx0cmV0dXJuICFhID09ICFiO1xuXHRcdFx0XHR9LFxuXHRcdFx0fSxcblx0XHRcdFwiQXJyYXlcIjoge1xuXHRcdFx0XHRzdHJpY3Q6IGZ1bmN0aW9uKGEsIGIpIHtcblx0XHRcdFx0XHRyZXR1cm4gYSA9PSBiO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRsb29zZTogZnVuY3Rpb24oYSwgYikge1xuXHRcdFx0XHRcdHJldHVybiBhLnRvU3RyaW5nKCkgPT0gYi50b1N0cmluZygpO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRzdHJ1Y3R1cmU6IGVxLnRydWVcblx0XHRcdH0sXG5cdFx0XHRcIk9iamVjdFwiOiB7XG5cdFx0XHRcdHN0cmljdDogZnVuY3Rpb24oYSwgYikge1xuXHRcdFx0XHRcdHJldHVybiBhLnRvU3RyaW5nKCkgPT0gYi50b1N0cmluZygpO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRsb29zZTogZnVuY3Rpb24oYSwgYikge1xuXHRcdFx0XHRcdHJldHVybiBhLnRvU3RyaW5nKCkgPT0gYi50b1N0cmluZygpO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRzdHJ1Y3R1cmU6IGVxLmZhbHNlLFxuXHRcdFx0fSxcblx0XHRcdFwiRnVuY3Rpb25cIjoge1xuXHRcdFx0XHRzdHJpY3Q6IGZ1bmN0aW9uKGEsIGIpIHtcblx0XHRcdFx0XHRyZXR1cm4gYS50b1N0cmluZygpID09IGIudG9TdHJpbmcoKTtcblx0XHRcdFx0fSxcblx0XHRcdFx0bG9vc2U6IGZ1bmN0aW9uKGEsIGIpIHtcblx0XHRcdFx0XHRyZXR1cm4gYS50b1N0cmluZygpID09IGIudG9TdHJpbmcoKTtcblx0XHRcdFx0fSxcblx0XHRcdFx0c3RydWN0dXJlOiBlcS50cnVlLFxuXHRcdFx0fVxuXHRcdH0sXG5cdFx0XCJSZWdFeHBcIjoge1xuXHRcdFx0Ly8g0LLQstC10YHRgtC4INGB0YDQsNCy0L3QtdC90LjQtSDRgNC10LPRg9C70Y/RgNC+0Log0YEganNvbiDQstC10YDRgdC40LXQuSBtb25nb29zZWpzXG5cdFx0XHRcIlJlZ0V4cFwiOiB7XG5cdFx0XHRcdHN0cmljdDogZnVuY3Rpb24oYSwgYikge1xuXHRcdFx0XHRcdGlmIChhID09PSBiKSByZXR1cm4gdHJ1ZTtcblx0XHRcdFx0fSxcblx0XHRcdFx0bG9vc2U6IGZ1bmN0aW9uKGEsIGIpIHtcblx0XHRcdFx0XHRyZXR1cm4gYS50b1N0cmluZygpID09IGIudG9TdHJpbmcoKTtcblx0XHRcdFx0fSxcblx0XHRcdFx0c3RydWN0dXJlOiBlcS50cnVlLFxuXHRcdFx0XHRkaWZmOiBlcS5kaWZmU3RyaW5nXG5cdFx0XHR9LFxuXHRcdFx0XCJVbmRlZmluZWRcIjoge1xuXHRcdFx0XHRsb29zZTogZnVuY3Rpb24oYSwgYikge1xuXHRcdFx0XHRcdGlmIChhIGluc3RhbmNlb2YgUmVnRXhwKVxuXHRcdFx0XHRcdFx0cmV0dXJuIGEudGVzdChiKTtcblx0XHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0XHRyZXR1cm4gYi50ZXN0KGEpO1xuXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRcIk51bGxcIjoge1xuXHRcdFx0XHRsb29zZTogZnVuY3Rpb24oYSwgYikge1xuXHRcdFx0XHRcdGlmIChhIGluc3RhbmNlb2YgUmVnRXhwKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gYS50ZXN0KGIpO1xuXHRcdFx0XHRcdH0gZWxzZVxuXHRcdFx0XHRcdFx0cmV0dXJuIGIudGVzdChhKTtcblx0XHRcdFx0fSxcblx0XHRcdH0sXG5cdFx0XHRcIk9iamVjdFwiOiB7XG5cdFx0XHRcdHN0cmljdDogZnVuY3Rpb24oYSwgYikge1xuXHRcdFx0XHRcdHJldHVybiBhLnRvU3RyaW5nKCkgPT0gYi50b1N0cmluZygpO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRsb29zZTogZnVuY3Rpb24oYSwgYikge1xuXHRcdFx0XHRcdHJldHVybiBhLnRvU3RyaW5nKCkgPT0gYi50b1N0cmluZygpO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0sXG5cdFx0XCJEYXRlXCI6IHtcblx0XHRcdFwiRGF0ZVwiOiB7XG5cdFx0XHRcdHN0cmljdDogZnVuY3Rpb24oYSwgYikge1xuXHRcdFx0XHRcdGlmIChhID09PSBiKSByZXR1cm4gdHJ1ZTtcblx0XHRcdFx0XHRyZXR1cm4gYS50b1N0cmluZygpID09IGIudG9TdHJpbmcoKTtcblx0XHRcdFx0fSxcblx0XHRcdFx0bG9vc2U6IGZ1bmN0aW9uKGEsIGIpIHtcblx0XHRcdFx0XHRyZXR1cm4gYS50b1N0cmluZygpID09IGIudG9TdHJpbmcoKTtcblx0XHRcdFx0fSxcblx0XHRcdFx0c3RydWN0dXJlOiBlcS50cnVlXG5cdFx0XHR9LFxuXHRcdFx0XCJPYmplY3RcIjoge1xuXHRcdFx0XHRzdHJpY3Q6IGZ1bmN0aW9uKGEsIGIpIHtcblx0XHRcdFx0XHRyZXR1cm4gYS50b1N0cmluZygpID09IGIudG9TdHJpbmcoKTtcblx0XHRcdFx0fSxcblx0XHRcdFx0bG9vc2U6IGZ1bmN0aW9uKGEsIGIpIHtcblx0XHRcdFx0XHRyZXR1cm4gYS50b1N0cmluZygpID09IGIudG9TdHJpbmcoKTtcblx0XHRcdFx0fSxcblx0XHRcdFx0c3RydWN0dXJlOiBlcS5mYWxzZSxcblx0XHRcdFx0ZGlmZjogZXEuZGlmZlN0cmluZ1xuXHRcdFx0fSxcblx0XHR9LFxuXHRcdFwiVW5kZWZpbmVkXCI6IHtcblx0XHRcdFwiVW5kZWZpbmVkXCI6IHtcblx0XHRcdFx0c3RyaWN0OiBlcS50cnVlLFxuXHRcdFx0XHRsb29zZTogZXEudHJ1ZSxcblx0XHRcdFx0c3RydWN0dXJlOiBlcS50cnVlLFxuXHRcdFx0XHRkaWZmOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdFx0cmVzdWx0OiAxXG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdFwiTnVsbFwiOiB7XG5cdFx0XHRcdHN0cmljdDogZXEudHJ1ZSxcblx0XHRcdFx0bG9vc2U6IGVxLnRydWUsXG5cdFx0XHRcdHN0cnVjdHVyZTogZXEudHJ1ZSxcblx0XHRcdFx0ZGlmZjogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRcdHJlc3VsdDogMSxcblx0XHRcdFx0XHRcdHZhbHVlOiBudWxsXG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0sXG5cdFx0XCJOdWxsXCI6IHtcblx0XHRcdFwiTnVsbFwiOiB7XG5cdFx0XHRcdHN0cmljdDogZXEudHJ1ZSxcblx0XHRcdFx0bG9vc2U6IGVxLnRydWUsXG5cdFx0XHRcdHN0cnVjdHVyZTogZXEudHJ1ZSxcblx0XHRcdFx0ZGlmZjogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRcdHJlc3VsdDogMSxcblx0XHRcdFx0XHRcdHZhbHVlOiBudWxsXG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0sXG5cdFx0XCJBcnJheVwiOiB7XG5cdFx0XHRcIkFycmF5XCI6IHtcblx0XHRcdFx0c3RyaWN0OiBlcS5lcUFycmF5KHtcblx0XHRcdFx0XHRzdHJpY3Q6IHRydWVcblx0XHRcdFx0fSksXG5cdFx0XHRcdGxvb3NlOiBlcS5lcUFycmF5KHtcblx0XHRcdFx0XHRsb29zZTogdHJ1ZVxuXHRcdFx0XHR9KSxcblx0XHRcdFx0c3RydWN0dXJlOiBlcS5lcUFycmF5KHtcblx0XHRcdFx0XHRzdHJ1Y3R1cmU6IHRydWVcblx0XHRcdFx0fSksXG5cdFx0XHRcdGRpZmY6IGVxLmVxQXJyYXkoe1xuXHRcdFx0XHRcdGRpZmY6IHRydWVcblx0XHRcdFx0fSlcblx0XHRcdH0sXG5cdFx0XHRcIk9iamVjdFwiOiB7XG5cdFx0XHRcdHN0cmljdDogZXEuZXFPYmplY3Qoe1xuXHRcdFx0XHRcdHN0cmljdDogdHJ1ZVxuXHRcdFx0XHR9KSxcblx0XHRcdFx0bG9vc2U6IGVxLmVxT2JqZWN0KHtcblx0XHRcdFx0XHRsb29zZTogdHJ1ZVxuXHRcdFx0XHR9KSxcblx0XHRcdFx0c3RydWN0dXJlOiBlcS5lcU9iamVjdCh7XG5cdFx0XHRcdFx0c3RydWN0dXJlOiB0cnVlXG5cdFx0XHRcdH0pLFxuXHRcdFx0XHRkaWZmOiBlcS5lcU9iamVjdCh7XG5cdFx0XHRcdFx0ZGlmZjogdHJ1ZVxuXHRcdFx0XHR9KVxuXHRcdFx0fVxuXHRcdH0sXG5cdFx0XCJPYmplY3RcIjoge1xuXHRcdFx0XCJPYmplY3RcIjoge1xuXHRcdFx0XHQvLyDQstC+0LfQvNC+0LbQvdC+INC90YPQttC90Ysg0LHRg9C00YPRgiDQlNGA0YPQs9C40LUg0L7Qv9C10YDQsNGG0LjQuFxuXHRcdFx0XHRzdHJpY3Q6IGVxLmVxT2JqZWN0KHtcblx0XHRcdFx0XHRzdHJpY3Q6IHRydWVcblx0XHRcdFx0fSksXG5cdFx0XHRcdGxvb3NlOiBlcS5lcU9iamVjdCh7XG5cdFx0XHRcdFx0bG9vc2U6IHRydWVcblx0XHRcdFx0fSksXG5cdFx0XHRcdHN0cnVjdHVyZTogZXEuZXFPYmplY3Qoe1xuXHRcdFx0XHRcdHN0cnVjdHVyZTogdHJ1ZVxuXHRcdFx0XHR9KSxcblx0XHRcdFx0ZGlmZjogZXEuZXFPYmplY3Qoe1xuXHRcdFx0XHRcdGRpZmY6IHRydWVcblx0XHRcdFx0fSlcblx0XHRcdH0sXG5cdFx0fSxcblx0XHRcIkZ1bmN0aW9uXCI6IHtcblx0XHRcdFwiRnVuY3Rpb25cIjoge1xuXHRcdFx0XHRzdHJpY3Q6IGZ1bmN0aW9uKGEsIGIpIHtcblx0XHRcdFx0XHRyZXR1cm4gYSA9PT0gYjtcblx0XHRcdFx0fSxcblx0XHRcdFx0bG9vc2U6IGZ1bmN0aW9uKGEsIGIpIHtcblx0XHRcdFx0XHRyZXR1cm4gYS50b1N0cmluZygpID09IGIudG9TdHJpbmcoKTtcblx0XHRcdFx0fSxcblx0XHRcdFx0c3RydWN0dXJlOiBlcS50cnVlLFxuXHRcdFx0XHRkaWZmOiBlcS5kaWZmU3RyaW5nXG5cdFx0XHR9XG5cdFx0fVxuXHR9O1xufTsiLCIvKiBTZWUgTElDRU5TRSBmaWxlIGZvciB0ZXJtcyBvZiB1c2UgKi9cblxuLypcbiAqIFRleHQgZGlmZiBpbXBsZW1lbnRhdGlvbi5cbiAqXG4gKiBUaGlzIGxpYnJhcnkgc3VwcG9ydHMgdGhlIGZvbGxvd2luZyBBUElTOlxuICogSnNEaWZmLmRpZmZDaGFyczogQ2hhcmFjdGVyIGJ5IGNoYXJhY3RlciBkaWZmXG4gKiBKc0RpZmYuZGlmZldvcmRzOiBXb3JkIChhcyBkZWZpbmVkIGJ5IFxcYiByZWdleCkgZGlmZiB3aGljaCBpZ25vcmVzIHdoaXRlc3BhY2VcbiAqIEpzRGlmZi5kaWZmTGluZXM6IExpbmUgYmFzZWQgZGlmZlxuICpcbiAqIEpzRGlmZi5kaWZmQ3NzOiBEaWZmIHRhcmdldGVkIGF0IENTUyBjb250ZW50XG4gKlxuICogVGhlc2UgbWV0aG9kcyBhcmUgYmFzZWQgb24gdGhlIGltcGxlbWVudGF0aW9uIHByb3Bvc2VkIGluXG4gKiBcIkFuIE8oTkQpIERpZmZlcmVuY2UgQWxnb3JpdGhtIGFuZCBpdHMgVmFyaWF0aW9uc1wiIChNeWVycywgMTk4NikuXG4gKiBodHRwOi8vY2l0ZXNlZXJ4LmlzdC5wc3UuZWR1L3ZpZXdkb2Mvc3VtbWFyeT9kb2k9MTAuMS4xLjQuNjkyN1xuICovXG52YXIgSnNEaWZmID0gKGZ1bmN0aW9uKCkge1xuICAvKmpzaGludCBtYXhwYXJhbXM6IDUqL1xuICBmdW5jdGlvbiBjbG9uZVBhdGgocGF0aCkge1xuICAgIHJldHVybiB7IG5ld1BvczogcGF0aC5uZXdQb3MsIGNvbXBvbmVudHM6IHBhdGguY29tcG9uZW50cy5zbGljZSgwKSB9O1xuICB9XG4gIGZ1bmN0aW9uIHJlbW92ZUVtcHR5KGFycmF5KSB7XG4gICAgdmFyIHJldCA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChhcnJheVtpXSkge1xuICAgICAgICByZXQucHVzaChhcnJheVtpXSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG4gIH1cbiAgZnVuY3Rpb24gZXNjYXBlSFRNTChzKSB7XG4gICAgdmFyIG4gPSBzO1xuICAgIG4gPSBuLnJlcGxhY2UoLyYvZywgJyZhbXA7Jyk7XG4gICAgbiA9IG4ucmVwbGFjZSgvPC9nLCAnJmx0OycpO1xuICAgIG4gPSBuLnJlcGxhY2UoLz4vZywgJyZndDsnKTtcbiAgICBuID0gbi5yZXBsYWNlKC9cIi9nLCAnJnF1b3Q7Jyk7XG5cbiAgICByZXR1cm4gbjtcbiAgfVxuXG4gIHZhciBEaWZmID0gZnVuY3Rpb24oaWdub3JlV2hpdGVzcGFjZSkge1xuICAgIHRoaXMuaWdub3JlV2hpdGVzcGFjZSA9IGlnbm9yZVdoaXRlc3BhY2U7XG4gIH07XG4gIERpZmYucHJvdG90eXBlID0ge1xuICAgICAgZGlmZjogZnVuY3Rpb24ob2xkU3RyaW5nLCBuZXdTdHJpbmcpIHtcbiAgICAgICAgLy8gSGFuZGxlIHRoZSBpZGVudGl0eSBjYXNlICh0aGlzIGlzIGR1ZSB0byB1bnJvbGxpbmcgZWRpdExlbmd0aCA9PSAwXG4gICAgICAgIGlmIChuZXdTdHJpbmcgPT09IG9sZFN0cmluZykge1xuICAgICAgICAgIHJldHVybiBbeyB2YWx1ZTogbmV3U3RyaW5nIH1dO1xuICAgICAgICB9XG4gICAgICAgIGlmICghbmV3U3RyaW5nKSB7XG4gICAgICAgICAgcmV0dXJuIFt7IHZhbHVlOiBvbGRTdHJpbmcsIHJlbW92ZWQ6IHRydWUgfV07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFvbGRTdHJpbmcpIHtcbiAgICAgICAgICByZXR1cm4gW3sgdmFsdWU6IG5ld1N0cmluZywgYWRkZWQ6IHRydWUgfV07XG4gICAgICAgIH1cblxuICAgICAgICBuZXdTdHJpbmcgPSB0aGlzLnRva2VuaXplKG5ld1N0cmluZyk7XG4gICAgICAgIG9sZFN0cmluZyA9IHRoaXMudG9rZW5pemUob2xkU3RyaW5nKTtcblxuICAgICAgICB2YXIgbmV3TGVuID0gbmV3U3RyaW5nLmxlbmd0aCwgb2xkTGVuID0gb2xkU3RyaW5nLmxlbmd0aDtcbiAgICAgICAgdmFyIG1heEVkaXRMZW5ndGggPSBuZXdMZW4gKyBvbGRMZW47XG4gICAgICAgIHZhciBiZXN0UGF0aCA9IFt7IG5ld1BvczogLTEsIGNvbXBvbmVudHM6IFtdIH1dO1xuXG4gICAgICAgIC8vIFNlZWQgZWRpdExlbmd0aCA9IDBcbiAgICAgICAgdmFyIG9sZFBvcyA9IHRoaXMuZXh0cmFjdENvbW1vbihiZXN0UGF0aFswXSwgbmV3U3RyaW5nLCBvbGRTdHJpbmcsIDApO1xuICAgICAgICBpZiAoYmVzdFBhdGhbMF0ubmV3UG9zKzEgPj0gbmV3TGVuICYmIG9sZFBvcysxID49IG9sZExlbikge1xuICAgICAgICAgIHJldHVybiBiZXN0UGF0aFswXS5jb21wb25lbnRzO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yICh2YXIgZWRpdExlbmd0aCA9IDE7IGVkaXRMZW5ndGggPD0gbWF4RWRpdExlbmd0aDsgZWRpdExlbmd0aCsrKSB7XG4gICAgICAgICAgZm9yICh2YXIgZGlhZ29uYWxQYXRoID0gLTEqZWRpdExlbmd0aDsgZGlhZ29uYWxQYXRoIDw9IGVkaXRMZW5ndGg7IGRpYWdvbmFsUGF0aCs9Mikge1xuICAgICAgICAgICAgdmFyIGJhc2VQYXRoO1xuICAgICAgICAgICAgdmFyIGFkZFBhdGggPSBiZXN0UGF0aFtkaWFnb25hbFBhdGgtMV0sXG4gICAgICAgICAgICAgICAgcmVtb3ZlUGF0aCA9IGJlc3RQYXRoW2RpYWdvbmFsUGF0aCsxXTtcbiAgICAgICAgICAgIG9sZFBvcyA9IChyZW1vdmVQYXRoID8gcmVtb3ZlUGF0aC5uZXdQb3MgOiAwKSAtIGRpYWdvbmFsUGF0aDtcbiAgICAgICAgICAgIGlmIChhZGRQYXRoKSB7XG4gICAgICAgICAgICAgIC8vIE5vIG9uZSBlbHNlIGlzIGdvaW5nIHRvIGF0dGVtcHQgdG8gdXNlIHRoaXMgdmFsdWUsIGNsZWFyIGl0XG4gICAgICAgICAgICAgIGJlc3RQYXRoW2RpYWdvbmFsUGF0aC0xXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGNhbkFkZCA9IGFkZFBhdGggJiYgYWRkUGF0aC5uZXdQb3MrMSA8IG5ld0xlbjtcbiAgICAgICAgICAgIHZhciBjYW5SZW1vdmUgPSByZW1vdmVQYXRoICYmIDAgPD0gb2xkUG9zICYmIG9sZFBvcyA8IG9sZExlbjtcbiAgICAgICAgICAgIGlmICghY2FuQWRkICYmICFjYW5SZW1vdmUpIHtcbiAgICAgICAgICAgICAgYmVzdFBhdGhbZGlhZ29uYWxQYXRoXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFNlbGVjdCB0aGUgZGlhZ29uYWwgdGhhdCB3ZSB3YW50IHRvIGJyYW5jaCBmcm9tLiBXZSBzZWxlY3QgdGhlIHByaW9yXG4gICAgICAgICAgICAvLyBwYXRoIHdob3NlIHBvc2l0aW9uIGluIHRoZSBuZXcgc3RyaW5nIGlzIHRoZSBmYXJ0aGVzdCBmcm9tIHRoZSBvcmlnaW5cbiAgICAgICAgICAgIC8vIGFuZCBkb2VzIG5vdCBwYXNzIHRoZSBib3VuZHMgb2YgdGhlIGRpZmYgZ3JhcGhcbiAgICAgICAgICAgIGlmICghY2FuQWRkIHx8IChjYW5SZW1vdmUgJiYgYWRkUGF0aC5uZXdQb3MgPCByZW1vdmVQYXRoLm5ld1BvcykpIHtcbiAgICAgICAgICAgICAgYmFzZVBhdGggPSBjbG9uZVBhdGgocmVtb3ZlUGF0aCk7XG4gICAgICAgICAgICAgIHRoaXMucHVzaENvbXBvbmVudChiYXNlUGF0aC5jb21wb25lbnRzLCBvbGRTdHJpbmdbb2xkUG9zXSwgdW5kZWZpbmVkLCB0cnVlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGJhc2VQYXRoID0gY2xvbmVQYXRoKGFkZFBhdGgpO1xuICAgICAgICAgICAgICBiYXNlUGF0aC5uZXdQb3MrKztcbiAgICAgICAgICAgICAgdGhpcy5wdXNoQ29tcG9uZW50KGJhc2VQYXRoLmNvbXBvbmVudHMsIG5ld1N0cmluZ1tiYXNlUGF0aC5uZXdQb3NdLCB0cnVlLCB1bmRlZmluZWQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgb2xkUG9zID0gdGhpcy5leHRyYWN0Q29tbW9uKGJhc2VQYXRoLCBuZXdTdHJpbmcsIG9sZFN0cmluZywgZGlhZ29uYWxQYXRoKTtcblxuICAgICAgICAgICAgaWYgKGJhc2VQYXRoLm5ld1BvcysxID49IG5ld0xlbiAmJiBvbGRQb3MrMSA+PSBvbGRMZW4pIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGJhc2VQYXRoLmNvbXBvbmVudHM7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBiZXN0UGF0aFtkaWFnb25hbFBhdGhdID0gYmFzZVBhdGg7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9LFxuXG4gICAgICBwdXNoQ29tcG9uZW50OiBmdW5jdGlvbihjb21wb25lbnRzLCB2YWx1ZSwgYWRkZWQsIHJlbW92ZWQpIHtcbiAgICAgICAgdmFyIGxhc3QgPSBjb21wb25lbnRzW2NvbXBvbmVudHMubGVuZ3RoLTFdO1xuICAgICAgICBpZiAobGFzdCAmJiBsYXN0LmFkZGVkID09PSBhZGRlZCAmJiBsYXN0LnJlbW92ZWQgPT09IHJlbW92ZWQpIHtcbiAgICAgICAgICAvLyBXZSBuZWVkIHRvIGNsb25lIGhlcmUgYXMgdGhlIGNvbXBvbmVudCBjbG9uZSBvcGVyYXRpb24gaXMganVzdFxuICAgICAgICAgIC8vIGFzIHNoYWxsb3cgYXJyYXkgY2xvbmVcbiAgICAgICAgICBjb21wb25lbnRzW2NvbXBvbmVudHMubGVuZ3RoLTFdID1cbiAgICAgICAgICAgIHt2YWx1ZTogdGhpcy5qb2luKGxhc3QudmFsdWUsIHZhbHVlKSwgYWRkZWQ6IGFkZGVkLCByZW1vdmVkOiByZW1vdmVkIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29tcG9uZW50cy5wdXNoKHt2YWx1ZTogdmFsdWUsIGFkZGVkOiBhZGRlZCwgcmVtb3ZlZDogcmVtb3ZlZCB9KTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIGV4dHJhY3RDb21tb246IGZ1bmN0aW9uKGJhc2VQYXRoLCBuZXdTdHJpbmcsIG9sZFN0cmluZywgZGlhZ29uYWxQYXRoKSB7XG4gICAgICAgIHZhciBuZXdMZW4gPSBuZXdTdHJpbmcubGVuZ3RoLFxuICAgICAgICAgICAgb2xkTGVuID0gb2xkU3RyaW5nLmxlbmd0aCxcbiAgICAgICAgICAgIG5ld1BvcyA9IGJhc2VQYXRoLm5ld1BvcyxcbiAgICAgICAgICAgIG9sZFBvcyA9IG5ld1BvcyAtIGRpYWdvbmFsUGF0aDtcbiAgICAgICAgd2hpbGUgKG5ld1BvcysxIDwgbmV3TGVuICYmIG9sZFBvcysxIDwgb2xkTGVuICYmIHRoaXMuZXF1YWxzKG5ld1N0cmluZ1tuZXdQb3MrMV0sIG9sZFN0cmluZ1tvbGRQb3MrMV0pKSB7XG4gICAgICAgICAgbmV3UG9zKys7XG4gICAgICAgICAgb2xkUG9zKys7XG5cbiAgICAgICAgICB0aGlzLnB1c2hDb21wb25lbnQoYmFzZVBhdGguY29tcG9uZW50cywgbmV3U3RyaW5nW25ld1Bvc10sIHVuZGVmaW5lZCwgdW5kZWZpbmVkKTtcbiAgICAgICAgfVxuICAgICAgICBiYXNlUGF0aC5uZXdQb3MgPSBuZXdQb3M7XG4gICAgICAgIHJldHVybiBvbGRQb3M7XG4gICAgICB9LFxuXG4gICAgICBlcXVhbHM6IGZ1bmN0aW9uKGxlZnQsIHJpZ2h0KSB7XG4gICAgICAgIHZhciByZVdoaXRlc3BhY2UgPSAvXFxTLztcbiAgICAgICAgaWYgKHRoaXMuaWdub3JlV2hpdGVzcGFjZSAmJiAhcmVXaGl0ZXNwYWNlLnRlc3QobGVmdCkgJiYgIXJlV2hpdGVzcGFjZS50ZXN0KHJpZ2h0KSkge1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBsZWZ0ID09PSByaWdodDtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIGpvaW46IGZ1bmN0aW9uKGxlZnQsIHJpZ2h0KSB7XG4gICAgICAgIHJldHVybiBsZWZ0ICsgcmlnaHQ7XG4gICAgICB9LFxuICAgICAgdG9rZW5pemU6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgIH1cbiAgfTtcblxuICB2YXIgQ2hhckRpZmYgPSBuZXcgRGlmZigpO1xuXG4gIHZhciBXb3JkRGlmZiA9IG5ldyBEaWZmKHRydWUpO1xuICB2YXIgV29yZFdpdGhTcGFjZURpZmYgPSBuZXcgRGlmZigpO1xuICBXb3JkRGlmZi50b2tlbml6ZSA9IFdvcmRXaXRoU3BhY2VEaWZmLnRva2VuaXplID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICByZXR1cm4gcmVtb3ZlRW1wdHkodmFsdWUuc3BsaXQoLyhcXHMrfFxcYikvKSk7XG4gIH07XG5cbiAgdmFyIENzc0RpZmYgPSBuZXcgRGlmZih0cnVlKTtcbiAgQ3NzRGlmZi50b2tlbml6ZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgcmV0dXJuIHJlbW92ZUVtcHR5KHZhbHVlLnNwbGl0KC8oW3t9OjssXXxcXHMrKS8pKTtcbiAgfTtcblxuICB2YXIgTGluZURpZmYgPSBuZXcgRGlmZigpO1xuICBMaW5lRGlmZi50b2tlbml6ZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgdmFyIHJldExpbmVzID0gW10sXG4gICAgICAgIGxpbmVzID0gdmFsdWUuc3BsaXQoL14vbSk7XG5cbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBsaW5lID0gbGluZXNbaV0sXG4gICAgICAgICAgbGFzdExpbmUgPSBsaW5lc1tpIC0gMV07XG5cbiAgICAgIC8vIE1lcmdlIGxpbmVzIHRoYXQgbWF5IGNvbnRhaW4gd2luZG93cyBuZXcgbGluZXNcbiAgICAgIGlmIChsaW5lID09ICdcXG4nICYmIGxhc3RMaW5lICYmIGxhc3RMaW5lW2xhc3RMaW5lLmxlbmd0aCAtIDFdID09PSAnXFxyJykge1xuICAgICAgICByZXRMaW5lc1tyZXRMaW5lcy5sZW5ndGggLSAxXSArPSAnXFxuJztcbiAgICAgIH0gZWxzZSBpZiAobGluZSkge1xuICAgICAgICByZXRMaW5lcy5wdXNoKGxpbmUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiByZXRMaW5lcztcbiAgfTtcblxuICByZXR1cm4ge1xuICAgIERpZmY6IERpZmYsXG5cbiAgICBkaWZmQ2hhcnM6IGZ1bmN0aW9uKG9sZFN0ciwgbmV3U3RyKSB7IHJldHVybiBDaGFyRGlmZi5kaWZmKG9sZFN0ciwgbmV3U3RyKTsgfSxcbiAgICBkaWZmV29yZHM6IGZ1bmN0aW9uKG9sZFN0ciwgbmV3U3RyKSB7IHJldHVybiBXb3JkRGlmZi5kaWZmKG9sZFN0ciwgbmV3U3RyKTsgfSxcbiAgICBkaWZmV29yZHNXaXRoU3BhY2U6IGZ1bmN0aW9uKG9sZFN0ciwgbmV3U3RyKSB7IHJldHVybiBXb3JkV2l0aFNwYWNlRGlmZi5kaWZmKG9sZFN0ciwgbmV3U3RyKTsgfSxcbiAgICBkaWZmTGluZXM6IGZ1bmN0aW9uKG9sZFN0ciwgbmV3U3RyKSB7IHJldHVybiBMaW5lRGlmZi5kaWZmKG9sZFN0ciwgbmV3U3RyKTsgfSxcblxuICAgIGRpZmZDc3M6IGZ1bmN0aW9uKG9sZFN0ciwgbmV3U3RyKSB7IHJldHVybiBDc3NEaWZmLmRpZmYob2xkU3RyLCBuZXdTdHIpOyB9LFxuXG4gICAgY3JlYXRlUGF0Y2g6IGZ1bmN0aW9uKGZpbGVOYW1lLCBvbGRTdHIsIG5ld1N0ciwgb2xkSGVhZGVyLCBuZXdIZWFkZXIpIHtcbiAgICAgIHZhciByZXQgPSBbXTtcblxuICAgICAgcmV0LnB1c2goJ0luZGV4OiAnICsgZmlsZU5hbWUpO1xuICAgICAgcmV0LnB1c2goJz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0nKTtcbiAgICAgIHJldC5wdXNoKCctLS0gJyArIGZpbGVOYW1lICsgKHR5cGVvZiBvbGRIZWFkZXIgPT09ICd1bmRlZmluZWQnID8gJycgOiAnXFx0JyArIG9sZEhlYWRlcikpO1xuICAgICAgcmV0LnB1c2goJysrKyAnICsgZmlsZU5hbWUgKyAodHlwZW9mIG5ld0hlYWRlciA9PT0gJ3VuZGVmaW5lZCcgPyAnJyA6ICdcXHQnICsgbmV3SGVhZGVyKSk7XG5cbiAgICAgIHZhciBkaWZmID0gTGluZURpZmYuZGlmZihvbGRTdHIsIG5ld1N0cik7XG4gICAgICBpZiAoIWRpZmZbZGlmZi5sZW5ndGgtMV0udmFsdWUpIHtcbiAgICAgICAgZGlmZi5wb3AoKTsgICAvLyBSZW1vdmUgdHJhaWxpbmcgbmV3bGluZSBhZGRcbiAgICAgIH1cbiAgICAgIGRpZmYucHVzaCh7dmFsdWU6ICcnLCBsaW5lczogW119KTsgICAvLyBBcHBlbmQgYW4gZW1wdHkgdmFsdWUgdG8gbWFrZSBjbGVhbnVwIGVhc2llclxuXG4gICAgICBmdW5jdGlvbiBjb250ZXh0TGluZXMobGluZXMpIHtcbiAgICAgICAgcmV0dXJuIGxpbmVzLm1hcChmdW5jdGlvbihlbnRyeSkgeyByZXR1cm4gJyAnICsgZW50cnk7IH0pO1xuICAgICAgfVxuICAgICAgZnVuY3Rpb24gZW9mTkwoY3VyUmFuZ2UsIGksIGN1cnJlbnQpIHtcbiAgICAgICAgdmFyIGxhc3QgPSBkaWZmW2RpZmYubGVuZ3RoLTJdLFxuICAgICAgICAgICAgaXNMYXN0ID0gaSA9PT0gZGlmZi5sZW5ndGgtMixcbiAgICAgICAgICAgIGlzTGFzdE9mVHlwZSA9IGkgPT09IGRpZmYubGVuZ3RoLTMgJiYgKGN1cnJlbnQuYWRkZWQgIT09IGxhc3QuYWRkZWQgfHwgY3VycmVudC5yZW1vdmVkICE9PSBsYXN0LnJlbW92ZWQpO1xuXG4gICAgICAgIC8vIEZpZ3VyZSBvdXQgaWYgdGhpcyBpcyB0aGUgbGFzdCBsaW5lIGZvciB0aGUgZ2l2ZW4gZmlsZSBhbmQgbWlzc2luZyBOTFxuICAgICAgICBpZiAoIS9cXG4kLy50ZXN0KGN1cnJlbnQudmFsdWUpICYmIChpc0xhc3QgfHwgaXNMYXN0T2ZUeXBlKSkge1xuICAgICAgICAgIGN1clJhbmdlLnB1c2goJ1xcXFwgTm8gbmV3bGluZSBhdCBlbmQgb2YgZmlsZScpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHZhciBvbGRSYW5nZVN0YXJ0ID0gMCwgbmV3UmFuZ2VTdGFydCA9IDAsIGN1clJhbmdlID0gW10sXG4gICAgICAgICAgb2xkTGluZSA9IDEsIG5ld0xpbmUgPSAxO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBkaWZmLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBjdXJyZW50ID0gZGlmZltpXSxcbiAgICAgICAgICAgIGxpbmVzID0gY3VycmVudC5saW5lcyB8fCBjdXJyZW50LnZhbHVlLnJlcGxhY2UoL1xcbiQvLCAnJykuc3BsaXQoJ1xcbicpO1xuICAgICAgICBjdXJyZW50LmxpbmVzID0gbGluZXM7XG5cbiAgICAgICAgaWYgKGN1cnJlbnQuYWRkZWQgfHwgY3VycmVudC5yZW1vdmVkKSB7XG4gICAgICAgICAgaWYgKCFvbGRSYW5nZVN0YXJ0KSB7XG4gICAgICAgICAgICB2YXIgcHJldiA9IGRpZmZbaS0xXTtcbiAgICAgICAgICAgIG9sZFJhbmdlU3RhcnQgPSBvbGRMaW5lO1xuICAgICAgICAgICAgbmV3UmFuZ2VTdGFydCA9IG5ld0xpbmU7XG5cbiAgICAgICAgICAgIGlmIChwcmV2KSB7XG4gICAgICAgICAgICAgIGN1clJhbmdlID0gY29udGV4dExpbmVzKHByZXYubGluZXMuc2xpY2UoLTQpKTtcbiAgICAgICAgICAgICAgb2xkUmFuZ2VTdGFydCAtPSBjdXJSYW5nZS5sZW5ndGg7XG4gICAgICAgICAgICAgIG5ld1JhbmdlU3RhcnQgLT0gY3VyUmFuZ2UubGVuZ3RoO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBjdXJSYW5nZS5wdXNoLmFwcGx5KGN1clJhbmdlLCBsaW5lcy5tYXAoZnVuY3Rpb24oZW50cnkpIHsgcmV0dXJuIChjdXJyZW50LmFkZGVkPycrJzonLScpICsgZW50cnk7IH0pKTtcbiAgICAgICAgICBlb2ZOTChjdXJSYW5nZSwgaSwgY3VycmVudCk7XG5cbiAgICAgICAgICBpZiAoY3VycmVudC5hZGRlZCkge1xuICAgICAgICAgICAgbmV3TGluZSArPSBsaW5lcy5sZW5ndGg7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG9sZExpbmUgKz0gbGluZXMubGVuZ3RoO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAob2xkUmFuZ2VTdGFydCkge1xuICAgICAgICAgICAgLy8gQ2xvc2Ugb3V0IGFueSBjaGFuZ2VzIHRoYXQgaGF2ZSBiZWVuIG91dHB1dCAob3Igam9pbiBvdmVybGFwcGluZylcbiAgICAgICAgICAgIGlmIChsaW5lcy5sZW5ndGggPD0gOCAmJiBpIDwgZGlmZi5sZW5ndGgtMikge1xuICAgICAgICAgICAgICAvLyBPdmVybGFwcGluZ1xuICAgICAgICAgICAgICBjdXJSYW5nZS5wdXNoLmFwcGx5KGN1clJhbmdlLCBjb250ZXh0TGluZXMobGluZXMpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIC8vIGVuZCB0aGUgcmFuZ2UgYW5kIG91dHB1dFxuICAgICAgICAgICAgICB2YXIgY29udGV4dFNpemUgPSBNYXRoLm1pbihsaW5lcy5sZW5ndGgsIDQpO1xuICAgICAgICAgICAgICByZXQucHVzaChcbiAgICAgICAgICAgICAgICAgICdAQCAtJyArIG9sZFJhbmdlU3RhcnQgKyAnLCcgKyAob2xkTGluZS1vbGRSYW5nZVN0YXJ0K2NvbnRleHRTaXplKVxuICAgICAgICAgICAgICAgICAgKyAnICsnICsgbmV3UmFuZ2VTdGFydCArICcsJyArIChuZXdMaW5lLW5ld1JhbmdlU3RhcnQrY29udGV4dFNpemUpXG4gICAgICAgICAgICAgICAgICArICcgQEAnKTtcbiAgICAgICAgICAgICAgcmV0LnB1c2guYXBwbHkocmV0LCBjdXJSYW5nZSk7XG4gICAgICAgICAgICAgIHJldC5wdXNoLmFwcGx5KHJldCwgY29udGV4dExpbmVzKGxpbmVzLnNsaWNlKDAsIGNvbnRleHRTaXplKSkpO1xuICAgICAgICAgICAgICBpZiAobGluZXMubGVuZ3RoIDw9IDQpIHtcbiAgICAgICAgICAgICAgICBlb2ZOTChyZXQsIGksIGN1cnJlbnQpO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgb2xkUmFuZ2VTdGFydCA9IDA7ICBuZXdSYW5nZVN0YXJ0ID0gMDsgY3VyUmFuZ2UgPSBbXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgb2xkTGluZSArPSBsaW5lcy5sZW5ndGg7XG4gICAgICAgICAgbmV3TGluZSArPSBsaW5lcy5sZW5ndGg7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHJldC5qb2luKCdcXG4nKSArICdcXG4nO1xuICAgIH0sXG5cbiAgICBhcHBseVBhdGNoOiBmdW5jdGlvbihvbGRTdHIsIHVuaURpZmYpIHtcbiAgICAgIHZhciBkaWZmc3RyID0gdW5pRGlmZi5zcGxpdCgnXFxuJyk7XG4gICAgICB2YXIgZGlmZiA9IFtdO1xuICAgICAgdmFyIHJlbUVPRk5MID0gZmFsc2UsXG4gICAgICAgICAgYWRkRU9GTkwgPSBmYWxzZTtcblxuICAgICAgZm9yICh2YXIgaSA9IChkaWZmc3RyWzBdWzBdPT09J0knPzQ6MCk7IGkgPCBkaWZmc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmKGRpZmZzdHJbaV1bMF0gPT09ICdAJykge1xuICAgICAgICAgIHZhciBtZWggPSBkaWZmc3RyW2ldLnNwbGl0KC9AQCAtKFxcZCspLChcXGQrKSBcXCsoXFxkKyksKFxcZCspIEBALyk7XG4gICAgICAgICAgZGlmZi51bnNoaWZ0KHtcbiAgICAgICAgICAgIHN0YXJ0Om1laFszXSxcbiAgICAgICAgICAgIG9sZGxlbmd0aDptZWhbMl0sXG4gICAgICAgICAgICBvbGRsaW5lczpbXSxcbiAgICAgICAgICAgIG5ld2xlbmd0aDptZWhbNF0sXG4gICAgICAgICAgICBuZXdsaW5lczpbXVxuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2UgaWYoZGlmZnN0cltpXVswXSA9PT0gJysnKSB7XG4gICAgICAgICAgZGlmZlswXS5uZXdsaW5lcy5wdXNoKGRpZmZzdHJbaV0uc3Vic3RyKDEpKTtcbiAgICAgICAgfSBlbHNlIGlmKGRpZmZzdHJbaV1bMF0gPT09ICctJykge1xuICAgICAgICAgIGRpZmZbMF0ub2xkbGluZXMucHVzaChkaWZmc3RyW2ldLnN1YnN0cigxKSk7XG4gICAgICAgIH0gZWxzZSBpZihkaWZmc3RyW2ldWzBdID09PSAnICcpIHtcbiAgICAgICAgICBkaWZmWzBdLm5ld2xpbmVzLnB1c2goZGlmZnN0cltpXS5zdWJzdHIoMSkpO1xuICAgICAgICAgIGRpZmZbMF0ub2xkbGluZXMucHVzaChkaWZmc3RyW2ldLnN1YnN0cigxKSk7XG4gICAgICAgIH0gZWxzZSBpZihkaWZmc3RyW2ldWzBdID09PSAnXFxcXCcpIHtcbiAgICAgICAgICBpZiAoZGlmZnN0cltpLTFdWzBdID09PSAnKycpIHtcbiAgICAgICAgICAgIHJlbUVPRk5MID0gdHJ1ZTtcbiAgICAgICAgICB9IGVsc2UgaWYoZGlmZnN0cltpLTFdWzBdID09PSAnLScpIHtcbiAgICAgICAgICAgIGFkZEVPRk5MID0gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdmFyIHN0ciA9IG9sZFN0ci5zcGxpdCgnXFxuJyk7XG4gICAgICBmb3IgKHZhciBpID0gZGlmZi5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgICB2YXIgZCA9IGRpZmZbaV07XG4gICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgZC5vbGRsZW5ndGg7IGorKykge1xuICAgICAgICAgIGlmKHN0cltkLnN0YXJ0LTEral0gIT09IGQub2xkbGluZXNbal0pIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgQXJyYXkucHJvdG90eXBlLnNwbGljZS5hcHBseShzdHIsW2Quc3RhcnQtMSwrZC5vbGRsZW5ndGhdLmNvbmNhdChkLm5ld2xpbmVzKSk7XG4gICAgICB9XG5cbiAgICAgIGlmIChyZW1FT0ZOTCkge1xuICAgICAgICB3aGlsZSAoIXN0cltzdHIubGVuZ3RoLTFdKSB7XG4gICAgICAgICAgc3RyLnBvcCgpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGFkZEVPRk5MKSB7XG4gICAgICAgIHN0ci5wdXNoKCcnKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBzdHIuam9pbignXFxuJyk7XG4gICAgfSxcblxuICAgIGNvbnZlcnRDaGFuZ2VzVG9YTUw6IGZ1bmN0aW9uKGNoYW5nZXMpe1xuICAgICAgdmFyIHJldCA9IFtdO1xuICAgICAgZm9yICggdmFyIGkgPSAwOyBpIDwgY2hhbmdlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgY2hhbmdlID0gY2hhbmdlc1tpXTtcbiAgICAgICAgaWYgKGNoYW5nZS5hZGRlZCkge1xuICAgICAgICAgIHJldC5wdXNoKCc8aW5zPicpO1xuICAgICAgICB9IGVsc2UgaWYgKGNoYW5nZS5yZW1vdmVkKSB7XG4gICAgICAgICAgcmV0LnB1c2goJzxkZWw+Jyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXQucHVzaChlc2NhcGVIVE1MKGNoYW5nZS52YWx1ZSkpO1xuXG4gICAgICAgIGlmIChjaGFuZ2UuYWRkZWQpIHtcbiAgICAgICAgICByZXQucHVzaCgnPC9pbnM+Jyk7XG4gICAgICAgIH0gZWxzZSBpZiAoY2hhbmdlLnJlbW92ZWQpIHtcbiAgICAgICAgICByZXQucHVzaCgnPC9kZWw+Jyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiByZXQuam9pbignJyk7XG4gICAgfSxcblxuICAgIC8vIFNlZTogaHR0cDovL2NvZGUuZ29vZ2xlLmNvbS9wL2dvb2dsZS1kaWZmLW1hdGNoLXBhdGNoL3dpa2kvQVBJXG4gICAgY29udmVydENoYW5nZXNUb0RNUDogZnVuY3Rpb24oY2hhbmdlcyl7XG4gICAgICB2YXIgcmV0ID0gW10sIGNoYW5nZTtcbiAgICAgIGZvciAoIHZhciBpID0gMDsgaSA8IGNoYW5nZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY2hhbmdlID0gY2hhbmdlc1tpXTtcbiAgICAgICAgcmV0LnB1c2goWyhjaGFuZ2UuYWRkZWQgPyAxIDogY2hhbmdlLnJlbW92ZWQgPyAtMSA6IDApLCBjaGFuZ2UudmFsdWVdKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXQ7XG4gICAgfVxuICB9O1xufSkoKTtcblxuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBKc0RpZmY7XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vbGliL3NjaGVtYScpXG5cbi8vIFBhdHRlcm5zXG5yZXF1aXJlKCcuL2xpYi9wYXR0ZXJucy9yZWZlcmVuY2UnKVxucmVxdWlyZSgnLi9saWIvcGF0dGVybnMvbm90aGluZycpXG5yZXF1aXJlKCcuL2xpYi9wYXR0ZXJucy9hbnl0aGluZycpXG5yZXF1aXJlKCcuL2xpYi9wYXR0ZXJucy9vYmplY3QnKVxucmVxdWlyZSgnLi9saWIvcGF0dGVybnMvb3InKVxucmVxdWlyZSgnLi9saWIvcGF0dGVybnMvZXF1YWxpdHknKVxucmVxdWlyZSgnLi9saWIvcGF0dGVybnMvcmVnZXhwJylcbnJlcXVpcmUoJy4vbGliL3BhdHRlcm5zL2NsYXNzJylcbnJlcXVpcmUoJy4vbGliL3BhdHRlcm5zL3NjaGVtYScpXG5cbi8vIEV4dGVuc2lvbnNcbnJlcXVpcmUoJy4vbGliL2V4dGVuc2lvbnMvQm9vbGVhbicpXG5yZXF1aXJlKCcuL2xpYi9leHRlbnNpb25zL051bWJlcicpXG5yZXF1aXJlKCcuL2xpYi9leHRlbnNpb25zL1N0cmluZycpXG5yZXF1aXJlKCcuL2xpYi9leHRlbnNpb25zL09iamVjdCcpXG5yZXF1aXJlKCcuL2xpYi9leHRlbnNpb25zL0FycmF5JylcbnJlcXVpcmUoJy4vbGliL2V4dGVuc2lvbnMvRnVuY3Rpb24nKVxucmVxdWlyZSgnLi9saWIvZXh0ZW5zaW9ucy9TY2hlbWEnKVxuIiwidmFyIFNjaGVtYSA9ICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge31cblxuU2NoZW1hLnByb3RvdHlwZSA9IHtcbiAgd3JhcCA6IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLndyYXBwZWQpIHJldHVybiB0aGlzLnZhbGlkYXRlXG4gICAgdGhpcy53cmFwcGVkID0gdHJ1ZVxuXG4gICAgdmFyIHB1YmxpY0Z1bmN0aW9ucyA9IFsgJ3RvSlNPTicsICd1bndyYXAnIF1cbiAgICBwdWJsaWNGdW5jdGlvbnMgPSBwdWJsaWNGdW5jdGlvbnMuY29uY2F0KHRoaXMucHVibGljRnVuY3Rpb25zIHx8IFtdKVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwdWJsaWNGdW5jdGlvbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmICghdGhpc1twdWJsaWNGdW5jdGlvbnNbaV1dKSBjb250aW51ZVxuICAgICAgdGhpcy52YWxpZGF0ZVtwdWJsaWNGdW5jdGlvbnNbaV1dID0gdGhpc1twdWJsaWNGdW5jdGlvbnNbaV1dLmJpbmQodGhpcylcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy52YWxpZGF0ZVxuICB9LFxuXG4gIHVud3JhcCA6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzXG4gIH0sXG5cbiAgdG9KU09OIDogc2Vzc2lvbihmdW5jdGlvbihtYWtlUmVmZXJlbmNlKSB7XG4gICAgdmFyIGpzb24sIHNlc3Npb24gPSBTY2hlbWEuc2Vzc2lvblxuXG4gICAgLy8gSW5pdGlhbGl6aW5nIHNlc3Npb24gaWYgaXQgaXNudFxuICAgIGlmICghc2Vzc2lvbi5zZXJpYWxpemVkKSBzZXNzaW9uLnNlcmlhbGl6ZWQgPSB7IG9iamVjdHM6IFtdLCBqc29uczogW10sIGlkczogW10gfVxuXG4gICAgdmFyIGluZGV4ID0gc2Vzc2lvbi5zZXJpYWxpemVkLm9iamVjdHMuaW5kZXhPZih0aGlzKVxuICAgIGlmIChtYWtlUmVmZXJlbmNlICYmIGluZGV4ICE9PSAtMSkge1xuICAgICAgLy8gVGhpcyB3YXMgYWxyZWFkeSBzZXJpYWxpemVkLCByZXR1cm5pbmcgYSBKU09OIHNjaGVtYSByZWZlcmVuY2UgKCRyZWYpXG4gICAgICBqc29uID0gc2Vzc2lvbi5zZXJpYWxpemVkLmpzb25zW2luZGV4XVxuXG4gICAgICAvLyBJZiB0aGVyZSB3YXMgbm8gaWQgZ2l2ZW4sIGdlbmVyYXRpbmcgb25lIG5vd1xuICAgICAgaWYgKGpzb24uaWQgPT0gbnVsbCkge1xuICAgICAgICBkbyB7XG4gICAgICAgICAganNvbi5pZCA9ICdpZC0nICsgTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpKjEwMDAwMClcbiAgICAgICAgfSB3aGlsZSAoc2Vzc2lvbi5zZXJpYWxpemVkLmlkcy5pbmRleE9mKGpzb24uaWQpICE9PSAtMSlcbiAgICAgICAgc2Vzc2lvbi5zZXJpYWxpemVkLmlkcy5wdXNoKGpzb24uaWQpXG4gICAgICB9XG5cbiAgICAgIGpzb24gPSB7ICckcmVmJzoganNvbi5pZCB9XG5cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVGhpcyB3YXMgbm90IHNlcmlhbGl6ZWQgeWV0LCBzZXJpYWxpemluZyBub3dcbiAgICAgIGpzb24gPSB7fVxuXG4gICAgICBpZiAodGhpcy5kb2MgIT0gbnVsbCkganNvbi5kZXNjcmlwdGlvbiA9IHRoaXMuZG9jXG5cbiAgICAgIC8vIFJlZ2lzdGVyaW5nIHRoYXQgdGhpcyB3YXMgc2VyaWFsaXplZCBhbmQgc3RvcmluZyB0aGUganNvblxuICAgICAgc2Vzc2lvbi5zZXJpYWxpemVkLm9iamVjdHMucHVzaCh0aGlzKVxuICAgICAgc2Vzc2lvbi5zZXJpYWxpemVkLmpzb25zLnB1c2goanNvbilcbiAgICB9XG5cbiAgICByZXR1cm4ganNvblxuICB9KVxufVxuXG5TY2hlbWEuZXh0ZW5kID0gZnVuY3Rpb24oZGVzY3JpcHRvcikge1xuICBpZiAoIWRlc2NyaXB0b3IudmFsaWRhdGUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1NjaGVtYSBvYmplY3RzIG11c3QgaGF2ZSBhIHZhbGlkYXRlIGZ1bmN0aW9uLicpXG4gIH1cblxuICB2YXIgY29uc3RydWN0b3IgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5pbml0aWFsaXplKSB0aGlzLmluaXRpYWxpemUuYXBwbHkodGhpcywgYXJndW1lbnRzKVxuXG4gICAgdGhpcy52YWxpZGF0ZSA9IHRoaXMudmFsaWRhdGUuYmluZCh0aGlzKVxuXG4gICAgdGhpcy52YWxpZGF0ZS5zY2hlbWEgPSB0aGlzLnZhbGlkYXRlXG4gIH1cblxuICB2YXIgcHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShTY2hlbWEucHJvdG90eXBlKVxuICBmb3IgKHZhciBrZXkgaW4gZGVzY3JpcHRvcikgcHJvdG90eXBlW2tleV0gPSBkZXNjcmlwdG9yW2tleV1cbiAgY29uc3RydWN0b3IucHJvdG90eXBlID0gcHJvdG90eXBlXG5cbiAgcmV0dXJuIGNvbnN0cnVjdG9yXG59XG5cblxudmFyIGFjdGl2ZSA9IGZhbHNlXG5mdW5jdGlvbiBzZXNzaW9uKGYpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIGlmIChhY3RpdmUpIHtcbiAgICAgIC8vIFRoZXJlJ3MgYW4gYWN0aXZlIHNlc3Npb24sIGp1c3QgZm9yd2FyZGluZyB0byB0aGUgb3JpZ2luYWwgZnVuY3Rpb25cbiAgICAgIHJldHVybiBmLmFwcGx5KHRoaXMsIGFyZ3VtZW50cylcblxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBUaGUgaW5pdGlhdG9yIGlzIHRoZSBvbmUgd2hvIGhhbmRsZXMgdGhlIGFjdGl2ZSBmbGFnLCBhbmQgY2xlYXJzIHRoZSBzZXNzaW9uIHdoZW4gaXQncyBvdmVyXG4gICAgICBhY3RpdmUgPSB0cnVlXG5cbiAgICAgIHZhciByZXN1bHQgPSBmLmFwcGx5KHRoaXMsIGFyZ3VtZW50cylcblxuICAgICAgLy8gQ2xlYW51cFxuICAgICAgZm9yICh2YXIgaSBpbiBzZXNzaW9uKSBkZWxldGUgc2Vzc2lvbltpXVxuICAgICAgYWN0aXZlID0gZmFsc2VcblxuICAgICAgcmV0dXJuIHJlc3VsdFxuICAgIH1cbiAgfVxufVxuU2NoZW1hLnNlc3Npb24gPSBzZXNzaW9uXG5cbmZ1bmN0aW9uIGxhc3REZWZpbmVkUmVzdWx0KGZ1bmN0aW9ucywgYXJnKSB7XG4gIHZhciBpID0gZnVuY3Rpb25zLmxlbmd0aCwgcmVzdWx0O1xuICB3aGlsZSAoaS0tKSB7XG4gICAgcmVzdWx0ID0gZnVuY3Rpb25zW2ldKGFyZylcbiAgICBpZiAocmVzdWx0ICE9IG51bGwpIHJldHVybiByZXN1bHRcbiAgfVxufVxuXG52YXIgZnJvbUpTZGVmcyA9IFtdXG5TY2hlbWEuZnJvbUpTID0gbGFzdERlZmluZWRSZXN1bHQuYmluZChudWxsLCBmcm9tSlNkZWZzKVxuU2NoZW1hLmZyb21KUy5kZWYgPSBBcnJheS5wcm90b3R5cGUucHVzaC5iaW5kKGZyb21KU2RlZnMpXG5cbnZhciBmcm9tSlNPTmRlZnMgPSBbXVxuU2NoZW1hLmZyb21KU09OID0gc2Vzc2lvbihsYXN0RGVmaW5lZFJlc3VsdC5iaW5kKG51bGwsIGZyb21KU09OZGVmcykpXG5TY2hlbWEuZnJvbUpTT04uZGVmID0gQXJyYXkucHJvdG90eXBlLnB1c2guYmluZChmcm9tSlNPTmRlZnMpXG5cblNjaGVtYS5wYXR0ZXJucyA9IHt9XG5TY2hlbWEuZXh0ZW5zaW9ucyA9IHt9XG4iLCJ2YXIgU2NoZW1hID0gcmVxdWlyZSgnLi4vQmFzZVNjaGVtYScpXG4gICwgRXF1YWxpdHlTY2hlbWEgPSByZXF1aXJlKCcuLi9wYXR0ZXJucy9lcXVhbGl0eScpXG4gICwgYW55dGhpbmcgPSByZXF1aXJlKCcuLi9wYXR0ZXJucy9hbnl0aGluZycpLmluc3RhbmNlXG5cbnZhciBBcnJheVNjaGVtYSA9IG1vZHVsZS5leHBvcnRzID0gU2NoZW1hLmV4dGVuc2lvbnMuQXJyYXlTY2hlbWEgPSBTY2hlbWEuZXh0ZW5kKHtcbiAgaW5pdGlhbGl6ZSA6IGZ1bmN0aW9uKGl0ZW1TY2hlbWEsIG1heCwgbWluKSB7XG4gICAgdGhpcy5pdGVtU2NoZW1hID0gaXRlbVNjaGVtYSB8fCBhbnl0aGluZ1xuICAgIHRoaXMubWluID0gbWluIHx8IDBcbiAgICB0aGlzLm1heCA9IG1heCB8fCBJbmZpbml0eVxuICB9LFxuXG4gIHZhbGlkYXRlIDogZnVuY3Rpb24oaW5zdGFuY2UpIHtcbiAgICAvLyBJbnN0YW5jZSBtdXN0IGJlIGFuIGluc3RhbmNlIG9mIEFycmF5XG4gICAgaWYgKCEoaW5zdGFuY2UgaW5zdGFuY2VvZiBBcnJheSkpIHJldHVybiBmYWxzZVxuXG4gICAgLy8gQ2hlY2tpbmcgbGVuZ3RoXG4gICAgaWYgKHRoaXMubWluID09PSB0aGlzLm1heCkge1xuICAgICAgaWYgKGluc3RhbmNlLmxlbmd0aCAhPT0gdGhpcy5taW4pIHJldHVybiBmYWxzZVxuXG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICh0aGlzLm1pbiA+IDAgICAgICAgICYmIGluc3RhbmNlLmxlbmd0aCA8IHRoaXMubWluKSByZXR1cm4gZmFsc2VcbiAgICAgIGlmICh0aGlzLm1heCA8IEluZmluaXR5ICYmIGluc3RhbmNlLmxlbmd0aCA+IHRoaXMubWF4KSByZXR1cm4gZmFsc2VcbiAgICB9XG5cbiAgICAvLyBDaGVja2luZyBjb25mb3JtYW5jZSB0byB0aGUgZ2l2ZW4gaXRlbSBzY2hlbWFcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGluc3RhbmNlLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoIXRoaXMuaXRlbVNjaGVtYS52YWxpZGF0ZShpbnN0YW5jZVtpXSkpIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIHRvSlNPTiA6IFNjaGVtYS5zZXNzaW9uKGZ1bmN0aW9uKCkge1xuICAgIHZhciBqc29uID0gU2NoZW1hLnByb3RvdHlwZS50b0pTT04uY2FsbCh0aGlzLCB0cnVlKVxuXG4gICAgaWYgKGpzb25bJyRyZWYnXSAhPSBudWxsKSByZXR1cm4ganNvblxuXG4gICAganNvbi50eXBlID0gJ2FycmF5J1xuXG4gICAgaWYgKHRoaXMubWluID4gMCkganNvbi5taW5JdGVtcyA9IHRoaXMubWluXG4gICAgaWYgKHRoaXMubWF4IDwgSW5maW5pdHkpIGpzb24ubWF4SXRlbXMgPSB0aGlzLm1heFxuICAgIGlmICh0aGlzLml0ZW1TY2hlbWEgIT09IGFueXRoaW5nKSBqc29uLml0ZW1zID0gdGhpcy5pdGVtU2NoZW1hLnRvSlNPTigpXG5cbiAgICByZXR1cm4ganNvblxuICB9KVxufSlcblxuU2NoZW1hLmZyb21KU09OLmRlZihmdW5jdGlvbihzY2gpIHtcbiAgaWYgKCFzY2ggfHwgc2NoLnR5cGUgIT09ICdhcnJheScpIHJldHVyblxuXG4gIC8vIFR1cGxlIHR5cGluZyBpcyBub3QgeWV0IHN1cHBvcnRlZFxuICBpZiAoc2NoLml0ZW1zIGluc3RhbmNlb2YgQXJyYXkpIHJldHVyblxuXG4gIHJldHVybiBuZXcgQXJyYXlTY2hlbWEoU2NoZW1hLmZyb21KU09OKHNjaC5pdGVtcyksIHNjaC5tYXhJdGVtcywgc2NoLm1pbkl0ZW1zKVxufSlcblxuQXJyYXkub2YgPSBmdW5jdGlvbigpIHtcbiAgLy8gUG9zc2libGUgc2lnbmF0dXJlcyA6IChzY2hlbWEpXG4gIC8vICAgICAgICAgICAgICAgICAgICAgICAobGVuZ3RoLCBzY2hlbWEpXG4gIC8vICAgICAgICAgICAgICAgICAgICAgICAobWluTGVuZ3RoLCBtYXhMZW5ndGgsIHNjaGVtYSlcbiAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpLnJldmVyc2UoKVxuICBpZiAoYXJncy5sZW5ndGggPT09IDIpIGFyZ3NbMl0gPSBhcmdzWzFdXG4gIHJldHVybiBuZXcgQXJyYXlTY2hlbWEoU2NoZW1hLmZyb21KUyhhcmdzWzBdKSwgYXJnc1sxXSwgYXJnc1syXSkud3JhcCgpXG59XG5cbkFycmF5Lmxpa2UgPSBmdW5jdGlvbihvdGhlcikge1xuICByZXR1cm4gbmV3IEVxdWFsaXR5U2NoZW1hKG90aGVyKS53cmFwKClcbn1cblxuQXJyYXkuc2NoZW1hID0gbmV3IEFycmF5U2NoZW1hKCkud3JhcCgpXG4iLCJ2YXIgU2NoZW1hID0gcmVxdWlyZSgnLi4vQmFzZVNjaGVtYScpXG5cbnZhciBCb29sZWFuU2NoZW1hID0gbW9kdWxlLmV4cG9ydHMgPSBTY2hlbWEuZXh0ZW5zaW9ucy5Cb29sZWFuU2NoZW1hID0gIG5ldyBTY2hlbWEuZXh0ZW5kKHtcbiAgdmFsaWRhdGUgOiBmdW5jdGlvbihpbnN0YW5jZSkge1xuICAgIHJldHVybiBPYmplY3QoaW5zdGFuY2UpIGluc3RhbmNlb2YgQm9vbGVhblxuICB9LFxuXG4gIHRvSlNPTiA6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB7IHR5cGUgOiAnYm9vbGVhbicgfVxuICB9XG59KVxuXG52YXIgYm9vbGVhblNjaGVtYSA9IG1vZHVsZS5leHBvcnRzID0gbmV3IEJvb2xlYW5TY2hlbWEoKS53cmFwKClcblxuU2NoZW1hLmZyb21KU09OLmRlZihmdW5jdGlvbihzY2gpIHtcbiAgaWYgKCFzY2ggfHwgc2NoLnR5cGUgIT09ICdib29sZWFuJykgcmV0dXJuXG5cbiAgcmV0dXJuIGJvb2xlYW5TY2hlbWFcbn0pXG5cbkJvb2xlYW4uc2NoZW1hID0gYm9vbGVhblNjaGVtYVxuIiwidmFyIFJlZmVyZW5jZVNjaGVtYSA9IHJlcXVpcmUoJy4uL3BhdHRlcm5zL3JlZmVyZW5jZScpXG5cbkZ1bmN0aW9uLnJlZmVyZW5jZSA9IGZ1bmN0aW9uKGYpIHtcbiAgcmV0dXJuIG5ldyBSZWZlcmVuY2VTY2hlbWEoZikud3JhcCgpXG59XG4iLCJ2YXIgU2NoZW1hID0gcmVxdWlyZSgnLi4vQmFzZVNjaGVtYScpXG5cbnZhciBOdW1iZXJTY2hlbWEgPSBtb2R1bGUuZXhwb3J0cyA9IFNjaGVtYS5leHRlbnNpb25zLk51bWJlclNjaGVtYSA9IFNjaGVtYS5leHRlbmQoe1xuICBpbml0aWFsaXplIDogZnVuY3Rpb24obWluaW11bSwgZXhjbHVzaXZlTWluaW11bSwgbWF4aW11bSwgZXhjbHVzaXZlTWF4aW11bSwgZGl2aXNpYmxlQnkpIHtcbiAgICB0aGlzLm1pbmltdW0gPSBtaW5pbXVtICE9IG51bGwgPyBtaW5pbXVtIDogLUluZmluaXR5XG4gICAgdGhpcy5leGNsdXNpdmVNaW5pbXVtID0gZXhjbHVzaXZlTWluaW11bVxuICAgIHRoaXMubWF4aW11bSA9IG1pbmltdW0gIT0gbnVsbCA/IG1heGltdW0gOiBJbmZpbml0eVxuICAgIHRoaXMuZXhjbHVzaXZlTWF4aW11bSA9IGV4Y2x1c2l2ZU1heGltdW1cbiAgICB0aGlzLmRpdmlzaWJsZUJ5ID0gZGl2aXNpYmxlQnkgfHwgMFxuICB9LFxuXG4gIG1pbiA6IGZ1bmN0aW9uKG1pbmltdW0pIHtcbiAgICByZXR1cm4gbmV3IE51bWJlclNjaGVtYSggbWluaW11bSwgZmFsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICwgdGhpcy5tYXhpbXVtLCB0aGlzLmV4Y2x1c2l2ZU1heGltdW1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICwgdGhpcy5kaXZpc2libGVCeVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgKS53cmFwKClcbiAgfSxcblxuICBhYm92ZSA6IGZ1bmN0aW9uKG1pbmltdW0pIHtcbiAgICByZXR1cm4gbmV3IE51bWJlclNjaGVtYSggbWluaW11bSwgdHJ1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLCB0aGlzLm1heGltdW0sIHRoaXMuZXhjbHVzaXZlTWF4aW11bVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLCB0aGlzLmRpdmlzaWJsZUJ5XG4gICAgICAgICAgICAgICAgICAgICAgICAgICApLndyYXAoKVxuICB9LFxuXG4gIG1heCA6IGZ1bmN0aW9uKG1heGltdW0pIHtcbiAgICByZXR1cm4gbmV3IE51bWJlclNjaGVtYSggdGhpcy5taW5pbXVtLCB0aGlzLmV4Y2x1c2l2ZU1pbmltdW1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICwgbWF4aW11bSwgZmFsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICwgdGhpcy5kaXZpc2libGVCeVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgKS53cmFwKClcbiAgfSxcblxuICBiZWxvdyA6IGZ1bmN0aW9uKG1heGltdW0pIHtcbiAgICByZXR1cm4gbmV3IE51bWJlclNjaGVtYSggdGhpcy5taW5pbXVtLCB0aGlzLmV4Y2x1c2l2ZU1pbmltdW1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICwgbWF4aW11bSwgdHJ1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLCB0aGlzLmRpdmlzaWJsZUJ5XG4gICAgICAgICAgICAgICAgICAgICAgICAgICApLndyYXAoKVxuICB9LFxuXG4gIHN0ZXAgOiBmdW5jdGlvbihkaXZpc2libGVCeSkge1xuICAgIHJldHVybiBuZXcgTnVtYmVyU2NoZW1hKCB0aGlzLm1pbmltdW0sIHRoaXMuZXhjbHVzaXZlTWluaW11bVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLCB0aGlzLm1heGltdW0sIHRoaXMuZXhjbHVzaXZlTWF4aW11bVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLCBkaXZpc2libGVCeVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgKS53cmFwKClcbiAgfSxcblxuICBwdWJsaWNGdW5jdGlvbnMgOiBbICdtaW4nLCAnYWJvdmUnLCAnbWF4JywgJ2JlbG93JywgJ3N0ZXAnIF0sXG5cbiAgdmFsaWRhdGUgOiBmdW5jdGlvbihpbnN0YW5jZSkge1xuICAgIHJldHVybiAoT2JqZWN0KGluc3RhbmNlKSBpbnN0YW5jZW9mIE51bWJlcikgJiZcbiAgICAgICAgICAgKHRoaXMuZXhjbHVzaXZlTWluaW11bSA/IGluc3RhbmNlID4gIHRoaXMubWluaW11bVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogaW5zdGFuY2UgPj0gdGhpcy5taW5pbXVtKSAmJlxuICAgICAgICAgICAodGhpcy5leGNsdXNpdmVNYXhpbXVtID8gaW5zdGFuY2UgPCAgdGhpcy5tYXhpbXVtXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgOiBpbnN0YW5jZSA8PSB0aGlzLm1heGltdW0pICYmXG4gICAgICAgICAgICh0aGlzLmRpdmlzaWJsZUJ5ID09PSAwIHx8IGluc3RhbmNlICUgdGhpcy5kaXZpc2libGVCeSA9PT0gMClcbiAgfSxcblxuICB0b0pTT04gOiBmdW5jdGlvbigpIHtcbiAgICB2YXIganNvbiA9IFNjaGVtYS5wcm90b3R5cGUudG9KU09OLmNhbGwodGhpcylcblxuICAgIGpzb24udHlwZSA9ICggdGhpcy5kaXZpc2libGVCeSAhPT0gMCAmJiB0aGlzLmRpdmlzaWJsZUJ5ICUgMSA9PT0gMCApID8gJ2ludGVnZXInIDogJ251bWJlcidcblxuICAgIGlmICh0aGlzLmRpdmlzaWJsZUJ5ICE9PSAwICYmIHRoaXMuZGl2aXNpYmxlQnkgIT09IDEpIGpzb24uZGl2aXNpYmxlQnkgPSB0aGlzLmRpdmlzaWJsZUJ5XG5cbiAgICBpZiAodGhpcy5taW5pbXVtICE9PSAtSW5maW5pdHkpIHtcbiAgICAgIGpzb24ubWluaW11bSA9IHRoaXMubWluaW11bVxuICAgICAgaWYgKHRoaXMuZXhjbHVzaXZlTWluaW11bSA9PT0gdHJ1ZSkganNvbi5leGNsdXNpdmVNaW5pbXVtID0gdHJ1ZVxuICAgIH1cblxuICAgIGlmICh0aGlzLm1heGltdW0gIT09IEluZmluaXR5KSB7XG4gICAgICBqc29uLm1heGltdW0gPSB0aGlzLm1heGltdW1cbiAgICAgIGlmICh0aGlzLmV4Y2x1c2l2ZU1heGltdW0gPT09IHRydWUpIGpzb24uZXhjbHVzaXZlTWF4aW11bSA9IHRydWVcbiAgICB9XG5cbiAgICByZXR1cm4ganNvblxuICB9XG59KVxuXG5TY2hlbWEuZnJvbUpTT04uZGVmKGZ1bmN0aW9uKHNjaCkge1xuICBpZiAoIXNjaCB8fCAoc2NoLnR5cGUgIT09ICdudW1iZXInICYmIHNjaC50eXBlICE9PSAnaW50ZWdlcicpKSByZXR1cm5cblxuICByZXR1cm4gbmV3IE51bWJlclNjaGVtYSggc2NoLm1pbmltdW0sIHNjaC5leGNsdXNpdmVNaW5pbXVtXG4gICAgICAgICAgICAgICAgICAgICAgICAgLCBzY2gubWF4aW11bSwgc2NoLmV4Y2x1c2l2ZU1heGltdW1cbiAgICAgICAgICAgICAgICAgICAgICAgICAsIHNjaC5kaXZpc2libGVCeSB8fCAoc2NoLnR5cGUgPT09ICdpbnRlZ2VyJyA/IDEgOiAwKVxuICAgICAgICAgICAgICAgICAgICAgICAgIClcbn0pXG5cbk51bWJlci5zY2hlbWEgICAgID0gbmV3IE51bWJlclNjaGVtYSgpLndyYXAoKVxuTnVtYmVyLm1pbiAgICAgICAgPSBOdW1iZXIuc2NoZW1hLm1pblxuTnVtYmVyLmFib3ZlICAgICAgPSBOdW1iZXIuc2NoZW1hLmFib3ZlXG5OdW1iZXIubWF4ICAgICAgICA9IE51bWJlci5zY2hlbWEubWF4XG5OdW1iZXIuYmVsb3cgICAgICA9IE51bWJlci5zY2hlbWEuYmVsb3dcbk51bWJlci5zdGVwICAgICAgID0gTnVtYmVyLnNjaGVtYS5zdGVwXG5cbk51bWJlci5JbnRlZ2VyID0gTnVtYmVyLnN0ZXAoMSlcbiIsInZhciBSZWZlcmVuY2VTY2hlbWEgPSByZXF1aXJlKCcuLi9wYXR0ZXJucy9yZWZlcmVuY2UnKVxuICAsIEVxdWFsaXR5U2NoZW1hID0gcmVxdWlyZSgnLi4vcGF0dGVybnMvZXF1YWxpdHknKVxuICAsIE9iamVjdFNjaGVtYSA9IHJlcXVpcmUoJy4uL3BhdHRlcm5zL29iamVjdCcpXG5cbk9iamVjdC5saWtlID0gZnVuY3Rpb24ob3RoZXIpIHtcbiAgcmV0dXJuIG5ldyBFcXVhbGl0eVNjaGVtYShvdGhlcikud3JhcCgpXG59XG5cbk9iamVjdC5yZWZlcmVuY2UgPSBmdW5jdGlvbihvKSB7XG4gIHJldHVybiBuZXcgUmVmZXJlbmNlU2NoZW1hKG8pLndyYXAoKVxufVxuXG5PYmplY3Quc2NoZW1hID0gbmV3IE9iamVjdFNjaGVtYSgpLndyYXAoKVxuIiwidmFyIFNjaGVtYSA9IHJlcXVpcmUoJy4uL0Jhc2VTY2hlbWEnKVxuICAsIHNjaGVtYSA9IHJlcXVpcmUoJy4uL3NjaGVtYScpXG5cbnZhciBTY2hlbWFSZWZlcmVuY2UgPSBtb2R1bGUuZXhwb3J0cyA9IFNjaGVtYS5leHRlbnNpb25zLlNjaGVtYVJlZmVyZW5jZSA9IFNjaGVtYS5leHRlbmQoe1xuICB2YWxpZGF0ZSA6IGZ1bmN0aW9uKCkge1xuICAgIHRocm93IG5ldyBFcnJvcignVHJ5aW5nIHRvIHZhbGlkYXRlIHVucmVzb2x2ZWQgc2NoZW1hIHJlZmVyZW5jZS4nKVxuICB9LFxuXG4gIHJlc29sdmUgOiBmdW5jdGlvbihzY2hlbWFEZXNjcmlwdG9yKSB7XG4gICAgdmFyIHNjaGVtYU9iamVjdCA9IFNjaGVtYS5mcm9tSlMoc2NoZW1hRGVzY3JpcHRvcilcblxuICAgIGZvciAodmFyIGtleSBpbiBzY2hlbWFPYmplY3QpIHtcbiAgICAgIGlmIChzY2hlbWFPYmplY3Rba2V5XSBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgICAgIHRoaXNba2V5XSA9IHNjaGVtYU9iamVjdFtrZXldLmJpbmQoc2NoZW1hT2JqZWN0KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpc1trZXldID0gc2NoZW1hT2JqZWN0W2tleV1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBkZWxldGUgdGhpcy5yZXNvbHZlXG4gIH0sXG5cbiAgcHVibGljRnVuY3Rpb25zIDogWyAncmVzb2x2ZScgXVxufSlcblxuc2NoZW1hLnJlZmVyZW5jZSA9IGZ1bmN0aW9uKHNjaGVtYURlc2NyaXB0b3IpIHtcbiAgcmV0dXJuIG5ldyBTY2hlbWFSZWZlcmVuY2UoKVxufVxuXG5mdW5jdGlvbiByZW5ld2luZyhyZWYpIHtcbiAgcmVmLnJlc29sdmUgPSBmdW5jdGlvbigpIHtcbiAgICBTY2hlbWEuc2VsZiA9IHNjaGVtYS5zZWxmID0gcmVuZXdpbmcobmV3IFNjaGVtYVJlZmVyZW5jZSgpKVxuICAgIHJldHVybiBTY2hlbWFSZWZlcmVuY2UucHJvdG90eXBlLnJlc29sdmUuYXBwbHkodGhpcywgYXJndW1lbnRzKVxuICB9XG4gIHJldHVybiByZWZcbn1cblxuU2NoZW1hLnNlbGYgPSBzY2hlbWEuc2VsZiA9IHJlbmV3aW5nKG5ldyBTY2hlbWFSZWZlcmVuY2UoKSlcblxuU2NoZW1hLmZyb21KU09OLmRlZihmdW5jdGlvbihzY2gpIHtcbiAgaWYgKHNjaC5pZCA9PSBudWxsICYmIHNjaFsnJHJlZiddID09IG51bGwpIHJldHVyblxuXG4gIHZhciBpZCwgc2Vzc2lvbiA9IFNjaGVtYS5zZXNzaW9uXG5cbiAgaWYgKCFzZXNzaW9uLmRlc2VyaWFsaXplZCkgc2Vzc2lvbi5kZXNlcmlhbGl6ZWQgPSB7IHJlZmVyZW5jZXM6IHt9LCBzdWJzY3JpYmVyczoge30gfVxuXG4gIGlmIChzY2guaWQgIT0gbnVsbCkge1xuICAgIC8vIFRoaXMgc2NoZW1hIGNhbiBiZSByZWZlcmVuY2VkIGluIHRoZSBmdXR1cmUgd2l0aCB0aGUgZ2l2ZW4gSURcbiAgICBpZCA9IHNjaC5pZFxuXG4gICAgLy8gRGVzZXJpYWxpemluZzpcbiAgICBkZWxldGUgc2NoLmlkXG4gICAgdmFyIHNjaGVtYU9iamVjdCA9IFNjaGVtYS5mcm9tSlNPTihzY2gpXG4gICAgc2NoLmlkID0gaWRcblxuICAgIC8vIFN0b3JpbmcgdGhlIHNjaGVtYSBvYmplY3QgYW5kIG5vdGlmeWluZyBzdWJzY3JpYmVyc1xuICAgIHNlc3Npb24uZGVzZXJpYWxpemVkLnJlZmVyZW5jZXNbaWRdID0gc2NoZW1hT2JqZWN0XG4gICAgOyhzZXNzaW9uLmRlc2VyaWFsaXplZC5zdWJzY3JpYmVyc1tpZF0gfHwgW10pLmZvckVhY2goZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgIGNhbGxiYWNrKHNjaGVtYU9iamVjdClcbiAgICB9KVxuXG4gICAgcmV0dXJuIHNjaGVtYU9iamVjdFxuXG4gIH0gZWxzZSB7XG4gICAgLy8gUmVmZXJlbmNpbmcgYSBzY2hlbWEgZ2l2ZW4gc29tZXdoZXJlIGVsc2Ugd2l0aCB0aGUgZ2l2ZW4gSURcbiAgICBpZCA9IHNjaFsnJHJlZiddXG5cbiAgICAvLyBJZiB0aGUgcmVmZXJlbmNlZCBzY2hlbWEgaXMgYWxyZWFkeSBrbm93biwgd2UgYXJlIHJlYWR5XG4gICAgaWYgKHNlc3Npb24uZGVzZXJpYWxpemVkLnJlZmVyZW5jZXNbaWRdKSByZXR1cm4gc2Vzc2lvbi5kZXNlcmlhbGl6ZWQucmVmZXJlbmNlc1tpZF1cblxuICAgIC8vIElmIG5vdCwgcmV0dXJuaW5nIGEgcmVmZXJlbmNlLCBhbmQgd2hlbiB0aGUgc2NoZW1hIGdldHMga25vd24sIHJlc29sdmluZyB0aGUgcmVmZXJlbmNlXG4gICAgaWYgKCFzZXNzaW9uLmRlc2VyaWFsaXplZC5zdWJzY3JpYmVyc1tpZF0pIHNlc3Npb24uZGVzZXJpYWxpemVkLnN1YnNjcmliZXJzW2lkXSA9IFtdXG4gICAgdmFyIHJlZmVyZW5jZSA9IG5ldyBTY2hlbWFSZWZlcmVuY2UoKVxuICAgIHNlc3Npb24uZGVzZXJpYWxpemVkLnN1YnNjcmliZXJzW2lkXS5wdXNoKHJlZmVyZW5jZS5yZXNvbHZlLmJpbmQocmVmZXJlbmNlKSlcblxuICAgIHJldHVybiByZWZlcmVuY2VcbiAgfVxufSlcbiIsInZhciBSZWdleHBTY2hlbWEgPSByZXF1aXJlKCcuLi9wYXR0ZXJucy9yZWdleHAnKVxuXG5TdHJpbmcub2YgPSBmdW5jdGlvbigpIHtcbiAgLy8gUG9zc2libGUgc2lnbmF0dXJlcyA6IChjaGFyc2V0KVxuICAvLyAgICAgICAgICAgICAgICAgICAgICAgKGxlbmd0aCwgY2hhcnNldClcbiAgLy8gICAgICAgICAgICAgICAgICAgICAgIChtaW5MZW5ndGgsIG1heExlbmd0aCwgY2hhcnNldClcbiAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpLnJldmVyc2UoKVxuICAgICwgY2hhcnNldCA9IGFyZ3NbMF0gPyAoJ1snICsgYXJnc1swXSArICddJykgOiAnW2EtekEtWjAtOV0nXG4gICAgLCBtYXggPSAgYXJnc1sxXVxuICAgICwgbWluID0gKGFyZ3MubGVuZ3RoID4gMikgPyBhcmdzWzJdIDogYXJnc1sxXVxuICAgICwgcmVnZXhwID0gJ14nICsgY2hhcnNldCArICd7JyArIChtaW4gfHwgMCkgKyAnLCcgKyAobWF4IHx8ICcnKSArICd9JCdcblxuICByZXR1cm4gbmV3IFJlZ2V4cFNjaGVtYShSZWdFeHAocmVnZXhwKSkud3JhcCgpXG59XG5cblN0cmluZy5zY2hlbWEgPSBuZXcgUmVnZXhwU2NoZW1hKCkud3JhcCgpXG4iLCJ2YXIgU2NoZW1hID0gcmVxdWlyZSgnLi4vQmFzZVNjaGVtYScpXG5cbnZhciBBbnl0aGluZ1NjaGVtYSA9IG1vZHVsZS5leHBvcnRzID0gU2NoZW1hLnBhdHRlcm5zLkFueXRoaW5nU2NoZW1hID0gU2NoZW1hLmV4dGVuZCh7XG4gIHZhbGlkYXRlIDogZnVuY3Rpb24oaW5zdGFuY2UpIHtcbiAgICByZXR1cm4gaW5zdGFuY2UgIT0gbnVsbFxuICB9LFxuXG4gIHRvSlNPTiA6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB7IHR5cGUgOiAnYW55JyB9XG4gIH1cbn0pXG5cbnZhciBhbnl0aGluZyA9IEFueXRoaW5nU2NoZW1hLmluc3RhbmNlID0gbmV3IEFueXRoaW5nU2NoZW1hKClcblxuU2NoZW1hLmZyb21KUy5kZWYoZnVuY3Rpb24oc2NoKSB7XG4gIGlmIChzY2ggPT09IHVuZGVmaW5lZCkgcmV0dXJuIGFueXRoaW5nXG59KVxuXG5TY2hlbWEuZnJvbUpTT04uZGVmKGZ1bmN0aW9uKHNjaCkge1xuICBpZiAoc2NoLnR5cGUgPT09ICdhbnknKSByZXR1cm4gYW55dGhpbmdcbn0pXG4iLCJ2YXIgU2NoZW1hID0gcmVxdWlyZSgnLi4vQmFzZVNjaGVtYScpXG5cbnZhciBDbGFzc1NjaGVtYSA9IG1vZHVsZS5leHBvcnRzID0gU2NoZW1hLnBhdHRlcm5zLkNsYXNzU2NoZW1hID0gU2NoZW1hLmV4dGVuZCh7XG4gIGluaXRpYWxpemUgOiBmdW5jdGlvbihjb25zdHJ1Y3Rvcikge1xuICAgIHRoaXMuY29uc3RydWN0b3IgPSBjb25zdHJ1Y3RvclxuICB9LFxuXG4gIHZhbGlkYXRlIDogZnVuY3Rpb24oaW5zdGFuY2UpIHtcbiAgICByZXR1cm4gaW5zdGFuY2UgaW5zdGFuY2VvZiB0aGlzLmNvbnN0cnVjdG9yXG4gIH1cbn0pXG5cblxuU2NoZW1hLmZyb21KUy5kZWYoZnVuY3Rpb24oY29uc3RydWN0b3IpIHtcbiAgaWYgKCEoY29uc3RydWN0b3IgaW5zdGFuY2VvZiBGdW5jdGlvbikpIHJldHVyblxuXG4gIGlmIChjb25zdHJ1Y3Rvci5zY2hlbWEgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgIHJldHVybiBjb25zdHJ1Y3Rvci5zY2hlbWEudW53cmFwKClcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbmV3IENsYXNzU2NoZW1hKGNvbnN0cnVjdG9yKVxuICB9XG59KVxuIiwidmFyIFNjaGVtYSA9IHJlcXVpcmUoJy4uL0Jhc2VTY2hlbWEnKVxuXG4vLyBPYmplY3QgZGVlcCBlcXVhbGl0eVxudmFyIGVxdWFsID0gZnVuY3Rpb24oYSwgYikge1xuICAvLyBpZiBhIG9yIGIgaXMgcHJpbWl0aXZlLCBzaW1wbGUgY29tcGFyaXNvblxuICBpZiAoT2JqZWN0KGEpICE9PSBhIHx8IE9iamVjdChiKSAhPT0gYikgcmV0dXJuIGEgPT09IGJcblxuICAvLyBib3RoIGEgYW5kIGIgbXVzdCBiZSBBcnJheSwgb3Igbm9uZSBvZiB0aGVtXG4gIGlmICgoYSBpbnN0YW5jZW9mIEFycmF5KSAhPT0gKGIgaW5zdGFuY2VvZiBBcnJheSkpIHJldHVybiBmYWxzZVxuXG4gIC8vIHRoZXkgbXVzdCBoYXZlIHRoZSBzYW1lIG51bWJlciBvZiBwcm9wZXJ0aWVzXG4gIGlmIChPYmplY3Qua2V5cyhhKS5sZW5ndGggIT09IE9iamVjdC5rZXlzKGIpLmxlbmd0aCkgcmV0dXJuIGZhbHNlXG5cbiAgLy8gYW5kIGV2ZXJ5IHByb3BlcnR5IHNob3VsZCBiZSBlcXVhbFxuICBmb3IgKHZhciBrZXkgaW4gYSkge1xuICAgIGlmICghZXF1YWwoYVtrZXldLCBiW2tleV0pKSByZXR1cm4gZmFsc2VcbiAgfVxuXG4gIC8vIGlmIGV2ZXJ5IGNoZWNrIHN1Y2NlZWRlZCwgdGhleSBhcmUgZGVlcCBlcXVhbFxuICByZXR1cm4gdHJ1ZVxufVxuXG52YXIgRXF1YWxpdHlTY2hlbWEgPSBtb2R1bGUuZXhwb3J0cyA9IFNjaGVtYS5wYXR0ZXJucy5FcXVhbGl0eVNjaGVtYSA9IFNjaGVtYS5leHRlbmQoe1xuICBpbml0aWFsaXplIDogZnVuY3Rpb24ob2JqZWN0KSB7XG4gICAgdGhpcy5vYmplY3QgPSBvYmplY3RcbiAgfSxcblxuICB2YWxpZGF0ZSA6IGZ1bmN0aW9uKGluc3RhbmNlKSB7XG4gICAgcmV0dXJuIGVxdWFsKGluc3RhbmNlLCB0aGlzLm9iamVjdClcbiAgfSxcblxuICB0b0pTT04gOiBmdW5jdGlvbigpIHtcbiAgICB2YXIganNvbiA9IFNjaGVtYS5wcm90b3R5cGUudG9KU09OLmNhbGwodGhpcylcblxuICAgIGpzb25bJ2VudW0nXSA9IFt0aGlzLm9iamVjdF1cblxuICAgIHJldHVybiBqc29uXG4gIH1cbn0pXG5cblxuU2NoZW1hLmZyb21KUy5kZWYoZnVuY3Rpb24oc2NoKSB7XG4gIGlmIChzY2ggaW5zdGFuY2VvZiBBcnJheSAmJiBzY2gubGVuZ3RoID09PSAxKSByZXR1cm4gbmV3IEVxdWFsaXR5U2NoZW1hKHNjaFswXSlcbn0pXG4iLCJ2YXIgU2NoZW1hID0gcmVxdWlyZSgnLi4vQmFzZVNjaGVtYScpXG5cbnZhciBOb3RoaW5nU2NoZW1hID0gbW9kdWxlLmV4cG9ydHMgPSBTY2hlbWEucGF0dGVybnMuTm90aGluZ1NjaGVtYSA9IFNjaGVtYS5leHRlbmQoe1xuICB2YWxpZGF0ZSA6IGZ1bmN0aW9uKGluc3RhbmNlKSB7XG4gICAgcmV0dXJuIGluc3RhbmNlID09IG51bGxcbiAgfSxcblxuICB0b0pTT04gOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4geyB0eXBlIDogJ251bGwnIH1cbiAgfVxufSlcblxudmFyIG5vdGhpbmcgPSBOb3RoaW5nU2NoZW1hLmluc3RhbmNlID0gbmV3IE5vdGhpbmdTY2hlbWEoKVxuXG5TY2hlbWEuZnJvbUpTLmRlZihmdW5jdGlvbihzY2gpIHtcbiAgaWYgKHNjaCA9PT0gbnVsbCkgcmV0dXJuIG5vdGhpbmdcbn0pXG5cblNjaGVtYS5mcm9tSlNPTi5kZWYoZnVuY3Rpb24oc2NoKSB7XG4gIGlmIChzY2gudHlwZSA9PT0gJ251bGwnKSByZXR1cm4gbm90aGluZ1xufSlcbiIsInZhciBTY2hlbWEgPSByZXF1aXJlKCcuLi9CYXNlU2NoZW1hJylcbiAgLCBhbnl0aGluZyA9IHJlcXVpcmUoJy4vYW55dGhpbmcnKS5pbnN0YW5jZVxuICAsIG5vdGhpbmcgPSByZXF1aXJlKCcuL25vdGhpbmcnKS5pbnN0YW5jZVxuXG52YXIgT2JqZWN0U2NoZW1hID0gbW9kdWxlLmV4cG9ydHMgPSBTY2hlbWEucGF0dGVybnMuT2JqZWN0U2NoZW1hID0gU2NoZW1hLmV4dGVuZCh7XG4gIGluaXRpYWxpemUgOiBmdW5jdGlvbihwcm9wZXJ0aWVzLCBvdGhlcikge1xuICAgIHZhciBzZWxmID0gdGhpc1xuXG4gICAgdGhpcy5vdGhlciA9IG90aGVyIHx8IGFueXRoaW5nXG4gICAgdGhpcy5wcm9wZXJ0aWVzID0gcHJvcGVydGllcyB8fCBbXVxuXG4gICAgLy8gU29ydGluZyBwcm9wZXJ0aWVzIGludG8gdHdvIGdyb3Vwc1xuICAgIHRoaXMuc3RyaW5nUHJvcHMgPSB7fSwgdGhpcy5yZWdleHBQcm9wcyA9IFtdXG4gICAgdGhpcy5wcm9wZXJ0aWVzLmZvckVhY2goZnVuY3Rpb24ocHJvcGVydHkpIHtcbiAgICAgIGlmICh0eXBlb2YgcHJvcGVydHkua2V5ID09PSAnc3RyaW5nJykge1xuICAgICAgICBzZWxmLnN0cmluZ1Byb3BzW3Byb3BlcnR5LmtleV0gPSBwcm9wZXJ0eVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2VsZi5yZWdleHBQcm9wcy5wdXNoKHByb3BlcnR5KVxuICAgICAgfVxuICAgIH0pXG4gIH0sXG5cbiAgdmFsaWRhdGUgOiBmdW5jdGlvbihpbnN0YW5jZSkge1xuICAgIHZhciBzZWxmID0gdGhpc1xuXG4gICAgaWYgKGluc3RhbmNlID09IG51bGwpIHJldHVybiBmYWxzZVxuXG4gICAgLy8gU2ltcGxlIHN0cmluZyBwcm9wZXJ0aWVzXG4gICAgdmFyIHN0cmluZ1Byb3BzVmFsaWQgPSBPYmplY3Qua2V5cyh0aGlzLnN0cmluZ1Byb3BzKS5ldmVyeShmdW5jdGlvbihrZXkpIHtcbiAgICAgIHJldHVybiAoc2VsZi5zdHJpbmdQcm9wc1trZXldLm1pbiA9PT0gMCAmJiAhKGtleSBpbiBpbnN0YW5jZSkpIHx8XG4gICAgICAgICAgICAgKHNlbGYuc3RyaW5nUHJvcHNba2V5XS52YWx1ZS52YWxpZGF0ZShpbnN0YW5jZVtrZXldKSlcbiAgICB9KVxuICAgIGlmICghc3RyaW5nUHJvcHNWYWxpZCkgcmV0dXJuIGZhbHNlXG5cbiAgICAvLyBJZiB0aGVyZSBhcmUgbm8gUmVnRXhwIGFuZCBvdGhlciB2YWxpZGF0b3IsIHRoYXQncyBhbGxcbiAgICBpZiAoIXRoaXMucmVnZXhwUHJvcHMubGVuZ3RoICYmIHRoaXMub3RoZXIgPT09IGFueXRoaW5nKSByZXR1cm4gdHJ1ZVxuXG4gICAgLy8gUmVnZXhwIGFuZCBvdGhlciBwcm9wZXJ0aWVzXG4gICAgdmFyIGNoZWNrZWRcbiAgICBmb3IgKHZhciBrZXkgaW4gaW5zdGFuY2UpIHtcblxuICAgICAgLy8gQ2hlY2tpbmcgdGhlIGtleSBhZ2FpbnN0IGV2ZXJ5IGtleSByZWdleHBzXG4gICAgICBjaGVja2VkID0gZmFsc2VcbiAgICAgIHZhciByZWdleHBQcm9wc1ZhbGlkID0gT2JqZWN0LmtleXModGhpcy5yZWdleHBQcm9wcykuZXZlcnkoZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIHJldHVybiAoIXNlbGYucmVnZXhwUHJvcHNba2V5XS5rZXkudGVzdChrZXkpIHx8XG4gICAgICAgICAgICAgICAgKChjaGVja2VkID0gdHJ1ZSkgJiYgc2VsZi5yZWdleHBQcm9wc1trZXldLnZhbHVlLnZhbGlkYXRlKGluc3RhbmNlW2tleV0pKVxuICAgICAgICAgICAgICAgKVxuICAgICAgfSlcbiAgICAgIGlmICghcmVnZXhwUHJvcHNWYWxpZCkgcmV0dXJuIGZhbHNlXG5cbiAgICAgIC8vIElmIHRoZSBrZXkgaXMgbm90IG1hdGNoZWQgYnkgcmVnZXhwcyBhbmQgYnkgc2ltcGxlIHN0cmluZyBjaGVja3NcbiAgICAgIC8vIHRoZW4gY2hlY2sgaXQgYWdhaW5zdCB0aGlzLm90aGVyXG4gICAgICBpZiAoIWNoZWNrZWQgJiYgIShrZXkgaW4gdGhpcy5zdHJpbmdQcm9wcykgJiYgIXRoaXMub3RoZXIudmFsaWRhdGUoaW5zdGFuY2Vba2V5XSkpIHJldHVybiBmYWxzZVxuXG4gICAgfVxuXG4gICAgLy8gSWYgYWxsIGNoZWNrcyBwYXNzZWQsIHRoZSBpbnN0YW5jZSBjb25mb3JtcyB0byB0aGUgc2NoZW1hXG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICB0b0pTT04gOiBTY2hlbWEuc2Vzc2lvbihmdW5jdGlvbigpIHtcbiAgICB2YXIgaSwgcHJvcGVydHksIHJlZ2V4cCwganNvbiA9IFNjaGVtYS5wcm90b3R5cGUudG9KU09OLmNhbGwodGhpcywgdHJ1ZSlcblxuICAgIGlmIChqc29uWyckcmVmJ10gIT0gbnVsbCkgcmV0dXJuIGpzb25cblxuICAgIGpzb24udHlwZSA9ICdvYmplY3QnXG5cbiAgICBmb3IgKGkgaW4gdGhpcy5zdHJpbmdQcm9wcykge1xuICAgICAgcHJvcGVydHkgPSB0aGlzLnN0cmluZ1Byb3BzW2ldXG4gICAgICBqc29uLnByb3BlcnRpZXMgPSBqc29uLnByb3BlcnRpZXMgfHwge31cbiAgICAgIGpzb24ucHJvcGVydGllc1twcm9wZXJ0eS5rZXldID0gcHJvcGVydHkudmFsdWUudG9KU09OKClcbiAgICAgIGlmIChwcm9wZXJ0eS5taW4gPT09IDEpIGpzb24ucHJvcGVydGllc1twcm9wZXJ0eS5rZXldLnJlcXVpcmVkID0gdHJ1ZVxuICAgICAgaWYgKHByb3BlcnR5LnRpdGxlKSBqc29uLnByb3BlcnRpZXNbcHJvcGVydHkua2V5XS50aXRsZSA9IHByb3BlcnR5LnRpdGxlXG4gICAgfVxuXG4gICAgZm9yIChpID0gMDsgaSA8IHRoaXMucmVnZXhwUHJvcHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHByb3BlcnR5ID0gdGhpcy5yZWdleHBQcm9wc1tpXVxuICAgICAganNvbi5wYXR0ZXJuUHJvcGVydGllcyA9IGpzb24ucGF0dGVyblByb3BlcnRpZXMgfHwge31cbiAgICAgIHJlZ2V4cCA9IHByb3BlcnR5LmtleS50b1N0cmluZygpXG4gICAgICByZWdleHAgPSByZWdleHAuc3Vic3RyKDIsIHJlZ2V4cC5sZW5ndGggLSA0KVxuICAgICAganNvbi5wYXR0ZXJuUHJvcGVydGllc1tyZWdleHBdID0gcHJvcGVydHkudmFsdWUudG9KU09OKClcbiAgICAgIGlmIChwcm9wZXJ0eS50aXRsZSkganNvbi5wYXR0ZXJuUHJvcGVydGllc1tyZWdleHBdLnRpdGxlID0gcHJvcGVydHkudGl0bGVcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vdGhlciAhPT0gYW55dGhpbmcpIHtcbiAgICAgIGpzb24uYWRkaXRpb25hbFByb3BlcnRpZXMgPSAodGhpcy5vdGhlciA9PT0gbm90aGluZykgPyBmYWxzZSA6IHRoaXMub3RoZXIudG9KU09OKClcbiAgICB9XG5cbiAgICByZXR1cm4ganNvblxuICB9KVxufSlcblxuLy8gVGVzdGluZyBpZiBhIGdpdmVuIHN0cmluZyBpcyBhIHJlYWwgcmVnZXhwIG9yIGp1c3QgYSBzaW5nbGUgc3RyaW5nIGVzY2FwZWRcbi8vIElmIGl0IGlzIGp1c3QgYSBzdHJpbmcgZXNjYXBlZCwgcmV0dXJuIHRoZSBzdHJpbmcuIE90aGVyd2lzZSByZXR1cm4gdGhlIHJlZ2V4cFxudmFyIHJlZ2V4cFN0cmluZyA9IChmdW5jdGlvbigpIHtcbiAgLy8gU3BlY2lhbCBjaGFyYWN0ZXJzIHRoYXQgc2hvdWxkIGJlIGVzY2FwZWQgd2hlbiBkZXNjcmliaW5nIGEgcmVndWxhciBzdHJpbmcgaW4gcmVnZXhwXG4gIHZhciBzaG91bGRCZUVzY2FwZWQgPSAnW10oKXt9XiQ/KisuJy5zcGxpdCgnJykubWFwKGZ1bmN0aW9uKGVsZW1lbnQpIHtcbiAgICAgICAgcmV0dXJuIFJlZ0V4cCgnKFxcXFxcXFxcKSpcXFxcJyArIGVsZW1lbnQsICdnJylcbiAgICAgIH0pXG4gIC8vIFNwZWNpYWwgY2hhcmFjdGVycyB0aGF0IHNob3VsZG4ndCBiZSBlc2NhcGVkIHdoZW4gZGVzY3JpYmluZyBhIHJlZ3VsYXIgc3RyaW5nIGluIHJlZ2V4cFxuICB2YXIgc2hvdWxkbnRCZUVzY2FwZWQgPSAnYkJ3V2REc1MnLnNwbGl0KCcnKS5tYXAoZnVuY3Rpb24oZWxlbWVudCkge1xuICAgICAgICByZXR1cm4gUmVnRXhwKCcoXFxcXFxcXFwpKicgKyBlbGVtZW50LCAnZycpXG4gICAgICB9KVxuXG4gIHJldHVybiBmdW5jdGlvbihzdHJpbmcpIHtcbiAgICB2YXIgaSwgaiwgbWF0Y2hcblxuICAgIGZvciAoaSA9IDA7IGkgPCBzaG91bGRCZUVzY2FwZWQubGVuZ3RoOyBpKyspIHtcbiAgICAgIG1hdGNoID0gc3RyaW5nLm1hdGNoKHNob3VsZEJlRXNjYXBlZFtpXSlcbiAgICAgIGlmICghbWF0Y2gpIGNvbnRpbnVlXG4gICAgICBmb3IgKGogPSAwOyBqIDwgbWF0Y2gubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgLy8gSWYgaXQgaXMgbm90IGVzY2FwZWQsIGl0IG11c3QgYmUgYSByZWdleHAgKGUuZy4gWywgXFxcXFssIFxcXFxcXFxcWywgZXRjLilcbiAgICAgICAgaWYgKG1hdGNoW2pdLmxlbmd0aCAlIDIgPT09IDEpIHJldHVybiBSZWdFeHAoJ14nICsgc3RyaW5nICsgJyQnKVxuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGkgPSAwOyBpIDwgc2hvdWxkbnRCZUVzY2FwZWQubGVuZ3RoOyBpKyspIHtcbiAgICAgIG1hdGNoID0gc3RyaW5nLm1hdGNoKHNob3VsZG50QmVFc2NhcGVkW2ldKVxuICAgICAgaWYgKCFtYXRjaCkgY29udGludWVcbiAgICAgIGZvciAoaiA9IDA7IGogPCBtYXRjaC5sZW5ndGg7IGorKykge1xuICAgICAgICAvLyBJZiBpdCBpcyBlc2NhcGVkLCBpdCBtdXN0IGJlIGEgcmVnZXhwIChlLmcuIFxcYiwgXFxcXFxcYiwgXFxcXFxcXFxcXGIsIGV0Yy4pXG4gICAgICAgIGlmIChtYXRjaFtqXS5sZW5ndGggJSAyID09PSAwKSByZXR1cm4gUmVnRXhwKCdeJyArIHN0cmluZyArICckJylcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBJdCBpcyBub3QgYSByZWFsIHJlZ2V4cC4gUmVtb3ZpbmcgdGhlIGVzY2FwaW5nLlxuICAgIGZvciAoaSA9IDA7IGkgPCBzaG91bGRCZUVzY2FwZWQubGVuZ3RoOyBpKyspIHtcbiAgICAgIHN0cmluZyA9IHN0cmluZy5yZXBsYWNlKHNob3VsZEJlRXNjYXBlZFtpXSwgZnVuY3Rpb24obWF0Y2gpIHtcbiAgICAgICAgcmV0dXJuIG1hdGNoLnN1YnN0cigxKVxuICAgICAgfSlcbiAgICB9XG5cbiAgICByZXR1cm4gc3RyaW5nXG4gIH1cbn0pKClcblxuU2NoZW1hLmZyb21KUy5kZWYoZnVuY3Rpb24ob2JqZWN0KSB7XG4gIGlmICghKG9iamVjdCBpbnN0YW5jZW9mIE9iamVjdCkpIHJldHVyblxuXG4gIHZhciBvdGhlciwgcHJvcGVydHksIHByb3BlcnRpZXMgPSBbXVxuICBmb3IgKHZhciBrZXkgaW4gb2JqZWN0KSB7XG4gICAgcHJvcGVydHkgPSB7IHZhbHVlIDogU2NoZW1hLmZyb21KUyhvYmplY3Rba2V5XSkgfVxuXG4gICAgLy8gJyonIGFzIHByb3BlcnR5IG5hbWUgbWVhbnMgJ2V2ZXJ5IG90aGVyIHByb3BlcnR5IHNob3VsZCBtYXRjaCB0aGlzIHNjaGVtYSdcbiAgICBpZiAoa2V5ID09PSAnKicpIHtcbiAgICAgIG90aGVyID0gcHJvcGVydHkudmFsdWVcbiAgICAgIGNvbnRpbnVlXG4gICAgfVxuXG4gICAgLy8gSGFuZGxpbmcgc3BlY2lhbCBjaGFycyBhdCB0aGUgYmVnaW5uaW5nIG9mIHRoZSBwcm9wZXJ0eSBuYW1lXG4gICAgcHJvcGVydHkubWluID0gKGtleVswXSA9PT0gJyonIHx8IGtleVswXSA9PT0gJz8nKSA/IDAgOiAxXG4gICAgcHJvcGVydHkubWF4ID0gKGtleVswXSA9PT0gJyonIHx8IGtleVswXSA9PT0gJysnKSA/IEluZmluaXR5IDogMVxuICAgIGtleSA9IGtleS5yZXBsYWNlKC9eWyo/K10vLCAnJylcblxuICAgIC8vIEhhbmRsaW5nIHByb3BlcnR5IHRpdGxlIHRoYXQgbG9va3MgbGlrZTogeyAnYSA6IGFuIGltcG9ydGFudCBwcm9wZXJ0eScgOiBOdW1iZXIgfVxuICAgIGtleSA9IGtleS5yZXBsYWNlKC9cXHMqOlteOl0rJC8sIGZ1bmN0aW9uKG1hdGNoKSB7XG4gICAgICBwcm9wZXJ0eS50aXRsZSA9IG1hdGNoLnJlcGxhY2UoL15cXHMqOlxccyovLCAnJylcbiAgICAgIHJldHVybiAnJ1xuICAgIH0pXG5cbiAgICAvLyBUZXN0aW5nIGlmIGl0IGlzIHJlZ2V4cC1saWtlIG9yIG5vdC4gSWYgaXQgaXMsIHRoZW4gY29udmVydGluZyB0byBhIHJlZ2V4cCBvYmplY3RcbiAgICBwcm9wZXJ0eS5rZXkgPSByZWdleHBTdHJpbmcoa2V5KVxuXG4gICAgcHJvcGVydGllcy5wdXNoKHByb3BlcnR5KVxuICB9XG5cbiAgcmV0dXJuIG5ldyBPYmplY3RTY2hlbWEocHJvcGVydGllcywgb3RoZXIpXG59KVxuXG5TY2hlbWEuZnJvbUpTT04uZGVmKGZ1bmN0aW9uKGpzb24pIHtcbiAgaWYgKCFqc29uIHx8IGpzb24udHlwZSAhPT0gJ29iamVjdCcpIHJldHVyblxuXG4gIHZhciBrZXksIHByb3BlcnRpZXMgPSBbXVxuICBmb3IgKGtleSBpbiBqc29uLnByb3BlcnRpZXMpIHtcbiAgICBwcm9wZXJ0aWVzLnB1c2goeyBtaW4gOiBqc29uLnByb3BlcnRpZXNba2V5XS5yZXF1aXJlZCA/IDEgOiAwXG4gICAgICAgICAgICAgICAgICAgICwgbWF4IDogMVxuICAgICAgICAgICAgICAgICAgICAsIGtleSA6IGtleVxuICAgICAgICAgICAgICAgICAgICAsIHZhbHVlIDogU2NoZW1hLmZyb21KU09OKGpzb24ucHJvcGVydGllc1trZXldKVxuICAgICAgICAgICAgICAgICAgICAsIHRpdGxlIDoganNvbi5wcm9wZXJ0aWVzW2tleV0udGl0bGVcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgfVxuICBmb3IgKGtleSBpbiBqc29uLnBhdHRlcm5Qcm9wZXJ0aWVzKSB7XG4gICAgcHJvcGVydGllcy5wdXNoKHsgbWluIDogMFxuICAgICAgICAgICAgICAgICAgICAsIG1heCA6IEluZmluaXR5XG4gICAgICAgICAgICAgICAgICAgICwga2V5IDogUmVnRXhwKCdeJyArIGtleSArICckJylcbiAgICAgICAgICAgICAgICAgICAgLCB2YWx1ZSA6IFNjaGVtYS5mcm9tSlNPTihqc29uLnBhdHRlcm5Qcm9wZXJ0aWVzW2tleV0pXG4gICAgICAgICAgICAgICAgICAgICwgdGl0bGUgOiBqc29uLnBhdHRlcm5Qcm9wZXJ0aWVzW2tleV0udGl0bGVcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgfVxuXG4gIHZhciBvdGhlclxuICBpZiAoanNvbi5hZGRpdGlvbmFsUHJvcGVydGllcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgb3RoZXIgPSBqc29uLmFkZGl0aW9uYWxQcm9wZXJ0aWVzID09PSBmYWxzZSA/IG5vdGhpbmcgOiBTY2hlbWEuZnJvbUpTT04oanNvbi5hZGRpdGlvbmFsUHJvcGVydGllcylcbiAgfVxuXG4gIHJldHVybiBuZXcgT2JqZWN0U2NoZW1hKHByb3BlcnRpZXMsIG90aGVyKVxufSlcbiIsInZhciBTY2hlbWEgPSByZXF1aXJlKCcuLi9CYXNlU2NoZW1hJylcbiAgLCBFcXVhbGl0eVNjaGVtYSA9IHJlcXVpcmUoJy4uL3BhdHRlcm5zL2VxdWFsaXR5JylcblxudmFyIE9yU2NoZW1hID0gbW9kdWxlLmV4cG9ydHMgPSBTY2hlbWEucGF0dGVybnMuT3JTY2hlbWEgPSBTY2hlbWEuZXh0ZW5kKHtcbiAgaW5pdGlhbGl6ZSA6IGZ1bmN0aW9uKHNjaGVtYXMpIHtcbiAgICB0aGlzLnNjaGVtYXMgPSBzY2hlbWFzXG4gIH0sXG5cbiAgdmFsaWRhdGUgOiBmdW5jdGlvbihpbnN0YW5jZSkge1xuICAgIHJldHVybiB0aGlzLnNjaGVtYXMuc29tZShmdW5jdGlvbihzY2gpIHtcbiAgICAgIHJldHVybiBzY2gudmFsaWRhdGUoaW5zdGFuY2UpXG4gICAgfSlcbiAgfSxcblxuICB0b0pTT04gOiBTY2hlbWEuc2Vzc2lvbihmdW5jdGlvbigpIHtcbiAgICB2YXIganNvbiA9IFNjaGVtYS5wcm90b3R5cGUudG9KU09OLmNhbGwodGhpcywgdHJ1ZSlcbiAgICAgICwgc3VianNvbnMgPSB0aGlzLnNjaGVtYXMubWFwKGZ1bmN0aW9uKHNjaCkgeyByZXR1cm4gc2NoLnRvSlNPTigpIH0pXG4gICAgICAsIG9ubHlFcXVhbGl0eSA9IHN1Ympzb25zLmV2ZXJ5KGZ1bmN0aW9uKGpzb24pIHtcbiAgICAgICAgICByZXR1cm4ganNvblsnZW51bSddIGluc3RhbmNlb2YgQXJyYXkgJiYganNvblsnZW51bSddLmxlbmd0aCA9PT0gMVxuICAgICAgICB9KVxuXG4gICAgaWYgKGpzb25bJyRyZWYnXSAhPSBudWxsKSByZXR1cm4ganNvblxuXG4gICAgaWYgKG9ubHlFcXVhbGl0eSkge1xuICAgICAganNvblsnZW51bSddID0gc3VianNvbnMubWFwKGZ1bmN0aW9uKGpzb24pIHtcbiAgICAgICAgcmV0dXJuIGpzb25bJ2VudW0nXVswXVxuICAgICAgfSlcblxuICAgIH0gZWxzZSB7XG4gICAgICBqc29uWyd0eXBlJ10gPSBzdWJqc29ucy5tYXAoZnVuY3Rpb24oanNvbikge1xuICAgICAgICB2YXIgc2ltcGxlVHlwZSA9IHR5cGVvZiBqc29uLnR5cGUgPT09ICdzdHJpbmcnICYmIE9iamVjdC5rZXlzKGpzb24pLmxlbmd0aCA9PT0gMVxuICAgICAgICByZXR1cm4gc2ltcGxlVHlwZSA/IGpzb24udHlwZSA6IGpzb25cbiAgICAgIH0pXG4gICAgfVxuXG4gICAgcmV0dXJuIGpzb25cbiAgfSlcbn0pXG5cblxuU2NoZW1hLmZyb21KUy5kZWYoZnVuY3Rpb24oc2NoZW1hcykge1xuICBpZiAoc2NoZW1hcyBpbnN0YW5jZW9mIEFycmF5KSByZXR1cm4gbmV3IE9yU2NoZW1hKHNjaGVtYXMubWFwKGZ1bmN0aW9uKHNjaCkge1xuICAgIHJldHVybiBzY2ggPT09IHVuZGVmaW5lZCA/IFNjaGVtYS5zZWxmIDogU2NoZW1hLmZyb21KUyhzY2gpXG4gIH0pKVxufSlcblxuU2NoZW1hLmZyb21KU09OLmRlZihmdW5jdGlvbihzY2gpIHtcbiAgaWYgKCFzY2gpIHJldHVyblxuXG4gIGlmIChzY2hbJ2VudW0nXSBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgcmV0dXJuIG5ldyBPclNjaGVtYShzY2hbJ2VudW0nXS5tYXAoZnVuY3Rpb24ob2JqZWN0KSB7XG4gICAgICByZXR1cm4gbmV3IEVxdWFsaXR5U2NoZW1hKG9iamVjdClcbiAgICB9KSlcbiAgfVxuXG4gIGlmIChzY2hbJ3R5cGUnXSBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgcmV0dXJuIG5ldyBPclNjaGVtYShzY2hbJ3R5cGUnXS5tYXAoZnVuY3Rpb24odHlwZSkge1xuICAgICAgcmV0dXJuIFNjaGVtYS5mcm9tSlNPTih0eXBlb2YgdHlwZSA9PT0gJ3N0cmluZycgPyB7IHR5cGUgOiB0eXBlIH0gOiB0eXBlKVxuICAgIH0pKVxuICB9XG59KVxuIiwidmFyIFNjaGVtYSA9IHJlcXVpcmUoJy4uL0Jhc2VTY2hlbWEnKVxuXG52YXIgUmVmZXJlbmNlU2NoZW1hID0gbW9kdWxlLmV4cG9ydHMgPSBTY2hlbWEucGF0dGVybnMuUmVmZXJlbmNlU2NoZW1hID0gU2NoZW1hLmV4dGVuZCh7XG4gIGluaXRpYWxpemUgOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHRoaXMudmFsdWUgPSB2YWx1ZVxuICB9LFxuXG4gIHZhbGlkYXRlIDogZnVuY3Rpb24oaW5zdGFuY2UpIHtcbiAgICByZXR1cm4gaW5zdGFuY2UgPT09IHRoaXMudmFsdWVcbiAgfSxcblxuICB0b0pTT04gOiBmdW5jdGlvbigpIHtcbiAgICB2YXIganNvbiA9IFNjaGVtYS5wcm90b3R5cGUudG9KU09OLmNhbGwodGhpcylcblxuICAgIGpzb25bJ2VudW0nXSA9IFt0aGlzLnZhbHVlXVxuXG4gICAgcmV0dXJuIGpzb25cbiAgfVxufSlcblxuXG5TY2hlbWEuZnJvbUpTLmRlZihmdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gbmV3IFJlZmVyZW5jZVNjaGVtYSh2YWx1ZSlcbn0pXG4iLCJ2YXIgU2NoZW1hID0gcmVxdWlyZSgnLi4vQmFzZVNjaGVtYScpXG5cbnZhciBSZWdleHBTY2hlbWEgPSBtb2R1bGUuZXhwb3J0cyA9IFNjaGVtYS5wYXR0ZXJucy5SZWdleHBTY2hlbWEgPSBTY2hlbWEuZXh0ZW5kKHtcbiAgaW5pdGlhbGl6ZSA6IGZ1bmN0aW9uKHJlZ2V4cCkge1xuICAgIHRoaXMucmVnZXhwID0gcmVnZXhwXG4gIH0sXG5cbiAgdmFsaWRhdGUgOiBmdW5jdGlvbihpbnN0YW5jZSkge1xuICAgIHJldHVybiBPYmplY3QoaW5zdGFuY2UpIGluc3RhbmNlb2YgU3RyaW5nICYmICghdGhpcy5yZWdleHAgfHwgdGhpcy5yZWdleHAudGVzdChpbnN0YW5jZSkpXG4gIH0sXG5cbiAgdG9KU09OIDogZnVuY3Rpb24oKSB7XG4gICAgdmFyIGpzb24gPSBTY2hlbWEucHJvdG90eXBlLnRvSlNPTi5jYWxsKHRoaXMpXG5cbiAgICBqc29uLnR5cGUgPSAnc3RyaW5nJ1xuXG4gICAgaWYgKHRoaXMucmVnZXhwKSB7XG4gICAgICBqc29uLnBhdHRlcm4gPSB0aGlzLnJlZ2V4cC50b1N0cmluZygpXG4gICAgICBqc29uLnBhdHRlcm4gPSBqc29uLnBhdHRlcm4uc3Vic3RyKDEsIGpzb24ucGF0dGVybi5sZW5ndGggLSAyKVxuICAgIH1cblxuICAgIHJldHVybiBqc29uXG4gIH1cbn0pXG5cblNjaGVtYS5mcm9tSlNPTi5kZWYoZnVuY3Rpb24oc2NoKSB7XG4gIGlmICghc2NoIHx8IHNjaC50eXBlICE9PSAnc3RyaW5nJykgcmV0dXJuXG5cbiAgaWYgKCdwYXR0ZXJuJyBpbiBzY2gpIHtcbiAgICByZXR1cm4gbmV3IFJlZ2V4cFNjaGVtYShSZWdFeHAoJ14nICsgc2NoLnBhdHRlcm4gKyAnJCcpKVxuICB9IGVsc2UgaWYgKCdtaW5MZW5ndGgnIGluIHNjaCB8fCAnbWF4TGVuZ3RoJyBpbiBzY2gpIHtcbiAgICByZXR1cm4gbmV3IFJlZ2V4cFNjaGVtYShSZWdFeHAoJ14ueycgKyBbIHNjaC5taW5MZW5ndGggfHwgMCwgc2NoLm1heExlbmd0aCBdLmpvaW4oJywnKSArICd9JCcpKVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBuZXcgUmVnZXhwU2NoZW1hKClcbiAgfVxufSlcblxuU2NoZW1hLmZyb21KUy5kZWYoZnVuY3Rpb24ocmVnZXhwKSB7XG4gIGlmIChyZWdleHAgaW5zdGFuY2VvZiBSZWdFeHApIHJldHVybiBuZXcgUmVnZXhwU2NoZW1hKHJlZ2V4cClcbn0pXG4iLCJ2YXIgU2NoZW1hID0gcmVxdWlyZSgnLi4vQmFzZVNjaGVtYScpXG5cblNjaGVtYS5mcm9tSlMuZGVmKGZ1bmN0aW9uKHNjaCkge1xuICBpZiAoc2NoIGluc3RhbmNlb2YgU2NoZW1hKSByZXR1cm4gc2NoXG59KVxuIiwidmFyIFNjaGVtYSA9IHJlcXVpcmUoJy4vQmFzZVNjaGVtYScpXG5cbnZhciBzY2hlbWEgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHNjaGVtYURlc2NyaXB0aW9uKSB7XG4gIHZhciBkb2MsIHNjaGVtYU9iamVjdFxuXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAyKSB7XG4gICAgZG9jID0gc2NoZW1hRGVzY3JpcHRpb25cbiAgICBzY2hlbWFEZXNjcmlwdGlvbiA9IGFyZ3VtZW50c1sxXVxuICB9XG5cbiAgaWYgKHRoaXMgaW5zdGFuY2VvZiBzY2hlbWEpIHtcbiAgICAvLyBXaGVuIGNhbGxlZCB3aXRoIG5ldywgY3JlYXRlIGEgc2NoZW1hIG9iamVjdCBhbmQgdGhlbiByZXR1cm4gdGhlIHNjaGVtYSBmdW5jdGlvblxuICAgIHZhciBjb25zdHJ1Y3RvciA9IFNjaGVtYS5leHRlbmQoc2NoZW1hRGVzY3JpcHRpb24pXG4gICAgc2NoZW1hT2JqZWN0ID0gbmV3IGNvbnN0cnVjdG9yKClcbiAgICBpZiAoZG9jKSBzY2hlbWFPYmplY3QuZG9jID0gZG9jXG4gICAgcmV0dXJuIHNjaGVtYU9iamVjdC53cmFwKClcblxuICB9IGVsc2Uge1xuICAgIC8vIFdoZW4gY2FsbGVkIGFzIHNpbXBsZSBmdW5jdGlvbiwgZm9yd2FyZCBldmVyeXRoaW5nIHRvIGZyb21KU1xuICAgIC8vIGFuZCB0aGVuIHJlc29sdmUgc2NoZW1hLnNlbGYgdG8gdGhlIHJlc3VsdGluZyBzY2hlbWEgb2JqZWN0XG4gICAgc2NoZW1hT2JqZWN0ID0gU2NoZW1hLmZyb21KUyhzY2hlbWFEZXNjcmlwdGlvbilcbiAgICBzY2hlbWEuc2VsZi5yZXNvbHZlKHNjaGVtYU9iamVjdClcbiAgICBpZiAoZG9jKSBzY2hlbWFPYmplY3QuZG9jID0gZG9jXG4gICAgcmV0dXJuIHNjaGVtYU9iamVjdC53cmFwKClcbiAgfVxufVxuXG5zY2hlbWEuU2NoZW1hID0gU2NoZW1hXG5cbnNjaGVtYS50b0pTT04gPSBmdW5jdGlvbihzY2gpIHtcbiAgcmV0dXJuIFNjaGVtYS5mcm9tSlMoc2NoKS50b0pTT04oKVxufVxuXG5zY2hlbWEuZnJvbUpTID0gZnVuY3Rpb24oc2NoKSB7XG4gIHJldHVybiBTY2hlbWEuZnJvbUpTKHNjaCkud3JhcCgpXG59XG5cbnNjaGVtYS5mcm9tSlNPTiA9IGZ1bmN0aW9uKHNjaCkge1xuICByZXR1cm4gU2NoZW1hLmZyb21KU09OKHNjaCkud3JhcCgpXG59XG5cbiIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7XG4gIHRoaXMuX2V2ZW50cyA9IHRoaXMuX2V2ZW50cyB8fCB7fTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gdGhpcy5fbWF4TGlzdGVuZXJzIHx8IHVuZGVmaW5lZDtcbn1cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xuXG4vLyBCYWNrd2FyZHMtY29tcGF0IHdpdGggbm9kZSAwLjEwLnhcbkV2ZW50RW1pdHRlci5FdmVudEVtaXR0ZXIgPSBFdmVudEVtaXR0ZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX2V2ZW50cyA9IHVuZGVmaW5lZDtcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX21heExpc3RlbmVycyA9IHVuZGVmaW5lZDtcblxuLy8gQnkgZGVmYXVsdCBFdmVudEVtaXR0ZXJzIHdpbGwgcHJpbnQgYSB3YXJuaW5nIGlmIG1vcmUgdGhhbiAxMCBsaXN0ZW5lcnMgYXJlXG4vLyBhZGRlZCB0byBpdC4gVGhpcyBpcyBhIHVzZWZ1bCBkZWZhdWx0IHdoaWNoIGhlbHBzIGZpbmRpbmcgbWVtb3J5IGxlYWtzLlxuRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnMgPSAxMDtcblxuLy8gT2J2aW91c2x5IG5vdCBhbGwgRW1pdHRlcnMgc2hvdWxkIGJlIGxpbWl0ZWQgdG8gMTAuIFRoaXMgZnVuY3Rpb24gYWxsb3dzXG4vLyB0aGF0IHRvIGJlIGluY3JlYXNlZC4gU2V0IHRvIHplcm8gZm9yIHVubGltaXRlZC5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24obikge1xuICBpZiAoIWlzTnVtYmVyKG4pIHx8IG4gPCAwIHx8IGlzTmFOKG4pKVxuICAgIHRocm93IFR5cGVFcnJvcignbiBtdXN0IGJlIGEgcG9zaXRpdmUgbnVtYmVyJyk7XG4gIHRoaXMuX21heExpc3RlbmVycyA9IG47XG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgZXIsIGhhbmRsZXIsIGxlbiwgYXJncywgaSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIElmIHRoZXJlIGlzIG5vICdlcnJvcicgZXZlbnQgbGlzdGVuZXIgdGhlbiB0aHJvdy5cbiAgaWYgKHR5cGUgPT09ICdlcnJvcicpIHtcbiAgICBpZiAoIXRoaXMuX2V2ZW50cy5lcnJvciB8fFxuICAgICAgICAoaXNPYmplY3QodGhpcy5fZXZlbnRzLmVycm9yKSAmJiAhdGhpcy5fZXZlbnRzLmVycm9yLmxlbmd0aCkpIHtcbiAgICAgIGVyID0gYXJndW1lbnRzWzFdO1xuICAgICAgaWYgKGVyIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgdGhyb3cgZXI7IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgICB9XG4gICAgICB0aHJvdyBUeXBlRXJyb3IoJ1VuY2F1Z2h0LCB1bnNwZWNpZmllZCBcImVycm9yXCIgZXZlbnQuJyk7XG4gICAgfVxuICB9XG5cbiAgaGFuZGxlciA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNVbmRlZmluZWQoaGFuZGxlcikpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGhhbmRsZXIpKSB7XG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAvLyBmYXN0IGNhc2VzXG4gICAgICBjYXNlIDE6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICAvLyBzbG93ZXJcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgaGFuZGxlci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoaXNPYmplY3QoaGFuZGxlcikpIHtcbiAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG5cbiAgICBsaXN0ZW5lcnMgPSBoYW5kbGVyLnNsaWNlKCk7XG4gICAgbGVuID0gbGlzdGVuZXJzLmxlbmd0aDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspXG4gICAgICBsaXN0ZW5lcnNbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gVG8gYXZvaWQgcmVjdXJzaW9uIGluIHRoZSBjYXNlIHRoYXQgdHlwZSA9PT0gXCJuZXdMaXN0ZW5lclwiISBCZWZvcmVcbiAgLy8gYWRkaW5nIGl0IHRvIHRoZSBsaXN0ZW5lcnMsIGZpcnN0IGVtaXQgXCJuZXdMaXN0ZW5lclwiLlxuICBpZiAodGhpcy5fZXZlbnRzLm5ld0xpc3RlbmVyKVxuICAgIHRoaXMuZW1pdCgnbmV3TGlzdGVuZXInLCB0eXBlLFxuICAgICAgICAgICAgICBpc0Z1bmN0aW9uKGxpc3RlbmVyLmxpc3RlbmVyKSA/XG4gICAgICAgICAgICAgIGxpc3RlbmVyLmxpc3RlbmVyIDogbGlzdGVuZXIpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIC8vIE9wdGltaXplIHRoZSBjYXNlIG9mIG9uZSBsaXN0ZW5lci4gRG9uJ3QgbmVlZCB0aGUgZXh0cmEgYXJyYXkgb2JqZWN0LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IGxpc3RlbmVyO1xuICBlbHNlIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIC8vIElmIHdlJ3ZlIGFscmVhZHkgZ290IGFuIGFycmF5LCBqdXN0IGFwcGVuZC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0ucHVzaChsaXN0ZW5lcik7XG4gIGVsc2VcbiAgICAvLyBBZGRpbmcgdGhlIHNlY29uZCBlbGVtZW50LCBuZWVkIHRvIGNoYW5nZSB0byBhcnJheS5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdLCBsaXN0ZW5lcl07XG5cbiAgLy8gQ2hlY2sgZm9yIGxpc3RlbmVyIGxlYWtcbiAgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkgJiYgIXRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQpIHtcbiAgICB2YXIgbTtcbiAgICBpZiAoIWlzVW5kZWZpbmVkKHRoaXMuX21heExpc3RlbmVycykpIHtcbiAgICAgIG0gPSB0aGlzLl9tYXhMaXN0ZW5lcnM7XG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSBFdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycztcbiAgICB9XG5cbiAgICBpZiAobSAmJiBtID4gMCAmJiB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoID4gbSkge1xuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCA9IHRydWU7XG4gICAgICBjb25zb2xlLmVycm9yKCcobm9kZSkgd2FybmluZzogcG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSAnICtcbiAgICAgICAgICAgICAgICAgICAgJ2xlYWsgZGV0ZWN0ZWQuICVkIGxpc3RlbmVycyBhZGRlZC4gJyArXG4gICAgICAgICAgICAgICAgICAgICdVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdC4nLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoKTtcbiAgICAgIGlmICh0eXBlb2YgY29uc29sZS50cmFjZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAvLyBub3Qgc3VwcG9ydGVkIGluIElFIDEwXG4gICAgICAgIGNvbnNvbGUudHJhY2UoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgdmFyIGZpcmVkID0gZmFsc2U7XG5cbiAgZnVuY3Rpb24gZygpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGcpO1xuXG4gICAgaWYgKCFmaXJlZCkge1xuICAgICAgZmlyZWQgPSB0cnVlO1xuICAgICAgbGlzdGVuZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gIH1cblxuICBnLmxpc3RlbmVyID0gbGlzdGVuZXI7XG4gIHRoaXMub24odHlwZSwgZyk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBlbWl0cyBhICdyZW1vdmVMaXN0ZW5lcicgZXZlbnQgaWZmIHRoZSBsaXN0ZW5lciB3YXMgcmVtb3ZlZFxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBsaXN0LCBwb3NpdGlvbiwgbGVuZ3RoLCBpO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIGxpc3QgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gIGxlbmd0aCA9IGxpc3QubGVuZ3RoO1xuICBwb3NpdGlvbiA9IC0xO1xuXG4gIGlmIChsaXN0ID09PSBsaXN0ZW5lciB8fFxuICAgICAgKGlzRnVuY3Rpb24obGlzdC5saXN0ZW5lcikgJiYgbGlzdC5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcblxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGxpc3QpKSB7XG4gICAgZm9yIChpID0gbGVuZ3RoOyBpLS0gPiAwOykge1xuICAgICAgaWYgKGxpc3RbaV0gPT09IGxpc3RlbmVyIHx8XG4gICAgICAgICAgKGxpc3RbaV0ubGlzdGVuZXIgJiYgbGlzdFtpXS5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgICAgIHBvc2l0aW9uID0gaTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHBvc2l0aW9uIDwgMClcbiAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgaWYgKGxpc3QubGVuZ3RoID09PSAxKSB7XG4gICAgICBsaXN0Lmxlbmd0aCA9IDA7XG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIH0gZWxzZSB7XG4gICAgICBsaXN0LnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIga2V5LCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgLy8gbm90IGxpc3RlbmluZyBmb3IgcmVtb3ZlTGlzdGVuZXIsIG5vIG5lZWQgdG8gZW1pdFxuICBpZiAoIXRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKVxuICAgICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgZWxzZSBpZiAodGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIGVtaXQgcmVtb3ZlTGlzdGVuZXIgZm9yIGFsbCBsaXN0ZW5lcnMgb24gYWxsIGV2ZW50c1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIGZvciAoa2V5IGluIHRoaXMuX2V2ZW50cykge1xuICAgICAgaWYgKGtleSA9PT0gJ3JlbW92ZUxpc3RlbmVyJykgY29udGludWU7XG4gICAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycyhrZXkpO1xuICAgIH1cbiAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycygncmVtb3ZlTGlzdGVuZXInKTtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNGdW5jdGlvbihsaXN0ZW5lcnMpKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnMpO1xuICB9IGVsc2Uge1xuICAgIC8vIExJRk8gb3JkZXJcbiAgICB3aGlsZSAobGlzdGVuZXJzLmxlbmd0aClcbiAgICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzW2xpc3RlbmVycy5sZW5ndGggLSAxXSk7XG4gIH1cbiAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IFtdO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gW3RoaXMuX2V2ZW50c1t0eXBlXV07XG4gIGVsc2VcbiAgICByZXQgPSB0aGlzLl9ldmVudHNbdHlwZV0uc2xpY2UoKTtcbiAgcmV0dXJuIHJldDtcbn07XG5cbkV2ZW50RW1pdHRlci5saXN0ZW5lckNvdW50ID0gZnVuY3Rpb24oZW1pdHRlciwgdHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIWVtaXR0ZXIuX2V2ZW50cyB8fCAhZW1pdHRlci5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IDA7XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24oZW1pdHRlci5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSAxO1xuICBlbHNlXG4gICAgcmV0ID0gZW1pdHRlci5fZXZlbnRzW3R5cGVdLmxlbmd0aDtcbiAgcmV0dXJuIHJldDtcbn07XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG52YXIgcXVldWUgPSBbXTtcbnZhciBkcmFpbmluZyA9IGZhbHNlO1xuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGRyYWluaW5nID0gdHJ1ZTtcbiAgICB2YXIgY3VycmVudFF1ZXVlO1xuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB2YXIgaSA9IC0xO1xuICAgICAgICB3aGlsZSAoKytpIDwgbGVuKSB7XG4gICAgICAgICAgICBjdXJyZW50UXVldWVbaV0oKTtcbiAgICAgICAgfVxuICAgICAgICBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgfVxuICAgIGRyYWluaW5nID0gZmFsc2U7XG59XG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHF1ZXVlLnB1c2goZnVuKTtcbiAgICBpZiAoIWRyYWluaW5nKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZHJhaW5RdWV1ZSwgMCk7XG4gICAgfVxufTtcblxucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbi8vIFRPRE8oc2h0eWxtYW4pXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iXX0=
