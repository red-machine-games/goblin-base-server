local FB_ID = table.remove(KEYS, 1)
local FB_FRIENDS_HASH = table.remove(KEYS, 1)
local STORE_TIME_MS = table.remove(KEYS, 1)

local fb_friends_hash = redis.call('get', 'fbfr_hsh:' .. FB_ID)

if fb_friends_hash ~= FB_FRIENDS_HASH then
    redis.call('del', 'fbfr:' .. FB_ID)

    for i = 1, #KEYS do
        redis.call('sadd', 'fbfr:' .. FB_ID, KEYS[i])
    end

    redis.call('set', 'fbfr_hsh:' .. FB_ID, FB_FRIENDS_HASH, 'PX', STORE_TIME_MS)
end