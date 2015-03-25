'use strict';

var util = require('util'),
  Store = require('../base'),
  _ = require('lodash'),
  async = require('async'),
  mongo = require('mongodb'),
  mongoVersion = require('mongodb/package.json').version,
  isNew = mongoVersion.indexOf('1.') !== 0,
  ObjectID = isNew ? mongo.ObjectID : mongo.BSONPure.ObjectID,
  debug = require('debug')('eventstore:store:mongodb');

function Mongo(options) {
  options = options || {};
  
  Store.call(this, options);
  
  var defaults = {
    host: 'localhost',
    port: 27017,
    dbName: 'eventstore',
    eventsCollectionName: 'events',
    snapshotsCollectionName: 'snapshots',
    transactionsCollectionName: 'transactions'
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

util.inherits(Mongo, Store);

_.extend(Mongo.prototype, {

  connect: function (callback) {
    var self = this;

    var options = this.options;

    var server;

    if (options.servers && Array.isArray(options.servers)){
      var servers = [];

      options.servers.forEach(function(item){
        if(item.host && item.port) {
          servers.push(new mongo.Server(item.host, item.port, item.options));
        }
      });

      server = new mongo.ReplSet(servers);
    } else {
      server = new mongo.Server(options.host, options.port, options.options);
    }

    this.db = new mongo.Db(options.dbName, server, { safe: true });
    this.db.on('close', function() {
      self.emit('disconnect');
    });

    this.db.open(function (err, client) {
      if (err) {
        debug(err);
        if (callback) callback(err);
        return;
      }
      function finish (err) {
        if (err) {
          debug(err);
          if (callback) callback(err);
          return;
        }
        
        self.client = client;
        
        self.events = self.db.collection(options.eventsCollectionName);
        self.events.ensureIndex({ aggregateId: 1, streamRevision: 1 },
          function (err) { if (err) { debug(err); } });
        self.events.ensureIndex({ dispatched: 1 }, { sparse: true },
          function (err) { if (err) { debug(err); } });
        
        self.snapshots = self.db.collection(options.snapshotsCollectionName);
        self.snapshots.ensureIndex({ aggregateId: 1, revision: -1 },
          function (err) { if (err) { debug(err); } });

        self.transactions = self.db.collection(options.transactionsCollectionName);
        
        self.emit('connect');
        if (callback) callback(null, self);
      }

      if (options.username) {
        return client.authenticate(options.username, options.password, finish);
      }
      
      finish();
    });
  },

  disconnect: function (callback) {
    if (!this.db) {
      if (callback) callback(null);
      return;
    }

    this.db.close(function (err) {
      if (err) {
        debug(err);
      }
      if (callback) callback(err);
    });
  },

  clear: function (callback) {
    var self = this;
    async.parallel([
      function (callback) {
        self.events.remove({}, callback);
      },
      function (callback) {
        self.snapshots.remove({}, callback);
      },
      function (callback) {
        self.transactions.remove({}, callback);
      }
    ], function (err) {
      if (err) {
        debug(err);
      }
      if (callback) callback(err);
    });
  },

  getNewId: function(callback) {
    callback(null, new ObjectID().toString());
  },

  addEvents: function (events, callback) {
    var noAggId = false;
    
    _.each(events, function (evt) {
      if (!evt.aggregateId) {
        noAggId = true;
      }
      
      evt._id = evt.id;
      evt.dispatched = false;
    });

    if (noAggId) {
      var errMsg = 'aggregateId not defined!';
      debug(errMsg);
      if (callback) callback(new Error(errMsg));
      return;
    }

    var self = this;

    if (events.length === 1) {
      return this.events.insert(events, {keepGoing: true}, callback);
    }

    var tx = {
      _id: events[0].commitId,
      events: events
    };
    
    this.transactions.insert(tx, { keepGoing: true }, function (err) {
      if (err) {
        debug(err);
        if (callback) callback(err);
        return;
      }
      
      self.events.insert(events, {keepGoing: true}, function (err) {
        if (err) {
          debug(err);
          if (callback) callback(err);
          return;
        }
        
        self.transactions.remove({ _id: tx._id }, function (err) {
          if (err) {
            debug(err);
          }
        });
        
        if (callback) { callback(null); }
      });
    });
  },

  getEvents: function (query, skip, limit, callback) {
    var findStatement = {};
    
    if (query.aggregate) {
      findStatement.aggregate = query.aggregate;
    }

    if (query.context) {
      findStatement.context = query.context;
    }
    
    if (query.aggregateId) {
      findStatement.aggregateId = query.aggregateId;
    }

    if (limit === -1) {
      return this.events.find(findStatement, { sort: { commitStamp: 1, streamRevision: 1, commitSequence: 1 } }).skip(skip).toArray(callback);
    }

    this.events.find(findStatement, { sort: { commitStamp: 1, streamRevision: 1, commitSequence: 1 } }).skip(skip).limit(limit).toArray(callback);
  },

  getEventsByRevision: function (query, revMin, revMax, callback) {
    if (!query.aggregateId) {
      var errMsg = 'aggregateId not defined!';
      debug(errMsg);
      if (callback) callback(new Error(errMsg));
      return;
    }
    
    var streamRevOptions = { '$gte': revMin, '$lt': revMax };
    if (revMax == -1) {
      streamRevOptions = { '$gte': revMin };
    }

    var findStatement = {
      aggregateId: query.aggregateId,
      streamRevision: streamRevOptions
    };

    if (query.aggregate) {
      findStatement.aggregate = query.aggregate;
    }

    if (query.context) {
      findStatement.context = query.context;
    }

    var self = this;

    this.events.find(findStatement, { sort: { commitStamp: 1, streamRevision: 1, commitSequence: 1 } }).toArray(function (err, res) {
      if (err) {
        debug(err);
        return callback(err);
      }
      
      if (!res || res.length === 0) {
        return callback(null, []);
      }

      var lastEvt = res[res.length - 1];

      if (lastEvt.restInCommitStream === 0 || !lastEvt.restInCommitStream) {
        callback(err, res);
        self.transactions.remove({ _id: lastEvt.commitId }, function (err) {
          if (err) {
            debug(err);
          }
        });
        return;
      }

      self.transactions.findOne({ _id: lastEvt.commitId }, function (err, tx) {
        if (err) {
          debug(err);
          return callback(err);
        }
        
        if (!tx) {
          return callback(null, res);
        }

        var missingEvts = tx.events.slice(tx.events.length - lastEvt.restInCommitStream);

        self.events.insert(missingEvts, {keepGoing: true}, function (err) {
          if (err) {
            debug(err);
            return callback(err);
          }

          self.transactions.remove({ _id: tx._id }, function (err) {
            if (err) {
              debug(err);
            }
          });
          
          self.getEvents(query, revMin, revMax, callback);
        });
      });
    });
  },

  getUndispatchedEvents: function (callback) {
    this.events.find({ 'dispatched' : false }, { sort: { commitStamp: 1, streamRevision: 1, commitSequence: 1 } }).toArray(callback);
  },

  setEventToDispatched: function (id, callback) {
    var updateCommand = { '$unset' : { 'dispatched': null } };
    this.events.update({'_id' : id}, updateCommand, callback);
  },

  addSnapshot: function(snap, callback) {
    if (!snap.aggregateId) {
      var errMsg = 'aggregateId not defined!';
      debug(errMsg);
      if (callback) callback(new Error(errMsg));
      return;
    }
    
    snap._id = snap.id;
    this.snapshots.insert(snap, callback);
  },

  getSnapshot: function (query, revMax, callback) {
    if (!query.aggregateId) {
      var errMsg = 'aggregateId not defined!';
      debug(errMsg);
      if (callback) callback(new Error(errMsg));
      return;
    }
    
    var findStatement = {
      aggregateId: query.aggregateId
    };

    if (query.aggregate) {
      findStatement.aggregate = query.aggregate;
    }

    if (query.context) {
      findStatement.context = query.context;
    }
    
    if (revMax > -1) {
      findStatement.revision = { '$lte': revMax };
    }

    this.snapshots.findOne(findStatement, { sort: { revision: -1, version: -1, commitStamp: -1 } }, callback);
  }

});

module.exports = Mongo;
