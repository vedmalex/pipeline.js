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
	'$$$trace': 1
};

function Context(config) {
	if (!(this instanceof Context)) throw new Error('constructor is not a function');
	if (config) {
		var val;
		for (var prop in config) {
			val = config[prop];
			if (!reserved[prop]) {
				if (val !== undefined && val !== null)
					this[prop] = config[prop];
			}

		}
		this.$$$trace = config.trace;
	}
}

exports.Context = Context;

Context.prototype.$$$parent;

Context.prototype.$$$childs;

Context.prototype.$$$errors;

Context.prototype.$$$stack;

Context.prototype.$$$trace;

Context.prototype.$$$signWith = function(name) {
	if (this.$$$trace) {
		if (!this.$$$stack) this.$$$stack = [];
		this.$$$stack.push(name);
	}
};
// для безымянных процедур с целью отладки
Context.prototype.$$$setCurrentStackName = function(name) {
	if (this.$$$trace) {
		if (!this.$$$stack) {
			this.$$$stack = [];
			this.$$$stack.push(name);
		} else {
			var current = this.$$$stack.pop();
			if ('object' !== typeof current || null == current)
				current = {
					name: name,
					forks: []
				};
			else current.name = name;
			this.$$$stack.push(current);
		}
	}
};

Context.prototype.addToStack = function(name, obj) {
	if (this.$$$trace) {
		var current = this.$$$stack.pop();
		if ('object' !== typeof current || null == current) current = {
			name: current,
			forks: []
		}
		current[name] = obj;
		this.$$$stack.push(current);
	}
};

Context.prototype.getChilds = function() {
	if (!this.$$$childs) this.$$$childs = [];
	return this.$$$childs;
};

Context.prototype.getParent = function() {
	return this.$$$parent;
};

Context.prototype.hasChild = function(ctx) {
	if (ctx instanceof Context) return ctx.$$$parent === this || this === ctx;
};

Context.ensure = function(ctx) {
	if (!(ctx instanceof Context)) return new Context(ctx);
	else return ctx;
};

Context.prototype.ensureIsChild = function(ctx) {
	var lctx = Context.ensure(ctx);
	if (!this.hasChild(lctx)) this.addChild(lctx);
	return lctx;
};

Context.prototype.addChild = function(ctx) {
	if (!this.hasChild(ctx)) {
		var child = Context.ensure(ctx);
		child.$$$parent = this;
		child.$$$trace = this.$$$trace;
		if (!this.$$$childs) this.$$$childs = [];
		if (!this.$$$errors) this.$$$errors = [];
		if (this.$$$trace) {
			if (!this.$$$stack) this.$$$stack = [];
			child.$$$stack = [];

			var current = this.$$$stack.pop();
			if ('object' !== typeof current || null == current) current = {
				name: current,
				forks: []
			};
			this.$$$stack.push(current);
			child.$$$stack.push(current.name);
			current.forks.push(child.$$$stack);
		}
		child.$$$errors = this.$$$errors;
		this.$$$childs.push(child);
	}
};

Context.prototype.fork = function(config) {
	var child = new Context(this);
	this.addChild(child);
	for (var p in config) {
		child[p] = config[p];
	}
	child.$$$trace = this.$$$trace;
	return child;
};

Context.prototype.hasErrors = function() {
	return this.$$$errors && this.$$$errors.length > 0;
};

Context.prototype.addError = function(e) {
	debugger;
	if (!this.$$$errors) this.$$$errors = [];
	this.$$$errors.push(e);
};
Context.prototype.getErrors = function() {
	if (!this.$$$errors) this.$$$errors = [];
	return this.$$$errors;
};

function extractType(v) {
	var ts = Object.prototype.toString;
	return ts.call(v).match(/\[object (.+)\]/)[1];
};

function clone(src, clean) {
	var type = extractType(src);
	switch (type) {
		case 'String':
		case 'Number':
			return src;
		case 'RegExp':
			return new RegExp(src.toString());
		case 'Date':
			return new Date(Number(src));
		case 'Object':
			if (src.toObject instanceof Function)
				return src.toObject();
			else {
				if (src.constructor === Object) {
					var obj = {};
					for (var p in src) {
						obj[p] = clone(src[p]);
					}
					return obj;
				} else return clean ? undefined : src;
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
	var obj = {};
	for (var p in this) {
		if (!reserved[p])
			obj[p] = clone(this[p], clean);
	}
	return obj;
};

Context.prototype.toJSON = function(argument) {
	return JSON.stringify(this.toObject(true));
};