local OK_ID = table.remove(KEYS, 1)
local OK_FRIENDS_HASH = table.remove(KEYS, 1)
local STORE_TIME_MS = table.remove(KEYS, 1)

local ok_friends_hash = redis.call('get', 'okfr_hsh:' .. OK_ID)

if ok_friends_hash ~= OK_FRIENDS_HASH then
    redis.call('del', 'okfr:' .. OK_ID)

    for i = 1, #KEYS do
        redis.call('sadd', 'okfr:' .. OK_ID, KEYS[i])
    end

    redis.call('set', 'okfr_hsh:' .. OK_ID, OK_FRIENDS_HASH, 'PX', STORE_TIME_MS)
end