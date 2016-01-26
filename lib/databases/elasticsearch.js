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
    transactionsTypeName: 'transactions',
    log: 'trace'
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
    var options = this.options;
    this.client.indices.delete({index: options.indexName}, function (err) {
      if (callback) callback(err);
    });
  },

  getNewId: function(callback) {
    callback(null, uuid.v4());
  },

//   addEvents: function (events, callback) {
//     if (events.length === 0) {
//       if (callback) { callback(null); }
//       return;
//     }

//     var commitId = events[0].commitId;

//     var noAggregateId = false,
//       invalidCommitId = false;

//     _.forEach(events, function (evt) {
//       if (!evt.aggregateId) {
//         noAggregateId = true;
//       }

//       if (!evt.commitId || evt.commitId !== commitId) {
//         invalidCommitId = true;
//       }

//       evt._id = evt.id;
//       evt.dispatched = false;
//     });

//     if (noAggregateId) {
//       var errMsg = 'aggregateId not defined!';
//       debug(errMsg);
//       if (callback) callback(new Error(errMsg));
//       return;
//     }

//     if (invalidCommitId) {
//       var errMsg = 'commitId not defined or different!';
//       debug(errMsg);
//       if (callback) callback(new Error(errMsg));
//       return;
//     }

//     var self = this;

//     if (events.length === 1) {
//       return this.events.insert(events, callback);
//     }

//     var tx = {
//       _id: commitId,
//       events: events,
//       aggregateId: events[0].aggregateId,
//       aggregate: events[0].aggregate,
//       context: events[0].context
//     };

//     this.transactions.insert(tx, function (err) {
//       if (err) {
//         debug(err);
//         if (callback) callback(err);
//         return;
//       }

//       self.events.insert(events, function (err) {
//         if (err) {
//           debug(err);
//           if (callback) callback(err);
//           return;
//         }

//         self.removeTransactions(events[events.length - 1]);

//         if (callback) { callback(null); }
//       });
//     });
//   },

//   getEvents: function (query, skip, limit, callback) {
//     var findStatement = {};

//     if (query.aggregate) {
//       findStatement.aggregate = query.aggregate;
//     }

//     if (query.context) {
//       findStatement.context = query.context;
//     }

//     if (query.aggregateId) {
//       findStatement.aggregateId = query.aggregateId;
//     }

//     if (limit === -1) {
//       return this.events.find(findStatement, { sort: [['commitStamp', 'asc'], ['streamRevision', 'asc'], ['commitSequence', 'asc']] }).skip(skip).toArray(callback);
//     }

//     this.events.find(findStatement, { sort: [['commitStamp', 'asc'], ['streamRevision', 'asc'], ['commitSequence', 'asc']] }).skip(skip).limit(limit).toArray(callback);
//   },

//   getEventsSince: function (date, skip, limit, callback) {
//     var findStatement = { commitStamp: { '$gte': date } };

//     if (limit === -1) {
//       return this.events.find(findStatement, { sort: [['commitStamp', 'asc'], ['streamRevision', 'asc'], ['commitSequence', 'asc']] }).skip(skip).toArray(callback);
//     }

//     this.events.find(findStatement, { sort: [['commitStamp', 'asc'], ['streamRevision', 'asc'], ['commitSequence', 'asc']] }).skip(skip).limit(limit).toArray(callback);
//   },

//   getEventsByRevision: function (query, revMin, revMax, callback) {
//     if (!query.aggregateId) {
//       var errMsg = 'aggregateId not defined!';
//       debug(errMsg);
//       if (callback) callback(new Error(errMsg));
//       return;
//     }

//     var streamRevOptions = { '$gte': revMin, '$lt': revMax };
//     if (revMax === -1) {
//       streamRevOptions = { '$gte': revMin };
//     }

//     var findStatement = {
//       aggregateId: query.aggregateId,
//       streamRevision: streamRevOptions
//     };

//     if (query.aggregate) {
//       findStatement.aggregate = query.aggregate;
//     }

//     if (query.context) {
//       findStatement.context = query.context;
//     }

//     var self = this;

//     this.events.find(findStatement, { sort: [['commitStamp', 'asc'], ['streamRevision', 'asc'], ['commitSequence', 'asc']] }).toArray(function (err, res) {
//       if (err) {
//         debug(err);
//         return callback(err);
//       }

//       if (!res || res.length === 0) {
//         return callback(null, []);
//       }

//       var lastEvt = res[res.length - 1];

//       var txOk = (revMax === -1 && !lastEvt.restInCommitStream) ||
//                  (revMax !== -1 && (lastEvt.streamRevision === revMax - 1 || !lastEvt.restInCommitStream));

//       if (txOk) {
//         // the following is usually unnecessary
//         self.removeTransactions(lastEvt);

//         return callback(null, res);
//       }

//       self.repairFailedTransaction(lastEvt, function (err) {
//         if (err) {
//           if (err.message.indexOf('missing tx entry') >= 0) {
//             return callback(null, res);
//           }
//           debug(err);
//           return callback(err);
//         }

//         self.getEventsByRevision(query, revMin, revMax, callback);
//       });
//     });
//   },

//   getUndispatchedEvents: function (query, callback) {
//     var findStatement = {
//       dispatched: false
//     };

//     if (query && query.aggregate) {
//       findStatement.aggregate = query.aggregate;
//     }

//     if (query && query.context) {
//       findStatement.context = query.context;
//     }

//     if (query && query.aggregateId) {
//       findStatement.aggregateId = query.aggregateId;
//     }

//     this.events.find(findStatement, { sort: [['commitStamp', 'asc'], ['streamRevision', 'asc'], ['commitSequence', 'asc']] }).toArray(callback);
//   },

//   setEventToDispatched: function (id, callback) {
//     var updateCommand = { '$unset' : { 'dispatched': null } };
//     this.events.update({'_id' : id}, updateCommand, callback);
//   },

//   addSnapshot: function(snap, callback) {
//     if (!snap.aggregateId) {
//       var errMsg = 'aggregateId not defined!';
//       debug(errMsg);
//       if (callback) callback(new Error(errMsg));
//       return;
//     }

//     snap._id = snap.id;
//     this.snapshots.insert(snap, callback);
//   },

//   getSnapshot: function (query, revMax, callback) {
//     if (!query.aggregateId) {
//       var errMsg = 'aggregateId not defined!';
//       debug(errMsg);
//       if (callback) callback(new Error(errMsg));
//       return;
//     }

//     var findStatement = {
//       aggregateId: query.aggregateId
//     };

//     if (query.aggregate) {
//       findStatement.aggregate = query.aggregate;
//     }

//     if (query.context) {
//       findStatement.context = query.context;
//     }

//     if (revMax > -1) {
//       findStatement.revision = { '$lte': revMax };
//     }

//     this.snapshots.findOne(findStatement, { sort: [['revision', 'desc'], ['version', 'desc'], ['commitStamp', 'desc']] }, callback);
//   },

//   removeTransactions: function (evt, callback) {
//     if (!evt.aggregateId) {
//       var errMsg = 'aggregateId not defined!';
//       debug(errMsg);
//       if (callback) callback(new Error(errMsg));
//       return;
//     }

//     var findStatement = { aggregateId: evt.aggregateId };

//     if (evt.aggregate) {
//       findStatement.aggregate = evt.aggregate;
//     }

//     if (evt.context) {
//       findStatement.context = evt.context;
//     }

//     // the following is usually unnecessary
//     this.transactions.remove(findStatement, function (err) {
//       if (err) {
//         debug(err);
//       }
//       if (callback) { callback(err); }
//     });
//   },

//   getPendingTransactions: function (callback) {
//     var self = this;
//     this.transactions.find({}).toArray(function (err, txs) {
//       if (err) {
//         debug(err);
//         return callback(err);
//       }

//       if (txs.length === 0) {
//         return callback(null, txs);
//       }

//       var goodTxs = [];

//       async.map(txs, function (tx, clb) {
//         var findStatement = { commitId: tx._id, aggregateId: tx.aggregateId };

//         if (tx.aggregate) {
//           findStatement.aggregate = tx.aggregate;
//         }

//         if (tx.context) {
//           findStatement.context = tx.context;
//         }

//         self.events.findOne(findStatement, function (err, evt) {
//           if (err) {
//             return clb(err);
//           }

//           if (evt) {
//             goodTxs.push(evt);
//           } else {
//             self.transactions.remove({ _id: tx._id }, function (err) {
//               if (err) {
//                 debug(err);
//               }
//             });
//           }

//           clb(null);
//         });
//       }, function (err) {
//         if (err) {
//           debug(err);
//           return callback(err);
//         }

//         callback(null, goodTxs);
//       })
//     });
//   },

//   getLastEvent: function (query, callback) {
//     if (!query.aggregateId) {
//       var errMsg = 'aggregateId not defined!';
//       debug(errMsg);
//       if (callback) callback(new Error(errMsg));
//       return;
//     }

//     var findStatement = { aggregateId: query.aggregateId };

//     if (query.aggregate) {
//       findStatement.aggregate = query.aggregate;
//     }

//     if (query.context) {
//       findStatement.context = query.context;
//     }

//     this.events.findOne(findStatement, { sort: [['commitStamp', 'desc'], ['streamRevision', 'desc'], ['commitSequence', 'desc']] }, callback);
//   },

//   repairFailedTransaction: function (lastEvt, callback) {
//     var self = this;

//     //var findStatement = {
//     //  aggregateId: lastEvt.aggregateId,
//     //  'events.streamRevision': lastEvt.streamRevision + 1
//     //};
//     //
//     //if (lastEvt.aggregate) {
//     //  findStatement.aggregate = lastEvt.aggregate;
//     //}
//     //
//     //if (lastEvt.context) {
//     //  findStatement.context = lastEvt.context;
//     //}

//     //this.transactions.findOne(findStatement, function (err, tx) {
//     this.transactions.findOne({ _id: lastEvt.commitId }, function (err, tx) {
//       if (err) {
//         debug(err);
//         return callback(err);
//       }

//       if (!tx) {
//         var err = new Error('missing tx entry for aggregate ' + lastEvt.aggregateId);
//         debug(err);
//         return callback(err);
//       }

//       var missingEvts = tx.events.slice(tx.events.length - lastEvt.restInCommitStream);

//       self.events.insert(missingEvts, function (err) {
//         if (err) {
//           debug(err);
//           return callback(err);
//         }

//         self.removeTransactions(lastEvt);

//         callback(null);
//       });
//     });
//   }

});

module.exports = Elastic;
