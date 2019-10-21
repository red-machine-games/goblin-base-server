local TO_VALUE = KEYS[1]
local MY_LOCK_KEY = KEYS[2]

local refresh = redis.call('hmget', 'refresh', 'locked', 'lock_key')

if #refresh > 0 and refresh[1] == '1' and refresh[2] == MY_LOCK_KEY then
    redis.call('hset', 'refresh', 'to', TO_VALUE)
    return 1
else
    return 0
end