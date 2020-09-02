var Store = require('../base'),
    util = require('util'),
    _ = require('lodash'),
    async = require('async'),
    dbg = require('debug'),
    DS = Store.use('@google-cloud/datastore');

var debug = dbg('eventstore:store:datastore'),
  error = dbg("eventstore:store:datastore:error");

/*
#########################################
####### Special note on testing #########
#########################################

Since query in cloud datastore by default is eventual consistency, to pass the unit test please activate an env variable for test only

$ export DATASTORE_TEST=true

What it will do, is forced all query and entity to have common ancestor which will make every query strong consistence,
with the tradeoff of limit of write per sec = 1.
*/
function Datastore(options) {
  options = options || {};

  var dsConf = {
    projectId: ""
  };

  this.options = _.defaults(options, dsConf);

  var defaults = {
    eventsTableName: 'events',
    snapshotsTableName: 'snapshots'
  };

  this.options = _.defaults(this.options, defaults);
}

util.inherits(Datastore, Store);

_.extend(Datastore.prototype, {

  AGGREGATE_KIND: "Aggregate",

  connect: function (callback) {
    var self = this;
    self.client = new DS(self.options);
    self.isConnected = true;

    self.emit('connect');
    if (callback) callback(null, self);
  },

  disconnect: function (callback) {
    // do nothing on cloud datastore client
    this.emit('disconnect');
    if (callback) callback(null);
  },

  clear: function (done) {
    var self = this;
    
    var clearEvents = function (callback) {
      clearKind(self.options.eventsTableName, self.options, self.client, function (err) {
        if (err) {
          error("clear events kind error: " + err); 
          return callback(err);
        }

        callback(null, "events");
      });      
    };

    var clearSnapshots = function (callback) {
      clearKind(self.options.snapshotsTableName, self.options, self.client, function (err) {
        if (err) {
          error("clear snapshots kind error: " + err); 
          return callback(err);
        }

        callback(null, "snapshots");
      });      
    };

    async.parallel([
      clearEvents,
      clearSnapshots
    ], function (err, data) {
      if (err) {
        error("removeKinds error: " + err);
        if (done) done(err);
        return;
      }
      if (done) done(null, self);
    });
  },
  
  addEvents: function (events, callback) {
    var self = this;

    var noAggId = _.every(events, function (event) {
      return !event.aggregateId
    });

    if (noAggId) {
      var errMsg = 'aggregateId not defined!';
      error(errMsg);
      if (callback) callback(new Error(errMsg));
      return;
    }

    if (!events || events.length === 0) {
      return callback(null);
    }

    var exclusions = [
      'header',
      'payload'
    ];

    var entities = _.map(events, function(event) {
      var path = [self.options.eventsTableName, event.id];
      if (process.env.DATASTORE_TEST) {
        path.unshift(self.AGGREGATE_KIND, "default");
      }

      return {
        key: self.client.key(path),
        excludeFromIndexes: exclusions,
        data: new StoredEvent(event)
      };
    });
    
    debug("Saving event to events table: " + JSON.stringify(entities, null, 2));
    self.client.save(entities, function(err, apiResponse) {
      if (err) {
        error("addEvents error: " + JSON.stringify(err));
        return callback(err);
      }

      callback(null, apiResponse);
    });
  },

  getEvents: function (query, skip, limit, callback) {
    var self = this;
    var client = self.client;
    var nextCursor = null;
    var results = [];

    var pageSize = skip + limit;

    async.doWhilst(function (end) {
      var q = client.createQuery(self.options.eventsTableName);

      if (process.env.DATASTORE_TEST) {
        q.hasAncestor(client.key([self.AGGREGATE_KIND, "default"]));
      }

      if (query && query.aggregateId)
        q.filter("aggregateId", "=", query.aggregateId);
  
      if (query && query.aggregate)
        q.filter("aggregate", "=", query.aggregate);
  
      if (query && query.context)
        q.filter("context", "=", query.context);

      if (limit !== -1)
        q.limit(pageSize);

      if (nextCursor)
        q.start(nextCursor);
        
      q.order("commitStamp").order("streamRevision");

      client.runQuery(q, function(err, entities, info) {
        if (err) {
          error("getEvents scan error: " + err);
          return end(err);
        }
    
        if (info.moreResults !== DS.NO_MORE_RESULTS) {
          nextCursor = info.endCursor;
        }
        results = results.concat(entities);
        end(null);
      });
    }, function () {
      return (results.length < pageSize || pageSize == -1) ? nextCursor !== null : false;
    }, function (err) {
      if (err) {
        error("getEvents error: " + err);
        return callback(err);
      }

      results = results.map(MapStoredEventToEvent);

      if (limit === -1) {
        results = results.slice(skip);
      } else {
        results = results.slice(skip, skip + limit);
      }

      callback(null, results);
    });
  },

  getEventsSince: function (date, skip, limit, callback) {
    var self = this;
    var client = self.client;
    var nextCursor = null;
    var results = [];

    var pageSize = skip + limit;

    async.doWhilst(function (end) {
      var q = client
        .createQuery(self.options.eventsTableName)
        .filter("commitStamp", ">=", date);

      if (process.env.DATASTORE_TEST) {
        q.hasAncestor(client.key([self.AGGREGATE_KIND, "default"]));
      }

      if (limit !== -1)
        q.limit(pageSize);

      if (nextCursor)
        q.start(nextCursor);
      
      q.order("commitStamp");

      client.runQuery(q, function(err, entities, info) {
        if (err) {
          error("getEventsSince scan error: " + err);
          return end(err);
        }
    
        if (info.moreResults !== DS.NO_MORE_RESULTS) {
          nextCursor = info.endCursor;
        }
        results = results.concat(entities);
        end(null);
      });
    }, function () {
      return (results.length < pageSize || pageSize == -1) ? nextCursor !== null : false;
    }, function (err) {
      if (err) {
        error("getEventsSince error: " + err);
        return callback(err);
      }

      results = results.map(MapStoredEventToEvent);

      if (limit === -1) {
        results = results.slice(skip);
      } else {
        results = results.slice(skip, skip + limit);
      }

      callback(null, results);
    });
  },

  getEventsByRevision: function (query, revMin, revMax, callback) {
    var self = this;
    var client = self.client;
    var nextCursor = null;
    var results = [];

    if (!query.aggregateId) {
      var errMsg = 'aggregateId not defined!';
      error(errMsg);
      if (callback) callback(new Error(errMsg));
      return;
    }
    
    async.doWhilst(function (end) {
      var q = client
        .createQuery(self.options.eventsTableName)
        .filter("aggregateId", "=", query.aggregateId)
        .filter("streamRevision", ">=", revMin);

      if (process.env.DATASTORE_TEST) {
        q.hasAncestor(client.key([self.AGGREGATE_KIND, "default"]));
      }

      if (revMax !== -1)
        q.filter("streamRevision", "<=", revMax);
      
      if (query && query.aggregate)
        q.filter("aggregate", "=", query.aggregate);

      if (query && query.context)
        q.filter("context", "=", query.context);

      if (nextCursor)
        q.start(nextCursor);
        
      q.order("streamRevision").order("commitStamp");

      client.runQuery(q, function(err, entities, info) {
        if (err) {
          error("getEventsByRevision scan error: " + err);
          return end(err);
        }
    
        if (info.moreResults !== DS.NO_MORE_RESULTS) {
          nextCursor = info.endCursor;
        }
        results = results.concat(entities);
        end(null);
      });
    }, function () {
      return nextCursor !== null;
    }, function (err) {
      if (err) {
        error("getEventsByRevision error: " + err);
        return callback(err);
      }

      results = results.map(MapStoredEventToEvent);

      results = _.sortBy(results, function (e) {
        return e.commitStamp;
      });

      callback(null, results);
    });
  },

  setEventToDispatched: function (id, callback) {
    var self = this;
    var client = self.client;

    var path = [self.options.eventsTableName, id];
    if (process.env.DATASTORE_TEST) {
      path.unshift(self.AGGREGATE_KIND, "default");
    }

    var evtKey = client.key(path);
    var tx = client.transaction();

    tx.run()
      .then(function() { return tx.get(evtKey); })
      .then(function(results) {
        var evt = results[0];
        if (evt) {
          evt.dispatched = true;

          tx.save({
            key: evtKey,
            data: evt
          });
          return tx.commit(callback);
        } else {
          // when not found
          return tx.rollback(callback);
        }
      })
      .catch(function() { tx.rollback(callback); });
  },

  getUndispatchedEvents: function (query, callback) {
    var self = this;
    var client = self.client;
    var nextCursor = null;
    var results = [];

    async.doWhilst(function (end) {
      var q = client
        .createQuery(self.options.eventsTableName)
        .filter("dispatched", false);

      if (process.env.DATASTORE_TEST) {
        q.hasAncestor(client.key([self.AGGREGATE_KIND, "default"]));
      }

      if (query && query.aggregateId)
        q.filter("aggregateId", "=", query.aggregateId);
  
      if (query && query.aggregate)
        q.filter("aggregate", "=", query.aggregate);
  
      if (query && query.context)
        q.filter("context", "=", query.context);

      if (nextCursor)
        q.start(nextCursor);
        
      q.order("commitStamp").order("id");

      client.runQuery(q, function(err, entities, info) {
        if (err) {
          error("getUndispatchedEvents scan error: " + err);
          return end(err);
        }
    
        if (info.moreResults !== DS.NO_MORE_RESULTS) {
          nextCursor = info.endCursor;
        }
        results = results.concat(entities);
        end(null);
      });
    }, function () {
      return nextCursor !== null;
    }, function (err) {
      if (err) {
        error("getUndispatchedEvents error: " + err);
        return callback(err);
      }

      results = results.map(MapStoredEventToEvent);

      callback(null, results);
    });
  },

  getLastEvent: function (query, callback) {
    var self = this;
    var client = self.client;

    if (!query.aggregateId) {
      var errMsg = 'aggregateId not defined!';
      error(errMsg);
      if (callback) callback(new Error(errMsg));
      return;
    }

    var q = client
        .createQuery(self.options.eventsTableName)
        .filter("aggregateId", "=", query.aggregateId)
        .order("commitStamp", { descending: true })
        .order("streamRevision", { descending: true })
        .order("commitSequence", { descending: true })
        .limit(1);

    if (process.env.DATASTORE_TEST) {
      q.hasAncestor(client.key([self.AGGREGATE_KIND, "default"]));
    }

    client.runQuery(q, function(err, entities, info) {
      if (err) {
        error("getLastEvent query error: " + err);
        return callback(err);
      }

      if ( entities.length < 1 ) {
        var errMsg = "Last event #aggr[" + query.aggregateId + "] not found !";
        error("getLastEvent query error: " + errMsg);
        return callback(new Error(errMsg));
      }
  
      callback(null, entities[0]);
    });
  },

  addSnapshot: function (snap, callback) {
    var self = this;
    var client = self.client;

    if (!snap.aggregateId) {
      var errMsg = 'aggregateId not defined!';
      error(errMsg);
      if (callback) callback(new Error(errMsg));
      return;
    }
    
    var path = [self.options.snapshotsTableName, snap.id];
    if (process.env.DATASTORE_TEST) {
      path.unshift(self.AGGREGATE_KIND, "default");
    }

    var ent = {
      key: client.key(path),
      data: new StoredSnapshot(snap)
    };

    client.save(ent, function(err, apiResponse) {
      if (err) {
        error("addSnapshot error: " + err);
        return callback(err);
      }
      callback(null, apiResponse);
    });
  },

  getSnapshot: function (query, revMax, callback) {
    var self = this;
    var client = self.client;

    if (!query.aggregateId) {
      var errMsg = 'aggregateId not defined!';
      error(errMsg);
      if (callback) callback(new Error(errMsg));
      return;
    }

    var q = client
      .createQuery(self.options.snapshotsTableName)
      .filter("aggregateId", "=", query.aggregateId)
      .limit(1);

    if (process.env.DATASTORE_TEST) {
      q.hasAncestor(client.key([self.AGGREGATE_KIND, "default"]));
    }

    if (query && query.aggregate)
      q.filter("aggregate", "=", query.aggregate);

    if (query && query.context)
      q.filter("context", "=", query.context);

    if (revMax != -1) {
      q.filter("revision", "<=", revMax);
      q.order("revision");
    }
    q.order("commitStamp", { descending: true })

    client.runQuery(q, function(err, entities, info) {
      if (err) {
        error("getSnapshot error: " + err);
        return callback(err);
      }

      entities = entities.map(MapStoredSnapshotToSnapshot);

      if ( entities.length < 1 ) {
        return callback(null, null);
      }

      callback(null, entities[0]);
    });
  },

  cleanSnapshots: function (query, callback) {
    var self = this;
    var client = self.client;

    self.scanSnapshots(query, function(error, keys) {
      if (error) {
        debug(error);
        if (callback) callback(error);
        return;
      }

      var keysToDelete = keys
        .slice(0, -1 * self.options.maxSnapshotsCount);

      if (keysToDelete.length === 0) {
        return callback(null, 0);
      }

      client.delete(keysToDelete, function(err, apiResponse) {
        if (err) {
          error("Clear (batchWrite) error): " + JSON.stringify(batch, null, 2));
          return callback(err);
        }

        callback(null, keysToDelete.length);
      });
    });
  },

  scanSnapshots: function (query, callback) {
    var self = this;
    var client = self.client;
    var nextCursor = null;
    var results = [];

    if (!query.aggregateId) {
      var errMsg = 'aggregateId not defined!';
      debug(errMsg);
      if (callback) callback(new Error(errMsg));
      return;
    }

    async.doWhilst(function (end) {
      var q = client
        .createQuery(self.options.snapshotsTableName)
        .select('__key__')
        .filter("aggregateId", "=", query.aggregateId);
  
      if (process.env.DATASTORE_TEST) {
        q.hasAncestor(client.key([self.AGGREGATE_KIND, "default"]));
      }

      if (query && query.aggregate)
        q.filter("aggregate", "=", query.aggregate);
  
      if (query && query.context)
        q.filter("context", "=", query.context);

      q.order("commitStamp", { descending: true });

      if (nextCursor)
        q.start(nextCursor);

      client.runQuery(q, function(err, entities, info) {
        if (err) {
          error("scanSnapshot query error: " + err);
          return end(err);
        }
    
        if (info.moreResults !== DS.NO_MORE_RESULTS) {
          nextCursor = info.endCursor;
        }
        results = results.concat(entities);
        end(null);
      });
    }, function () {
      return nextCursor !== null;
    }, function (err) {
      if (err) {
        error("scanSnapshot error: " + err);
        return callback(err);
      }

      results = results.map(function(entity) {
        return entity[client.KEY];
      });

      callback(null, results);
    });
  }

});

var clearKind = function (kind, opts, client, cleared) {
  debug("Clearing " + kind + " events table")
  
  var nextPageCursor = null;

  var read = function (callback) {
    var q = client
      .createQuery(kind)
      .select('__key__')
      .limit(100);

    if (nextPageCursor) {
      q.start(nextPageCursor);
    }

    client.runQuery(q, function(err, entities, info) {
      if (err) {
        error("clearKind " + kind + " read error: " + err);
        return callback(err);
      }
  
      var keys = entities.map(function(entity) {
        return entity[DS.KEY];
      });
  
      if (info.moreResults !== DS.NO_MORE_RESULTS) {
        nextPageCursor = info.endCursor;
      }

      callback(null, keys);
    });
  };

  var del = function (batch, callback) {
    if (batch && batch.length) {
      debug("Clear: calling batchWrites: " + JSON.stringify(batch, null, 2));
      client.delete(batch, function(err, apiResponse) {
        if (err) {
          error("Clear (batchWrite) error): " + JSON.stringify(batch, null, 2));
          return callback(err);
        }

        callback(null, apiResponse);
      });
    } else {
      callback(null);
    }
  };

  async.doWhilst(function (next) {
    async.seq(read, del)(function (err, result) {
      if (err) next(err);
      else next(null, result);
    });
  }, function() {
    return nextPageCursor !== null;
  }, function (err, r) {
    if (err) {
      error("Error while clearing " + kind + " kind: " + JSON.stringify(err, null, 2));
      return cleared(err);
    }
    debug(kind + " kind successfully cleared.");
    return cleared();
  });
};

var StoredEvent = function (event) {
  debug("Converting event to StoredEvent: " + JSON.stringify(event, null, 2));
  this.aggregateId = event.aggregateId;
  this.rowKey = (event.context || "") + ":" + (event.aggregate || "") + ":" + _.padStart(event.streamRevision, 16, '0');
  this.id = event.id;
  this.context = event.context || null;
  this.aggregate = event.aggregate || null;
  this.streamRevision = event.streamRevision;
  this.commitId = event.commitId;
  this.commitSequence = event.commitSequence;
  this.commitStamp = new Date(event.commitStamp);
  this.header = event.header || null;
  this.dispatched = event.dispatched || false;
  this.payload = event.payload;
  debug("Event converted to StoredEvent: " + JSON.stringify(this, null, 2));
};

function MapStoredEventToEvent(storedEvent) {
  var event = {
    aggregateId: storedEvent.aggregateId,
    id: storedEvent.id,
    context: storedEvent.context,
    aggregate: storedEvent.aggregate,
    streamRevision: storedEvent.streamRevision,
    commitId: storedEvent.commitId,
    commitSequence: storedEvent.commitSequence,
    commitStamp: storedEvent.commitStamp || null,
    header: storedEvent.header || null,
    dispatched: storedEvent.dispatched,
    payload: storedEvent.payload || null
  };

  return event;
}

var StoredSnapshot = function (snapshot) {
  this.id = snapshot.id;
  this.aggregateId = snapshot.aggregateId;
  this.aggregate = snapshot.aggregate || null;
  this.context = snapshot.context || null;
  this.revision = snapshot.revision;
  this.version = snapshot.version;
  this.commitStamp = new Date(snapshot.commitStamp).getTime();
  this.data = snapshot.data;
};

function MapStoredSnapshotToSnapshot(storedSnapshot) {
  var snapshot = {
    id: storedSnapshot.id,
    aggregateId: storedSnapshot.aggregateId,
    aggregate: storedSnapshot.aggregate || undefined,
    context: storedSnapshot.context || undefined,
    revision: storedSnapshot.revision,
    version: storedSnapshot.version,
    commitStamp: new Date(storedSnapshot.commitStamp) || null,
    data: storedSnapshot.data || null
  };

  return snapshot;
}

module.exports = Datastore;