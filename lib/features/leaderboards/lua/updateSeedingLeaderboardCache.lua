local TO_VALUE = KEYS[1]
local MY_LOCK_KEY = KEYS[2]
local NOW = KEYS[3]

local seed = redis.call('hmget', 'seedl', 'locked', 'lock_key')

if seed[1] ~= false and seed[1] == '1' and seed[2] == MY_LOCK_KEY then
    redis.call('hmset', 'seedl', 'seed_to', TO_VALUE, 'now', NOW)
    return 1
else
    return 0
end