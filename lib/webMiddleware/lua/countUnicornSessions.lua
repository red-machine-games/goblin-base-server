redis.replicate_commands()

local BATCH_SIZE = KEYS[1]
local SESS_COUNTER_BLOCK_MS = KEYS[2]

local sess_counter_block = redis.call('get', 'sess_current_count_block')

if sess_counter_block then
    return '0'
else
    local sess_current_count_cursor = redis.call('get', 'sess_current_count_cursor') or '0'
    local so_the_listing = redis.call('scan', sess_current_count_cursor, 'match', 'sess:*', 'count', BATCH_SIZE)
    local sess_current_count
    if #so_the_listing[2] > 0 then
        sess_current_count = redis.call('incrby', 'sess_current_count', #so_the_listing[2])
    else
        sess_current_count = redis.call('get', 'sess_current_count')
    end
    if so_the_listing[1] == '0' then
        redis.call('del', 'sess_current_count', 'sess_current_count_cursor')
        redis.call('set', 'sess_current_count_block', '1', 'px', SESS_COUNTER_BLOCK_MS)
        return '2;' .. (sess_current_count or '0')
    else
        redis.call('set', 'sess_current_count_cursor', so_the_listing[1])
        return '1'
    end
end
