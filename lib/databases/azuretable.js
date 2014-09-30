'use strict';


var util = require('util'),
  Store = require('../base'),
  _ = require('lodash'),
  async = require('async'),
  azure = require('azure-storage'),
  uuid = require('node-uuid'),
  eg = azure.TableUtilities.entityGenerator,
  debug = require('debug')('eventstore:store:redis');

function AzureTable(options) {

  options = options || {};

  var azureConf = {
    storageAccount: 'nodeeventstore',
    storageAccessKey: 'aXJaod96t980AbNwG9Vh6T3ewPQnvMWAn289Wft9RTv+heXQBxLsY3Z4w66CI7NN12+1HUnHM8S3sUbcI5zctg==',
    storageTableHost: 'https://nodeeventstore.table.core.windows.net/',
  }

  this.options = _.defaults(options, azureConf);

  var defaults = {
    eventsTableName: 'events',
    snapshotsTableName: 'snapshots',
    timeout: 1000
  };

  this.options = _.defaults(this.options, defaults);

  var defaultOpt = {
    auto_reconnect: true,
    ssl: false
  };

  this.options.options = this.options.options || {};

  this.options.options = _.defaults(this.options.options, defaultOpt);

}

util.inherits(AzureTable, Store);

_.extend(AzureTable.prototype, {

  connect: function (callback) {
    var self = this;
    var retryOperations = new azure.ExponentialRetryPolicyFilter();
    var server = azure.createTableService(this.options.storageAccount, this.options.storageAccessKey, this.options.storageTableHost).withFilter(retryOperations);

    self.client = server;
    self.isConnected = true;

    var createEventsTable = function (callback) {
      self.client.createTableIfNotExists(self.options.eventsTableName, callback);
    };

    var createSnapshotTable = function (callback) {
      self.client.createTableIfNotExists(self.options.snapshotsTableName, callback);
    };

    async.parallel([createEventsTable,
      createSnapshotTable
    ], function (err) {
      if (err) {
        if (callback) callback(err);
      } else {
        self.emit('connect');
        if (callback) callback(null, self);
      }
    });


  },

  disconnect: function (callback) {
    this.emit('disconnect');
    if (callback) callback(null);
  },

  clear: function (done) {
    var self = this;
    var query = new azure.TableQuery();

    var clearEventsTable = function (callback) {
      self.client.queryEntities(self.options.eventsTableName, query, null, function (err, entities) {
          if (!err) {
            async.each(entities.entries, function (entity, callback) {
                self.client.deleteEntity(self.options.eventsTableName, entity, function (error, response) {
                  callback(error);
                });
              },
              function (error) {
                callback(error);
              });
          }
        }
      );
    };

    var clearSnapshotsTable = function (callback) {
      self.client.queryEntities(self.options.snapshotsTableName, query, null, function (err, entities) {
          if (!err) {
            async.each(entities.entries, function (entity, callback) {
                self.client.deleteEntity(self.options.snapshotsTableName, entity, function (error, response) {
                  callback(error);
                });
              },
              function (error) {
                callback(error);
              });
          }
        }
      );
    };

    async.parallel([clearEventsTable,
      clearSnapshotsTable
    ], function (err) {
      if (err) {
        if (done) done(err);
      } else {

        if (done) done(null, self);
      }
    });
  },

  getNewId: function (callback) {
    callback(null, uuid.v4());
  },

  addEvents: function (events, callback) {

    var self = this;
    var batch = new azure.TableBatch();

    var noAggId = _.every(events, function (event) {
      return !event.aggregateId
    })

    if (noAggId) {
      var errMsg = 'aggregateId not defined!';
      debug(errMsg);
      if (callback) callback(new Error(errMsg));
      return;
    }

    async.each(events, function (event, callback) {
        var item = new StoredEvent(event);
        batch.insertEntity(item);
        callback(null);
      },
      function (err) {
        if (err) {
          if (callback) callback(err)
        } else {
          self.client.executeBatch(self.options.eventsTableName, batch, function (err, performBatchOperationResponses, batchResponse) {
            if (err) {
              debug(err);
              if (callback) callback(err)
            }

            if (callback)  callback(null);
          });
        }
      });
  },

  getEvents: function (query, skip, limit, callback) {
    var self = this;
    var tableQuery = new azure.TableQuery();
    var continuationToken = null;
    var entities = [];

    var pageSize = skip + limit;

    tableQuery = _(query)
      .pick(['aggregate', 'context', 'aggregateId'])
      .reduce(function (result, val, key) {
        key = key === 'aggregateId' ? 'PartitionKey' : key;
        if (result._where.length === 0) return tableQuery.where(key + ' eq ?', val);
        return result.and(key + ' eq ?', val)
      }, tableQuery);


    if (limit !== -1) {
      tableQuery = tableQuery.top(pageSize);
    }

    async.doWhilst(function (end) {
      // retrieve entities
      self.client.queryEntities(self.options.eventsTableName, tableQuery, continuationToken, function (err, results) {
          if (err) {
            return end(err);
          }

          else {
            continuationToken = results.continuationToken;
            entities = entities.concat(results.entries);
            end(null);
          }
        }
      );
    }, function () {
      // test if we need to load more
      return entities.length < pageSize ? continuationToken !== null : false;

    }, function (err) {
      // return results
      if (err) {
        return callback(err);
      }

      entities = entities.map(MapStoredEventToEvent);

      entities = _.sortBy(entities, ['commitStamp', 'streamRevision', 'commitSequence']);

      if (limit === -1) {
        entities = entities.slice(skip);
      }
      else {
        entities = entities.slice(skip, skip + limit);
      }

      callback(null, entities);
    });
  },

  getEventsByRevision: function (query, revMin, revMax, callback) {

    var self = this;
    var tableQuery = new azure.TableQuery();
    var continuationToken = null;
    var entities = [];

    if (!query.aggregateId) {
      var errMsg = 'aggregateId not defined!';
      debug(errMsg);
      if (callback) callback(new Error(errMsg));
      return;
    }

    tableQuery = _(query)
      .pick(['aggregate', 'context', 'aggregateId'])
      .reduce(function (result, val, key) {
        key = key === 'aggregateId' ? 'PartitionKey' : key;
        if (result._where.length === 0) return tableQuery.where(key + ' eq ?', val);
        return result.and(key + ' eq ?', val)
      }, tableQuery);


    tableQuery = tableQuery.and('streamRevision >= ?', revMin);
    if (revMax != -1) tableQuery = tableQuery.and('streamRevision < ?', revMax);

    async.doWhilst(function (end) {
      // retrieve entities
      self.client.queryEntities(self.options.eventsTableName, tableQuery, continuationToken, function (err, results) {
          if (err) {
            return end(err);
          }

          else {
            continuationToken = results.continuationToken;
            entities = entities.concat(results.entries);
            end(null);
          }
        }
      );
    }, function () {
      // test if we need to load more
      return continuationToken !== null;

    }, function (err) {
      // return results
      if (err) {
        return callback(err);
      }

      entities = entities.map(MapStoredEventToEvent);

      entities = _.sortBy(entities, ['commitStamp', 'streamRevision', 'commitSequence']);

      callback(null, entities);
    });
  },

  getUndispatchedEvents: function (callback) {

    var self = this;
    var tableQuery = new azure.TableQuery().where('dispatched == false');
    var continuationToken = null;
    var entities = [];

    async.doWhilst(function (end) {
      // retrieve entities
      self.client.queryEntities(self.options.eventsTableName, tableQuery, continuationToken, function (err, results) {
          if (err) {
            return end(err);
          }

          else {
            continuationToken = results.continuationToken;
            entities = entities.concat(results.entries);
            end(null);
          }
        }
      );
    }, function () {
      // test if we need to load more
      return continuationToken !== null;

    }, function (err) {
      // return results
      if (err) {
        return callback(err);
      }

      entities = entities.map(MapStoredEventToEvent);

      entities = _.sortBy(entities, ['commitStamp', 'streamRevision', 'commitSequence']);

      callback(null, entities);
    });
  },

  setEventToDispatched: function (id, callback) {
    var self = this;
    var tableQuery = new azure.TableQuery().where('id eq ?', id);

    self.client.queryEntities(self.options.eventsTableName, tableQuery, null, function (err, results) {
      var event = results.entries[0];

      event.dispatched = true;

      self.client.updateEntity(self.options.eventsTableName, event, {checkEtag: true}, callback);
    });
  },

  addSnapshot: function (snap, callback) {
    var self = this;

    if (!snap.aggregateId) {
      var errMsg = 'aggregateId not defined!';
      debug(errMsg);
      if (callback) callback(new Error(errMsg));
      return;
    }

    self.client.insertEntity(self.options.snapshotsTableName, new StoredSnapshot(snap), callback);
  },

  getSnapshot: function (query, revMax, callback) {

    var self = this;
    var tableQuery = new azure.TableQuery();
    var continuationToken = null;
    var entities = [];

    if (!query.aggregateId) {
      var errMsg = 'aggregateId not defined!';
      debug(errMsg);
      if (callback) callback(new Error(errMsg));
      return;
    }

    tableQuery = _(query)
      .pick(['aggregate', 'context', 'aggregateId'])
      .reduce(function (result, val, key) {
        key = key === 'aggregateId' ? 'PartitionKey' : key;
        if (result._where.length === 0) return tableQuery.where(key + ' eq ?', val);
        return result.and(key + ' eq ?', val)
      }, tableQuery);


    if (revMax != -1) tableQuery = tableQuery.and('revision le ?', revMax);

    async.doWhilst(function (end) {
      // retrieve entities
      self.client.queryEntities(self.options.snapshotsTableName, tableQuery, continuationToken, function (err, results) {
          if (err) {
            return end(err);
          }

          else {
            continuationToken = results.continuationToken;
            entities = entities.concat(results.entries);
            end(null);
          }
        }
      );
    }, function () {
      // test if we need to load more
      return continuationToken !== null;

    }, function (err) {
      // return results
      if (err) {
        return callback(err);
      }

      entities = entities.map(MapStoredSnapshotToSnapshot);

      entities = _.sortBy(entities, ['revision', 'version', 'commitStamp']).reverse();

      callback(null, entities[0]);
    });

  }

});

var StoredEvent = function (event) {
  this.PartitionKey = eg.Entity(event.aggregateId);
  this.RowKey = eg.Entity(event.commitId + event.commitSequence);
  this.aggregateId = eg.Entity(event.aggregateId);
  this.id = eg.Entity(event.id);
  this.context = eg.Entity(event.context);
  this.aggregate = eg.Entity(event.aggregate);
  this.streamRevision = eg.Entity(event.streamRevision);
  this.commitId = eg.Entity(event.commitId);
  this.commitSequence = eg.Entity(event.commitSequence);
  this.commitStamp = eg.Entity(event.commitStamp);
  this.header = eg.Entity(event.header);
  this.dispatched = eg.Entity(event.dispatched || false);
  this.payload = eg.Entity(JSON.stringify(event.payload));
};

function MapStoredEventToEvent(storedEvent) {
  var event = {
    aggregateId: getEntityProperty(storedEvent.PartitionKey),
    id: getEntityProperty(storedEvent.id),
    context: getEntityProperty(storedEvent.context),
    aggregate: getEntityProperty(storedEvent.aggregate),
    streamRevision: getEntityProperty(storedEvent.streamRevision),
    commitId: getEntityProperty(storedEvent.commitId),
    commitSequence: getEntityProperty(storedEvent.commitSequence),
    commitStamp: getEntityProperty(storedEvent.commitStamp) || null,
    header: getEntityProperty(storedEvent.header) || null,
    dispatched: getEntityProperty(storedEvent.dispatched),
    payload: JSON.parse(getEntityProperty(storedEvent.payload)) || null
  }

  return event;
}

var StoredSnapshot = function (snapshot) {
  this.PartitionKey = eg.Entity(snapshot.aggregateId);
  this.RowKey = eg.Entity(snapshot.id);
  this.id = eg.Entity(snapshot.id);
  this.aggregateId = eg.Entity(snapshot.aggregateId);
  this.aggregate = eg.Entity(snapshot.aggregate);
  this.context = eg.Entity(snapshot.context);
  this.revision = eg.Entity(snapshot.revision);
  this.version = eg.Entity(snapshot.version);
  this.commitStamp = eg.Entity(snapshot.commitStamp);
  this.data = eg.Entity(JSON.stringify(snapshot.data));
};

function MapStoredSnapshotToSnapshot(storedSnapshot) {
  var snapshot = {
    id: getEntityProperty(storedSnapshot.id),
    aggregateId: getEntityProperty(storedSnapshot.PartitionKey),
    aggregate: getEntityProperty(storedSnapshot.aggregate),
    context: getEntityProperty(storedSnapshot.context),
    revision: getEntityProperty(storedSnapshot.revision),
    version: getEntityProperty(storedSnapshot.version),
    commitStamp: getEntityProperty(storedSnapshot.commitStamp),
    data: JSON.parse(getEntityProperty(storedSnapshot.data)) || null
  }

  return snapshot;
}

var getEntityProperty = function (propertyField) {
  if (propertyField != null)
    return propertyField['_'];
  else
    return null;
};

module.exports = AzureTable;
