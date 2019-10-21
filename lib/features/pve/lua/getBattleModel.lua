local PID = KEYS[1]
local MODEL_TTL_MS = KEYS[2]

local the_model = redis.call('get', 'me:' .. PID)

if not the_model then
    return nil
else
    redis.call('pexpire', 'me:' .. PID, MODEL_TTL_MS)
    return the_model
end