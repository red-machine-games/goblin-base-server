local SENDER_BOOKING_KEY = KEYS[1]
local THE_MESSAGE = KEYS[2]
local IS_BINARY = KEYS[3] == '1'
local PAIR_INGAME_TTL = tonumber(KEYS[4])
local ABSOLUTE_GAMEPLAY_TTL = tonumber(KEYS[5])
local NOW = tonumber(KEYS[6])

local pair_index = redis.call('hmget', 'pinx:' .. SENDER_BOOKING_KEY, 'prid', 'pid')

if pair_index[1] == false then
    return nil
else
    local pair_key = 'pair:' .. pair_index[1]
    local the_pair = redis.call('hmget', pair_key, 'stat', 'upd', 'pida', 'pidb', 'pseda', 'psedb', 'opbot', 'cat')

    if tonumber(the_pair[8]) * 1000 + ABSOLUTE_GAMEPLAY_TTL < NOW then
        return nil
    else
        local is_paused = the_pair[5] == '1' or the_pair[6] == '1'
        if is_paused or the_pair[1] ~= '4' or tonumber(the_pair[2]) + PAIR_INGAME_TTL <= NOW then
            return nil
        elseif the_pair[7] == '1' then
            return '1'
        else
            redis.call(
                    'publish', 'gr-pub',
                    (pair_index[2] == the_pair[3] and the_pair[4] or the_pair[3]) .. '//14;' ..
                            (IS_BINARY and '1;' or '0;') .. THE_MESSAGE
            )
            return '0'
        end
    end
end