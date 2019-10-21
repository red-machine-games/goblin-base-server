local PID = KEYS[1]
local THE_MODEL = KEYS[2]
local MODEL_TTL_MS = KEYS[3]

local the_key = 'me:' .. PID

if redis.call('exists', the_key) == 1 then
    redis.call('set', the_key, THE_MODEL, 'px', MODEL_TTL_MS)
    return 1
else
    return nil
end