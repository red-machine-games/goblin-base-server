local BOOKING_KEY = KEYS[1]

local pair_index = redis.call('hmget', 'pinx:' .. BOOKING_KEY, 'prid', 'pid')

if pair_index[1] == false then
    return nil
else
    local the_pair = redis.call('hmget', 'pair:' .. pair_index[1], 'pida', 'pidb', 'tura', 'turb')
    local is_player_a = pair_index[2] == the_pair[1]

    return is_player_a and the_pair[3] or the_pair[4]
end