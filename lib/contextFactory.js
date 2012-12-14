// 1. all fork object not hanlde errors it self.
// 2. all child for all forks is it wn childs
// 

function ContextFactory(config) {
	var parent = config || {};
	var childs = [];
	var result = Object.create(parent);

	result.fork = function() {
		var retVal = ContextFactory(result);
		childs.push(retVal);
		return retVal;
	};
	result.getChilds = function() {
		return childs;
	};
	result.getParent = function() {
		return config;
	};
	if(typeof(result.getErrors) !== "function") {
		var errors = [];
		result.getErrors = function() {
			return errors;
		};
		result.hasErrors = function() {
			return errors.length > 0;
		};
		result.addError = function(err) {
			errors.push(err);
		};
	}
	return result;
}
exports.ContextFactory = ContextFactory;

function fork() {
	var retVal = ContextFactory(this);
	this.childs.push(retVal);
	return retVal;
}

function getChilds() {
	return this.childs;
}

function getParent() {
	return this.parent;
}

function ContextFactory2(config) {
	var parent = config || {};
	var result = Object.create(parent);
	result.parent = parent;
	result.childs = [];
	result.fork = fork;
	result.getChilds = getChilds;
	result.getParent = getParent;
	if(typeof(result.getErrors) !== "function") {
		var errors = [];
		result.getErrors = function() {
			return errors;
		};
		result.hasErrors = function() {
			return errors.length > 0;
		};
		result.addError = function(err) {
			errors.push(err);
		};
	}
	return result;
}
exports.ContextFactory2 = ContextFactory2;