local BOOKING_KEY = KEYS[1]
local TIME_TO_CONNECT_PAIR = tonumber(KEYS[2])
local NOW = tonumber(KEYS[3])
local LOCK_TTL = KEYS[4]

local pair_index = redis.call('hmget', 'pinx:' .. BOOKING_KEY, 'prid', 'pid')

if pair_index[1] == false then
    return nil
else
    local pair_key = 'pair:' .. pair_index[1]
    local the_pair = redis.call('hmget', pair_key, 'stat', 'upd')

    if the_pair[1] ~= false then
        local istat = tonumber(the_pair[1])
        if istat >= 0 and istat < 4 and tonumber(the_pair[2]) + TIME_TO_CONNECT_PAIR > NOW then
            redis.call('set', 'cloc:' .. BOOKING_KEY, '1', 'px', LOCK_TTL)
            return '1'
        end
    end

    return nil
end