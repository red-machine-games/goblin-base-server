local PAIR_ID = KEYS[1]
local PID = KEYS[2]
local THE_MESSAGE = KEYS[3]
local CLOSE_SOCKET = KEYS[4] == '1'
local PAIR_INGAME_TTL = tonumber(KEYS[5])
local PAUSED_PAIR_TTS = tonumber(KEYS[6])
local ABSOLUTE_GAMEPLAY_TTL = tonumber(KEYS[7])
local NOW = tonumber(KEYS[8])

local pair_key = 'pair:' .. PAIR_ID
local the_pair = redis.call('hmget', pair_key, 'stat', 'upd', 'pseda', 'psedb', 'pida', 'pidb', 'cat')

if tonumber(the_pair[7]) * 1000 + ABSOLUTE_GAMEPLAY_TTL < NOW then
    return nil
else
    local is_paused = the_pair[3] == '1' or the_pair[4] == '1'
    if is_paused and tonumber(the_pair[2]) + PAUSED_PAIR_TTS <= NOW then
        return nil
    elseif the_pair[1] ~= '4' or tonumber(the_pair[2]) + PAIR_INGAME_TTL <= NOW then
        return nil
    else
        redis.call('hdel', pair_key, 'qupd')
        local opponent_is_player_a = PID == the_pair[5]
        local caller_pid = opponent_is_player_a and the_pair[6] or the_pair[5]
        redis.call('publish', 'gr-pub', caller_pid .. '//' .. (CLOSE_SOCKET and '6;' or '5;0;') .. THE_MESSAGE)
        redis.call('lpop', 'pq:' .. PAIR_ID)
        if redis.call('llen', 'pq:' .. PAIR_ID) > 0 then
            redis.call('publish', 'gr-pub', '-1//1;' .. PAIR_ID)
        end
    end
end