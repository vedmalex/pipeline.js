/*! 
 * Module dependency
 */
var Stage = require('./stage').Stage;
var util = require('./util').Util;

/**
 * Empty stage faster than use unassigned `Stage`
 */
function Empty() {
	Stage.apply(this);
}

/*!
 * Inherited from Stage
 */
util.inherits(Empty, Stage);

/**
 * override of execute
 * @param {Context} context evaluating context
 * @param {Context} [callback] returning callback
 * @api public
 */
Empty.prototype.execute = function(err, context, callback) {
	if (context instanceof Function) {
		callback = context;
		context = err;
		err = undefined;
	} else if (!context && !(err instanceof Error)) {
		context = err;
		err = undefined;
		callback = undefined;
	}
	if (callback)
		return callback(err, context);
};

/*!
 * toString
 */
Empty.prototype.toString = function() {
	return "[pipeline Empty]";
};

exports.Empty = Empty;