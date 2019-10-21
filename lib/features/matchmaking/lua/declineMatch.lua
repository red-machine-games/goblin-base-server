local PID = KEYS[1]
local NOW = tonumber(KEYS[2])
local TIME_FOR_ACCEPTANCE = tonumber(KEYS[3])

local stat = redis.call('hget', 'qplr:' .. PID, 'stat')

if stat then
    if stat == '0' or stat == '2' then
        return stat
    elseif stat == '1' then
        local qplr = redis.call('hmget', 'qplr:' .. PID, 'upd', 'opp', 'opbot')
        if tonumber(qplr[1]) + TIME_FOR_ACCEPTANCE > NOW then
            if qplr[3] == '1' then
                redis.call('del', 'qplr:' .. PID)
            else
                redis.call('del', 'qplr:' .. PID, 'qplr:' .. qplr[2])
                redis.call('publish', 'mm-pub', qplr[2] .. '//2')
            end
            return stat
        else
            return nil
        end
    end
else
    return nil
end