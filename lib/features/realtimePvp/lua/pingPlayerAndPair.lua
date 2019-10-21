local BOOKING_KEY = KEYS[1]
local PLAYER_PING = KEYS[2]
local PAIR_INGAME_TTL = tonumber(KEYS[3])
local PAUSED_PAIR_TTS = tonumber(KEYS[4])
local ABSOLUTE_GAMEPLAY_TTL = tonumber(KEYS[5])
local NOW = tonumber(KEYS[6])
local LOCK_TTL = KEYS[7]
local UNPAUSED_GAME_TTL = tonumber(KEYS[8])
local PAUSED_TIMEDOUT_PAIR_INACTIVITY_MS = tonumber(KEYS[9])
local N = 5

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

        local is_paused_and_timed_out = is_paused and tonumber(the_pair[2]) + PAUSED_PAIR_TTS <= NOW
        local is_player_a = pair_index[2] == the_pair[3]
        local is_paused_and_is_paused_player = is_paused and ((is_player_a and the_pair[5] == '1') or (not is_player_a and the_pair[6] == '1'))

        if is_paused_and_timed_out then
            if tonumber(the_pair[2]) + PAUSED_PAIR_TTS + PAUSED_TIMEDOUT_PAIR_INACTIVITY_MS <= NOW then
                return nil
            else
                return '-1'
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
                return '-1'
            else
                return nil
            end
        else
            local prev_pings = redis.call('lrange', 'ping:' .. pair_index[2], '0', '-1')
            table.insert(prev_pings, PLAYER_PING)
            redis.call('rpush', 'ping:' .. pair_index[2], PLAYER_PING)
            redis.call('pexpire', 'ping:' .. pair_index[2], PAIR_INGAME_TTL + PAUSED_PAIR_TTS)
            if #prev_pings > N then
                table.remove(prev_pings, 1)
                redis.call('lpop', 'ping:' .. pair_index[2])
            end
            local avg = 0
            for i = 1, #prev_pings, 1 do
                avg = avg + tonumber(prev_pings[i])
            end
            avg = math.floor(avg / #prev_pings)

            local opponent_is_bot = the_pair[7] == '1'
            local ping_pendulum = redis.call('hget', pair_key, 'ppen')
            if opponent_is_bot then
                redis.call('hmset', pair_key, 'upd', NOW, 'pavga', avg, 'lmsga', math.floor(NOW / 1000))
            else
                if is_player_a then
                    if ping_pendulum == '1' then
                        redis.call('hmset', pair_key, 'upd', NOW, 'ppen', '0', 'pavga', avg, 'lmsga', math.floor(NOW / 1000))
                    else
                        redis.call('hmset', pair_key, 'pavga', avg, 'lmsga', math.floor(NOW / 1000))
                    end
                elseif ping_pendulum == '0' then
                    redis.call('hmset', pair_key, 'upd', NOW, 'ppen', '1', 'pavgb', avg, 'lmsgb', math.floor(NOW / 1000))
                else
                    redis.call('hmset', pair_key, 'pavgb', avg, 'lmsgb', math.floor(NOW / 1000))
                end
            end
            redis.call('set', 'cloc:' .. BOOKING_KEY, '1', 'px', LOCK_TTL)

            redis.call('publish', 'gr-pub', '-1//1;' .. pair_index[1])

            if is_player_a then
                return avg .. ';' .. redis.call('hget', pair_key, 'pavgb')
            else
                return avg .. ';' .. redis.call('hget', pair_key, 'pavga')
            end
        end
    end
end