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
Empty.prototype.execute = function(ctx, callback){
	callback(null, ctx);
};

/*!
 * toString
 */
Empty.prototype.toString = function () {
    return "[pipeline Empty]";
};

exports.Empty = Empty;