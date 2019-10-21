local LAST_ID = tonumber(table.remove(KEYS, 1))
local MY_LOCK_KEY = table.remove(KEYS, 1)
local NOW = tonumber(table.remove(KEYS, 1))
local OPERATIVE_RECORD_LIFETIME_MS = table.remove(KEYS, 1)

local seed = redis.call('hmget', 'seedl', 'locked', 'lock_key')

if seed[1] ~= false or MY_LOCK_KEY == 'debug' then
    if MY_LOCK_KEY ~= 'debug' and (seed[1] == '0' or seed[2] ~= MY_LOCK_KEY) then
        return 0
    else
        for i = 1, #KEYS, 6 do
            local PID = KEYS[i]
            local VALUE = KEYS[i + 1]
            local SEGMENT = KEYS[i + 2]
            local VK = KEYS[i + 3]
            local FB = KEYS[i + 4]
            local OK = KEYS[i + 5]

            redis.call('zadd', 'rc:' .. SEGMENT, 'nx', VALUE, PID)
            if OPERATIVE_RECORD_LIFETIME_MS ~= '0' then
                redis.call('set', 'rclti:' .. SEGMENT .. ':p' .. PID, '1', 'px', OPERATIVE_RECORD_LIFETIME_MS)
            end

            if VK ~= '-1' then
                redis.call('setnx', 'vkres:' .. VK .. ':' .. SEGMENT, VALUE)
                if OPERATIVE_RECORD_LIFETIME_MS ~= '0' then
                    redis.call('set', 'rclti:' .. SEGMENT .. ':vk' .. VK, '1', 'px', OPERATIVE_RECORD_LIFETIME_MS)
                end
            end
            if FB ~= '-1' then
                redis.call('setnx', 'fbres:' .. FB .. ':' .. SEGMENT, VALUE)
                if OPERATIVE_RECORD_LIFETIME_MS ~= '0' then
                    redis.call('set', 'rclti:' .. SEGMENT .. ':fb' .. FB, '1', 'px', OPERATIVE_RECORD_LIFETIME_MS)
                end
            end
            if OK ~= '-1' then
                redis.call('set', 'okrc:' .. OK .. ':' .. SEGMENT, VALUE)
                if OPERATIVE_RECORD_LIFETIME_MS ~= '0' then
                    redis.call('set', 'rclti:' .. SEGMENT .. ':ok' .. OK, '1', 'px', OPERATIVE_RECORD_LIFETIME_MS)
                end
            end
        end
        redis.call('hmset', 'seedl', 'seed_now', tostring(LAST_ID), 'now', tostring(NOW))
        return 1
    end
else
    return 2
end