local UNICORN = KEYS[1]
local SUBSESSION = KEYS[2]

redis.call('del', 'sexp:' .. UNICORN)
redis.call('set', 'subs:' .. UNICORN, SUBSESSION)
redis.call('hdel', 'sess:' .. UNICORN, 'kill')