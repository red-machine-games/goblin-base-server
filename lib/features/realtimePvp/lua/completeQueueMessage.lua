local PAIR_ID = KEYS[1]
local PID = KEYS[2]
local THE_MESSAGE = KEYS[3]
local THE_NEW_MODEL = KEYS[4]
local PAIR_INGAME_TTL = tonumber(KEYS[5])
local TIME_TO_PROCESS_MESSAGE = tonumber(KEYS[6])
local PAUSED_PAIR_TTS = tonumber(KEYS[7])
local ABSOLUTE_GAMEPLAY_TTL = tonumber(KEYS[8])
local NOW = tonumber(KEYS[9])
local GAME_OVER_MESSAGE = KEYS[10]
local BITWISE_MESSAGE = KEYS[11] == '1'
local MESSAGE_SEQUENCE = tonumber(KEYS[12])

local pair_key = 'pair:' .. PAIR_ID
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
        local q_upd = redis.call('hget', pair_key, 'qupd')
        if tonumber(q_upd) + TIME_TO_PROCESS_MESSAGE < NOW then
            return nil
        else
            local opponents_pids_etc = redis.call('hmget', pair_key, 'pida', 'pidb', 'opbot', 'turax', 'turbx')
            local is_player_a = opponents_pids_etc[1] == PID
            if is_player_a then
                if MESSAGE_SEQUENCE == tonumber(opponents_pids_etc[4] or '0') + 1 then
                    redis.call('hset', pair_key, 'turax', MESSAGE_SEQUENCE)
                else
                    return '0'
                end
            elseif MESSAGE_SEQUENCE == tonumber(opponents_pids_etc[5] or '0') + 1 then
                redis.call('hset', pair_key, 'turbx', MESSAGE_SEQUENCE)
            else
                return '0'
            end
            local opp_is_bot = opponents_pids_etc[3] == '1'
            if GAME_OVER_MESSAGE == '-1' then
                redis.call('hdel', pair_key, 'qupd')
                if THE_NEW_MODEL ~= '-1' then
                    redis.call('hset', pair_key, 'mdl', THE_NEW_MODEL)
                end
                redis.call('lpop', 'pq:' .. PAIR_ID)
                if redis.call('llen', 'pq:' .. PAIR_ID) > 0 then
                    redis.call('publish', 'gr-pub', '-1//1;' .. PAIR_ID)
                end
                if BITWISE_MESSAGE then
                    if not opp_is_bot then
                        redis.call('publish', 'gr-pub', '-1//3;' .. opponents_pids_etc[1] .. ';' .. opponents_pids_etc[2] .. ';' .. THE_MESSAGE)
                    else
                        redis.call('publish', 'gr-pub', '-1//3;' .. opponents_pids_etc[1] .. ';-1;' .. THE_MESSAGE)
                    end
                else
                    redis.call('publish', 'gr-pub', PID .. '//7;' .. THE_MESSAGE)
                end

                return '1;' ..  opponents_pids_etc[1] .. ';' .. opponents_pids_etc[2] .. ';-1;-1;' .. (opp_is_bot and '1' or '0')
            else
                local opponents_hids = redis.call('hmget', pair_key, 'hida', 'hidb')
                local booking_key_a = redis.call('get', 'pidnx:' .. opponents_pids_etc[1])
                if redis.call('get', 'pgoto:' .. opponents_pids_etc[1]) == PAIR_ID then
                    redis.call('del', 'pgoto:' .. opponents_pids_etc[1])
                end
                if redis.call('get', 'pidnx:' .. opponents_pids_etc[1]) == booking_key_a then
                    redis.call('del', 'pidnx:' .. opponents_pids_etc[1])
                end
                redis.call('del', pair_key, 'pinx:' .. booking_key_a, 'pq:' .. PAIR_ID, 'sq:' .. booking_key_a)
                if not opp_is_bot then
                    local booking_key_b = redis.call('get', 'pidnx:' .. opponents_pids_etc[2])
                    if redis.call('get', 'pgoto:' .. opponents_pids_etc[2]) == PAIR_ID then
                        redis.call('del', 'pgoto:' .. opponents_pids_etc[2])
                    end
                    if redis.call('get', 'pidnx:' .. opponents_pids_etc[2]) == booking_key_b then
                        redis.call('del', 'pidnx:' .. opponents_pids_etc[2])
                    end
                    redis.call('del', 'pinx:' .. booking_key_b, 'sq:' .. booking_key_b)
                end
                redis.call('incrby', 'the_occupation', 1)

                if BITWISE_MESSAGE then
                    if not opp_is_bot then
                        redis.call('publish', 'gr-pub', '-1//4;' .. opponents_pids_etc[1] .. ';' .. opponents_pids_etc[2] .. ';' .. GAME_OVER_MESSAGE)
                    else
                        redis.call('publish', 'gr-pub', '-1//4;' .. opponents_pids_etc[1] .. ';-1;' .. GAME_OVER_MESSAGE)
                    end
                else
                    redis.call('publish', 'gr-pub', opponents_pids_etc[1] .. '//11;' .. GAME_OVER_MESSAGE)
                    if not opp_is_bot then
                        redis.call('publish', 'gr-pub', opponents_pids_etc[2] .. '//11;' .. GAME_OVER_MESSAGE)
                    end
                end

                return '1;' ..  opponents_pids_etc[1] .. ';' .. opponents_pids_etc[2] .. ';' .. opponents_hids[1] .. ';' .. opponents_hids[2] .. ';' .. (opp_is_bot and '1' or '0')
            end
        end
    end
end