local BOOKING_KEY = KEYS[1]

local target_pair_index = 'pinx:' .. BOOKING_KEY
local pair_index = redis.call('hmget', target_pair_index, 'prid', 'pid')
local pair_key = 'pair:' .. pair_index[1]

local opponents_pids = redis.call('hmget', pair_key, 'pida', 'pidb', 'opbot')
local booking_key_a = redis.call('get', 'pidnx:' .. opponents_pids[1])
if redis.call('get', 'pgoto:' .. opponents_pids[1]) == pair_index[1] then
    redis.call('del', 'pgoto:' .. opponents_pids[1])
end
if redis.call('get', 'pidnx:' .. opponents_pids[1]) == booking_key_a then
    redis.call('del', 'pidnx:' .. opponents_pids[1])
end
redis.call('del', pair_key, 'pinx:' .. booking_key_a, 'pq:' .. pair_index[1], 'sq:' .. booking_key_a)
redis.call('publish', 'gr-pub', opponents_pids[1] .. '//10')

local booking_key_b
if opponents_pids[3] ~= '1' then
    booking_key_b = redis.call('get', 'pidnx:' .. opponents_pids[2])
    if redis.call('get', 'pgoto:' .. opponents_pids[2]) == pair_index[1] then
        redis.call('del', 'pgoto:' .. opponents_pids[2])
    end
    if redis.call('get', 'pidnx:' .. opponents_pids[2]) == booking_key_b then
        redis.call('del', 'pidnx:' .. opponents_pids[2])
    end
    redis.call('del', 'pinx:' .. booking_key_b, 'sq:' .. booking_key_b)
    redis.call('publish', 'gr-pub', opponents_pids[2] .. '//10')
end
redis.call('incrby', 'the_occupation', 1)