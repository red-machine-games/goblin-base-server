local BOOKING_KEY = KEYS[1]

return redis.call('get', 'sq:' .. BOOKING_KEY)