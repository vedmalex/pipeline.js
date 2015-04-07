/*!
 * Module dependency
 */
var cmp = require('comparator.js');
var get = cmp.get;
var set = cmp.set;

// добавить время обработки ctx на процессоре
// оптимизировать код, чтобы работал быстрее....
// может быть где-то убрать где-то добавить.
//контекст может быть массивом, не обязательно 
// весь объект инициализировать сделать внутреннее хранилище, для неизменяемости ссылки....

/*!
 * List of reserver words for context.
 * Used to check wheater or not property is the Context-class property
 */

var reserved = {
	// "__errors": 1,
	// "hasErrors": 1,
	// "addError": 1,
	// "getErrors": 1,
	"getChilds": 1,
	"getParent": 1,
	"__parent": 1,
	"__signWith": 1,
	"__stack": 1,
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
 *  @param {Object} config The object that is the source for the **Context**.
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
	}
};

/**
 * Reference to parent
 * @api private
 */
Context.prototype.__parent = undefined;

/**
 * Reference to list of errors
 * @api private
 */
Context.prototype.__errors = undefined;

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
	var child = new (self.constructor)(self);
	self.addChild(child);
	for (var p in config) {
		child[p] = config[p];
	}
	return child;
};
/**
 * Same but different as a fork. it make possible get piece of context as context;
 * @param path String path to context object that need to be a Context instance
 * @return {Context} | {Primitive type}
 */

Context.prototype.get = function(path) {
	var root = get(this, path);
	if (root instanceof Object) {
		var result = root;
		if (!(result instanceof Context)) {
			result = this.ensureIsChild(result);
			set(this, path, result);
		}
		return result;
	}
};

/*!
 * toString
 */
Context.prototype.toString = function () {
    return "[pipeline Context]";
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