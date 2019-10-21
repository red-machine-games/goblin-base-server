local LAST_ID = tonumber(KEYS[1])
local MY_LOCK_KEY = KEYS[2]
local NOW = tonumber(KEYS[3])

local refresh = redis.call('hmget', 'prefresh', 'locked', 'lock_key')

if refresh[1] ~= false and refresh[1] == '1' and refresh[2] == MY_LOCK_KEY then
    local refresh_to = redis.call('hget', 'prefresh', 'to')
    if LAST_ID >= tonumber(refresh_to) then
        redis.call('hmset', 'prefresh', 'from', '0', 'to', '0', 'now', tostring(NOW), 'locked', '0')
    else
        redis.call('hmset', 'prefresh', 'from', tostring(LAST_ID), 'now', tostring(NOW), 'locked', '0')
    end
    return 1
else
    return 0
end
