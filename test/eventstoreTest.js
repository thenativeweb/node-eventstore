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

    describe('and checking the api function by calling', function () {
      
      describe('getEvents', function () {

        var es = eventstore(),
          orgFunc = es.store.getEvents;
        
        before(function (done) {
          es.init(done);
        });
        
        after(function () {
          es.store.getEvents = orgFunc;
        });
        
        describe('with nice arguments', function () {

          it('it should pass them correctly', function (done) {

            var given = {
              query: { aggregateId: 'myAggId', aggregate: 'myAgg', context: 'myCont' },
              skip: 2,
              limit: 32,
              callback: function () {}
            };

            es.store.getEvents = function (query, skip, limit, callback) {
              expect(query).to.eql(given.query);
              expect(skip).to.eql(given.skip);
              expect(limit).to.eql(given.limit);
              expect(callback).to.be.a('function');

              done();
            };

            es.getEvents(given.query, given.skip, given.limit, given.callback);

          });
          
        });

        describe('with only the callback', function () {

          it('it should pass them correctly', function (done) {

            var given = {
              callback: function () {}
            };

            es.store.getEvents = function (query, skip, limit, callback) {
              expect(query).to.be.an('object');
              expect(query).to.empty();
              expect(skip).to.eql(0);
              expect(limit).to.eql(-1);
              expect(callback).to.be.a('function');

              done();
            };

            es.getEvents(given.callback);

          });

        });

        describe('with query and callback', function () {

          it('it should pass them correctly', function (done) {

            var given = {
              query: { aggregateId: 'myAggId', aggregate: 'myAgg', context: 'myCont' },
              callback: function () {}
            };

            es.store.getEvents = function (query, skip, limit, callback) {
              expect(query).to.eql(given.query);
              expect(skip).to.eql(0);
              expect(limit).to.eql(-1);
              expect(callback).to.be.a('function');

              done();
            };

            es.getEvents(given.query, given.callback);

          });

        });

        describe('with skip and callback', function () {

          it('it should pass them correctly', function (done) {

            var given = {
              skip: 3,
              callback: function () {}
            };

            es.store.getEvents = function (query, skip, limit, callback) {
              expect(query).to.be.an('object');
              expect(query).to.empty();
              expect(skip).to.eql(given.skip);
              expect(limit).to.eql(-1);
              expect(callback).to.be.a('function');

              done();
            };

            es.getEvents(given.skip, given.callback);

          });

        });

        describe('with query, skip and callback', function () {

          it('it should pass them correctly', function (done) {

            var given = {
              query: { aggregateId: 'myAggId', aggregate: 'myAgg', context: 'myCont' },
              skip: 3,
              callback: function () {}
            };

            es.store.getEvents = function (query, skip, limit, callback) {
              expect(query).to.eql(given.query);
              expect(skip).to.eql(given.skip);
              expect(limit).to.eql(-1);
              expect(callback).to.be.a('function');

              done();
            };

            es.getEvents(given.query, given.skip, given.callback);

          });

        });

        describe('with skip, limit and callback', function () {

          it('it should pass them correctly', function (done) {

            var given = {
              skip: 3,
              limit: 50,
              callback: function () {}
            };

            es.store.getEvents = function (query, skip, limit, callback) {
              expect(query).to.be.an('object');
              expect(query).to.empty();
              expect(skip).to.eql(given.skip);
              expect(limit).to.eql(given.limit);
              expect(callback).to.be.a('function');

              done();
            };

            es.getEvents(given.skip, given.limit, given.callback);

          });

        });

        describe('with query as string,  skip, limit and callback', function () {

          it('it should pass them correctly', function (done) {

            var given = {
              query: 'myAggId',
              skip: 3,
              limit: 50,
              callback: function () {}
            };

            es.store.getEvents = function (query, skip, limit, callback) {
              expect(query).to.be.an('object');
              expect(query.aggregateId).to.eql('myAggId');
              expect(skip).to.eql(given.skip);
              expect(limit).to.eql(given.limit);
              expect(callback).to.be.a('function');

              done();
            };

            es.getEvents(given.query, given.skip, given.limit, given.callback);

          });

        });
                
      });

      describe('getEventsByRevision', function () {

        var es = eventstore(),
          orgFunc = es.store.getEventsByRevision;

        before(function (done) {
          es.init(done);
        });

        after(function () {
          es.store.getEventsByRevision = orgFunc;
        });

        describe('with nice arguments', function () {

          it('it should pass them correctly', function (done) {

            var given = {
              query: { aggregateId: 'myAggId', aggregate: 'myAgg', context: 'myCont' },
              revMin: 2,
              revMax: 32,
              callback: function () {}
            };

            es.store.getEventsByRevision = function (query, revMin, revMax, callback) {
              expect(query).to.eql(given.query);
              expect(revMin).to.eql(given.revMin);
              expect(revMax).to.eql(given.revMax);
              expect(callback).to.be.a('function');

              done();
            };

            es.getEventsByRevision(given.query, given.revMin, given.revMax, given.callback);

          });

        });

        describe('with query and callback', function () {

          it('it should pass them correctly', function (done) {

            var given = {
              query: { aggregateId: 'myAggId', aggregate: 'myAgg', context: 'myCont' },
              callback: function () {}
            };

            es.store.getEventsByRevision = function (query, revMin, revMax, callback) {
              expect(query).to.eql(given.query);
              expect(revMin).to.eql(0);
              expect(revMax).to.eql(-1);
              expect(callback).to.be.a('function');

              done();
            };

            es.getEventsByRevision(given.query, given.callback);

          });

        });

        describe('with query, revMin and callback', function () {

          it('it should pass them correctly', function (done) {

            var given = {
              query: { aggregateId: 'myAggId', aggregate: 'myAgg', context: 'myCont' },
              revMin: 2,
              callback: function () {}
            };

            es.store.getEventsByRevision = function (query, revMin, revMax, callback) {
              expect(query).to.eql(given.query);
              expect(revMin).to.eql(given.revMin);
              expect(revMax).to.eql(-1);
              expect(callback).to.be.a('function');

              done();
            };

            es.getEventsByRevision(given.query, given.revMin, given.callback);

          });

        });
        
        describe('with query as string, revMin, revMax and callback', function () {

          it('it should pass them correctly', function (done) {

            var given = {
              query: 'myAggId',
              revMin: 2,
              revMax: 4,
              callback: function () {}
            };

            es.store.getEventsByRevision = function (query, revMin, revMax, callback) {
              expect(query).to.be.an('object');
              expect(query.aggregateId).to.eql('myAggId');
              expect(revMin).to.eql(given.revMin);
              expect(revMax).to.eql(given.revMax);
              expect(callback).to.be.a('function');

              done();
            };

            es.getEventsByRevision(given.query, given.revMin, given.revMax, given.callback);

          });

        });

        describe('with wrong query', function () {

          it('it should pass them correctly', function (done) {

            es.getEventsByRevision(123, 3, 100, function (err) {
              expect(err.message).to.match(/aggregateId/);
              done();
            });

          });

        });

      });

      describe('getEventStream', function () {

        var es = eventstore(),
          orgFunc = es.store.getEventsByRevision;

        before(function (done) {
          es.init(done);
        });

        after(function () {
          es.store.getEventsByRevision = orgFunc;
        });

        describe('with nice arguments', function () {

          it('it should pass them correctly', function (done) {

            var given = {
              query: { aggregateId: 'myAggId', aggregate: 'myAgg', context: 'myCont' },
              revMin: 2,
              revMax: 32,
              callback: function () {}
            };

            es.store.getEventsByRevision = function (query, revMin, revMax, callback) {
              expect(query).to.eql(given.query);
              expect(revMin).to.eql(given.revMin);
              expect(revMax).to.eql(given.revMax);
              expect(callback).to.be.a('function');

              done();
            };

            es.getEventStream(given.query, given.revMin, given.revMax, given.callback);

          });

        });

        describe('with query and callback', function () {

          it('it should pass them correctly', function (done) {

            var given = {
              query: { aggregateId: 'myAggId', aggregate: 'myAgg', context: 'myCont' },
              callback: function () {}
            };

            es.store.getEventsByRevision = function (query, revMin, revMax, callback) {
              expect(query).to.eql(given.query);
              expect(revMin).to.eql(0);
              expect(revMax).to.eql(-1);
              expect(callback).to.be.a('function');

              done();
            };

            es.getEventStream(given.query, given.callback);

          });

        });

        describe('with query, revMin and callback', function () {

          it('it should pass them correctly', function (done) {

            var given = {
              query: { aggregateId: 'myAggId', aggregate: 'myAgg', context: 'myCont' },
              revMin: 2,
              callback: function () {}
            };

            es.store.getEventsByRevision = function (query, revMin, revMax, callback) {
              expect(query).to.eql(given.query);
              expect(revMin).to.eql(given.revMin);
              expect(revMax).to.eql(-1);
              expect(callback).to.be.a('function');

              done();
            };

            es.getEventStream(given.query, given.revMin, given.callback);

          });

        });

        describe('with query as string, revMin, revMax and callback', function () {

          it('it should pass them correctly', function (done) {

            var given = {
              query: 'myAggId',
              revMin: 2,
              revMax: 4,
              callback: function () {}
            };

            es.store.getEventsByRevision = function (query, revMin, revMax, callback) {
              expect(query).to.be.an('object');
              expect(query.aggregateId).to.eql('myAggId');
              expect(revMin).to.eql(given.revMin);
              expect(revMax).to.eql(given.revMax);
              expect(callback).to.be.a('function');

              done();
            };

            es.getEventStream(given.query, given.revMin, given.revMax, given.callback);

          });

        });

        describe('with wrong query', function () {

          it('it should pass them correctly', function (done) {

            es.getEventStream(123, 3, 100, function (err) {
              expect(err.message).to.match(/aggregateId/);
              done();
            });

          });

        });

      });

      describe('getFromSnapshot', function () {

        var es = eventstore(),
          orgFunc = es.store.getSnapshot;

        before(function (done) {
          es.init(done);
        });

        after(function () {
          es.store.getSnapshot = orgFunc;
        });

        describe('with nice arguments', function () {

          it('it should pass them correctly', function (done) {

            var given = {
              query: { aggregateId: 'myAggId', aggregate: 'myAgg', context: 'myCont' },
              revMax: 32,
              callback: function () {
              }
            };

            es.store.getSnapshot = function (query, revMax, callback) {
              expect(query).to.eql(given.query);
              expect(revMax).to.eql(given.revMax);
              expect(callback).to.be.a('function');

              done();
            };

            es.getFromSnapshot(given.query, given.revMax, given.callback);

          });

        });

        describe('with query and callback', function () {

          it('it should pass them correctly', function (done) {

            var given = {
              query: { aggregateId: 'myAggId', aggregate: 'myAgg', context: 'myCont' },
              callback: function () {
              }
            };

            es.store.getSnapshot = function (query, revMax, callback) {
              expect(query).to.eql(given.query);
              expect(revMax).to.eql(-1);
              expect(callback).to.be.a('function');

              done();
            };

            es.getFromSnapshot(given.query, given.callback);

          });

          describe('with query as string, revMax and callback', function () {

            it('it should pass them correctly', function (done) {

              var given = {
                query: 'myAggId',
                revMax: 31,
                callback: function () {
                }
              };

              es.store.getSnapshot = function (query, revMax, callback) {
                expect(query).to.be.an('object');
                expect(query.aggregateId).to.eql('myAggId');
                expect(revMax).to.eql(31);
                expect(callback).to.be.a('function');

                done();
              };

              es.getFromSnapshot(given.query, given.revMax, given.callback);

            });

          });

          describe('with wrong query', function () {

            it('it should pass them correctly', function (done) {

              es.getFromSnapshot(123, 100, function (err) {
                expect(err.message).to.match(/aggregateId/);
                done();
              });

            });

          });

        });
        
      });

      describe('createSnapshot', function () {

        var es = eventstore(),
          orgFunc = es.store.addSnapshot;

        before(function (done) {
          es.init(done);
        });

        after(function () {
          es.store.addSnapshot = orgFunc;
        });

        describe('with nice arguments', function () {

          it('it should pass them correctly', function (done) {

            var obj = {
              aggregateId: 'myAggId',
              aggregate: 'myAgg',
              context: 'myCont',
              data: { snap: 'data' }
            };

            es.store.addSnapshot = function (snap, callback) {
              expect(snap.aggregateId).to.eql(obj.aggregateId);
              expect(snap.aggregate).to.eql(obj.aggregate);
              expect(snap.context).to.eql(obj.context);
              expect(snap.data).to.eql(obj.data);
              expect(callback).to.be.a('function');

              done();
            };

            es.createSnapshot(obj, function () {});

          });

        });

        describe('with streamId', function () {

          it('it should pass them correctly', function (done) {

            var obj = {
              streamId: 'myAggId',
              data: { snap: 'data' }
            };

            es.store.addSnapshot = function (snap, callback) {
              expect(snap.aggregateId).to.eql(obj.streamId);
              expect(snap.data).to.eql(obj.data);
              expect(callback).to.be.a('function');

              done();
            };

            es.createSnapshot(obj, function () {});

          });

        });

        describe('with wrong aggregateId', function () {

          it('it should pass them correctly', function (done) {

            var obj = {
              data: { snap: 'data' }
            };

            es.createSnapshot(obj, function (err) {
              expect(err.message).to.match(/aggregateId/);
              done();
            });

          });

        });

        describe('with wrong data', function () {

          it('it should pass them correctly', function (done) {

            var obj = {
              aggregateId: 'myAggId',
              aggregate: 'myAgg',
              context: 'myCont'
            };

            es.createSnapshot(obj, function (err) {
              expect(err.message).to.match(/data/);
              done();
            });

          });

        });

      });

      describe('setEventToDispatched', function () {

        var es = eventstore(),
          orgFunc = es.store.setEventToDispatched;

        before(function (done) {
          es.init(done);
        });

        after(function () {
          es.store.setEventToDispatched = orgFunc;
        });

        describe('with an event', function () {

          it('it should pass it correctly', function (done) {

            var evt = {
              commitId: '1234'
            };

            es.store.setEventToDispatched = function (id, callback) {
              expect(id).to.eql(evt.commitId);
              expect(callback).to.be.a('function');

              done();
            };

            es.setEventToDispatched(evt, function () {
            });

          });

        });

        describe('with a commitId', function () {

          it('it should pass it correctly', function (done) {

            var evt = {
              commitId: '1234'
            };

            es.store.setEventToDispatched = function (id, callback) {
              expect(id).to.eql(evt.commitId);
              expect(callback).to.be.a('function');

              done();
            };

            es.setEventToDispatched(evt.commitId, function () {});

          });

        });

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
