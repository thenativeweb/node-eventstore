var mongo = require('mongodb')
  , ObjectID = mongo.BSONPure.ObjectID
  , async = require('async');

var root = this;

var MongoDbStorage;

if (typeof exports !== 'undefined') {
    MongoDbStorage = exports;
} else {
    MongoDbStorage = root.MongoDbStorage = {};
}

MongoDbStorage.VERSION = '0.0.1';

// Create new instance of storage.
MongoDbStorage.createStorage = function(options, callback) {
    new Storage(options, callback);
};

/*******************************************
* Storage 
*/
var Storage = function(options, callback) {
    callback = !callback ? options : callback;
    options = callback ? options : {};
 
    // Set options and load defaults if needed.
    this.options = options || {};
    this.options.host = this.options.host || 'localhost';
    this.options.port = this.options.port || mongo.Connection.DEFAULT_PORT;
    
    this.logger = this.options.logger || null;
    this.collectionName = this.options.collectionName || 'events';
    this.collectionNameSnapshots = this.collectionName+'_snapshots';
    this.dbName = this.options.dbName || 'eventstore';
    
    this.store = new mongo.Db(this.dbName
                             , new mongo.Server(this.options.host, this.options.port, {}), {});
                             
    this.store.addListener("error", function(error) {
		if (this.logger) {
			this.logger.error("Error connecting to mongo -- perhaps it isn't running?\n"+JSON.stringify(error));
		}
    }.bind(this));
    
    this.client = undefined;
    this.store.open(function(err, client) {
		if (err) {
			if (this.logger) {
				this.logger.error(err);
			}
		}
        this.client = client;
        callback(this);
    }.bind(this));
};

// This functions clears all events. It's used for testing.
Storage.prototype._clear = function(clb) {
    var client = this.client;
    var collectionName = this.collectionName;
    var collectionNameSnapshots = this.collectionNameSnapshots;
    var logger = this.logger;
    async.waterfall([
        function(callback){
            client.collection(collectionNameSnapshots, function(err, collection) {
                if (err) {
                    if (logger) {
    					logger.error(err);
					}
                }
                callback(null, collection);
            });
        },
        function(collection, callback){
            collection.remove(function(err, doc) {
                if (err) {
                    if (logger) {
						logger.error(err);
					}
                }
                else {
                    callback(null);
                }
            });
        },
        function(callback){
            client.collection(collectionName, function(err, collection) {
                if (err) {
                    if (logger) {
						logger.error(err);
					}
                }
                callback(null, collection);
            });
        },
        function(collection, callback){
            collection.remove(function(err, doc) {
                if (err) {
                    if (logger) {
						logger.error(err);
					}
                }
                else {
                    clb();
                }
            });
        }
    ]);
};

// This function saves an event in the storage.
Storage.prototype.addEvent = function(event, clb) {
    var client = this.client;
    var collectionName = this.collectionName;
    var logger = this.logger;
    async.waterfall([
        function(callback){
            client.collection(collectionName, function(err, collection) {
                if (err) {
					if (logger) {
						logger.error(err);
					}
                }
                event._id = event.commitId;
                callback(null, collection);
            });
        },
        function(collection, callback){
            collection.insert(event, function(err, doc) {
                if (err) {
                    if (logger) {
						logger.error(err);
					}
                }
                else {
                    clb();
                }
            });
        }
    ]);
};

// This function saves a snapshot in the storage.
Storage.prototype.addSnapshot = function(snapshot, clb) {
    var client = this.client;
    var collectionNameSnapshots = this.collectionNameSnapshots;
    var logger = this.logger;
    async.waterfall([
        function(callback){
            client.collection(collectionNameSnapshots, function(err, collection) {
                if (err) {
    				if (logger) {
						logger.error(err);
					}
                }
                snapshot._id = snapshot.snapshotId;
                callback(null, collection);
            });
        },
        function(collection, callback){
            collection.insert(snapshot, function(err, doc) {
                if (err) {
                    if (logger) {
						logger.error(err);
					}
                }
                else {
                    clb();
                }
            });
        }
    ]);
};

// This function returns the wished events.
Storage.prototype.getEvents = function(streamId, minRev, maxRev, callback) {
	var logger = this.logger;
    this.client.collection(this.collectionName, function(err, collection) {
		if (err) {
			if (logger) {
				logger.error(err);
			}
		}
		else {
			var options = {'$gte':minRev, '$lt':maxRev};
			if (maxRev == -1) {
				options = {'$gte':minRev};
			}
			
			var findStatement = {
									'streamId' : streamId,
									'streamRevision': options
								};
			collection.find(findStatement, {sort:[['streamRevision','asc']]}, function(err, cursor) {
				cursor.toArray(function(err, events) {
					if (err) {
						if (logger) {
							logger.error(err);
						}
					}
					else {
						callback(events);
					}
				});
			});
		}
    });
};

// This function returns all events.
Storage.prototype.getAllEvents = function(callback) {
    var logger = this.logger;
    this.client.collection(this.collectionName, function(err, collection) {
		if (err) {
			if (logger) {
				logger.error(err);
			}
		}
		else {
			collection.find({}, {sort:[['commitStamp','asc']]}, function(err, cursor) {
				cursor.toArray(function(err, events) {
					if (err) {
						if (logger) {
							logger.error(err);
						}
					}
					else {
						callback(events);
					}
				});
			});
		}
    });
};

// This function returns the wished snapshot.
// If revMax is -1 returns the latest snapshot.
Storage.prototype.getSnapshot = function(streamId, maxRev, callback) {
    var logger = this.logger;
    this.client.collection(this.collectionNameSnapshots, function(err, collection) {
		if (err) {
			if (logger) {
				logger.error(err);
			}
		}
		else {			
			var findStatement = {'streamId' : streamId};
            if (maxRev > -1) {
                findStatement = {
                                    'streamId' : streamId,
									'snapshotRevision': {'$lte':maxRev}
								};
			}
			collection.find(findStatement, {sort:[['snapshotRevision','asc']]}, function(err, cursor) {
				cursor.toArray(function(err, snapshots) {
					if (err) {
						if (logger) {
							logger.error(err);
						}
					}
					else {
                        if (snapshots.length > 0) {
						    callback(snapshots[0]);
                        }
                        else {
                            callback(null);
                        }
					}
				});
			});
		}
    });
};

// This function returns all undispatched events.
Storage.prototype.getUndispatchedEvents = function(callback) {
	var logger = this.logger;
    this.client.collection(this.collectionName, function(err, collection) {
		if (err) {
			if (logger) {
				logger.error(err);
			}
		}
		else {
			collection.find({'dispatched' : false}, {sort:[['streamRevision','asc']]}, function(err, cursor) {
				if (err) {
					if (logger) {
						logger.error(err);
					}
				}
				else {
					cursor.toArray(function(err, events) {
                                        
						if (err) {
							if (logger) {
								logger.error(err);
							}
						}
						else {
							if (!events) {
								callback(null, []);
							} else {
								callback(null, events);
							}
						}
					});
				}
			});
		}
    });
};

// This function set an event to dispatched.
Storage.prototype.setEventToDispatched = function(evt) {
	var logger = this.logger;
    this.client.collection(this.collectionName, function(err, collection) {
		if (err) {
			if (logger) {
				logger.error(err);
			}
		}
		else {
			var updateCommand = { '$set' : {'dispatched': true} };
			collection.update({'_id' : evt.commitId}, updateCommand, function(err, doc) {
				if (err) {
					if (logger) {
						logger.error(err);
					}
				}
			});
		}
    });
};

// This function returns a new id.
Storage.prototype.getId = function(callback) {
    if (typeof callback === 'function') {
        callback(new ObjectID().toString());
    }
};
