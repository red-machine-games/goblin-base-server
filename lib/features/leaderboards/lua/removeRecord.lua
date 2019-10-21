local PID = KEYS[1]
local SEGMENT = KEYS[2]
local VK_ID = KEYS[3]
local FB_ID = KEYS[4]
local OK_ID = KEYS[5]

redis.call('zrem', 'rc:' .. SEGMENT, PID)
redis.call('del', 'rclti:' .. SEGMENT .. ':p' .. PID)

if VK_ID ~= '-1' then
    redis.call('del', 'vkrc:' .. VK_ID .. ':' .. SEGMENT)
    redis.call('del', 'rclti:' .. SEGMENT .. ':vk' .. VK_ID)
end
if FB_ID ~= '-1' then
    redis.call('del', 'fbrc:' .. FB_ID .. ':' .. SEGMENT)
    redis.call('del', 'rclti:' .. SEGMENT .. ':fb' .. FB_ID)
end
if OK_ID ~= '-1' then
    redis.call('del', 'okrc:' .. OK_ID .. ':' .. SEGMENT)
    redis.call('del', 'rclti:' .. SEGMENT .. ':ok' .. OK_ID)
end