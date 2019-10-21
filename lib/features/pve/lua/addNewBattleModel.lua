local PID = KEYS[1]
local THE_MODEL = KEYS[2]
local MODEL_TTL_MS = KEYS[3]
local DEBT_TTL_MS = KEYS[4]

if redis.call('exists', 'me:' .. PID) ~= 1 then
    redis.call('set', 'me:' .. PID, THE_MODEL, 'px', MODEL_TTL_MS)
    redis.call('set', 'meDebt:' .. PID, '1', 'px', DEBT_TTL_MS)
    return 1
else
    return nil
end