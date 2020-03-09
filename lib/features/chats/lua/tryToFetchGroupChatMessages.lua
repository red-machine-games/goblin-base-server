
local USER_ID = KEYS[1]
local GROUP_ID = KEYS[2]
local NOW = tonumber(KEYS[3])
local BUCKET_LIFETIME_MS = tonumber(KEYS[4])

local bucket_now = redis.call('zscore', 'bi:' .. GROUP_ID, USER_ID)

if bucket_now ~= nil and bucket_now ~= false and tonumber(bucket_now) + BUCKET_LIFETIME_MS > NOW then
    redis.call('zadd', 'bi:' .. GROUP_ID, NOW, USER_ID)
    local k = 'b:' .. GROUP_ID .. ":" .. USER_ID
    local all_subscription_inbox = redis.call('smembers', k)
    redis.call('del', k)
    if #all_subscription_inbox > 0 then
        local out = {}
        for i=1, #all_subscription_inbox, 1 do
            local mk = 'm:' .. GROUP_ID .. ':' .. all_subscription_inbox[i]
            local theMessage = redis.call('hget', mk, 'c')
            local newR = redis.call('hincrby', mk, 'r', -1)
            if newR < 1 then
                redis.call('del', mk)
            end
            table.insert(out, theMessage)
        end
        return table.concat(out, ',')
    else
        return 0
    end
else
    return -1
end