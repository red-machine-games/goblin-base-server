local PID = table.remove(KEYS, 1)
local VK_ID = table.remove(KEYS, 1)
local FB_ID = table.remove(KEYS, 1)
local OK_ID = table.remove(KEYS, 1)
local OPERATIVE_RECORD_LIFETIME_MS = table.remove(KEYS, 1)

for i = 1, #KEYS, 2 do
    local SEGMENT = KEYS[i]
    local VALUE = KEYS[i + 1]

    redis.call('zadd', 'rc:' .. SEGMENT, VALUE, PID)
    if OPERATIVE_RECORD_LIFETIME_MS ~= '0' then
        redis.call('set', 'rclti:' .. SEGMENT .. ':p' .. PID, '1', 'px', OPERATIVE_RECORD_LIFETIME_MS)
    end

    if VK_ID ~= '-1' then
        redis.call('set', 'vkrc:' .. VK_ID .. ':' .. SEGMENT, VALUE)
        if OPERATIVE_RECORD_LIFETIME_MS ~= '0' then
            redis.call('set', 'rclti:' .. SEGMENT .. ':vk' .. VK_ID, '1', 'px', OPERATIVE_RECORD_LIFETIME_MS)
        end
    end
    if FB_ID ~= '-1' then
        redis.call('set', 'fbrc:' .. FB_ID .. ':' .. SEGMENT, VALUE)
        if OPERATIVE_RECORD_LIFETIME_MS ~= '0' then
            redis.call('set', 'rclti:' .. SEGMENT .. ':fb' .. FB_ID, '1', 'px', OPERATIVE_RECORD_LIFETIME_MS)
        end
    end
    if OK_ID ~= '-1' then
        redis.call('set', 'okrc:' .. OK_ID .. ':' .. SEGMENT, VALUE)
        if OPERATIVE_RECORD_LIFETIME_MS ~= '0' then
            redis.call('set', 'rclti:' .. SEGMENT .. ':ok' .. OK_ID, '1', 'px', OPERATIVE_RECORD_LIFETIME_MS)
        end
    end
end