local BOOKING_KEY = KEYS[1]
local PAIR_INGAME_TTL = tonumber(KEYS[2])
local PAUSED_PAIR_TTS = tonumber(KEYS[3])
local UNPAUSED_GAME_TTL = tonumber(KEYS[4])
local ABSOLUTE_GAMEPLAY_TTL = tonumber(KEYS[5])
local NOW = tonumber(KEYS[6])

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

        local is_player_a = pair_index[2] == the_pair[3]
        local is_paused_and_is_paused_player = is_paused and ((is_player_a and the_pair[5] == '1') or (not is_player_a and the_pair[6] == '1'))

        if is_paused then
            if tonumber(the_pair[2]) + PAUSED_PAIR_TTS <= NOW then
                return nil
            else
                return '-1';
            end
        elseif is_paused_and_is_paused_player then
            if is_player_a then
                redis.call('hdel', pair_key, 'pseda')
                if the_pair[6] == false then
                    redis.call('hmset', pair_key, 'upd', NOW, 'lmsga', math.floor(NOW / 1000))
                end
            else
                redis.call('hdel', pair_key, 'psedb')
                if the_pair[5] == false then
                    redis.call('hmset', pair_key, 'upd', NOW, 'lmsgb', math.floor(NOW / 1000))
                end
            end
            local target_player_turn = redis.call('hget', pair_key, is_player_a and 'turb' or 'tura')
            if is_player_a then
                if the_pair[5] ~= '1' then
                    redis.call('publish', 'gr-pub', the_pair[4] .. '//9;' .. (is_player_a and '0;' or '1;') .. (is_paused and '1;' or '0;') .. target_player_turn .. ';' .. tostring(NOW))
                end
            else
                redis.call('publish', 'gr-pub', the_pair[3] .. '//9;' .. (is_player_a and '0;' or '1;') .. (is_paused and '1;' or '0;') .. target_player_turn .. ';' .. tostring(NOW))
            end
        elseif the_pair[1] ~= '4' or tonumber(the_pair[2]) + PAIR_INGAME_TTL <= NOW then
            return nil
        elseif tonumber(the_pair[2]) + UNPAUSED_GAME_TTL <= NOW then
            if the_pair[7] ~= '1' then
                if (is_player_a and not the_pair[6]) or (not is_player_a and not the_pair[5]) then
                    redis.call('hmset', pair_key, is_player_a and 'psedb' or 'pseda', '1', 'upd', NOW, is_player_a and 'lmsga' or 'lmsgb', math.floor(NOW / 1000))
                    local target_player_turn = redis.call('hget', pair_key, is_player_a and 'tura' or 'turb')
                    redis.call('publish', 'gr-pub', (is_player_a and the_pair[3] or the_pair[4]) .. '//8;' .. target_player_turn .. ';' .. tostring(NOW))
                end
            else
                return nil
            end
        else
            is_player_a = pair_index[2] == the_pair[3]
            local opponent_is_bot = the_pair[7] == '1'
            if opponent_is_bot then
                redis.call('hmset', pair_key, 'upd', NOW, 'lmsga', math.floor(NOW / 1000))
            else
                local ping_pendulum = redis.call('hget', pair_key, 'ppen')
                if is_player_a and ping_pendulum == '1' then
                    redis.call('hmset', pair_key, 'upd', NOW, 'ppen', '0', 'lmsga', math.floor(NOW / 1000))
                elseif not is_player_a and ping_pendulum == '0' then
                    redis.call('hmset', pair_key, 'upd', NOW, 'ppen', '1', 'lmsgb', math.floor(NOW / 1000))
                end
            end
            return '1;'
                    .. (is_player_a and (the_pair[3] .. ';' .. the_pair[4]) or (the_pair[4] .. ';' .. the_pair[3]))
                    .. ';' ..  pair_index[1]
        end
    end
end