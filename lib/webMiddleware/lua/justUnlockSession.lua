local UNICORN = KEYS[1]

redis.call('del', 'sexp:' .. UNICORN)
redis.call('hdel', 'sess:' .. UNICORN, 'kill')