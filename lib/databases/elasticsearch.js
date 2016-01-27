'use strict';

var util = require('util'),
  Store = require('../base'),
  _ = require('lodash'),
  async = require('async'),
  uuid = require('uuid'),
  elasticsearch = Store.use('elasticsearch'),
  elasticsearchVersion = Store.use('elasticsearch/package.json').version,
  // isNew = mongoVersion.indexOf('1.') !== 0,
  // ObjectID = isNew ? mongo.ObjectID : mongo.BSONPure.ObjectID,
  debug = require('debug')('eventstore:store:elasticsearch');

function Elastic(options) {
  options = options || {};

  Store.call(this, options);

  var defaults = {
    host: '52.58.4.8',
    port: 9200,
    indexName: 'eventstore',
    eventsTypeName: 'events',
    snapshotsTypeName: 'snapshots',
    log: 'warning'
  };

  _.defaults(options, defaults);

  var defaultOpt = {
    auto_reconnect: false,
    ssl: false
  };

  options.options = options.options || {};

  _.defaults(options.options, defaultOpt);

  this.options = options;
}

util.inherits(Elastic, Store);

_.extend(Elastic.prototype, {

  connect: function (callback) {
    var options = this.options;
    this.client = new elasticsearch.Client({host: options.host+':'+options.port, log: options.log});
    this.emit('connect');
    if (callback) callback(null);
  },

  disconnect: function (callback) {
    this.client = null;
    this.emit('disconnect');
    if (callback) callback(null);
  },

  clear: function (callback) {
    var self = this;
    var options = this.options;
    this.client.indices.exists({index: options.indexName}, function (err, result) {
      if (result){
        self.client.indices.delete({index: options.indexName}, function (err) {
          if (callback) callback(err);
        });        
      } else {
        if (callback) callback(err);
      }
    });
  },

  getNewId: function(callback) {
    callback(null, uuid.v4());
  },

  addEvents: function (events, callback) {
    var options = this.options;
    
    if (events.length === 0) {
      if (callback) callback(null);
      return;
    }

    var noAggId = false
    var bulkMap = [];

    _.forEach(events, function (evt) {
      if (!evt.aggregateId) {
        noAggId = true;
      }
      evt.dispatched = false;
      bulkMap.push({create: {_index: options.indexName, _type: options.eventsTypeName, _id: evt.id}});
      bulkMap.push(evt);
    });

    if (noAggId) {
      var errMsg = 'aggregateId not defined!';
      debug(errMsg);
      if (callback) callback(new Error(errMsg));
      return;
    }
    this.client.bulk({body: bulkMap, refresh: true}, function(error, response){
      if (callback) callback(error);
    });
  },
  
  _search: function (type, find, sort, skip, limit, callback) {
    const searchOptions = {
      index: this.options.indexName,
      type: type,
      q: find.join(' AND '),
      sort: sort,
      defaultOperator: 'AND',
      from: (!skip ? 0 : skip),
      size: (!limit || limit === -1 ? 10000 : limit)
    };
    this.client.search(searchOptions, function (error, response) {
      var dataList = [];
      if (response && response.hits && response.hits.hits && response.hits.hits.length) {
        dataList = response.hits.hits.map((data) => {
          return data._source;
        });
      }
      callback(null, dataList);
    });    
  },
  
  _searchEvents: function(find, skip, limit, callback) {
    this._search(this.options.eventsTypeName, find, ['commitStamp:asc', 'streamRevision:asc', 'commitSequence:asc'], skip, limit, callback);
  },
  
  _searchSnapshots: function(find, skip, limit, callback) {
    this._search(this.options.snapshotsTypeName, find, ['revision:desc', 'version:desc', 'commitStamp:desc'], skip, limit, callback);
  },

  getEvents: function (query, skip, limit, callback) {
    var findStatement = [];
    if (query.aggregate) findStatement.push('aggregate:' + query.aggregate);
    if (query.context) findStatement.push('context:' + query.context);
    if (query.aggregateId) findStatement.push('aggregateId:' + query.aggregateId);
    
    this._searchEvents(findStatement, skip, limit, callback);
  },

  getEventsSince: function (date, skip, limit, callback) {
    var findStatement = ['commitStamp:[' + date.toJSON() + ' TO *]'];
    
    this._searchEvents(findStatement, skip, limit, callback);
  },

  getEventsByRevision: function (query, revMin, revMax, callback) {
    if (!query.aggregateId) {
      var errMsg = 'aggregateId not defined!';
      debug(errMsg);
      if (callback) callback(new Error(errMsg));
      return;
    }
    
    var findStatement = [];
    if (revMax === -1) {
      findStatement.push('streamRevision:[' + revMin + ' TO *]');
    } else {
      findStatement.push('streamRevision:[' + revMin + ' TO ' + revMax + '}');  
    }
    findStatement.push('aggregateId:' + query.aggregateId);
    if (query.aggregate) findStatement.push('aggregate:' + query.aggregate);
    if (query.context) findStatement.push('context:' + query.context);
    
    this._searchEvents(findStatement, null, null, callback);
  },

  getUndispatchedEvents: function (query, callback) {
    var findStatement = ['dispatched:false'];
    if (query && query.aggregate) findStatement.push('aggregate:' + query.aggregate);
    if (query && query.context) findStatement.push('context:' + query.context);
    if (query && query.aggregateId) findStatement.push('aggregateId:' + query.aggregateId);
    
    this._searchEvents(findStatement, null, null, callback);
  },

  setEventToDispatched: function (id, callback) {
    this.client.update({
      index: this.options.indexName,
      type: this.options.eventsTypeName,
      id: id,
      body: {
        doc: {
          dispatched: true
        }
      },
      refresh: true
    }, function (error, response) {
      if (callback) callback(error);
    });
  },

  addSnapshot: function(snap, callback) {
    if (!snap.aggregateId) {
      var errMsg = 'aggregateId not defined!';
      debug(errMsg);
      if (callback) callback(new Error(errMsg));
      return;
    }

    this.client.create({
      index: this.options.indexName,
      type: this.options.snapshotsTypeName,
      id: snap.id,
      body: snap,
      refresh: true
    }, function (error, response) {
      if (callback) callback(error);
    });
  },

  getSnapshot: function (query, revMax, callback) {
    if (!query.aggregateId) {
      var errMsg = 'aggregateId not defined!';
      debug(errMsg);
      if (callback) callback(new Error(errMsg));
      return;
    }

    var findStatement = ['aggregateId:' + query.aggregateId];

    if (query.context) findStatement.push('aggregate:' + query.aggregate);
    if (query.aggregate) findStatement.push('context:' + query.context);
    if (revMax > -1) findStatement.push('revision:[* TO ' + revMax + ']');

    this._searchSnapshots(findStatement, 0, 1, function(error, response){
      const snap = response && response.length ? response[0] : null;
      if (callback) callback(null, snap);
    });
  }

});

module.exports = Elastic;