var expect = require('expect.js')
  , storageModule = require('../storage');
 
 describe('Storage', function() {

    var storage;

    describe('beeing not connected', function() {

        describe('calling createStorage', function() {

            describe('without a callback', function() {

                before(function() {
                    storage = storageModule.createStorage({ dbName: 'testeventstore' });
                });

                describe('calling connect', function() {

                    it('it should connect successfully', function(done) {

                        storage.connect(function(err) {
                            expect(err).not.to.be.ok();
                            done();
                        });

                    });

                });

            });

            describe('with a callback', function() {

                it('it should connect successfully', function(done) {

                    storageModule.createStorage({ dbName: 'testeventstore' }, function(err, str) {
                        storage = str;
                        expect(err).not.to.be.ok();
                        expect(str).to.not.eql(null);
                        done();
                    });

                });

            });

        });

    });

    describe('beeing connected', function() {

        before(function(done) {
            storage.events.remove({}, function() {
                storage.snapshots.remove({}, function() {
                    storage.transactions.remove({}, done);
                });
            });
        });

        describe('calling getId', function() {

            it('it should callback with a new id', function(done) {

                storage.getId(function(err, id) {
                    expect(err).not.to.be.ok();
                    expect(id).to.be.an('string');
                    done();
                });

            });

        });

        describe('calling addEvents', function() {

            var event = {
                streamId: 'id1',
                streamRevision: 0,
                commitId: '10',
                commitSequence: '10',
                dispatched: false,
                payload: {
                    event:'bla'
                }
            };

            it('it should save the events', function(done) {

                storage.addEvents([event], function(err) {
                    expect(err).not.to.be.ok();

                    storage.getEvents('id1', -1, function(err, evts) {
                        expect(err).not.to.be.ok();
                        expect(evts).to.be.an('array');
                        expect(evts).to.have.length(1);

                        done();
                    });
                });

            });

            describe('calling getUndispatchedEvents', function() {

                it('it should be in the array', function(done) {
                    storage.getUndispatchedEvents(function(err, evts) {
                        expect(err).not.to.be.ok();
                        expect(evts).to.be.an('array');
                        expect(evts).to.have.length(1);
                        expect(event).to.eql(evts[0]);

                        done();
                    });
                });

                describe('calling setEventToDispatched', function() {

                    it('it should not be in the undispatched array anymore', function(done) {

                        storage.setEventToDispatched(event, function(err) {
                            expect(err).not.to.be.ok();
                            storage.getUndispatchedEvents(function(err, evts) {
                                expect(err).not.to.be.ok();
                                expect(evts).to.be.an('array');
                                expect(evts).to.have.length(0);

                                done();
                            });
                        });

                    });

                });
                
            });

        });

        describe('calling addSnapshot', function() {

            it('it should save the snapshot', function(done) {

                var snapshot = {
                    snapshotId: '1',
                    streamId: '3',
                    revision: 1,
                    data: 'data'
                };

                storage.addSnapshot(snapshot, function(err) {
                    expect(err).to.eql(null);

                    storage.getSnapshot('3', function(err, snap) {
                        expect(err).not.to.be.ok();
                        expect(snap.data).to.eql(snapshot.data);
                        expect(snap.snapshotId).to.eql(snapshot.snapshotId);
                        expect(snap.revision).to.eql(snapshot.revision);
                        expect(snap.streamId).to.eql(snapshot.streamId);

                        done();
                    });
                });

            });

        });

        describe('having a filled store with example data', function() {

            before(function(done) {
                storage.addEvents([
                    {streamId: '2', streamRevision: 0, commitId: '0', commitSequence: 0, restInCommitStream: 3, commitStamp: new Date(2012, 3, 14, 8, 0, 0), payload: {id: '1', event:'blaaaaaaaaaaa'}},
                    {streamId: '2', streamRevision: 1, commitId: '0', commitSequence: 1, restInCommitStream: 2, commitStamp: new Date(2012, 3, 14, 9, 0, 0), payload: {id: '2', event:'blaaaaaaaaaaa'}},
                    {streamId: '2', streamRevision: 2, commitId: '0', commitSequence: 2, restInCommitStream: 1, commitStamp: new Date(2012, 3, 14, 10, 0, 0), payload: {id: '3', event:'blaaaaaaaaaaa'}},
                    {streamId: '2', streamRevision: 3, commitId: '0', commitSequence: 3, restInCommitStream: 0, commitStamp: new Date(2012, 3, 15, 8, 0, 0), payload: {id: '4', event:'blaaaaaaaaaaa'}}
                ],
                function (err) {
                    storage.addEvents([
                        {streamId: '3', streamRevision: 0, commitId: '1', commitSequence: 0, restInCommitStream: 1, commitStamp: new Date(2012, 3, 16, 8, 0, 0), payload: {id: '5', event:'blaaaaaaaaaaa'}},
                        {streamId: '3', streamRevision: 1, commitId: '1', commitSequence: 1, restInCommitStream: 0, commitStamp: new Date(2012, 3, 17, 8, 0, 0), payload: {id: '6', event:'blaaaaaaaaaaa'}}
                        ],
                        function (err) {
                            storage.addSnapshot({snapshotId: '1', streamId: '3', revision: 1, data: 'data'}, function() {
                                storage.addSnapshot({snapshotId: '2', streamId: '3', revision: 2, data: 'dataPlus'}, done);
                            });
                        }
                    );
                });
            });

            describe('calling getEvents for id 2', function() {

                it('it should callback with the correct values', function(done) {
                    storage.getEvents('2', 0, -1, function(err, events) {
                        expect(err).not.to.be.ok();
                        expect(events).to.have.length(4);
                        expect(events[0].commitId).to.eql('0');
                        expect(events[1].commitId).to.eql('0');
                        expect(events[3].commitId).to.eql('0');

                        done();
                    });
                });

            });

            describe('calling getEvents for id 3', function() {

                it('it should callback with the correct values', function(done) {
                    storage.getEvents('3', 0, -1, function(err, events) {
                        expect(err).not.to.be.ok();
                        expect(events).to.have.length(2);

                        done();
                    });
                });

            });

            describe('calling getEvents for id 2 from 1 to 3', function() {

                it('it should callback with the correct values', function(done) {
                    storage.getEvents('2', 1, 3, function(err, events) {
                        expect(err).to.eql(null);
                        expect(events).to.have.length(2);

                        done();
                    });
                });

            });

            describe('calling getUndispatchedEvents', function() {

                it('it should callback with the correct values', function(done) {
                    storage.getUndispatchedEvents(function(err, events) {
                        expect(err).not.to.be.ok();
                        expect(events).to.have.length(6);
                        expect(events[0].commitId).to.eql('0');
                        expect(events[2].commitId).to.eql('0');
                        expect(events[5].commitId).to.eql('1');

                        done();
                    });
                });

            });

            describe('calling getEventRange searching by event id', function() {

                it('it should callback with the correct values', function(done) {
                    storage.getEventRange({id: '2'}, 2, function(err, events) {
                        expect(err).not.to.be.ok();
                        expect(events).to.have.length(2);
                        expect(events[0].commitId).to.eql('1');
                        expect(events[1].commitId).to.eql('1');

                        done();
                    });
                });

            });

            describe('calling getSnapshot for id 3', function() {

                it('it should callback with the correct values', function(done) {
                    storage.getSnapshot('3', -1, function(err, snap) {
                        expect(err).not.to.be.ok();
                        expect(snap.data).to.eql('dataPlus');
                        expect(snap.snapshotId).to.eql('2');
                        expect(snap.streamId).to.eql('3');
                        expect(snap.revision).to.eql('2');

                        done();
                    });
                });

            });

            describe('calling getSnapshot for id 3 with maxRev 1', function() {

                it('it should callback with the correct values', function(done) {
                    storage.getSnapshot('3', 1, function(err, snap) {
                        expect(err).not.to.be.ok();
                        expect(snap.data).to.eql('data');
                        expect(snap.snapshotId).to.eql('1');
                        expect(snap.streamId).to.eql('3');
                        expect(snap.revision).to.eql('1');

                        done();
                    });
                });

            });

            describe('calling getAllEvents without a from and a amount argument', function() {

                it('it should callback with the correct values', function(done) {
                    storage.getAllEvents(function(err, evts) {
                        expect(evts).to.have.length(7);

                        done();
                    });
                });

            });

            describe('calling getAllEvents with a from but without an amount argument', function() {

                it('it should callback with the correct values', function(done) {
                    storage.getAllEvents(2, function(err, evts) {
                        expect(evts).to.have.length(5);

                        done();
                    });
                });

            });

            describe('calling getAllEvents with a from and an amount argument that does not exceed the limit', function() {

                it('it should callback with the correct values', function(done) {
                    storage.getAllEvents(2, 2, function(err, evts) {
                        expect(evts).to.have.length(2);

                        done();
                    });
                });

            });

            describe('calling getAllEvents with a from and an amount argument that does exceed the limit', function() {

                it('it should callback with the correct values', function(done) {
                    storage.getAllEvents(2, 10, function(err, evts) {
                        expect(evts).to.have.length(5);

                        done();
                    });
                });

            });

        });

        describe('having a pending transaction', function() {

            before(function(done) {
                var evts = [
                    {streamId: '1818', streamRevision: 0, commitId: '18180', commitSequence: 0, restInCommitStream: 3, commitStamp: new Date(2012, 3, 14, 8, 0, 0), payload: {id: '1', event:'blaaaaaaaaaaa'}},
                    {streamId: '1818', streamRevision: 1, commitId: '18180', commitSequence: 1, restInCommitStream: 2, commitStamp: new Date(2012, 3, 14, 9, 0, 0), payload: {id: '2', event:'blaaaaaaaaaaa'}},
                    {streamId: '1818', streamRevision: 2, commitId: '18180', commitSequence: 2, restInCommitStream: 1, commitStamp: new Date(2012, 3, 14, 10, 0, 0), payload: {id: '3', event:'blaaaaaaaaaaa'}}
                ];
                storage.addEvents(evts,
                function (err) {
                    evts.push({_id: '181803', streamId: '1818', streamRevision: 3, commitId: '18180', commitSequence: 3, restInCommitStream: 0, commitStamp: new Date(2012, 3, 14, 11, 0, 0), payload: {id: '4', event:'missed'}});
                    var tx = {
                        _id: '18180',
                        events: evts
                    };
                    setTimeout(function() {
                        storage.transactions.save(tx, done);
                    }, 100);
                });
            });

            describe('calling getEvents without maxRev', function() {

                it('it should try to fix the pending transaction', function(done) {

                    storage.getEvents('1818', 0, function(err, events) {
                        expect(err).not.to.be.ok();
                        expect(events).to.have.length(4);
                        expect(events[0].commitId).to.eql('18180');
                        expect(events[1].commitId).to.eql('18180');
                        expect(events[3].commitId).to.eql('18180');
                        expect(events[3].payload.event).to.eql('missed');

                        storage.transactions.findOne({ id: '18180'}, function(err, res) {
                            expect(res).not.to.be.ok();
                            done();
                        });
                    });

                });

            });

        });

    });

 });