local BOOKING_KEY = KEYS[1]
local TIME_TO_CONNECT_PAIR = tonumber(KEYS[2])
local NOW = tonumber(KEYS[3])
local GAMEPLAY_MODEL = KEYS[4]
local START_TS = KEYS[5]
local RANDOM_SEED = KEYS[6]

local pair_index = redis.call('hmget', 'pinx:' .. BOOKING_KEY, 'prid', 'pid')

if pair_index[1] == false then
    return nil
else
    local pair_key = 'pair:' .. pair_index[1]
    local the_pair = redis.call('hmget', pair_key, 'stat', 'upd', 'pida', 'pidb', 'opbot')
    if the_pair[1] ~= '3' or tonumber(the_pair[2]) + TIME_TO_CONNECT_PAIR <= NOW then
        return nil
    else
        redis.call(
            'hmset', pair_key,
            'mdl', GAMEPLAY_MODEL, 'upd', NOW, 'stat', '4', 'tura', '0', 'turb', '0',
            'ppen', '1', 'pavga', '0', 'pavgb', '0'
        )
        if the_pair[5] ~= '1' then
            local is_player_a = pair_index[2] == the_pair[3]
            local opponent_payload = redis.call('hget', pair_key, (is_player_a and 'plda' or 'pldb'))
            redis.call('publish', 'gr-pub', (is_player_a and the_pair[4] or the_pair[3]) .. '//4;' .. opponent_payload .. ';' .. START_TS .. ';' .. RANDOM_SEED .. ';' .. (is_player_a and '0' or '1'))
        end

        return '1'
    end
end