local NOW = tonumber(KEYS[1])
local PACKAGE_TIMEOUT = tonumber(KEYS[2])
local ALL_REFRESH_TIMEOUT = tonumber(KEYS[3])

local refresh = redis.call('hmget', 'refreshac', 'locked', 'lock_key', 'now', 'from', 'to')

if refresh[1] ~= false then
    if refresh[1] == '1' then
        if tonumber(refresh[3]) + PACKAGE_TIMEOUT <= NOW then
            local new_lock_key = tonumber(refresh[2]) + 1
            redis.call('hmset', 'refreshac', 'lock_key', tostring(new_lock_key), 'now', tostring(NOW))
            return { 1, tonumber(refresh[4]), tonumber(refresh[5]), new_lock_key }
        end
    elseif tonumber(refresh[4]) >= tonumber(refresh[5]) then
        if tonumber(refresh[3]) + ALL_REFRESH_TIMEOUT <= NOW then
            local new_lock_key = tonumber(refresh[2]) + 1
            redis.call('hmset', 'refreshac', 'locked', '1', 'lock_key',
                tostring(new_lock_key), 'now', tostring(NOW), 'from', '0', 'to', '-1')
            return { 1, 1, -1, new_lock_key }
        end
    else
        if tonumber(refresh[3]) + PACKAGE_TIMEOUT <= NOW then
            local new_lock_key = tonumber(refresh[2]) + 1
            redis.call('hmset', 'refreshac', 'locked', '1', 'lock_key', tostring(new_lock_key), 'now', tostring(NOW))
            return { 1, tonumber(refresh[4]), tonumber(refresh[5]), new_lock_key }
        end
    end
else
    redis.call('hmset', 'refreshac', 'locked', '1', 'lock_key', '1', 'now', tostring(NOW), 'from', '0', 'to', '-1')
    return { 1, 1 }
end

return { 0 }