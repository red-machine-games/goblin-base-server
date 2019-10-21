local PID = KEYS[1]
local NOW = tonumber(KEYS[2])
local TIME_FOR_SEARCH = tonumber(KEYS[3])

local stat = redis.call('hget', 'qplr:' .. PID, 'stat')

if stat ~= nil then
    local updated = redis.call('hget', 'qplr:' .. PID, 'upd')
    if stat == '0' then
        if updated + TIME_FOR_SEARCH <= NOW then
            return nil
        else
            local a_segment = redis.call('hget', 'qplr:' .. PID, 'segm')
            redis.call('zrem', 'sq:' .. a_segment, PID)
            redis.call('del', 'qplr:' .. PID)
            return '0'
        end
    elseif stat == '1' or stat == '2' then
        return stat
    else
        return nil
    end
else
    return nil;
end