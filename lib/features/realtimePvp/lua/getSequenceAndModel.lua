local PAIR_ID = KEYS[1]
local PID = KEYS[2]
local PAIR_INGAME_TTL = tonumber(KEYS[3])
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
        local pair_pida_and_sqs = redis.call('hmget', pair_key, 'pida', 'tura', 'turb')
        local opponent_is_player_a = PID == pair_pida_and_sqs[1]
        local the_model = redis.call('hget', pair_key, 'mdl')

        return (opponent_is_player_a and '0' or '1')
                .. ';' .. (opponent_is_player_a and pair_pida_and_sqs[2] or pair_pida_and_sqs[3])
                .. ';' .. the_model
    end
end