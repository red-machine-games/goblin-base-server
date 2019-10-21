local LAST_FROM = tonumber(KEYS[1])
local MY_LOCK_KEY = KEYS[2]
local NOW = tonumber(KEYS[3])

local refresh = redis.call('hmget', 'refreshac', 'locked', 'lock_key')

if refresh[1] ~= false and refresh[1] == '1' and refresh[2] == MY_LOCK_KEY then
    local refresh_to = redis.call('hget', 'refreshac', 'to')
    if LAST_FROM >= tonumber(refresh_to) then
        redis.call('hmset', 'refreshac', 'from', '0', 'to', '0', 'now', tostring(NOW), 'locked', '0')
    else
        redis.call('hmset', 'refreshac', 'from', tostring(LAST_FROM), 'now', tostring(NOW), 'locked', '0')
    end
    return 1
else
    return 0
end