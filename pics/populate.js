var pipeline = require('./..');

//////////////////

var util = require('util');
var format = util.format;
// var pipeline = require('pipeline.js');

var Context = pipeline.Context;

// var comparator = require('comparator.js');

// function getValue(path, obj) {
// 	return comparator.get(obj, path);
// 	// if ( !! obj.$__) return mpath.get(path, obj, '_doc', map);
// 	// else return mpath.get(path, obj, map);
// }

// function setValue(path, val, obj) {
// 	return comparator.set(obj, path, val);
// 	// if ( !! obj.$__) return mpath.set(path, val, obj, '_doc', map);
// 	// return mpath.set(path, val, obj, map);
// }

function getRelationDef(sourceModel, propName) {
	if (global.RelationCache && Object.keys(global.RelationCache).length > 0) {
		return getValue(propName, global.RelationCache.thing[sourceModel]);
	}
}

function exRelationLookup(db, relsContext, rec, relDef, callback) {
	var found;
	var from = relDef.from;
	var to = relDef.to;
	var _from = rec[from];
	var _to = rec[to];
	var relName = relDef.relationModel;

	if (!relsContext[relName]) relsContext[relName] = {};
	if (relsContext[relName][_from] && relsContext[relName][_from][_to]) found = relsContext[relName][_from][_to];

	if (!found) {
		var relModel = db.model(relDef.relationModel);
		relModel.findOne(rec, function(err, found) {
			if (err) return callback(err);
			var newRel;
			if (!found) newRel = new relModel(rec);

			if (!relsContext[relName][_from]) relsContext[relName][_from] = {};
			if (!relsContext[relName][_to]) relsContext[relName][_to] = {};
			relsContext[relName][_to][_from] = found ? found : newRel;
			relsContext[relName][_from][_to] = found ? found : newRel;
			callback(null, found, newRel);
		});
	} else callback(null, found);
}

var linkEmbedded = new pipeline.MultiWaySwitch({
	name: 'Link Embedded Relations',
	cases: [{
		evaluate: function(ctx) {
			return ctx.relDef.oppositeEmbedded;
		},
		stage: {
			name: 'link opposite embedded',
			run: function(err, ctx, done) {
				var dest = ctx.dest;
				var rel = ctx.relDef;
				var serverModel = rel.model;
				var relModel = ctx.db.model(serverModel);
				var relObj = ctx.saveList[ctx.objectId];
				var linkObj = function(err, toUpdate) {
					if (toUpdate) {
						ctx.saveList[toUpdate.get('_id')] = toUpdate;
						var pName = rel.to;
						if (rel.single) {
							var newVal = dest.to;
							if (newVal === null || newVal == '$$$unlink$rel$$$' || newVal === '') newVal = undefined;
							var oldVal = toUpdate.get(pName);
							updateKey(ctx.loadFromDB, serverModel, pName, oldVal, newVal, toUpdate);
							toUpdate.set(pName, newVal);
						} else {
							var arr = toUpdate.get(pName);
							arr.addToSet.apply(arr, dest.add);
							arr.remove.apply(arr, dest.remove);
						}
					} else {
						// думаю не должен попасть ни разу
					}
					done();
				};
				if (relObj) {
					linkObj(null, relObj);
				} else if (ctx.deleteList[ctx.objectId]) {
					relObj = ctx.deleteList[ctx.objectId];
					linkObj(null, relObj);
				} else {
					relModel.findOne({
						_id: ctx.objectId
					}, linkObj);
				}
			}
		}
	}, {
		evaluate: function(ctx) {
			return ctx.relDef.embedded;
		},
		stage: {
			name: "link embedded",
			run: function(err, ctx, done) {
				var dest = ctx.dest;
				var rel = ctx.relDef;
				var serverModel = rel.ref;
				var prop = rel.from;
				var db = ctx.db;
				var loadFromDB = ctx.loadFromDB;
				var relModel = db.model(serverModel);
				var relObj = ctx.saveList[ctx.objectId]; /*обновить объект на противоположенной стороне ассоциации*/
				var linkObj = function(err, toUpdate) {
					if (toUpdate) {
						var newVal = toUpdate.get(rel.fromKeyField);
						if (newVal === null || newVal === '$$$unlink$rel$$$' || newVal === '') newVal = undefined;

						var connect = function(key, remove) {
							if (key === null || key === '$$$unlink$rel$$$' || key === '') key = undefined;
							if (key) {
								var opposite = findObjectBy(db, loadFromDB, serverModel, rel.toKeyField, key);
								ctx.saveList[opposite.get('_id')] = opposite;
								var oldVal = opposite.get(prop);
								if (rel.oppositeSingle) {
									// если надо встроить ссылку
									updateKey(ctx.loadFromDB, serverModel, prop, oldVal, newVal, opposite);
									// remove HERE
									if (remove)
										opposite.set(prop, undefined);
									else
										opposite.set(prop, newVal);
								} else {
									// если надо добавить в массив
									if (remove) opposite.get(prop).remove(newVal);
									else opposite.get(prop).addToSet(newVal);
								}
							}
						};

						if (rel.single) {
							connect(dest.to);
						} else {
							var i;
							var addLen = dest.add ? dest.add.length : 0;
							for (i = 0; i < addLen; i++) {
								connect(dest.add[i]);
							}
							var remLen = dest.remove ? dest.remove.length : 0;
							for (i = 0; i < remLen; i++) {
								connect(dest.remove[i], true);
							}
						}
					} else {
						// думаю тут не должен попасть ни разу
					}
					done();
				};
				if (relObj) {
					linkObj(null, relObj);
				} else if (ctx.deleteList[ctx.objectId]) {
					relObj = ctx.deleteList[ctx.objectId];
					linkObj(null, relObj);
				} else {
					relModel.findOne({
						_id: ctx.objectId
					}, linkObj);
				}
			}
		}
	}]
});

var linkNotEmbedded = new pipeline.Stage({
	name: 'link not embedded',
	run: function(err, ctx, done) {
		var dest = ctx.dest;
		var rel = ctx.relDef;
		var relModel = ctx.db.model(rel.relationModel);
		// ищем связь в базе и помечаем ее на удаление.
		var to = dest.to;
		var nothingLink = to === undefined || to === null || to === '$$$unlink$rel$$$' || to === '';
		nothingLink = nothingLink || !! ctx.deleteList[ctx.objectId.toString()]; // can't link with deleting
		if (!nothingLink) {
			var fc = {};
			fc[rel.to] = dest.to;
			var obj = ctx.saveList[ctx.objectId.toString()];
			fc[rel.from] = obj.get(rel.fromKeyField || '_id');
			exRelationLookup(ctx.db, ctx.relsContext, fc, rel, function(err, relObj, newRel) {
				if (newRel) {
					ctx.saveList[newRel.get('_id')] = newRel;
				} else {
					ctx.dublicateLink[relObj.get('_id')] = relObj;
				}
				done();
			});
		} else done();
	}
});

var link = new pipeline.MultiWaySwitch({
	name: "link relations",
	cases: [{
		evaluate: function(ctx) {
			var rel = ctx.relDef;
			return !rel.derived && (rel.embedded || rel.oppositeEmbedded);
		},
		stage: linkEmbedded
	}, {
		evaluate: function(ctx) {
			var rel = ctx.relDef;
			return !rel.derived && !(rel.embedded || rel.oppositeEmbedded);
		},
		stage: linkNotEmbedded
	}]
});

var unlinkNotEmbedded = new pipeline.Stage({
	name: "unlink not embedded",
	run: function unlinkNotEmbedded(err, ctx, done) {
		var dest = ctx.dest;
		var rel = ctx.relDef;
		var relModel = ctx.db.model(rel.relationModel);
		// ищем связь в базе и помечаем ее на удаление.
		var from = dest.from;
		var nothingToUnlink = from === null || from === undefined || from === '$$$unlink$rel$$$' || dest.from === '';
		if (!nothingToUnlink || (nothingToUnlink && rel.single)) {
			var fc = {};
			var obj = ctx.saveList[ctx.objectId.toString()];
			if (!obj) obj = ctx.deleteList[ctx.objectId.toString()]; // need to unlink object especially if it is deleted
			fc[rel.from] = obj.get(rel.fromKeyField || '_id');
			fc[rel.to] = dest.from;
			exRelationLookup(ctx.db, ctx.relsContext, fc, rel, function(err, toDelete, newRel) {
				if (!err) {
					var id = toDelete && toDelete.get('_id');
					if (id) {
						if (!ctx.dublicateLink[id]) {
							ctx.deleteList[id] = toDelete;
						}
						// if (ctx.dublicateLink[id]) console.log('not passed duplicate');
					}
				}
				done();
			});
		} else done();
	}
});

var unlink = new pipeline.MultiWaySwitch({
	name: "Unlink",
	cases: [{
		evaluate: function(ctx) {
			var rel = ctx.relDef;
			return !(rel.embedded || rel.oppositeEmbedded);
		},
		stage: unlinkNotEmbedded
	}]
});

var hasMany = new pipeline.Sequential({
	name: "Process has many",
	prepareContext: function(ctx) {
		var changeSet = ctx.item;
		var hasManyList = changeSet.hasMany;
		var len = hasManyList ? hasManyList.length : 0;
		ctx = new Context({
			count: len,
			hasManyList: hasManyList,
			serverModel: changeSet.serverModel,
			objectId: changeSet.objectId,
			loadFromDB: ctx.loadFromDB,
			saveList: ctx.saveList,
			dublicateLink: ctx.dublicateLink,
			deleteList: ctx.deleteList,
			relsContext: ctx.relsContext,
			db: ctx.db
		});
		return ctx;
	},
	split: function(ctx, iter) {
		var hmItem = ctx.hasManyList[iter];
		// console.log(format('hasMany: %s -> %s', ctx.serverModel, hmItem.key));
		var rel = getRelationDef(ctx.serverModel, hmItem.key);
		var lcontext = ctx.fork({
			relDef: rel,
			source: ctx.objectId,
			dest: hmItem
		});
		return lcontext;
	},
	reachEnd: function(err, ctx, iter) {
		return iter === ctx.count || err;
	},
	stage: new pipeline.MultiWaySwitch({
		cases: [{
			evaluate: function(ctx) {
				return !!ctx.relDef.embedded || ctx.relDef.oppositeEmbedded;
			},
			stage: new pipeline.Sequential({
				reachEnd: function(err, ctx, iter) {
					return iter === 1 || err;
				},
				stage: link
			})
		}, {
			evaluate: function(ctx) {
				return !( !! ctx.relDef.embedded || ctx.relDef.oppositeEmbedded);
			},
			stage: new pipeline.MultiWaySwitch({
				name: 'add new items',
				// first we bo link and check if it is existing in someway, and then unlink.
				cases: [{
					evaluate: function(ctx) {
						return !!ctx.dest.add && ctx.dest.add.length > 0;
					},
					stage: new pipeline.Sequential({
						prepareContext: function(ctx) {
							var hmItem = ctx.dest;
							return ctx.fork({
								list: hmItem,
								count: hmItem.add.length
							});

						},
						split: function(ctx, iter) {
							return ctx.fork({
								dest: {
									key: ctx.list.key,
									to: ctx.list.add[iter]
								}
							});
						},
						reachEnd: function(err, ctx, iter) {
							return iter === ctx.count || err;
						},
						stage: link
					})
				}, {
					name: 'remove items',
					evaluate: function(ctx) {
						return !!ctx.dest.remove && ctx.dest.remove.length > 0;
					},
					stage: new pipeline.Sequential({
						prepareContext: function(ctx) {
							var hmItem = ctx.dest;
							return ctx.fork({
								list: hmItem,
								count: hmItem.remove.length
							});
						},
						split: function(ctx, iter) {
							return ctx.fork({
								dest: {
									key: ctx.list.key,
									from: ctx.list.remove[iter]
								}
							});
						},
						reachEnd: function(err, ctx, iter) {
							return iter === ctx.count || err;
						},
						stage: unlink
					})
				}]
			})
		}]
	})
});

var belongsTo = new pipeline.Sequential({
	name: 'process belongs to',
	prepareContext: function(ctx) {
		var changeSet = ctx.item;
		var belongsToList = changeSet.belongsTo;
		var len = belongsToList ? belongsToList.length : 0;
		ctx = new Context({
			count: len,
			belongsToList: belongsToList,
			serverModel: changeSet.serverModel,
			objectId: changeSet.objectId,
			loadFromDB: ctx.loadFromDB,
			saveList: ctx.saveList,
			dublicateLink: ctx.dublicateLink,
			deleteList: ctx.deleteList,
			relsContext: ctx.relsContext,
			db: ctx.db
		});
		return ctx;
	},
	split: function(ctx, iter) {
		var btItem = ctx.belongsToList[iter];
		// console.log(format('belongsTo: %s -> %s', ctx.serverModel, btItem.key));
		var rel = getRelationDef(ctx.serverModel, btItem.key);
		var lcontext = ctx.fork({
			relDef: rel,
			source: ctx.objectId,
			dest: btItem
		});
		return lcontext;
	},
	reachEnd: function(err, ctx, iter) {
		return iter === ctx.count || err;
	},
	// fisrt link -> check duplicate link and then unlink if all is ok;
	stage: new pipeline.Pipeline([link, unlink])
});

var processRelations = new pipeline.MultiWaySwitch({
	name: "Process relations",
	cases: [{
		evaluate: function(ctx) {
			return ctx.item.hasMany && ctx.item.hasMany.length > 0;
		},
		stage: hasMany
	}, {
		evaluate: function(ctx) {
			return ctx.item.belongsTo && ctx.item.belongsTo.length > 0;
		},
		stage: belongsTo
	}]
});

var prepareChanges = new pipeline.Stage({
	name: 'Prepare changes for update records',
	run: function prepareChanges(err, ctx, done) {
		// console.log('prepare');
		var changeSet = ctx.item;
		var upd = ctx.changeItem = {};
		var i;
		var len = (changeSet && changeSet.changes) ? changeSet.changes.length : 0;
		for (i = 0; i < len; i++) {
			var src = changeSet.changes[i];
			upd[src.key] = src.to;
		}
		upd._id = changeSet.objectId;
		done();
	}
});

var update = new pipeline.Pipeline({
	name: 'Update records',
	stages: [prepareChanges,
		function makeChanges(err, ctx, done) {
			// console.log(ctx.item.action);
			var item = ctx.item;
			var destList;
			var updateRecord = function(err, toUpdate) {
				if (err) done(err);
				else {
					if (!toUpdate) toUpdate = new ctx.model();
					var oldVal;
					var newVal;
					var changeItem = ctx.changeItem;
					for (var p in changeItem) {
						newVal = changeItem[p];
						if (newVal === '' || newVal === null) changeItem[p] = newVal = undefined;
						oldVal = toUpdate.get(p);
						updateKey(ctx.loadFromDB, item.serverModel, p, oldVal, newVal, toUpdate);
						toUpdate.set(p, changeItem[p]);
					}
					destList[toUpdate.get('_id')] = toUpdate;
					ctx.rootItem = toUpdate;
					done();
				}
			};
			var obj = ctx.saveList[item.objectId];
			if (obj) {
				destList = ctx.saveList;
				updateRecord(null, obj);
			} else if (ctx.deleteList[item.objectId]) {
				destList = ctx.deleteList;
				obj = ctx.deleteList[item.objectId];
				updateRecord(null, obj);
			} else {
				destList = ctx.saveList;
				obj = findObjectBy(ctx.db, ctx.loadFromDB, item.serverModel, '_id', item.objectId);
				if (obj) {
					updateRecord(null, obj);
				} else {
					//minimize this!
					// console.log('find');
					ctx.model.findOne({
						_id: item.objectId
					}, updateRecord);
				}
			}
		}
	]
});

var remove = new pipeline.Stage({
	name: 'Remove records',
	run: function remove(err, ctx, done) {
		// console.log('remove');
		var item = ctx.item;
		var removeObj = function(err, toDelete) {
			if (err) done(err);
			else if (!toDelete) done(new Error(format('Item %s with ID %s not found', item.serverModel, item.ObjectId)));
			else {
				var obj = toDelete.toJSON();
				delete obj.__v;
				delete obj.id;
				delete obj._id;
				var changes = [];
				for (var p in obj) {
					changes.push({
						key: p,
						from: obj[p],
						to: "$$$delete$$$"
					});
				}
				if (!item.changes) item.changes = [];
				item.changes.push.apply(item.changes, changes);
				ctx.deleteList[toDelete.get('_id')] = toDelete;
				ctx.rootItem = toDelete;
				done();
			}
		};
		var obj = ctx.saveList[item.objectId];
		if (obj) {
			delete ctx.saveList[item.objectId];
			removeObj(null, obj);
		} else if (ctx.deleteList[item.objectId]) {
			done(); // already mark for delete
		} else {
			obj = findObjectBy(ctx.db, ctx.loadFromDB, item.serverModel, '_id', item.objectId);
			if (obj) {
				removeObj(null, obj);
			} else {
				//minimize this!
				// console.log('find');
				ctx.model.findOne({
					_id: item.objectId
				}, removeObj);
			}
		}
	}
});

var processChangeSet = new pipeline.MultiWaySwitch({
	name: 'Process change set',
	cases: [{
		evaluate: function(ctx) {
			return ctx.item.action === 'update' || ctx.item.action === 'create' || ctx.item.action === 'unlink';
		},
		stage: new pipeline.Pipeline([update, processRelations])
	}, {
		evaluate: function(ctx) {
			return ctx.item.action === 'delete';
		},
		stage: new pipeline.Pipeline([remove, processRelations])
	}]
});

var runner = new pipeline.Pipeline('transaction processing');
// collect IDS.
// ensure IDS.

runner.addStage(function startTransaction(err, ctx, done) {
	ctx.transaction.set("startedAt", new Date());
	ctx.transaction.set("state", "WORK");
	ctx.transaction.save(function(err, data) {
		ctx.transaction = data;
		done(err);
	});
});

runner.addStage(function getTransactionTicket(err, ctx, done) {
	ctx.transaction.db.model('TransactionTicket').findOne({
		transaction: ctx.transaction._id
	}, function(ferr, data) {
		if (ferr) return done(ferr);
		if (data) {
			data.set("state", "WORK");
			data.save(function(ferr) {
				done(ferr);
			});
		} else {
			done(ferr);
		}
	});
});

// preload related objects, so that the y will resides in the cache instead db
// here we can lock this object in locking table.
runner.addStage(new pipeline.Sequential({
	name: 'prepare items to preload from DB',
	prepareContext: function(ctx) {
		ctx.objectCache = {};
		ctx.loadFromDB = {};
		loadFromDB = {};
		var notEmpty = (ctx.transaction && ctx.transaction.changes);
		var lcontext = {
			db: ctx.transaction.db,
			changeList: notEmpty ? ctx.transaction.changes : [],
			objectCache: ctx.objectCache,
			loadFromDB: ctx.loadFromDB,
			count: notEmpty ? ctx.transaction.changes.length : 0
		};
		return lcontext;
	},
	split: function(ctx, iter) {
		var item = ctx.changeList[iter];
		return {
			item: item,
			db: ctx.db,
			model: ctx.db.model(item.serverModel),
			objectCache: ctx.objectCache,
			loadFromDB: ctx.loadFromDB
		};
	},
	reachEnd: function(err, ctx, iter) {
		return !!err || iter >= ctx.count;
	},
	stage: function preparePreload(err, ctx, done) {
		var item = ctx.item;
		var serverModel = item.serverModel;
		var objectId = item.objectId;
		var loadFromDB = ctx.loadFromDB;

		var i, rel, relDef, objCond;

		if (!loadFromDB[serverModel]) loadFromDB[serverModel] = {};
		objCond = loadFromDB[serverModel];
		if (!objCond._id) objCond._id = {};
		objCond._id[objectId] = item.action === 'create' ? -1 : 1;

		// hasMany
		var hm = item.hasMany;
		var len = hm ? hm.length : 0;
		for (i = 0; i < len; i++) {
			rel = item.hasMany[i];
			relDef = getRelationDef(serverModel, rel.key);
			var all = [];
			var res = [];
			all.push.apply(all, rel.add);
			all.push.apply(all, rel.intact);
			all.push.apply(all, rel.remove);
			var j, assocCond;

			if (!loadFromDB[relDef.ref]) loadFromDB[relDef.ref] = {};
			objCond = loadFromDB[relDef.ref];
			if (!objCond[relDef.toKeyField]) objCond[relDef.toKeyField] = {};

			var allLen = all.length;
			for (j = 0; j < allLen; j++) {
				if (objCond[relDef.toKeyField][all[j]] !== -1) objCond[relDef.toKeyField][all[j]] = 1;
			}

		}
		// belongsTo
		var bt = item.belongsTo;
		len = bt ? bt.length : 0;
		var btFrom, btTo;
		for (i = 0; i < len; i++) {
			rel = bt[i];
			relDef = getRelationDef(serverModel, rel.key);

			if (!loadFromDB[relDef.ref]) loadFromDB[relDef.ref] = {};

			objCond = loadFromDB[relDef.ref];
			if (!objCond[relDef.toKeyField]) objCond[relDef.toKeyField] = {};

			var to = rel.to;
			if (to !== null && to !== undefined && to !== '$$$unlink$rel$$$' && to !== '') {
				if (objCond[relDef.toKeyField][to] !== -1) objCond[relDef.toKeyField][to] = 1;
			}

			var from = rel.from;
			if (from !== null && from !== undefined && from !== '$$$unlink$rel$$$' && from !== '') {
				if (objCond[relDef.toKeyField][from] !== -1) objCond[relDef.toKeyField][from] = 1;
			}
		}
		done();
	}
}));

function ObjectKeysFiltered(object, cond) {
	var res = [];
	for (var p in object) {
		if (cond(object[p])) res.push(p);
	}
	return res;
}

function onlyExiting(item) {
	return item === 1; // not pre-marked as created
}

function getAll(item) {
	return true; // not pre-marked as created
}

function findObjectBy(db, loadFromDB, serverModel, key, value) {
	// console.log('cache');
	if (loadFromDB[serverModel] && loadFromDB[serverModel][key]) {
		var obj = loadFromDB[serverModel][key][value];
		if (obj === -1) { // this object is mared as create in transaction;
			var model = db.model(serverModel)
			obj = new model();
			obj.set(key, value);
			loadFromDB[serverModel][key][value] = obj;
			return obj;
		} else return obj;
	}
}

function updateKey(loadFromDB, serverModel, key, old, value, obj) {
	// console.log('change cache key');
	old = String(old);
	value = String(value);
	if (loadFromDB[serverModel] && loadFromDB[serverModel][key]) {
		if (old !== value) {
			if (value) loadFromDB[serverModel][key][value] = obj;
			delete loadFromDB[serverModel][key][old];
		} else {
			if (value) loadFromDB[serverModel][key][value] = obj;
		}
	}
}

// loads data from DB to prepare all the things
// here must be transaction techiqes like locks
// -- now it is just dirty read
//  need to investigate transaction serializable and read committed.

// serializable will throw if one of the touched fields is different or changed

runner.addStage(new pipeline.Sequential({
	name: "preload items from db",
	prepareContext: function(ctx) {
		var models = Object.keys(ctx.loadFromDB);
		var len = models.length;
		var condHash, propNames, cond, model;
		var loadList = [];
		// готовим набор данных для поиска по базе.
		for (var i = 0; i < len; i++) {
			cond = {
				$or: []
			};
			loadList.push(cond);
			model = models[i];
			condHash = ctx.loadFromDB[model];
			propNames = Object.keys(condHash);
			cond.model = model;
			cond.fields = {};
			var j;
			var pnLen = propNames.length;
			var prop, propName, values;
			for (j = 0; j < pnLen; j++) {
				prop = {};
				values = ObjectKeysFiltered(condHash[propNames[j]], getAll);
				if (values.length > 0) {
					prop[propNames[j]] = {
						$in: values
					};
					cond.$or.push(prop);
				}
				cond.fields[propNames[j]] = 1;
			}
		}
		ctx.loadList = loadList ? loadList : [];
		var lcontext = {
			db: ctx.transaction.db,
			objectCache: ctx.objectCache,
			loadFromDB: ctx.loadFromDB,
			loadList: ctx.loadList,
			count: ctx.loadList.length
		};
		return lcontext;
	},
	split: function(ctx, iter) {
		var item = ctx.loadList[iter];
		return {
			item: item,
			db: ctx.db,
			model: ctx.db.model(item.model),
			objectCache: ctx.objectCache,
			loadFromDB: ctx.loadFromDB,
			loadList: ctx.loadList
		};
	},
	reachEnd: function(err, ctx, iter) {
		return !!err || iter >= ctx.count;
	},
	stage: function(err, ctx, done) {
		if (ctx.item.$or.length > 0) {
			// здесь более жесткая проверка на валидность обхекта...
			// необходим отчитаться по каждому существующему объекту...

			ctx.model.find({
				$or: ctx.item.$or
			}, function(err, data) {
				var fldList = Object.keys(ctx.item.fields);
				var cache = ctx.loadFromDB[ctx.item.model];
				var len = data ? data.length : 0;
				var rec, fldName, val, j;
				var fldCnt = fldList.length;
				// Разместить данные в дереве кэша
				for (var i = 0; i < len; i++) {
					rec = data[i];
					for (j = 0; j < fldCnt; j++) {
						fldName = fldList[j];
						val = rec.get(fldName);
						if (val && val !== '') cache[fldName][val] = rec;
					}
				}
				// все записи которые остались не помеченные т.е. == 1 необходимо отметить как создаваемые =-1
				for (j = 0; j < fldCnt; j++) {
					fldName = fldList[j];
					val = cache[fldName];
					for (var cv in val) {
						if (val[cv] === 1) val[cv] = -1;
					}
				}
				done();
			});
		} else done();
	}
}));

//transaction
runner.addStage(new pipeline.Sequential({
	name: "process transaction change set",
	prepareContext: function(ctx) {
		ctx.saveList = {};
		ctx.dublicateLink = {};
		ctx.deleteList = {};
		ctx.relsContext = {};
		var notEmpty = (ctx.transaction && ctx.transaction.changes);
		var lcontext = {
			changeList: notEmpty ? ctx.transaction.changes : [],
			db: ctx.transaction.db,
			count: notEmpty ? ctx.transaction.changes.length : 0,
			loadFromDB: ctx.loadFromDB,
			saveList: ctx.saveList,
			dublicateLink: ctx.dublicateLink,
			deleteList: ctx.deleteList,
			relsContext: ctx.relsContext
		};
		return lcontext;
	},
	split: function(ctx, iter) {
		var item = ctx.changeList[iter];
		return {
			item: item,
			db: ctx.db,
			model: ctx.db.model(item.serverModel),
			loadFromDB: ctx.loadFromDB,
			saveList: ctx.saveList,
			dublicateLink: ctx.dublicateLink,
			deleteList: ctx.deleteList,
			relsContext: ctx.relsContext
		};
	},
	reachEnd: function(err, ctx, iter) {
		return !!err || iter >= ctx.count;
	},
	stage: processChangeSet
}));

//validation
runner.addStage(new pipeline.Sequential({
	name: "validate items",
	prepareContext: function(ctx) {
		// console.log('validate');
		var list = Object.keys(ctx.saveList);
		return {
			saveListKeys: list,
			saveList: ctx.saveList,
			dublicateLink: ctx.dublicateLink,
			count: list.length
		};
	},
	stage: function(err, ctx, done) {
		ctx.item.validate(done);
	},
	split: function(ctx, iter) {
		return {
			item: ctx.saveList[ctx.saveListKeys[iter]]
		};
	},
	reachEnd: function(err, ctx, iter) {
		return err || iter >= ctx.count;
	}
}));

//delete
runner.addStage(new pipeline.Sequential({
	name: 'process delete action',
	prepareContext: function(ctx) {
		// console.log('remove');
		var list = Object.keys(ctx.deleteList);
		return {
			saveListKeys: list,
			dublicateLink: ctx.dublicateLink,
			saveList: ctx.deleteList,
			count: list.length
		};
	},
	stage: function deleteIfNeed(err, ctx, done) {
		ctx.item.remove(done);
	},
	split: function(ctx, iter) {
		return {
			item: ctx.saveList[ctx.saveListKeys[iter]]
		};
	},
	reachEnd: function(err, ctx, iter) {
		return err || iter >= ctx.count;
	}
}));

//save
runner.addStage(new pipeline.Sequential({
	name: "process save transaction",
	prepareContext: function(ctx) {
		// console.log('save');
		var list = Object.keys(ctx.saveList);
		return {
			userName: ctx.transaction.userName,
			saveListKeys: list,
			dublicateLink: ctx.dublicateLink,
			saveList: ctx.saveList,
			count: list.length
		};
	},
	split: function(ctx, iter) {
		return {
			userName: ctx.userName,
			item: ctx.saveList[ctx.saveListKeys[iter]]
		};
	},
	stage: function(err, ctx, done) {
		ctx.item.$__userName = ctx.userName;
		ctx.item.save(done);
	},
	reachEnd: function(err, ctx, iter) {
		return err || iter >= ctx.count;
	}
}));

runner.addStage(function finish(err, ctx, done) {
	var trans = ctx.transaction;
	trans.set("finishedAt", new Date());
	trans.set("state", err ? "FAIL" : "DONE");
	if (err) {
		ctx.transaction.commitErrorList.push(JSON.stringify(err));
	}
	trans.save(function(err, data) {
		ctx.transaction = data;
		done(err);
	});
});

exports.runner = runner;

// проблема в сохранении транзакции, т.е. нужен дополнительный уровень на котором будуд проверенны все связи
//, на валидность, связи belongsTo должны быть выставлены корректно... т.е. проверены что там действительно нет связи... и 
// это делается но немного не так. т.е. в случае если мы подключаем и отключаем одновременно один объект что делать. подключать или отключать.
// решение: если from отсутствует его нужно обязательно ensure
// то же самое нужно сделать и с другими связями.... has many --- проверить что я уже это делал.

//////////////////

function typeRef(cfg) {

	this.type = cfg.type;

	if (cfg.name) {
		this.name = cfg.name;
	}

	if (cfg.ref) {
		this.referencedType = cfg.ref;
		this.ref = cfg.ref.name;
	}

	if (cfg.kind) {
		switch (cfg.kind) {
			case 'instance':
				this.objInstance = true;
				break;
			case 'subclass':
				break;
		}
	}

	if (cfg.value) {
		this.value = cfg.value;
	}

}

typeRef.prototype.name = '';
typeRef.prototype.type = '';
typeRef.prototype.static = undefined;
typeRef.prototype.objInstance = undefined;

typeRef.prototype.properties = undefined;
typeRef.prototype.ref = "";
typeRef.prototype.value = undefined;
typeRef.prototype.referencedType = undefined;

typeRef.prototype.toString = function() {
	return this.name || this.type;
};

function extractTypeName(_v) {
	var v = _v;
	var ts = Object.prototype.toString;
	var ret = ts.call(v).match(/\[object (.+)\]/)[1];
	var cfg = {
		type: ret
	};

	if (ret === "Function") {
		if (v.name !== ret) {
			cfg.name = v.name;
		}
		if (v.super_) {
			cfg.ref = v.super_;
			cfg.kind = 'subclass';
		}
	} else if (ret === "Object") {
		if (v.constructor) {
			cfg.name = v.constructor.name;
			cfg.ref = v.constructor;
			cfg.kind = 'instance';
		}
	} else {
		if(ret === "RegExp") v = v.toString();
		var gtype = global[ret];
		if (gtype && gtype instanceof Function) {

			var val = JSON.stringify(JSON.stringify(v));
			cfg.value = val.slice(1, val.length - 1).replace(/\{/g,'\\{').replace(/\}/g,'\\}').replace(/,/g,',\n').replace(/\[/g,'\\[\n').replace(/\]/g,'\n\\]');

			cfg.name = gtype.name;
			cfg.ref = gtype;
			cfg.kind = 'instance';
		}
	}
	return new typeRef(cfg);
	// сделать разборку массивов и функций и других типов
}

var types = {};

function registerExternalType(obj) {
	var type = extractTypeName(obj);
	types[type.name || type.type] = true;
}

function isRegistredType(obj) {
	return types[obj];
}

var EventEmitter = require('events').EventEmitter;

function getAllMembersList(obj) {
	if (obj instanceof Object) {
		return Object.getOwnPropertyNames(obj);
	} else {
		return [];
	}
}

function getObjectKeysList(obj) {
	if (obj instanceof Object) {
		return Object.keys(obj);
	} else {
		return [];
	}
}

// registerExternalType(Object);
// registerExternalType(Array);
// registerExternalType(Number);
// registerExternalType(String);
// registerExternalType(RegExp);
// registerExternalType(Function);
registerExternalType(global.Undefined);
registerExternalType(global.Null);
registerExternalType(pipeline.Context);
registerExternalType(pipeline.Stage);
registerExternalType(pipeline.Pipeline);
registerExternalType(pipeline.MultiWaySwitch);
// registerExternalType(EventEmitter);

var list = Object.keys(pipeline);
var rec;

var Objects = [];



Objects.push(linkEmbedded);
Objects.push(linkNotEmbedded);
// Objects.push(new pipeline.Pipeline());
Objects.push(new pipeline.Context({
	one: 1,
	two: '2',
	three: ['one', 2, 3],
	nr:/some/
}));
// for (var i = 0, len = list.length; i < len; i++) {
// 	Objects.push(pipeline[list[i]]);
// }

function describe(curr, currDescr) {
	return function(item, index, list) {
		var type = extractTypeName(curr[item]);
		currDescr[item] = type;
		if (isRegistredType(type) && !described[type]) {
			Objects.push(curr[item]);
		}
	};
}

var curr;
var described = {};
// различать
// owned -- те поля которые уже проставлены
// registered -- те поля которые могут быть проставлены и принадлежать текущему объекту
// prototype -- те что у прототипа...


// оформить в виде метода для извлечения данных о типах.... 

var ready = [];

while (Objects.length > 0) {
	curr = Objects.shift();
	var describedItem = extractTypeName(curr);
	if (!described[describedItem]) {

		if (!describedItem.objInstance) {
			described[describedItem] = true;
		} else if (isRegistredType(describedItem) && !described[describedItem]) {
			Objects.push(describedItem.referencedType);
		}

		if (curr instanceof Function) {

			describedItem.static = {};
			describedItem.properties = {};

			getObjectKeysList(curr).forEach(describe(curr, describedItem.static));

			getAllMembersList(curr.prototype).forEach(describe(curr, describedItem.properties));

			//display items
			console.log(describedItem.toString(), describedItem.referencedType ? ('-> ' + describedItem.ref) : '');

			console.log('statics');
			for (var p in describedItem.static) {
				console.log('\t', p, ':', describedItem.static[p].toString());
			}
			console.log('public');
			for (var p in describedItem.properties) {
				console.log('\t', p, ':', describedItem.properties[p].toString());
			}
		} else {

			describedItem.properties = {};
			// object.keys не со всеми типами работает
			// Object.keys(curr).forEach(describe(curr, describedItem.properties));
			getAllMembersList(curr).forEach(describe(curr, describedItem.properties));

			//display items
			console.log('instance of :' + describedItem.name);
			for (var p in describedItem.properties) {
				console.log('\t', p, ':', describedItem.properties[p].toString());
			}
		}
		ready.push(describedItem);
	}
}
debugger;
var fs = require('fs');
var Factory = require('fte.js').Factory;

var fte = new Factory({
	root: './'
});

var outXml = fte.run(ready, 'gvTree.dot.njs');
fs.writeFile('schema.dot', outXml, function(err) {
	console.log('done');
});


/*

отличать объекты и классы..

сделать опцию отрисовать и объекты и классы

*/