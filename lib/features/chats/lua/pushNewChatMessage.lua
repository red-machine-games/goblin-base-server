
local THE_MESSAGE = KEYS[1]
local GROUP_ID = KEYS[2]
local MESSAGE_SEQUENCE_NUM = KEYS[3]
local MAX_INBOX_PER_BUCKET = tonumber(KEYS[4])

local buckets_num = redis.call('zcard', 'bi:' .. GROUP_ID)

if buckets_num > 0 then
    redis.call('hmset', 'm:' .. GROUP_ID .. ':' .. MESSAGE_SEQUENCE_NUM, 'c', THE_MESSAGE, 'r', buckets_num)
    local bik = 'bi:' .. GROUP_ID
    local all_subscribers = redis.call('zrange', bik, 0, -1)
    for i=1, #all_subscribers, 1 do
        local bk = 'b:' .. GROUP_ID .. ":" .. all_subscribers[i]
        local particular_bucket_inbox_size = redis.call('scard', bk)
        if particular_bucket_inbox_size < MAX_INBOX_PER_BUCKET then
            redis.call('sadd', bk, MESSAGE_SEQUENCE_NUM)
        else
            local all_bucket_messages = redis.call('smembers', bk)
            for j=1, #all_bucket_messages, 1 do
                local mk = 'm:' .. GROUP_ID .. ':' .. all_bucket_messages[j]
                local newR = redis.call('hincrby', mk, 'r', -1)
                if newR < 1 then
                    redis.call('del', mk)
                end
            end
            redis.call('del', bk)
            redis.call('zrem', bik, all_subscribers[i])
        end
    end
    redis.call('publish', 'grchat', '1//' .. GROUP_ID)
    return 1
else
    return 0
end