#### v1.0.2
- optimized indexes

#### v1.0.1
- optimized getSnapshot when using versioning of same revision

#### v1.0.0
- refactored whole module
- added possibility to define aggregateId, aggregate and context
- added a lot of tests
- stabilized everything
- optimized performance
- mongodb legacy data should be usable to (so you can update from eventstore.mongodb to eventstore) without migrating data
- IMPORTANT: changed API!!!

#### v0.7.0

- make using of eventDispatcher configurable
- map getUndispatchedEvents and setEventToDispatched to eventstore

#### v0.6.2

- optimized storage initialization

#### v0.6.1

- forking of event dispatching is configurable now

#### v0.6.0

- removed couchDb implementation
- rewritten tests in mocha and expect.js
- updated to node.js 0.6.15

#### v0.5.0

- simplified API for storage usage
- if possible fork dispatching to own childprocess
- optimized lastRevision handling

#### v0.3.0

- eventstreams
- snapshoting
- get all events with paging for replay
- console.logger
- db implementations for mongoDb, couchDb, redis