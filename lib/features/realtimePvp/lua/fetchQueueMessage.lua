local PAIR_ID = KEYS[1]
local PAIR_INGAME_TTL = tonumber(KEYS[2])
local TIME_TO_PROCESS_MESSAGE = tonumber(KEYS[3])
local PAUSED_PAIR_TTS = tonumber(KEYS[4])
local ABSOLUTE_GAMEPLAY_TTL = tonumber(KEYS[5])
local NOW = tonumber(KEYS[6])

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
        if not q_upd or (q_upd and tonumber(q_upd) + TIME_TO_PROCESS_MESSAGE <= NOW) then
            local the_message = redis.call('lindex', 'pq:' .. PAIR_ID, '0')
            if the_message then
                redis.call('hset', pair_key, 'qupd', NOW)
                return the_message
            else
                return nil
            end
        else
            return nil
        end
    end
end