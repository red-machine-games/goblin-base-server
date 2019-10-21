local PID = KEYS[1]

if redis.call('exists', 'meDebt:' .. PID) ~= 1 then
    return nil
else
    redis.call('del', 'meDebt:' .. PID)
    return '1'
end