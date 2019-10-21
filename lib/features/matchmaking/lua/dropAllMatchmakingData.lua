local PID = KEYS[1]

local qplr_key = 'qplr:' .. PID
local qplr = redis.call('hmget', qplr_key, 'ky', 'grip')
local bkey, gameroom_stuff = qplr[1], qplr[2]

if bkey and gameroom_stuff then
    redis.call('del', qplr_key, 'grmb:' .. gameroom_stuff .. ':' .. bkey, 'mmrem:' .. PID)
    return '1'
else
    redis.call('del', qplr_key, 'mmrem:' .. PID)
    return nil
end