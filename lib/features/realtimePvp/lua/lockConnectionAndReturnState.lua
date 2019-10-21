local BOOKING_KEY = KEYS[1]
local LOCK_TTL = KEYS[2]
local TIME_TO_CONNECT_PAIR = tonumber(KEYS[3])
local PAIR_INGAME_TTL = tonumber(KEYS[4])
local PAUSED_PAIR_TTS = tonumber(KEYS[5])
local ABSOLUTE_GAMEPLAY_TTL = tonumber(KEYS[6])
local NOW = tonumber(KEYS[7])
local FORCE_RENEW_LOCK = KEYS[8] == '1'
local QUASI_UNIQ_ID = KEYS[9]

local lock_key = 'cloc:' .. BOOKING_KEY
local the_lock = redis.call('get', lock_key)

if the_lock and not FORCE_RENEW_LOCK then
    return nil
else
    local pair_index = redis.call('hmget', 'pinx:' .. BOOKING_KEY, 'prid', 'pid')
    if pair_index[1] == false then
        return '-1'
    else
        if the_lock then
            redis.call('del', lock_key)
            redis.call('publish', 'gr-pub', pair_index[2] .. '//12;' .. QUASI_UNIQ_ID)
        end
        local the_pair = redis.call('hmget', 'pair:' .. pair_index[1], 'stat', 'upd', 'pida', 'pseda', 'psedb', 'cat')

        if tonumber(the_pair[6]) * 1000 + ABSOLUTE_GAMEPLAY_TTL < NOW then
            return '-1'
        else
            local is_paused = the_pair[4] == '1' or the_pair[5] == '1'
            if the_pair[1] == false then
                return '-1'
            elseif is_paused and tonumber(the_pair[2]) + PAUSED_PAIR_TTS <= NOW then
                return '-1'
            elseif (the_pair[1] == '0' or the_pair[1] == '1' or the_pair[1] == '2' or the_pair[1] == '3') then
                if tonumber(the_pair[2]) + TIME_TO_CONNECT_PAIR <= NOW then
                    return '-1'
                else
                    redis.call('set', lock_key, '1', 'px', LOCK_TTL)
                    return '1;' .. the_pair[1] .. ';' .. pair_index[2]
                end
            elseif the_pair[1] == '4' and tonumber(the_pair[2]) + PAIR_INGAME_TTL <= NOW then
                return '-1'
            else
                local is_player_a = pair_index[2] == the_pair[3]
                local pair_key = 'pair:' .. pair_index[1]
                local pair_state = redis.call(
                        'hmget', pair_key,
                        'mdl', 'tura', 'turb', 'pseda', 'psedb'
                )
                local opponentPayload = redis.call('hget', pair_key, is_player_a and 'pldb' or 'plda')
                local playerTurnA = tonumber(pair_state[2])
                local playerTurnB = tonumber(pair_state[3])

                local out = {
                    mdl = pair_state[1],
                    tura = playerTurnA,
                    turb = playerTurnB,
                    isA = is_player_a and 1 or 0,
                    pid = pair_index[2],
                    oppld = opponentPayload
                }

                if is_player_a and pair_state[4] == '1' then
                    redis.call('hdel', 'pair:' .. pair_index[1], 'pseda')
                    if pair_state[5] == false then
                        redis.call('hset', 'pair:' .. pair_index[1], 'upd', NOW)
                    end
                elseif not is_player_a and pair_state[5] == '1' then
                    redis.call('hdel', 'pair:' .. pair_index[1], 'psedb')
                    if pair_state[4] == false then
                        redis.call('hset', 'pair:' .. pair_index[1], 'upd', NOW)
                    end
                end

                redis.call('set', lock_key, '1', 'px', LOCK_TTL)
                return cjson.encode(out)
            end
        end
    end
end