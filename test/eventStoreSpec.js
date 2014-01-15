var expect = require('expect.js'),
    eventstoreModule = require('../lib/eventStore'),
    storageModule = require('../lib/storage/inMemory/storage');
 
 describe('EventStore', function() {

    var eventstore;

    describe('not beeing configured', function() {

        before(function() {
            eventstore = eventstoreModule.createStore();
        });

        describe('requesting an eventstream', function() {

            it('it should callback with an error', function(done) {

                eventstore.getEventStream('1', 0, -1, function(err) {
                    expect(err).to.be.ok();
                    done();
                });

            });

        });

        describe('committing', function() {

            it('it should callback with an error', function(done) {

                var fakeEventStream = {
                    currentRevision: function() {
                        return 0;
                    },
                    events: [],
                    uncommittedEvents: []
                };

                eventstore.commit(fakeEventStream, function(err) {
                    expect(err).to.be.ok();
                    done();
                });

            });

        });

    });

    describe('beeing configured', function() {

        before(function(done) {
            eventstore = eventstoreModule.createStore({
                forkDispatching: false
            });
            storageModule.createStorage(function(err, storage) {
                eventstore.configure(function() {
                    this.use(storage);
                });
                eventstore.start(done);
            });
        });

        describe('requesting all events', function() {

            before(function(done) {
                eventstore.getEventStream('e-1a', 0, -1, function(err, stream) {
                    stream.addEvent({ id: '11a'});
                    stream.addEvent({ id: '22a'});
                    stream.addEvent({ id: '33a'});
                    stream.addEvent({ id: '44a'});
                    stream.addEvent({ id: '55a'});
                    stream.commit(function() {
                        eventstore.getEventStream('e-1b', 0, -1, function(err, stream) {
                            stream.addEvent({ id: '11b'});
                            stream.addEvent({ id: '22b'});
                            stream.addEvent({ id: '33b'});
                            stream.addEvent({ id: '44b'});
                            stream.addEvent({ id: '55b'});
                            stream.commit(done);
                        });
                    });
                });
            });

            var events;

            it('it should callback with the correct values', function(done) {

                eventstore.getAllEvents(4, 2, function(err, evts) {
                    events = evts;
                    expect(err).not.to.be.ok();
                    expect(events[0].payload.id).to.eql('55a');
                    expect(events[1].payload.id).to.eql('11b');
                    expect(events).to.have.length(2);
                    done();
                });

            });

            describe('requesting the next range', function() {

                it('it should callback with the correct values', function(done) {

                    events.next(function(err, evts) {
                        expect(err).not.to.be.ok();
                        expect(evts[0].payload.id).to.eql('22b');
                        expect(evts).to.have.length(2);
                        done();
                    });

                });

            });

            describe('calling getUndispatchedEvents', function() {

                var firstEvt;

                it('it should be in the array', function(done) {
                    eventstore.getUndispatchedEvents(function(err, evts) {
                        expect(err).not.to.be.ok();
                        expect(evts).to.be.an('array');
                        expect(evts).to.have.length(10);

                        firstEvt = evts[0];

                        done();
                    });
                });

                describe('calling setEventToDispatched', function() {

                    it('it should not be in the undispatched array anymore', function(done) {

                        eventstore.setEventToDispatched(firstEvt, function(err) {
                            expect(err).not.to.be.ok();
                            eventstore.getUndispatchedEvents(function(err, evts) {
                                expect(err).not.to.be.ok();
                                expect(evts).to.be.an('array');
                                expect(evts).to.have.length(9);

                                done();
                            });
                        });

                    });

                });
                
            });

        });

        describe('requesting an eventstream', function() {

            it('it should callback without an error', function(done) {

                eventstore.getEventStream('1', 0, -1, function(err, es) {
                    expect(err).not.to.be.ok();
                    done();
                });

            });

        });

        describe('requesting all events of a stream', function() {

            before(function(done) {
                eventstore.getEventStream('e4', 0, -1, function(err, stream) {
                    stream.addEvent({ id: '1'});
                    stream.addEvent({ id: '2'});
                    stream.addEvent({ id: '3'});
                    stream.addEvent({ id: '4'});
                    stream.addEvent({ id: '5'});
                    stream.commit(done);
                });
            });

            it('it should callback with the correct values', function(done) {

                eventstore.getEvents('e4', function(err, events) {
                    expect(err).not.to.be.ok();
                    expect(events[0].payload.id).to.eql('1');
                    expect(events).to.have.length(5);
                    done();
                });

            });

        });

        describe('requesting an event range', function() {

            before(function(done) {
                eventstore.getEventStream('e5', 0, -1, function(err, stream) {
                    stream.addEvent({ id: '11'});
                    stream.addEvent({ id: '22'});
                    stream.addEvent({ id: '33'});
                    stream.addEvent({ id: '44'});
                    stream.addEvent({ id: '55'});
                    stream.commit(done);
                });
            });

            var events;

            it('it should callback with the correct values', function(done) {

                eventstore.getEventRange({id: '22'}, 2, function(err, evts) {
                    events = evts;
                    expect(err).not.to.be.ok();
                    expect(events[0].payload.id).to.eql('33');
                    expect(events).to.have.length(2);
                    done();
                });

            });

            describe('requesting the next range', function() {

                it('it should callback with the correct values', function(done) {

                    events.next(function(err, evts) {
                        expect(err).not.to.be.ok();
                        expect(evts[0].payload.id).to.eql('55');
                        expect(evts).to.have.length(1);
                        done();
                    });

                });

            });

        });

        describe('committing', function() {

            it('it should callback without an error', function(done) {

                var fakeEventStream = {
                    currentRevision: function() {
                        return 0;
                    },
                    events: [],
                    uncommittedEvents: [
                        {streamId: 'e1', payload: { event:'bla' } },
                        {streamId: 'e1', payload: { event:'blabli' } }
                    ]
                };

                eventstore.commit(fakeEventStream, function(err) {
                    expect(err).not.to.be.ok();
                    done();
                });

            });

            describe('requesting the full eventstream', function() {

                it('it should callback with the correct values', function(done) {

                    eventstore.getEventStream('e1', 0, -1, function(err, es) {
                        expect(es.events).to.have.length(2);
                        expect(es.uncommittedEvents).to.have.length(0);
                        done();
                    });

                });

            });

        });

        describe('adding an event to an eventstream', function() {

            before(function(done) {
                eventstore.getEventStream('e2', 0, -1, function(err, es) {
                    es.addEvent({streamId: 'e2', payload: 'test'});
                    es.commit(done);
                });
            });

            describe('requesting the full eventstream', function() {

                var stream;

                it('it should callback with the correct values', function(done) {

                    eventstore.getEventStream('e2', 0, -1, function(err, es) {
                        stream = es;
                        expect(es.currentRevision()).to.be(0);
                        expect(es.currentRevision()).to.be(es.lastRevision);
                        expect(es.events).to.have.length(1);
                        expect(es.uncommittedEvents).to.have.length(0);
                        expect(es.events[0].streamId).to.eql('e2');
                        expect(es.events[0].payload.payload).to.eql('test');
                        done();
                    });

                });

                describe('creating a snapshot', function() {

                    it('it should callback without an error', function(done) {

                        eventstore.createSnapshot(stream.streamId, stream.currentRevision(), 'data', function(err) {
                            expect(err).not.to.be.ok();
                            done();
                        });

                    });

                    describe('calling getFromSnapshot', function() {

                        it('it should callback with the correct values', function(done) {

                            eventstore.getFromSnapshot('e2', function(err, snapshot, es) {
                                expect(err).not.to.be.ok();
                                expect(snapshot.data).to.eql('data');
                                expect(snapshot.streamId).to.eql('e2');
                                expect(es.currentRevision()).to.be(0);
                                expect(snapshot.revision).to.be(es.lastRevision);
                                expect(snapshot.revision).to.be(es.currentRevision());
                                done();
                            });

                        });

                    });

                });

            });

        });

    });

 });