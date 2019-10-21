local OCCUPATION_BY_DEFAULT = KEYS[1]

local the_occupation = redis.call('get', 'the_occupation')

if the_occupation then
    return the_occupation
else
    redis.call('set', 'the_occupation', OCCUPATION_BY_DEFAULT)
    return OCCUPATION_BY_DEFAULT
end