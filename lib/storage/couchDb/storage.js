var cradle = require('cradle');

var root = this;

var CouchDbStorage;

if (typeof exports !== 'undefined') {
    CouchDbStorage = exports;
} else {
    CouchDbStorage = root.CouchDbStorage = {};
}

CouchDbStorage.VERSION = '0.0.1';

// Create new instance of storage.
CouchDbStorage.createStorage = function(options, callback) {
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
    this.options.port = this.options.port || 5984;
    
    this.logger = this.options.logger || null;
    this.collectionName = this.options.collectionName || 'events';
    
    cradle.setup({host: this.options.host,
                  port: this.options.port,
                  options: {cache: true, raw: false}});
    
    this.store = new(cradle.Connection)();
    
    this.client = this.store.database(this.collectionName);
    this.client.exists(function(err, res) {
		if (err) {
			if (this.logger) {
				this.logger.error(JSON.stringify(err));
			}
		}
		else if (res === false) {
            this.client.create(function(err) {
                if (err) {
                    if (this.logger) {
						this.logger.error(JSON.stringify(err));
					}
                }
                else {
                    this.client.save('_design/'+this.collectionName, {
                        byStreamId: {
                            map: function (evt) {
                                if (evt.snapshotId == null) {
                                    emit(evt.streamId, evt);
                                }
                            }
                        },
                        allUndispatched: {
                            map: function (evt) {
                                if (evt.snapshotId == null && evt.dispatched === false) {
                                    emit(evt._id, evt);
                                }
                            }
                        },
                        snapshotsByStreamId: {
                            map: function (snapshot) {
                                if (snapshot.snapshotId != null) {
                                    emit(snapshot.streamId, snapshot);
                                }
                            }
                        },
                        all: {
                            map: function (evt) {
                                emit(evt._id, evt);
                            }
                        }
                    });
                }
            }.bind(this));
        }
        callback(this);
    }.bind(this));
};

// This functions clears all events. It's used for testing.
Storage.prototype._clear = function(clb) {
    var logger = this.logger;
    var client = this.client;
    client.all(function(err, doc) {
        if (err) {
            if (logger) {
				logger.error(JSON.stringify(err));
			}
            clb();
        }
        else {
            for(var i = 0; i < doc.length; i++) {
                /* Don't delete design documents. */
                if(doc[i].id.indexOf("_design") == -1) {
                    client.remove(doc[i].id, doc[i].value.rev, function(err, doc) {
                        if (err) {
                            if (logger) {
                                logger.error(JSON.stringify(err));
                            }
                        }
                    });
                }
                if (i === doc.length-1) {
                    clb();
                }
            }
        }
    });
};

// This function saves an event in the storage.
Storage.prototype.addEvent = function(event, clb) {
	var logger = this.logger;
    this.client.save(event.commitId, event, function(err, res) {
        if (err) {
			if (logger) {
				logger.error(JSON.stringify(err));
			}
        }
        else {
            clb();
        }
    });
};

// This function saves a snapshot in the storage.
Storage.prototype.addSnapshot = function(snapshot, clb) {
    var logger = this.logger;
    this.client.save(snapshot.snapshotId, snapshot, function(err, res) {
        if (err) {
    		if (logger) {
				logger.error(JSON.stringify(err));
			}
        }
        else {
            clb();
        }
    });
};

// This function returns the wished events.
Storage.prototype.getEvents = function(streamId, minRev, maxRev, callback) {
	var logger = this.logger;
    this.client.view(this.collectionName+'/byStreamId', { 'key': streamId }, 
        function(err, res) {
            if(!err) {
                var result = [];
            	for (var i in res) {
    				result.push(res[i].value);
    			}
                if (result.length === 0) {
                    callback([]);
                } else {
                    if (maxRev === -1) {
                        callback(result.slice(minRev));
                    }
                    else {
                        callback(result.slice(minRev, maxRev));
                    }
                }
            }
            else {
				if (logger) {
					logger.error(JSON.stringify(err));
				}
			}
        }.bind(this));
};

// This function returns all events.
Storage.prototype.getAllEvents = function(callback) {
    var logger = this.logger;
    this.client.view(this.collectionName+'/all', 
        function(err, res) {
            if(!err) {
                var result = [];
                for (var i in res) {
    				result.push(res[i].value);
    			}
                if (result.length === 0) {
                    callback([]);
                } else {
                    if (maxRev === -1) {
                        callback(result.slice(minRev));
                    }
                    else {
                        callback(result.slice(minRev, maxRev));
                    }
                }
            }
            else {
				if (logger) {
					logger.error(JSON.stringify(err));
				}
			}
        }.bind(this));
};

// This function returns the wished snapshot.
// If revMax is -1 returns the latest snapshot.
Storage.prototype.getSnapshot = function(streamId, maxRev, callback) {
    var logger = this.logger;
    this.client.view(this.collectionName+'/snapshotsByStreamId', { 'key': streamId }, 
        function(err, res) {
            if(!err) {
                var result = [];
        		for (var i in res) {
    				result.push(res[i].value);
    			}
                if (result.length === 0) {
                    callback(null);
                } else {
                    if (maxRev === -1) {
                        callback(result[result.length-1]);
                    }
                    else {
                        callback(result[maxRev]);
                    }
                }
            }
            else {
    			if (logger) {
					logger.error(JSON.stringify(err));
				}
			}
        }.bind(this));
};

// This function returns all undispatched events.
Storage.prototype.getUndispatchedEvents = function(callback) {
	var logger = this.logger;
    this.client.view(this.collectionName+'/allUndispatched', function(err, res) {
		if (err) {
			if (logger) {
				logger.error(JSON.stringify(err));
			}
		}
		else {
			var result = [];
			for (var i in res) {
				result.push(res[i].value);
			}
			callback(result);
		}
    });
};

// This function set an event to dispatched.
Storage.prototype.setEventToDispatched = function(evt) {
	var logger = this.logger;
    this.client.merge(evt.commitId, {'dispatched': true}, function(err, res) {
        if (err) {
            if (logger) {
				logger.error(JSON.stringify(err));
			}
        }
    });
};

// This function returns a new id.
Storage.prototype.getId = function(callback) {
	var logger = this.logger;
    this.store.uuids(function(err, uuids) {
        if (err) {
			if (logger) {
				logger.error(JSON.stringify(err));
			}
		}
		else {
            if (typeof callback === 'function') {
                callback(uuids.toString());
            }
        }
    });
};
