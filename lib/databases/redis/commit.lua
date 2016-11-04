local key = KEYS[1]
local event = cjson.decode(KEYS[2])
local revisionKey = KEYS[3] .. ':revision'

local revision = redis.call('INCR', revisionKey)
event['streamRevision'] = revision
redis.call('SET', key, cjson.encode(event))

return revision
