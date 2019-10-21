local PAIR_ID = KEYS[1]
local QUOTA_NUM = KEYS[2]

local quota_key = 'qot:' .. PAIR_ID .. ':' .. QUOTA_NUM
local so_the_content = redis.call('get', quota_key)

if so_the_content then
    redis.call('del', quota_key)
end

return so_the_content