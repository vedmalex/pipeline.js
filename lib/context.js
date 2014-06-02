var reserved = {
	"$$$errors": 1,
	"hasErrors": 1,
	"addError": 1,
	"getErrors": 1,
	"getChilds": 1,
	"getParent": 1,
	"$$$childs": 1,
	"$$$parent": 1,
	"$$$signWith": 1,
	"$$$setCurrentStackName": 1,
	"$$$stack": 1,
	"addToStack": 1,
	"hasChild": 1,
	"ensure": 1,
	"ensureIsChild": 1,
	"addChild": 1,
	"toJSON": 1,
	"toObject": 1,
	"fork": 1,
	// '$$$trace': 1
};

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
		self.$$$trace = config.trace || config.$$$trace;
	}
}

exports.Context = Context;

Context.prototype.$$$parent;

Context.prototype.$$$childs;

Context.prototype.$$$errors;

Context.prototype.$$$stack;

Context.prototype.$$$trace;

Context.prototype.$$$signWith = function(name) {
	var self = this;
	if (self.$$$trace) {
		if (!self.$$$stack) self.$$$stack = [];
		self.$$$stack.push(name);
	}
};

// for unnamed functions for debug.
Context.prototype.$$$setCurrentStackName = function(name) {
	var self = this;
	if (self.$$$trace) {
		if (!self.$$$stack) {
			self.$$$stack = [];
			self.$$$stack.push(name);
		} else {
			var current = self.$$$stack.pop();
			if ('object' !== typeof current || null == current) {
				current = {
					name: name,
					forks: []
				};
			} else {
				current.name = name;
			}
			self.$$$stack.push(current);
		}
	}
};

Context.prototype.addToStack = function(name, obj) {
	var self = this;
	if (self.$$$trace) {
		var current = self.$$$stack.pop();
		if ('object' !== typeof current || null == current) {
			current = {
				name: current,
				forks: []
			};
		}
		current[name] = obj;
		self.$$$stack.push(current);
	}
};

Context.prototype.getChilds = function() {
	var self = this;
	if (!self.$$$childs) {
		self.$$$childs = [];
	}
	return self.$$$childs;
};

Context.prototype.getParent = function() {
	var self = this;
	return self.$$$parent;
};

Context.prototype.hasChild = function(ctx) {
	var self = this;
	if (ctx instanceof Context) {
		return ctx.$$$parent === self || self === ctx;
	}
};

Context.ensure = function(ctx) {
	if (!(ctx instanceof Context)) {
		return new Context(ctx);
	} else {
		return ctx;
	}
};

Context.prototype.ensureIsChild = function(ctx) {
	var self = this;
	var lctx = Context.ensure(ctx);
	if (!self.hasChild(lctx)) {
		self.addChild(lctx);
	}
	return lctx;
};

Context.prototype.addChild = function(ctx) {
	var self = this;
	if (!self.hasChild(ctx)) {
		var child = Context.ensure(ctx);
		child.$$$parent = self;
		child.$$$trace = self.$$$trace;
		if (!self.$$$childs) {
			self.$$$childs = [];
		}
		if (!self.$$$errors) {
			self.$$$errors = [];
		}
		if (self.$$$trace) {
			if (!self.$$$stack) {
				self.$$$stack = [];
			}
			child.$$$stack = [];

			var current = self.$$$stack.pop();
			if ('object' !== typeof current || null == current) {
				current = {
					name: current,
					forks: []
				};
			}
			self.$$$stack.push(current);
			child.$$$stack.push(current.name);
			current.forks.push(child.$$$stack);
		}
		child.$$$errors = self.$$$errors;
		self.$$$childs.push(child);
	}
};

Context.prototype.fork = function(config) {
	var self = this;
	var child = new Context(self);
	self.addChild(child);
	for (var p in config) {
		child[p] = config[p];
	}
	child.$$$trace = self.$$$trace;
	return child;
};

Context.prototype.hasErrors = function() {
	var self = this;
	return self.$$$errors && self.$$$errors.length > 0;
};

Context.prototype.addError = function(e) {
	var self = this;
	if (!self.$$$errors) {
		self.$$$errors = [];
	}
	self.$$$errors.push(e);
};
Context.prototype.getErrors = function() {
	var self = this;
	if (!self.$$$errors) {
		self.$$$errors = [];
	}
	return self.$$$errors;
};

function extractType(v) {
	var ts = Object.prototype.toString;
	return ts.call(v).match(/\[object (.+)\]/)[1];
}

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

Context.prototype.toObject = function(clean) {
	//сделать код
	var self = this;
	var obj = {};
	for (var p in self) {
		if (!reserved[p]) {
			obj[p] = clone(self[p], clean);
		}
	}
	return obj;
};

Context.prototype.toJSON = function(argument) {
	var self = this;
	return JSON.stringify(self.toObject(true));
};