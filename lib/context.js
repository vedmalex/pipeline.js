/*!
 * List of reserver words for context.
 * Used to check wheater or not property is the Context-class property
 */

var reserved = {
	"__errors": 1,
	"hasErrors": 1,
	"addError": 1,
	"getErrors": 1,
	"getChilds": 1,
	"getParent": 1,
	"__children": 1,
	"__parent": 1,
	"__signWith": 1,
	"__setCurrentStackName": 1,
	"__stack": 1,
	"addToStack": 1,
	"hasChild": 1,
	"ensure": 1,
	"ensureIsChild": 1,
	"addChild": 1,
	"toJSON": 1,
	"toObject": 1,
	"fork": 1,
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
}

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
 * All child context has parent list of error. This allow to be sure that any fork
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
		if (!self.__errors) {
			self.__errors = [];
		}
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
		child.__errors = self.__errors;
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
 * Checks wheather or not context has error while execution
 * @api public
 * @return {Boolean}
 */
Context.prototype.hasErrors = function() {
	var self = this;
	return self.__errors && self.__errors.length > 0;
};

/**
 * Adds Error into error list
 * @api public
 * @param {Error} e error itself
 */
Context.prototype.addError = function(e) {
	var self = this;
	if (!self.__errors) {
		self.__errors = [];
	}
	self.__errors.push(e);
};

/**
 * Gets Error-list if exists
 * @api public
 * @return {Array of Error} 
 */
Context.prototype.getErrors = function() {
	var self = this;
	if (!self.__errors) {
		self.__errors = [];
	}
	return self.__errors;
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

exports.Context = Context;