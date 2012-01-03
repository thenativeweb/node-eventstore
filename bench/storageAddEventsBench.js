var Benchmark = require('benchmark');
var suite = new Benchmark.Suite();
var util = require('./util');
var uuid = require('../lib/storage/inMemory/uuid');

util.prepare(function() {
	// add tests
	suite.add('inMemory#addEvents', function(deferred) {
		util.inMemoryStorage.addEvents([{streamId: uuid().toString(), commitId: uuid().toString(), payload: {event:'bla'}}], function() {
			//deferred.resolve();
		});
	}, {defer: false})
	.add('mongoDbStorage#addEvents', function(deferred) {
		util.mongoDbStorage.addEvents([{streamId: uuid().toString(), commitId: uuid().toString(), payload: {event:'bla'}}], function() {
			deferred.resolve();
		});
	}, {defer: true})
	.add('redisStorage#addEvents', function(deferred) {
		util.redisStorage.addEvents([{streamId: uuid().toString(), commitId: uuid().toString(), payload: {event:'bla'}}], function() {
			deferred.resolve();
		});
	}, {defer: true})
	.add('couchDbStorage#addEvents', function(deferred) {
		util.couchDbStorage.addEvents([{streamId: uuid().toString(), commitId: uuid().toString(), payload: {event:'bla'}}], function() {
			deferred.resolve();
		});
	}, {defer: true})
	// add listeners
	.on('cycle', function(event, bench) {
		console.log(String(bench));
	})
	.on('complete', function() {
		util.showDefaultResult(this);
	})
	// run async
	.run({ 'async': true });
});