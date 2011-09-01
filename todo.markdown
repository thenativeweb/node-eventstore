Inspiration:

https://github.com/joliver/EventStore/blob/master/doc/EventStore.Example/MainProgram.cs

### todo:

v0.0.1

1. create a stream and commit it by aggregateId

    EventStream (load and save)

    - add(event)
    - commit()
    
    - collection for committedEvents and uncommittedEvents
    
    Event = streamId (=aggregateId), streamRevision, commitId, commitSequence, commitStamp, headers, Dispatched, payload

1. load stream -> (streamId, minRevision, maxRevision)


v0.0.2

1. dispatch commit to publisher
1. take a snapshot
1. load stream from latest snapshot -> (snapshot, maxRevision)
1. compress json
1. pipelinehook for _select commit_, _precommit_, _postcommit_


v.0.0.3

1. encrypt json


