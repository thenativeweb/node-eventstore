local key = KEYS[1]
local event = cjson.decode(KEYS[2])
local revisionKey = KEYS[3] .. ':revision'

local revision = redis.call('GET', revisionKey)
if (not revision) then revision = 0 end
redis.call('INCR', revisionKey)
event['streamRevision'] = tonumber(revision)
redis.call('SET', key, cjson.encode(event))

return tonumber(revision)
