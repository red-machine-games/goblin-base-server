local BOOKING_KEY = KEYS[1]
local REQUEST_SEQUENCE_CACHE_TTL = tonumber(KEYS[2])
local NEW_SEQUENCE = tonumber(KEYS[3])

local seq = redis.call('get', 'sq:' .. BOOKING_KEY)
if not seq then
    seq = 0
else
    seq = tonumber(seq)
end
if NEW_SEQUENCE ~= seq + 1 then
    return '-1'
else
    redis.call('set', 'sq:' .. BOOKING_KEY, NEW_SEQUENCE, 'px', REQUEST_SEQUENCE_CACHE_TTL)
    return seq
end