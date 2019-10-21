local BOOKING_KEY = KEYS[1]
local TIME_TO_CONNECT_PAIR = tonumber(KEYS[2])
local NOW = tonumber(KEYS[3])

local pair_index = redis.call('hmget', 'pinx:' .. BOOKING_KEY, 'prid', 'pid')

if pair_index[1] == false then
    return nil
else
    local pair_key = 'pair:' .. pair_index[1]
    local the_pair = redis.call('hmget', pair_key, 'stat', 'upd', 'pida', 'pidb', 'opbot')
    if the_pair[1] == false or (the_pair[1] ~= '0' and the_pair[1] ~= '1' and the_pair[1] ~= '2') or tonumber(the_pair[2]) + TIME_TO_CONNECT_PAIR <= NOW then
        if the_pair[1] == '3' then
            local is_player_a = pair_index[2] == the_pair[3]
            return '2;' .. pair_index[1] .. ';' .. redis.call('hget', pair_key, is_player_a and 'pldb' or 'plda')
        else
            return nil
        end
    else
        local is_player_a = pair_index[2] == the_pair[3]
        local is_other_player_ready
        if the_pair[5] ~= '1' then
            if is_player_a then
                local player_a_has_payload = redis.call('hexists', pair_key, 'plda') == 1
                if player_a_has_payload then
                    is_other_player_ready = redis.call('hget', pair_key, 'rdyb') == '1'
                else
                    return nil
                end
            else
                local player_b_has_payload = redis.call('hexists', pair_key, 'pldb') == 1
                if player_b_has_payload then
                    is_other_player_ready = redis.call('hget', pair_key, 'rdya') == '1'
                else
                    return nil
                end
            end
        end
        if is_other_player_ready or the_pair[5] == '1' then
            if the_pair[5] ~= '1' then
                redis.call('hdel', pair_key, is_player_a and 'rdyb' or 'rdya')
            end
            redis.call('hmset', pair_key, 'stat', '3', 'upd', NOW)

            redis.call('publish', 'gr-pub', the_pair[3] .. '//3');
            if the_pair[5] ~= '1' then
                redis.call('publish', 'gr-pub', the_pair[4] .. '//3');
            end
            return '2;' .. pair_index[1] .. ';' .. (is_player_a and '1' or '0')
        else
            redis.call('hset', pair_key, is_player_a and 'rdya' or 'rdyb', '1')
            local opponent_payload = redis.call('hget', pair_key, is_player_a and 'pldb' or 'plda')
            if opponent_payload then
                return '1;' .. opponent_payload
            else
                return '1;-1'
            end
        end
    end
end