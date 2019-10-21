local VK_ID = table.remove(KEYS, 1)
local VK_FRIENDS_HASH = table.remove(KEYS, 1)
local STORE_TIME_MS = table.remove(KEYS, 1)

local vk_friends_hash = redis.call('get', 'vkfr_hsh:' .. VK_ID)

if vk_friends_hash ~= VK_FRIENDS_HASH then
    redis.call('del', 'vkfr:' .. VK_ID)

    for i = 1, #KEYS do
        redis.call('sadd', 'vkfr:' .. VK_ID, KEYS[i])
    end

    redis.call('set', 'vkfr_hsh:' .. VK_ID, VK_FRIENDS_HASH, 'PX', STORE_TIME_MS)
end