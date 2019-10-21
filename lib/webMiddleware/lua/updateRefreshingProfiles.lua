local TO_VALUE = KEYS[1]
local MY_LOCK_KEY = KEYS[2]

local refresh = redis.call('hmget', 'prefresh', 'locked', 'lock_key')

if refresh[1] ~= false and refresh[1] == '1' and refresh[2] == MY_LOCK_KEY then
    redis.call('hset', 'prefresh', 'to', TO_VALUE)
    return 1
else
    return 0
end