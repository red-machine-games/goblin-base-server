local BOOKING_KEY = KEYS[1]
local TIME_TO_CONNECT_PAIR = tonumber(KEYS[2])
local NOW = tonumber(KEYS[3])
local THE_PAYLOAD = KEYS[4]

local pair_index = redis.call('hmget', 'pinx:' .. BOOKING_KEY, 'prid', 'pid')

if pair_index[1] == false then
    return nil
else
    local pair_key = 'pair:' .. pair_index[1]
    local the_pair = redis.call('hmget', pair_key, 'stat', 'upd', 'pida', 'pidb', 'opbot')
    if the_pair[1] == false or (the_pair[1] ~= '0' and the_pair[1] ~= '1') or tonumber(the_pair[2]) + TIME_TO_CONNECT_PAIR <= NOW then
        return nil
    else
        local is_player_a = pair_index[2] == the_pair[3]
        local other_player_set_payload
        if the_pair[5] ~= '1' then
            if is_player_a then
                local player_a_has_payload = redis.call('hexists', pair_key, 'plda') == 1
                if player_a_has_payload then
                    return nil
                else
                    other_player_set_payload = redis.call('hexists', pair_key, 'pldb') == 1
                    redis.call('hset', pair_key, 'plda', THE_PAYLOAD)
                end
            else
                local player_b_has_payload = redis.call('hexists', pair_key, 'pldb') == 1
                if player_b_has_payload then
                    return nil
                else
                    other_player_set_payload = redis.call('hexists', pair_key, 'plda') == 1
                    redis.call('hset', pair_key, 'pldb', THE_PAYLOAD)
                end
            end
        else
            redis.call('hset', pair_key, 'plda', THE_PAYLOAD)
        end
        if other_player_set_payload or the_pair[5] == '1' then
            redis.call('hmset', pair_key, 'stat', '2', 'upd', NOW)
            local opp_payload = redis.call('hget', pair_key, (is_player_a and 'pldb' or 'plda'))
            redis.call('publish', 'gr-pub', the_pair[3] .. '//2;1,' .. (is_player_a and opp_payload or THE_PAYLOAD));
            if the_pair[5] ~= '1' then
                redis.call('publish', 'gr-pub', the_pair[4] .. '//2;0,' .. (is_player_a and THE_PAYLOAD or opp_payload));
            end
            return '2'
        else
            return '1'
        end
    end
end