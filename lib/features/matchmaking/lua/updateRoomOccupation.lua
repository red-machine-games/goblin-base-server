local ROOM_IP_ADDRESS = KEYS[1]
local ROOM_TTL_INDEX_MS = KEYS[2]
local INCREMENT_BY = KEYS[3]
local HARD_SET_TO = KEYS[4]

redis.call('set', 'groomttl:' .. ROOM_IP_ADDRESS, '1', 'px', ROOM_TTL_INDEX_MS)

if INCREMENT_BY ~= '-1' then
    redis.call('zincrby', 'grooms', INCREMENT_BY, ROOM_IP_ADDRESS)
elseif HARD_SET_TO ~= '-1' and HARD_SET_TO ~= nil then
    redis.call('zadd', 'grooms', HARD_SET_TO, ROOM_IP_ADDRESS)
end
