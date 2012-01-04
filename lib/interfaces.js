//     lib/interfaces.js v0.0.1
//     (c) 2012 Kaba AG, MIC AWM; under MIT License
//     (by) Jan Muehlemann (jamuhl)
//        , Adriano Raiano (adrai)

// Definition of modules used in eventstore. You can check an object against 
// the interface with the _checkInterface_ function.     
// __Example:__
//
//      var util =  require('./util');
//      util.checkInterface(myPublisher, interfaces.IPublisher);

var root = this
  , interfaces;

if (typeof exports !== 'undefined') {
    interfaces = exports;
} else {
    interfaces = root.eventStore.interfaces = {};
}

interfaces.VERSION = '0.0.1';

// ## storage interface
interfaces.IStorage = {

    // __addEvents:__ add events to the underlaying storage:
    // 
    // `storage.addEvents(events, callback)`
    //
    // - __events:__ array of events    
    // - __callback:__ `function(err){}`
    addEvents: function(){},
    
    // __getEvents:__ get events from the underlaying storage:
    // 
    // `storage.getEvents(streamId, minRev, maxRev, callback)`
    //
    // - __streamId:__ id for requested stream (equal to aggregateId)
    // - __minRev:__ revision startpoint
    // . __maxRev:__ revision endpoint (hint: -1 = to end)
    // - __callback:__ `function(err, events){}`
    getEvents: function(){},
    
    // __getUndispatchedEvents:__ get undispatched events from the underlaying storage:
    // 
    // `storage.getUndispatchedEvents(callback)`
    //
    // - __callback:__ `function(err, events){}`
    getUndispatchedEvents: function(){},
    
    // __setEventToDispatched:__ sets an undispatched event to dispatched:
    // 
    // `storage.setEventToDispatched(event)`
    //
    // - __event:__ undispatched event
    setEventToDispatched: function(){},
    
    // __getId:__ gets a unique id from storage:
    // 
    // `storage.getId(callback)`
    //
    // - __callback:__ `function(err, id){}`
    getId: function(){}
};

// ## publisher interface
interfaces.IPublisher = {

    // __publish:__ publishes an event:
    // 
    // `publisher.publish(event)`
    //
    // - __event:__ undispatched event
    publish: function(){}
};

// ## logger interface
interfaces.ILogger = {

    // __info:__ logs a message with level _info_:
    // 
    // `logger.info(message)`
    //
    // - __message:__ string to log
    info: function(){},
    
    // __warn:__ logs a message with level _warning_:
    // 
    // `logger.warn(message)`
    //
    // - __message:__ string to log
    warn: function(){},
    
    // __error:__ logs a message with level _error_:
    // 
    // `logger.error(message)`
    //
    // - __message:__ string to log
    error: function(){}
}