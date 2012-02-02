//     lib/eventDispatcherProcess.js v0.3.0
//     (c) 2012 Kaba AG, MIC AWM; under MIT License
//     (by) Jan Muehlemann (jamuhl)
//        , Adriano Raiano (adrai)

// This is the event dispatcher process that will be called as separate process...
// __Example:__
//
//      var self = this;
//      this.dispatcher = cp.fork(__dirname + '/eventDispatcherProcess.js');
//      this.dispatcher.send({ action: 'use', payload: { options: this.options, storageModulePath: this.storage.filename } });
//      this.dispatcher.on('message', function(m) {
//          if (m.action === 'publish') {
//              self.publisher.publish(JSON.deserialize(m.payload));
//          }
//      });
//      this.dispatcher.send({ action: 'start' });
//
//      // create a handle function on fork
//      this.dispatcher.addUndispatchedEvents = function(evts) {
//          self.dispatcher.send({ action: 'addUndispatchedEvents', payload: JSON.stringify(evts) });
//      };

var EventDispatcher = require('./eventDispatcher')
  , util =  require('./util')
  , options = null
  , logger = null
  , publisher = null
  , storageModulePath = null
  , eventDispatcher = null;

// when receiving a message from parent process...
process.on('message', function(m) {
    if (m.action === 'use') {

        if (m.payload.options) {
            options = m.payload.options;
        }
        if (m.payload.storageModulePath) {
            storageModulePath = m.payload.storageModulePath;
        }

    } else if (m.action === 'start') {

        var publisher = {
            publish: function(msg) {
                process.send({ action: 'publish', payload: JSON.stringify(msg) });
            }
        };

        // prepare event dispatcher
        eventDispatcher = new EventDispatcher(options);
        eventDispatcher.usePublisher(publisher);

        require(storageModulePath).createStorage(
            options.repository,
            function(err, storage) {
                if (err) {
                    console.log(err);
                } else {
                    eventDispatcher.useStorage(storage)
                                   .start();
                    process.send({ action: 'start' });
                }
            }
        );
                       
    } else if (m.action === 'addUndispatchedEvents') {
        eventDispatcher.addUndispatchedEvents(JSON.deserialize(m.payload));
    }
});