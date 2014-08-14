var expect = require('expect.js'),
  eventstore = require('../'),
  InMemory = require('../lib/databases/inmemory');

describe('eventstore', function () {
  
  it('it should be a function', function () {
    
    expect(eventstore).to.be.a('function');
    
  });

  describe('calling that function', function() {

    describe('without options', function () {

      it('it should return as expected', function () {

        var es = eventstore();
        expect(es).to.be.a('object');
        expect(es.useEventPublisher).to.be.a('function');
        expect(es.init).to.be.a('function');
        expect(es.getEvents).to.be.a('function');
        expect(es.getEventsByRevision).to.be.a('function');
        expect(es.getEventStream).to.be.a('function');
        expect(es.getFromSnapshot).to.be.a('function');
        expect(es.createSnapshot).to.be.a('function');
        expect(es.commit).to.be.a('function');
        expect(es.getUndispatchedEvents).to.be.a('function');
        expect(es.setEventToDispatched).to.be.a('function');
        expect(es.getNewId).to.be.a('function');
        
        expect(es.store).to.be.a(InMemory);

      });

    });
    
    describe('with options of a non existing db implementation', function () {

      it('it should throw an error', function () {

        expect(function () {
          eventstore({ type: 'strangeDb' });
        }).to.throwError();

      });

    });

    describe('with options of an own db implementation', function () {

      it('it should return with the an instance of that implementation', function () {

        var es = eventstore(InMemory);
        expect(es).to.be.a('object');
        expect(es.useEventPublisher).to.be.a('function');
        expect(es.init).to.be.a('function');
        expect(es.getEvents).to.be.a('function');
        expect(es.getEventsByRevision).to.be.a('function');
        expect(es.getEventStream).to.be.a('function');
        expect(es.getFromSnapshot).to.be.a('function');
        expect(es.createSnapshot).to.be.a('function');
        expect(es.commit).to.be.a('function');
        expect(es.getUndispatchedEvents).to.be.a('function');
        expect(es.setEventToDispatched).to.be.a('function');
        expect(es.getNewId).to.be.a('function');

        expect(es.store).to.be.a(InMemory);

      });

    });

    describe('with options containing a type property with the value of', function () {

      var types = ['inmemory'/*, 'mongodb', 'tingodb', 'redis', 'couchdb'*/];

      types.forEach(function (type) {

        describe('"' + type + '"', function () {

          var es = null;

          describe('calling init without callback', function () {

            afterEach(function (done) {
              es.store.disconnect(done);
            });

            beforeEach(function () {
              es = eventstore({ type: type });
            });

            it('it should emit connect', function (done) {

              es.init();
              es.once('connect', done);

            });

          });

          describe('calling init with callback', function () {

            afterEach(function (done) {
              es.store.disconnect(done);
            });
            
            beforeEach(function () {
              es = eventstore({ type: type });
            });

            it('it should callback successfully', function (done) {

              es.init(function(err) {
                expect(err).not.to.be.ok();
                done();
              });

            });

          });

          describe('having initialized (connected)', function () {

            describe('calling disconnect on store', function () {

              beforeEach(function (done) {
                es = eventstore({ type: type });
                es.init(done);
              });

              it('it should callback successfully', function (done) {

                es.store.disconnect(function (err) {
                  expect(err).not.to.be.ok();
                  done();
                });

              });

              it('it should emit disconnect', function (done) {

                es.once('disconnect', done);
                es.store.disconnect();

              });

            });

            describe('using the eventstore', function () {

              before(function (done) {
                es = eventstore({ type: type });
                es.init(done);
              });

              describe('calling getNewId', function () {

                it('it should callback with a new Id as string', function (done) {

                  es.getNewId(function (err, id) {
                    expect(err).not.to.be.ok();
                    expect(id).to.be.a('string');
                    done();
                  });

                });

              });
              
              // continue here!!!!!!!!!!!!!!!!!
              
              
              
              
              
              

            });

          });

        });

      });
      
    });
    
    describe('and defining a publisher function in a synchronous way', function () {

      it('it should initialize an eventDispatcher', function (done) {

        function publish (evt) {}
        var es = eventstore();
        es.useEventPublisher(publish);
        es.init(function (err) {
          expect(err).not.to.be.ok();
          expect(es.publisher).to.be.ok();
          done();
        });

      });
      
      describe('when committing a new event', function () {

        it('it should publish a new event', function (done) {

          function publish (evt) {
            expect(evt.one).to.eql('event');
            done();
          }

          var es = eventstore();
          es.useEventPublisher(publish);
          es.init(function (err) {
            expect(err).not.to.be.ok();

            es.getEventStream('streamId', function (err, stream) {
              stream.addEvent({ one: 'event' });

              stream.commit(function (err) {
                expect(err).not.to.be.ok();
              });
            });
          });
          
        });
        
      });
      
    });

    describe('and defining a publisher function in an asynchronous way', function () {

      it('it should initialize an eventDispatcher', function (done) {

        function publish (evt, callback) {callback();}
        var es = eventstore();
        es.useEventPublisher(publish);
        es.init(function (err) {
          expect(err).not.to.be.ok();
          expect(es.publisher).to.be.ok();
          done();
        });

      });

      describe('when committing a new event', function () {

        it('it should publish a new event', function (done) {

          function publish (evt, callback) {
            expect(evt.one).to.eql('event');
            callback();
            done();
          }

          var es = eventstore();
          es.useEventPublisher(publish);
          es.init(function (err) {
            expect(err).not.to.be.ok();

            es.getEventStream('streamId', function (err, stream) {
              stream.addEvent({ one: 'event' });

              stream.commit(function (err) {
                expect(err).not.to.be.ok();
              });
            });
          });

        });

      });

    });

    describe('and not defining a publisher function', function () {

      it('it should not initialize an eventDispatcher', function (done) {

        var es = eventstore();
        es.init(function (err) {
          expect(err).not.to.be.ok();
          expect(es.publisher).not.to.be.ok();
          done();
        });

      });

    });
    
  });

});