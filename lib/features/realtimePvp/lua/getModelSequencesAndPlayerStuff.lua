local TARGET_BOOKING_KEY = KEYS[1]
local TARGET_PID = KEYS[2]
local PAIR_INGAME_TTL = tonumber(KEYS[3])
local ABSOLUTE_GAMEPLAY_TTL = tonumber(KEYS[4])
local NOW = tonumber(KEYS[5])

local pair_index = redis.call('hmget', 'pinx:' .. TARGET_BOOKING_KEY, 'prid', 'pid')

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
        local model_and_turns = redis.call('hmget', pair_key, 'mdl', 'tura', 'turb')
        local disconnected_is_a = TARGET_PID == the_pair[3]
        local out = {
            mdl = model_and_turns[1],
            tura = tonumber(model_and_turns[2]),
            turb = tonumber(model_and_turns[3]),
            isA = disconnected_is_a,
            opbot = the_pair[5] == 1
        }
        return cjson.encode(out)
    end
end