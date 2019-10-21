local BOOKING_KEY = KEYS[1]
local PID = KEYS[2]
local PAIR_INGAME_TTL = tonumber(KEYS[3])
local PAUSED_PAIR_TTS = tonumber(KEYS[4])
local ABSOLUTE_GAMEPLAY_TTL = tonumber(KEYS[5])
local NOW = tonumber(KEYS[6])
local MESSAGE_TO_DELIVER = KEYS[7]

local pair_index = redis.call('hmget', 'pinx:' .. BOOKING_KEY, 'prid', 'pid')

if pair_index[1] == false then
    return nil
else
    local pair_key = 'pair:' .. pair_index[1]
    local the_pair = redis.call('hmget', pair_key, 'stat', 'upd', 'pida', 'pidb', 'pseda', 'psedb', 'opbot', 'cat')

    if tonumber(the_pair[8]) * 1000 + ABSOLUTE_GAMEPLAY_TTL < NOW then
        return nil
    else
        local is_paused = the_pair[5] == '1' or the_pair[6] == '1'
        if is_paused and tonumber(the_pair[2]) + PAUSED_PAIR_TTS <= NOW then
            return nil
        elseif the_pair[1] ~= '4' or tonumber(the_pair[2]) + PAIR_INGAME_TTL <= NOW then
            return nil
        else
            local is_player_a = PID == the_pair[3]
            redis.call('hmset', pair_key, is_player_a and 'pseda' or 'psedb', '1', 'upd', NOW)
            redis.call('hset', pair_key, 'psedrects', NOW)
            if the_pair[7] ~= '1' and ((is_player_a and not the_pair[5]) or (not is_player_a and not the_pair[6])) then
                local opposed_pid = is_player_a and the_pair[4] or the_pair[3]
                local target_player_turn = redis.call('hget', pair_key, is_player_a and 'tura' or 'turb')
                if MESSAGE_TO_DELIVER then
                    redis.call('publish', 'gr-pub', opposed_pid .. '//5;1;' .. target_player_turn .. ';' .. MESSAGE_TO_DELIVER)
                else
                    redis.call('publish', 'gr-pub', opposed_pid .. '//8;' .. target_player_turn .. ';' .. tostring(NOW))
                end
            end
            redis.call('del', 'cloc:' .. BOOKING_KEY)
            return '1'
        end
    end
end