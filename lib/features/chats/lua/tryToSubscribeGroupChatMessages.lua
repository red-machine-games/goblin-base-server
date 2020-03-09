
local USER_ID = KEYS[1]
local GROUP_ID = KEYS[2]
local NOW = tonumber(KEYS[3])
local BUCKET_LIFETIME_MS = tonumber(KEYS[4])

local bucket_now = redis.call('zscore', 'bi:' .. GROUP_ID, USER_ID)

if bucket_now ~= nil and bucket_now ~= false and tonumber(bucket_now) + BUCKET_LIFETIME_MS > NOW then
    return 0
else
    redis.call('zadd', 'bi:' .. GROUP_ID, NOW, USER_ID)
    redis.call('del', 'b:' .. GROUP_ID .. ":" .. USER_ID)
    return 1
end