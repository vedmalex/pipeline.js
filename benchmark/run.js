var bench = require('benchmark');
var suiteFork = bench.Suite();
var suiteCreate = bench.Suite();
var suiteError = bench.Suite();
var pipe = require('../');
var util = require('util');

ContextFactory = pipe.ContextFactory;
ContextFactory2 = pipe.ContextFactory2;
Context = pipe.Context;
fc1 = null;
c1 = 0;
c2 = 0;
c3 = 0;
fc2 = null;
fc3 = null;
forkContext = null;
forkContext2 = null;
forkContext3 = null;

suiteCreate
.add("Create ContextFactory", function(){
	var c = ContextFactory({a:1,b:0,c:"string",d:new Date(), e:{a:2,b:2}});
	// if(!forkContext)
		forkContext = c;
		fc1 = c;
})
.add("Create Context", function(){
	var c = new Context({a:1,b:0,c:"string",d:new Date(), e:{a:2,b:2}});
	// if(!forkContext2)
		forkContext2 = c;
		fc2 = c;
})
.add("Create ContextFactory2", function(){
	var c = ContextFactory2({a:1,b:0,c:"string",d:new Date(), e:{a:2,b:2}});
	// if(!forkContext)
		forkContext3 = c;
		fc3 = c;
})
.on('cycle', function(event){
	console.log(String(event.target));
})
.on('complete', function(){
	console.log('done');
	console.log('Fastest is ' + this.filter('fastest').pluck('name'));
})
.run();

suiteFork
.add('Fork ContextFactory', function(){
	if(c1 == 5){
		forkContext = fc1;
		c1 = 0;
	}
	forkContext = forkContext.fork();
	forkContext.a +=1;
	forkContext.d.setDate(forkContext.d.getDate() + 1);
	c1++;
})
.add('Fork Context', function(){
	if(c2 == 5){
		forkContext = fc1;
		c2 = 0;
	}
	forkContext2 = forkContext2.fork();
	forkContext2.a +=1;
	forkContext2.d.setDate(forkContext2.d.getDate() + 1);
	c2++;
})
.add('Fork ContextFactory', function(){
	if(c3 == 5){
		forkContext = fc1;
		c3 = 0;
	}
	forkContext3 = forkContext3.fork();
	forkContext3.a +=1;
	forkContext3.d.setDate(forkContext3.d.getDate() + 1);
	c3++;
})
.on('cycle', function(event){
	console.log(String(event.target));
})
.on('complete', function(){
	console.log('done');
	console.log('Fastest is ' + this.filter('fastest').pluck('name'));
})
.run();

suiteError
.add('Error ContextFactory', function(){
	forkContext.addError(new Error());
})
.add('Error Context', function(){
	forkContext2.addError(new Error());
})
.add('Error ContextFactory2', function(){
	forkContext3.addError(new Error());
})
.on('cycle', function(event){
	console.log(String(event.target));
})
.on('complete', function(){
	console.log('done');
	console.log('Fastest is ' + this.filter('fastest').pluck('name'));
})
.run();

bench.Suite()
.add('native for', function(){
	var itemList = [119,201,12,3,334,14,31,123,321,23,32,332,300,1,2];
	var i;
	var len = itemList.length;
	var rec;
	var res = 0;
	for (i = 0; i< len; i++){
		rec = itemList[i];
		res += rec;
	}
})
.add('forEach', function(){
	var itemList = [119,201,12,3,334,14,31,123,321,23,32,332,300,1,2];
	var res = 0;
	itemList.forEach(function(item){
		res+= item;
	});
})
.add('forHash array', function(){
	var itemList = [119,201,12,3,334,14,31,123,321,23,32,332,300,1,2];
	var res = 0;
	for(var p in itemList){
		res+= itemList[p];
	}
})
.add('forObjectKeys', function(){
	var itemList = {119:1,201:1,12:1,3:1,334:1,14:1,31:1,123:1,321:1,23:1,32:1,332:1,300:1,1:1,2:1};
	var res = 0;
	var plist = Object.keys(itemList);
	var i;
	var len = plist.length;
	var rec;
	for (i = 0; i< len; i++){
		res += itemList[plist[i]];
	}
})
.add('forHash object', function(){
	var itemList = {119:1,201:1,12:1,3:1,334:1,14:1,31:1,123:1,321:1,23:1,32:1,332:1,300:1,1:1,2:1};
	var res = 0;
	for(var p in itemList){
		res+= itemList[p];
	}
})
.on('cycle', function(event){
	console.log(String(event.target));
})
.on('complete', function(){
	console.log('done');
	console.log('Fastest is ' + this.filter('fastest').pluck('name'));
})
.run();