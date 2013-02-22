;(function(p,c,e){function r(n){if(!c[n]){if(!p[n])return;c[n]={exports:{}};p[n][0](function(x){return r(p[n][1][x])},c[n],c[n].exports);}return c[n].exports}for(var i=0;i<e.length;i++)r(e[i]);return r})({0:[function(require,module,exports){(function(global){global.pipelinejs = require('./index');
})(window)
},{"./index":1}],1:[function(require,module,exports){exports.Stage = require('./lib/stage').Stage;
exports.Pipeline = require('./lib/pipeline').Pipeline;
exports.Sequential = require('./lib/sequential').Sequential;
exports.IfElse = require('./lib/ifelse').IfElse;
exports.MultiWaySwitch = require('./lib/multywayswitch').MultiWaySwitch;
exports.Parallel = require('./lib/parallel').Parallel;
exports.Context = require('./lib/context').Context;
exports.Util = require('./lib/util').Util;
},{"./lib/stage":2,"./lib/pipeline":3,"./lib/sequential":4,"./lib/ifelse":5,"./lib/multywayswitch":6,"./lib/parallel":7,"./lib/context":8,"./lib/util":9}],2:[function(require,module,exports){var Context = require('./context').Context;
var EventEmitter = require("events").EventEmitter;
var schema = require('js-schema');
var util = require('./util.js').Util;

function Stage(config) {
	if(!(this instanceof Stage)) throw new Error('constructor is not a function');
	if(config) {
		if(typeof(config) === 'object') {
			if(typeof(config.ensure) === 'function') this.ensure = config.ensure;
			if(typeof(config.validate) === 'function') this.validate = config.validate;
			if(typeof(config.schema) === 'object') {
				// override validate method
				this.validate = schema(config.schema);
			}
			if(typeof(config.run) === 'function') this.run = config.run;
		} else if(typeof(config) === 'function') this.run = config;
	}
	EventEmitter.call(this);
}
exports.Stage = Stage;
util.inherits(Stage, EventEmitter);
var StageProto = Stage.prototype;

StageProto.reportName = function() {
	return 'stage ' + util.getClass(this);
};

StageProto.ensure = function(context, callback) {
	if(this.validate(context)) {
		if(typeof(callback) == 'function') callback(null);
	} else callback(new Error(this.reportName() + ' reports: Context is invalid'));
};
StageProto.validate = function(context) {
	return true;
};
StageProto.run = 0;
StageProto.execute = function(_context, callback) {
	var context = _context instanceof Context ? _context : new Context(_context);
	var self = this;
	self.ensure(context, function(err) {
		if(!err) {
			if(typeof(self.run) == 'function') {
				self.run(null, context, function(err) {
					if(typeof(callback) == 'function') callback(err, context);
					else {
						if(err) {
							context.addError(err);
							self.emit('error', err, context);
						} else self.emit('done', context);
					}
				});
			} else {
				var runIsNotAFunction = new Error(self.reportName() + ' reports: run is not a function');
				context.addError(runIsNotAFunction);
				if(typeof(callback) == 'function') callback(runIsNotAFunction, context);
				else self.emit('error', runIsNotAFunction, context);
			}
		} else {
			if(typeof(callback) == 'function') callback(err, context);
			else {
				context.addError(err);
				self.emit('error', err, context);
			}
		}
	});
};
},{"./context":8,"events":10,"js-schema":11,"./util.js":9}],8:[function(require,module,exports){var reserved = {
	"$$$errors": 1,
	"hasErrors": 1,
	"addError": 1,
	"getErrors": 1,
	"getChilds": 1,
	"getParent": 1,
	"$$$childs": 1,
	"$$$parent": 1,
	"fork": 1
};

function Context(config) {
	if(!(this instanceof Context)) throw new Error('constructor is not a function');
	if(config) {
		var val;
		for(var prop in config) {
			val = config[prop];
			if(!reserved[prop]) {
				if(val !== undefined && val !== null)
					this[prop] = config[prop];
			}
		}
	}
}

exports.Context = Context;

Context.prototype.getChilds = function() {
	if(!this.$$$childs) this.$$$childs = [];
	return this.$$$childs;
};

Context.prototype.getParent = function() {
	return this.$$$parent;
};

Context.prototype.fork = function(config) {
	var child = new Context(this);
	child.$$$parent = this;
	if(!this.$$$childs) this.$$$childs = [];
	if(!this.$$$errors) this.$$$errors = [];
	child.$$$errors = this.$$$errors;
	this.$$$childs.push(child);
	for(var p in config){
		child[p] = config[p];
	}
	return child;
};

Context.prototype.hasErrors = function() {
	return this.$$$errors && this.$$$errors.length > 0;
};

Context.prototype.addError = function(e) {
	if(!this.$$$errors) this.$$$errors = [];
	this.$$$errors.push(e);
};
Context.prototype.getErrors = function() {
	if(!this.$$$errors) this.$$$errors = [];
	return this.$$$errors;
};
},{}],10:[function(require,module,exports){(function(process){if (!process.EventEmitter) process.EventEmitter = function () {};

var EventEmitter = exports.EventEmitter = process.EventEmitter;
var isArray = typeof Array.isArray === 'function'
    ? Array.isArray
    : function (xs) {
        return Object.prototype.toString.call(xs) === '[object Array]'
    }
;
function indexOf (xs, x) {
    if (xs.indexOf) return xs.indexOf(x);
    for (var i = 0; i < xs.length; i++) {
        if (x === xs[i]) return i;
    }
    return -1;
}

// By default EventEmitters will print a warning if more than
// 10 listeners are added to it. This is a useful default which
// helps finding memory leaks.
//
// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
var defaultMaxListeners = 10;
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!this._events) this._events = {};
  this._events.maxListeners = n;
};


EventEmitter.prototype.emit = function(type) {
  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events || !this._events.error ||
        (isArray(this._events.error) && !this._events.error.length))
    {
      if (arguments[1] instanceof Error) {
        throw arguments[1]; // Unhandled 'error' event
      } else {
        throw new Error("Uncaught, unspecified 'error' event.");
      }
      return false;
    }
  }

  if (!this._events) return false;
  var handler = this._events[type];
  if (!handler) return false;

  if (typeof handler == 'function') {
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
        var args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
    return true;

  } else if (isArray(handler)) {
    var args = Array.prototype.slice.call(arguments, 1);

    var listeners = handler.slice();
    for (var i = 0, l = listeners.length; i < l; i++) {
      listeners[i].apply(this, args);
    }
    return true;

  } else {
    return false;
  }
};

// EventEmitter is defined in src/node_events.cc
// EventEmitter.prototype.emit() is also defined there.
EventEmitter.prototype.addListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('addListener only takes instances of Function');
  }

  if (!this._events) this._events = {};

  // To avoid recursion in the case that type == "newListeners"! Before
  // adding it to the listeners, first emit "newListeners".
  this.emit('newListener', type, listener);

  if (!this._events[type]) {
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  } else if (isArray(this._events[type])) {

    // Check for listener leak
    if (!this._events[type].warned) {
      var m;
      if (this._events.maxListeners !== undefined) {
        m = this._events.maxListeners;
      } else {
        m = defaultMaxListeners;
      }

      if (m && m > 0 && this._events[type].length > m) {
        this._events[type].warned = true;
        console.error('(node) warning: possible EventEmitter memory ' +
                      'leak detected. %d listeners added. ' +
                      'Use emitter.setMaxListeners() to increase limit.',
                      this._events[type].length);
        console.trace();
      }
    }

    // If we've already got an array, just append.
    this._events[type].push(listener);
  } else {
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  var self = this;
  self.on(type, function g() {
    self.removeListener(type, g);
    listener.apply(this, arguments);
  });

  return this;
};

EventEmitter.prototype.removeListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('removeListener only takes instances of Function');
  }

  // does not use listeners(), so no side effect of creating _events[type]
  if (!this._events || !this._events[type]) return this;

  var list = this._events[type];

  if (isArray(list)) {
    var i = indexOf(list, listener);
    if (i < 0) return this;
    list.splice(i, 1);
    if (list.length == 0)
      delete this._events[type];
  } else if (this._events[type] === listener) {
    delete this._events[type];
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  // does not use listeners(), so no side effect of creating _events[type]
  if (type && this._events && this._events[type]) this._events[type] = null;
  return this;
};

EventEmitter.prototype.listeners = function(type) {
  if (!this._events) this._events = {};
  if (!this._events[type]) this._events[type] = [];
  if (!isArray(this._events[type])) {
    this._events[type] = [this._events[type]];
  }
  return this._events[type];
};

})(require("__browserify_process"))
},{"__browserify_process":12}],12:[function(require,module,exports){// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],11:[function(require,module,exports){module.exports = require('./lib/schema')

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

},{"./lib/schema":13,"./lib/patterns/reference":14,"./lib/patterns/nothing":15,"./lib/patterns/anything":16,"./lib/patterns/object":17,"./lib/patterns/or":18,"./lib/patterns/equality":19,"./lib/patterns/regexp":20,"./lib/patterns/class":21,"./lib/patterns/schema":22,"./lib/extensions/Boolean":23,"./lib/extensions/Number":24,"./lib/extensions/String":25,"./lib/extensions/Object":26,"./lib/extensions/Array":27,"./lib/extensions/Function":28,"./lib/extensions/Schema":29}],13:[function(require,module,exports){var Schema = require('./Schema')

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


},{"./Schema":30}],30:[function(require,module,exports){var Schema =  module.exports = function() {}

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

},{}],14:[function(require,module,exports){var Schema = require('../Schema')

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

},{"../Schema":30}],15:[function(require,module,exports){var Schema = require('../Schema')

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

},{"../Schema":30}],16:[function(require,module,exports){var Schema = require('../Schema')

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

},{"../Schema":30}],17:[function(require,module,exports){var Schema = require('../Schema')
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

},{"../Schema":30,"./anything":16,"./nothing":15}],18:[function(require,module,exports){var Schema = require('../Schema')
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

},{"../Schema":30,"../patterns/equality":19}],19:[function(require,module,exports){var Schema = require('../Schema')

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

},{"../Schema":30}],20:[function(require,module,exports){var Schema = require('../Schema')

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

},{"../Schema":30}],21:[function(require,module,exports){var Schema = require('../Schema')

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

},{"../Schema":30}],22:[function(require,module,exports){var Schema = require('../Schema')

Schema.fromJS.def(function(sch) {
  if (sch instanceof Schema) return sch
})

},{"../Schema":30}],23:[function(require,module,exports){var Schema = require('../Schema')

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

},{"../Schema":30}],24:[function(require,module,exports){var Schema = require('../Schema')

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

},{"../Schema":30}],25:[function(require,module,exports){var RegexpSchema = require('../patterns/regexp')

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

},{"../patterns/regexp":20}],26:[function(require,module,exports){var ReferenceSchema = require('../patterns/reference')
  , EqualitySchema = require('../patterns/equality')
  , ObjectSchema = require('../patterns/object')

Object.like = function(other) {
  return new EqualitySchema(other).wrap()
}

Object.reference = function(o) {
  return new ReferenceSchema(o).wrap()
}

Object.schema = new ObjectSchema().wrap()

},{"../patterns/reference":14,"../patterns/equality":19,"../patterns/object":17}],27:[function(require,module,exports){var Schema = require('../Schema')
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

    json.tpye = 'array'

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

},{"../Schema":30,"../patterns/equality":19,"../patterns/anything":16}],28:[function(require,module,exports){var ReferenceSchema = require('../patterns/reference')

Function.reference = function(f) {
  return new ReferenceSchema(f).wrap()
}

},{"../patterns/reference":14}],29:[function(require,module,exports){var Schema = require('../Schema')
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

},{"../Schema":30,"../schema":13}],9:[function(require,module,exports){(function(global){exports.Util = {};
exports.Util.getClass = function(obj) {
  if(obj && typeof obj === 'object' && Object.prototype.toString.call(obj) !== '[object Array]' && obj.constructor && obj !== global) {
    var res = obj.constructor.toString().match(/function\s*(\w+)\s*\(/);
    if(res && res.length === 2) {
      return res[1];
    }
  }
  return false;
};
exports.Util.inherits = function (ctor, superCtor) {
    ctor.super_ = superCtor;
    ctor.prototype = Object.create(superCtor.prototype, {
        constructor: {
            value: ctor,
            enumerable: false
        }
    });
};
})(window)
},{}],3:[function(require,module,exports){var Stage = require('./stage').Stage;
var util = require('./util.js').Util;

function Pipeline(config) {
	if(!(this instanceof Pipeline)) throw new Error('constructor is not a function');
	this.stages = [];
	if(config) {
		if(config instanceof Array) {
			Stage.call(this);
			var len = config.length;
			for(var i = 0; i < len; i++) {
				this.addStage(config[i]);
			}
		}
		if(typeof(config) === 'object') {
			delete config.run;
			Stage.call(this, config);
		} else if(typeof(config) === 'function') Stage.call(this);
	} else Stage.call(this);
}
util.inherits(Pipeline, Stage);
exports.Pipeline = Pipeline;
// pushs Stage to specific list if any
// _list is optional
var PipelineProto = Pipeline.prototype;
var StageProto = Pipeline.super_.prototype;

PipelineProto.addStage = function(stage, _list) {
	var list = _list;
	if(typeof(list) == 'string') {
		if(!this[list]) this[list] = [];
		list = this[list];
	}
	if(!list) list = this.stages;
	if(!(stage instanceof Stage)){
		if(typeof(stage) === 'function') stage = new Stage(stage);
		else if(typeof(stage) === 'object') stage = new Stage(stage);
		else stage = new Stage(); //
	}

	list.push(stage);
	this.run = 0; //reset run method
};

// сформировать окончательную последовательность stages исходя из имеющихся списков
// приоритет списка.
// список который будет использоваться в случае ошибки.
PipelineProto.compile = function() {
	var self = this;
	var len = self.stages.length;
	var run = function(err, context, done) {
			var i = -1;
			var stlen = len; // hack to avoid upper context search;
			var stList = self.stages; // the same hack
			//sequential run;
			var next = function(err, context) {
					if(++i == stlen || err) {
						done(err);
					} else {
						stList[i].execute(context, next);
					}
				};
			next(err, context);
		};

	if(len > 0) {
		self.run = run;
	} else throw new Error('ANY STAGE FOUND');
};

PipelineProto.execute = function(context, callback) {
	var self = this;
	if(!self.run) self.compile();
	StageProto.execute.apply(this, arguments);
};
},{"./stage":2,"./util.js":9}],4:[function(require,module,exports){var Stage = require('./stage').Stage;
var Context = require('./context').Context;
var util = require('./util.js').Util;

function Sequential(config) {
	if(!(this instanceof Sequential)) throw new Error('constructor is not a function');
	Stage.apply(this);
	if(!config) config = {};
	if(config instanceof Stage) config = {
		stage: config
	}; /*stage, split, reachEnd, combine*/
	if(config.stage instanceof Stage) this.stage = config.stage;
	else if(config.stage instanceof Function) this.stage = new Stage(config.stage);
	else this.stage = new Stage();
	this.prepareContext = config.prepareContext instanceof Function ? config.prepareContext : function(ctx) {
		return ctx;
	};
	this.split = config.split instanceof Function ? config.split : function(ctx, iter) {
		return ctx;
	};
	this.reachEnd = config.reachEnd instanceof Function ? config.reachEnd : function(err, ctx, iter) {
		return true;
	};
	this.combine = config.combine instanceof Function ? config.combine : null;
	this.checkContext = config.checkContext instanceof Function ? config.checkContext : function(err, ctx, iter, callback) {
		callback(err, ctx);
	};
}

util.inherits(Sequential, Stage);

exports.Sequential = Sequential;
var StageProto = Sequential.super_.prototype;
var SequentialProto = Sequential.prototype;

SequentialProto.compile = function() {
	var self = this;
	var run = function(err, ctx, done) {
			var iter = -1;
			var childsCtx = [];
			var combine = function(err) {
					if(!err && self.combine) self.combine(innerCtx, ctx, childsCtx);
					done(err);
				};
			var innerCtx = self.prepareContext(ctx);
			if(!(innerCtx instanceof Context)) innerCtx = new Context(innerCtx);
			var next = function(err, retCtx) {
					iter++;
					if(iter > 0) childsCtx.push(retCtx);
					self.checkContext(err, innerCtx, iter, function(err, innerCtx) {
						if(self.reachEnd(err, innerCtx, iter)) combine(err, iter);
						else {
							self.stage.execute(self.split(innerCtx, iter), next);
						}
					});
				};
			next();
		};
	self.run = run;
};

SequentialProto.execute = function(context, callback) {
	var self = this;
	if(!self.run) self.compile();
	StageProto.execute.apply(this, arguments);
};
},{"./stage":2,"./context":8,"./util.js":9}],5:[function(require,module,exports){var Stage = require('./stage').Stage;
var util = require('./util.js').Util;

function IfElse(config) {
	if(!(this instanceof IfElse)) throw new Error('constructor is not a function');
	Stage.apply(this);
	if(!config) config = {};
	this.condition = config.condition instanceof Function ? config.condition : function(ctx) {
		return true;
	};

	if(config.success instanceof Stage) this.success = config.success;
	else if(config.success instanceof Function) this.success = new Stage(config.success);
	else this.success = new Stage();

	if(config.failed instanceof Stage) this.failed = config.failed;
	else if(config.failed instanceof Function) this.failed = new Stage(config.failed);
	else this.failed = new Stage();
}

util.inherits(IfElse, Stage);

exports.IfElse = IfElse;
var StageProto = IfElse.super_.prototype;
var IfElseProto = IfElse.prototype;

IfElseProto.compile = function() {
	var self = this;
	var run = function(err, ctx, done) {
			if(self.condition(ctx)) self.success.execute(ctx, done);
			else self.failed.execute(ctx, done);
		};
	self.run = run;
};

IfElseProto.execute = function(context, callback) {
	var self = this;
	if(!self.run) self.compile();
	StageProto.execute.apply(this, arguments);
};
},{"./stage":2,"./util.js":9}],6:[function(require,module,exports){var Stage = require('./stage').Stage;
var util = require('./util.js').Util;

function defCondition() {
	return true;
}

function defSplit(ctx) {
	return ctx;
}

function defExHandler(err, ctx) {
	return err;
}

function defCombine(ctx, resCtx) {
	return ctx;
}

function MultiWaySwitch(config) {
	if(!(this instanceof MultiWaySwitch)) throw new Error('constructor is not a function');
	Stage.apply(this);

	if(!config) config = {};
	if(config instanceof Array) config = {cases:config};
	this.cases = config.cases ? config.cases : [];
	this.condition = config.defCond ? config.defCond : defCondition;
	this.defaults = config.defaults ? config.defaults : null;
	this.exHandler = config.exHandler instanceof Function ? config.exHandler : defExHandler;
	this.split = config.split instanceof Function ? config.split : defSplit;
	this.combine = config.combine instanceof Function ? config.combine : defCombine;
}

util.inherits(MultiWaySwitch, Stage);

exports.MultiWaySwitch = MultiWaySwitch;
var StageProto = MultiWaySwitch.super_.prototype;
var MultiWaySwitchProto = MultiWaySwitch.prototype;

MultiWaySwitchProto.compile = function() {
	var self = this;
	var i;
	var len = this.cases.length;
	var caseItem;
	var statics = [];
	var dynamics = [];

	// Разделяем и назначаем каждому stage свое окружение: evaluate, split, combine
	for(i = 0; i < len; i++) {
		caseItem = this.cases[i];
		if(caseItem instanceof Stage) caseItem = {
			stage: caseItem,
			evaluate: true
		};
		if(caseItem.hasOwnProperty('stage')) {
			if(caseItem.stage instanceof Function){
				caseItem.stage = new Stage(caseItem.stage);
			}
			if(!(caseItem.split instanceof Function)) {
				caseItem.split = self.split;
			}
			if(!(caseItem.combine instanceof Function)) {
				caseItem.combine = self.combine;
			}
			if(!(caseItem.exHandler instanceof Function)) {
				caseItem.exHandler = self.exHandler;
			}
			if(typeof caseItem.evaluate == 'function' && typeof caseItem.evaluate !== 'boolean') {
				dynamics.push(caseItem);
			} else if(typeof caseItem.evaluate == 'boolean' && caseItem.evaluate) {
				statics.push(caseItem);
			}
		}
	}

	var run = function(err, ctx, done) {
			var i;
			var len = dynamics.length;
			var actuals = [];
			actuals.push.apply(actuals, statics);

			for(i = 0; i < len; i++) {
				if(dynamics[i].evaluate(ctx)) actuals.push(dynamics[i]);
			}
			if(actuals.length === 0 && self.defaults) {
				actuals.push(self.defaults);
			}
			len = actuals.length;
			var iter = 0;

			var errors = [];
			var next = function(index) {
					function finish() {
						if(errors.length > 0) done(errors);
						else done();
					}

					function logError(err) {
						errors.push({index:index,err:err});
					}
					return function(err, retCtx) {
						iter++;
						var cur = actuals[index];
						if(cur.exHandler(err, ctx)) logError(err);
						else cur.combine(ctx, retCtx);
						if(iter == len) finish();
					};
				};
			var stg;
			for(i = 0; i < len; i++) {
				stg = actuals[i];
				stg.stage.execute(stg.split(ctx), next(i));
			}

			if(len === 0) done();
		};
	self.run = run;
};

MultiWaySwitchProto.execute = function(context, callback) {
	var self = this;
	if(!self.run) self.compile();
	StageProto.execute.apply(this, arguments);
};
},{"./stage":2,"./util.js":9}],7:[function(require,module,exports){var Stage = require('./stage').Stage;
var Context = require('./context').Context;
var util = require('./util.js').Util;

function Parallel(config) {
	if(!(this instanceof Parallel)) throw new Error('constructor is not a function');
	Stage.apply(this);
	if(!config) config = {};
	if(config instanceof Stage) config = {stage: config};
	if(config.stage instanceof Stage) this.stage = config.stage;
	else if(config.stage instanceof Function) this.stage = new Stage(config.stage);
	else this.stage = new Stage();

	this.split = config.split instanceof Function ? config.split : function(ctx) {
		return [ctx];
	};
	this.exHandler = config.exHandler instanceof Function ? config.exHandler : function(err, ctx, index) {
		return err;
	};
	this.combine = config.combine instanceof Function ? config.combine : null;
}

util.inherits(Parallel, Stage);

exports.Parallel = Parallel;
var StageProto = Parallel.super_.prototype;
var ParallelProto = Parallel.prototype;

ParallelProto.compile = function() {
	var self = this;
	var run = function(err, ctx, done) {
			var iter = 0;
			var childs = self.split(ctx);

			var len = childs ? childs.length : 0;
			var errors = [];
			var next = function(index) {
					function finish() {
						if(errors.length > 0) done(errors);
						else {
							if(!err && self.combine) self.combine(ctx, childs);
							done();
						}
					}

					function logError(err) {
						errors.push({index:index,err:err});
					}
					return function(err, retCtx) {
						iter++;
						if(iter > 0) childs[index] = retCtx;
						if(self.exHandler(err, ctx, index)) logError(err);
						if(iter == len) finish();
					};
				};
			var cldCtx;
			for(var i = 0; i < len; i++) {
				cldCtx = childs[i];
				self.stage.execute(childs[i], next(i));
			}

			if(len === 0) done();
		};
	self.run = run;
};

ParallelProto.execute = function(context, callback) {
	var self = this;
	if(!self.run) self.compile();
	StageProto.execute.apply(this, arguments);
};
},{"./stage":2,"./context":8,"./util.js":9}]},{},[0]);