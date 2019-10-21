local BOOKING_KEY = KEYS[1]
local PAIR_INGAME_TTL = tonumber(KEYS[2])
local PAUSED_PAIR_TTS = tonumber(KEYS[3])
local ABSOLUTE_GAMEPLAY_TTL = tonumber(KEYS[4])
local NOW = tonumber(KEYS[5])
local SEND_MESSAGE_TO_OPPONENT = KEYS[6]

local pair_index = redis.call('hmget', 'pinx:' .. BOOKING_KEY, 'prid', 'pid')

if pair_index[1] == false then
    return nil
else
    local pair_key = 'pair:' .. pair_index[1]
    local the_pair = redis.call('hmget', pair_key, 'stat', 'upd', 'pida', 'pidb', 'opbot', 'cat')

    if tonumber(the_pair[6]) * 1000 + ABSOLUTE_GAMEPLAY_TTL < NOW then
        return nil
    elseif the_pair[1] ~= '4' or tonumber(the_pair[2]) + PAIR_INGAME_TTL <= NOW then
        return nil
    else
        local paused = redis.call('hmget', pair_key, 'pseda', 'psedb')
        local is_paused = paused[1] == '1' or paused[2] == '1'

        if is_paused and tonumber(the_pair[2]) + PAUSED_PAIR_TTS <= NOW then
            return nil
        else
            if not paused[1] and not paused[2] then
                redis.call('hset', pair_key, 'upsedrects', NOW)
            end
            local is_player_a = pair_index[2] == the_pair[3]
            local target_player_turn = redis.call('hget', pair_key, is_player_a and 'turb' or 'tura')
            if is_player_a then
                if the_pair[5] ~= '1' then
                    if SEND_MESSAGE_TO_OPPONENT then
                        redis.call('publish', 'gr-pub', the_pair[4] .. '//5;' .. (is_paused and '1;' or '0;') .. target_player_turn .. ';' .. SEND_MESSAGE_TO_OPPONENT)
                    else
                        local pause_ts = ''
                        if not is_paused then
                            local _pts = redis.call('hget', pair_key, 'psedrects')
                            if _pts then
                                pause_ts = ';' .. _pts
                            end
                        end
                        redis.call('publish', 'gr-pub', the_pair[4] .. '//9;' .. (is_player_a and '0;' or '1;') .. (is_paused and '1;' or '0;') .. target_player_turn .. ';' .. tostring(NOW) .. pause_ts)
                    end
                end
            elseif SEND_MESSAGE_TO_OPPONENT then
                redis.call('publish', 'gr-pub', the_pair[3] .. '//5;' .. (is_paused and '1;' or '0;') .. target_player_turn .. ';' .. SEND_MESSAGE_TO_OPPONENT)
            else
                local pause_ts = ''
                if not is_paused then
                    local _pts = redis.call('hget', pair_key, 'psedrects')
                    if _pts then
                        pause_ts = ';' .. _pts
                    end
                end
                redis.call('publish', 'gr-pub', the_pair[3] .. '//9;' .. (is_player_a and '0;' or '1;') .. (is_paused and '1;' or '0;') .. target_player_turn .. ';' .. tostring(NOW) .. pause_ts)
            end
            return '1'
        end
    end
end