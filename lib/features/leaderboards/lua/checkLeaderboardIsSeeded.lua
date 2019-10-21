local NOW = tonumber(KEYS[1])
local TIME_FOR_PACK = tonumber(KEYS[2])

local seed = redis.call('hmget', 'seedl', 'now', 'locked', 'lock_key', 'seed_to')

if seed[1] ~= false then
    local seed_locked = tonumber(seed[3])
    if (seed_locked == 1 and tonumber(seed[2]) + TIME_FOR_PACK <= NOW) or seed_locked == 0 then
        if seed[5] and tonumber(seed[5]) >= tonumber(seed[1]) then
            local new_lock_key = tonumber(seed[4]) + 1
            redis.call('hmset', 'seedl', 'now', tostring(NOW), 'locked', '1', 'lock_key', tostring(new_lock_key))
            return { 1, new_lock_key, tonumber(seed[1]), tonumber(seed[5]) }
        end
    end
else
    redis.call('hmset', 'seedl', 'now', tostring(NOW), 'locked', '1', 'lock_key', '1')
    return { 1, 1, 0 }
end

return { 0 }