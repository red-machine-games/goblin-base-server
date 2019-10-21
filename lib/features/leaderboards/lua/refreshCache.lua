local TO_VALUE = tonumber(table.remove(KEYS, 1))
local MY_LOCK_KEY = table.remove(KEYS, 1)
local NOW = tonumber(table.remove(KEYS, 1))

local refresh = redis.call('hmget', 'refresh', 'locked', 'lock_key')

if #refresh > 0 and refresh[1] == '1' and refresh[2] == MY_LOCK_KEY then
    for i = 1, #KEYS, 5 do
        local UID = table.remove(KEYS, 1);
        local VK_ID = table.remove(KEYS, 1);
        local FB_ID = table.remove(KEYS, 1);
        local SUBJECT = table.remove(KEYS, 1);
        local SCORE = table.remove(KEYS, 1);

        redis.call('zadd', 'rec:' .. SUBJECT, SCORE, UID)
        redis.call('hmset', 'vkrec:' .. VK_ID .. ':' .. SUBJECT, 'score', SCORE)
        redis.call('hmset', 'fbrec:' .. FB_ID .. ':' .. SUBJECT, 'score', SCORE)
    end
    redis.call('hmset', 'refresh', 'from', tostring(TO_VALUE), 'now', tostring(NOW), 'locked', '0')
    return 1
else
    return 0
end