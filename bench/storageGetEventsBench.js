var Benchmark = require('benchmark');
var suite = new Benchmark.Suite();
var util = require('./util');
var async = require('async');

util.prepare(function() {

	var events =[
        {streamId: '2', streamRevision: 0, commitId: '0', payload: {event:'blaaaaaaaaaaa'}, dispatched: false},
        {streamId: '2', streamRevision: 1, commitId: '1', payload: {event:'blaaaaaaaaaaa'}, dispatched: false},
        {streamId: '2', streamRevision: 2, commitId: '2', payload: {event:'blaaaaaaaaaaa'}, dispatched: false},
        {streamId: '2', streamRevision: 3, commitId: '3', payload: {event:'blaaaaaaaaaaa'}, dispatched: false}
    ];

	async.parallel([
    
        function(callback){
            util.inMemoryStorage.addEvents(events, function(err) {
                callback(err);
            });
        },
        
        function(callback){
            util.mongoDbStorage.addEvents(events, function(err) {
				callback(err);
            });
        },
        
        function(callback){
            util.redisStorage.addEvents(events, function(err) {
                callback(err);
            });
        },
        
        function(callback){
            util.couchDbStorage.addEvents(events, function(err) {
                callback(err);
            });
        }
        
    ],

    function(err, results){
        // add tests
		suite.add('inMemory#getEvents', function(deferred) {
			util.inMemoryStorage.getEvents('2', 0, -1, function(err, events) {
				//deferred.resolve();
			});
		}, {defer: false})
		.add('mongoDbStorage#getEvents', function(deferred) {
			util.mongoDbStorage.getEvents('2', 0, -1, function(err, events) {
				deferred.resolve();
			});
		}, {defer: true})
		.add('redisStorage#getEvents', function(deferred) {
			util.redisStorage.getEvents('2', 0, -1, function(err, events) {
				deferred.resolve();
			});
		}, {defer: true})
		.add('couchDbStorage#getEvents', function(deferred) {
			util.couchDbStorage.getEvents('2', 0, -1, function(err, events) {
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

});