local PID = KEYS[1]

redis.call('del', 'me:' .. PID)
redis.call('del', 'meDebt:' .. PID)