var Stage = require('./').Stage;
var Context = require('./').Context;
var Pipeline = require('./').Pipeline;
var Sequential = require('./').Sequential;
var Parallel = require('./').Parallel;
var IfElse = require('./').IfElse;
var MultiWaySwitch = require('./').MultiWaySwitch;

var Util = require('./').Util;

var schema = require('js-schema');
var util = require('util');
var assert = require('assert');
////////////////////

		var stage0 = new Stage({
			stage: function(err, ctx, done) {
				ctx.liter = 1;
				done();
			}
		});
		var ctx = {
			some: [1, 2, 3, 4, 5, 6, 7]
		};
		var len = ctx.some.length;
		var stage = new Sequential({
			stage: stage0,
			split: function(ctx, iter) {
				return {
					iter: ctx.some[iter]
				};
			},
			reachEnd: function(err, ctx, iter) {
				return err || iter == len;
			},
			combine: function(ctx, childs) {
				var len = childs.length;
				ctx.result = 0;
				for(var i = 0; i < len; i++) {
					ctx.result += childs[i].liter;
				}
			}
		});

		stage.execute(ctx, function(err, context) {
			console.log(err, context);
			assert.equal(context.result, 7);
		});
