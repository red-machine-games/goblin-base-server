local BOOKING_KEY = KEYS[1]
local THE_MESSAGE = KEYS[2]
local PAIR_INGAME_TTL = tonumber(KEYS[3])
local PAUSED_PAIR_TTS = tonumber(KEYS[4])
local ABSOLUTE_GAMEPLAY_TTL = tonumber(KEYS[5])
local NOW = tonumber(KEYS[6])

local pair_index = redis.call('hmget', 'pinx:' .. BOOKING_KEY, 'prid', 'pid')

if pair_index[1] == false then
    return nil
else
    local pair_key = 'pair:' .. pair_index[1]
    local the_pair = redis.call('hmget', pair_key, 'stat', 'upd', 'pseda', 'psedb', 'cat')

    if tonumber(the_pair[5]) * 1000 + ABSOLUTE_GAMEPLAY_TTL < NOW then
        return nil
    else
        local is_paused = the_pair[3] == '1' or the_pair[4] == '1'
        if is_paused and tonumber(the_pair[2]) + PAUSED_PAIR_TTS <= NOW then
            return nil
        elseif the_pair[1] ~= '4' or tonumber(the_pair[2]) + PAIR_INGAME_TTL <= NOW then
            return nil
        else
            redis.call('rpush', 'pq:' .. pair_index[1], THE_MESSAGE)
            redis.call('publish', 'gr-pub', '-1//1;' .. pair_index[1])
            return '1'
        end
    end
end