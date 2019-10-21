local BOOKING_KEY = KEYS[1]
local FROM_HOST = KEYS[2]
local FROM_PORT = KEYS[3]

local pair_index = redis.call('hmget', 'pinx:' .. BOOKING_KEY, 'prid', 'pid')

if pair_index[1] == false then
    return nil
else
    local pair_key = 'pair:' .. pair_index[1]
    local the_pair = redis.call(
        'hmget', pair_key, 'pida', 'dgrha', 'dgrpa', 'dgrhb', 'dgrpb', 'pseda', 'psedb')
    local is_paused = the_pair[6] == '1' or the_pair[7] == '1'

    if not the_pair[1] or is_paused then
        return nil
    else
        local is_player_a = pair_index[2] == the_pair[1]
        local datagram_host, datagram_port
        if is_player_a then
            datagram_host = the_pair[4]
            datagram_port = the_pair[5]
            if the_pair[2] ~= FROM_HOST or the_pair[3] ~= FROM_PORT then
                redis.call('hmset', pair_key, 'dgrha', FROM_HOST, 'dgrpa', FROM_PORT)
            end
        else
            datagram_host = the_pair[2]
            datagram_port = the_pair[3]
            if the_pair[4] ~= FROM_HOST or the_pair[5] ~= FROM_PORT then
                redis.call('hmset', pair_key, 'dgrhb', FROM_HOST, 'dgrpb', FROM_PORT)
            end
        end

        if datagram_host and datagram_port then
            return datagram_host .. ',' .. datagram_port
        else
            return nil
        end
    end
end